const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { WebSocket, WebSocketServer } = require('ws');
const { createRelayServer } = require('../server');

function nextMessage(socket) {
    return once(socket, 'message').then(([data]) => JSON.parse(data.toString()));
}

async function startRelay(context, options = {}) {
    const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await once(upstream, 'listening');
    const relay = createRelayServer({ apiKey: 'test-key', upstreamUrl: `ws://127.0.0.1:${upstream.address().port}`, ...options });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(async () => {
        await relay.close();
        for (const socket of upstream.clients) socket.terminate();
        await new Promise(resolve => upstream.close(resolve));
    });
    return { upstream, port: relay.server.address().port };
}

const lesson = {
    lessonTitle: 'FOREVER 속의 WILL',
    targetExpressions: ['Would you wait for me forever?', 'Will you wait for me forever?'],
    keyConcept: 'would는 조심스러운 부탁, will은 확신'
};

test('INIT_SESSION context builds the teaching instruction and Dayna greets first', { timeout: 5000 }, async context => {
    const { upstream, port } = await startRelay(context);
    const connection = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${port}/ws/gemini-live?handshake=init`);
    context.after(() => client.terminate());
    await once(client, 'open');
    const [gemini] = await connection;
    client.send(JSON.stringify({ type: 'INIT_SESSION', mode: 'TEACHING', context: lesson }));
    const setup = await nextMessage(gemini);
    const instruction = setup.setup.systemInstruction.parts[0].text;
    assert.match(instruction, /데이나\(Dayna\)/);
    assert.match(instruction, /학습 주제: FOREVER 속의 WILL/);
    assert.match(instruction, /"Would you wait for me forever\?", "Will you wait for me forever\?"/);
    assert.match(instruction, /'Would you wait for me forever\?'을 활용해서/);
    assert.doesNotMatch(instruction, /\{\{/);
    const kickoff = nextMessage(gemini);
    const ready = nextMessage(client);
    gemini.send(JSON.stringify({ setupComplete: {} }));
    assert.deepEqual(await ready, { setupComplete: {} });
    const turn = await kickoff;
    assert.equal(turn.clientContent.turnComplete, true);
    assert.match(turn.clientContent.turns[0].parts[0].text, /먼저/);
});

test('handshake falls back to a context-free teaching session after the init timeout', { timeout: 5000 }, async context => {
    const { upstream, port } = await startRelay(context, { initTimeoutMs: 50 });
    const connection = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${port}/ws/gemini-live?handshake=init`);
    context.after(() => client.terminate());
    const [gemini] = await connection;
    const setup = await nextMessage(gemini);
    assert.match(setup.setup.systemInstruction.parts[0].text, /일상 인사와 안부 표현/);
});

test('FREE mode keeps the original tutor instruction and sends no greeting turn', { timeout: 5000 }, async context => {
    const { upstream, port } = await startRelay(context);
    const { TUTOR_INSTRUCTION } = await import('../live-service.mjs');
    const connection = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${port}/ws/gemini-live?handshake=init`);
    context.after(() => client.terminate());
    await once(client, 'open');
    const [gemini] = await connection;
    client.send(JSON.stringify({ type: 'INIT_SESSION', mode: 'FREE', context: lesson }));
    const setup = await nextMessage(gemini);
    assert.equal(setup.setup.systemInstruction.parts[0].text, TUTOR_INSTRUCTION);
    let extra = false;
    gemini.on('message', () => { extra = true; });
    const ready = nextMessage(client);
    gemini.send(JSON.stringify({ setupComplete: {} }));
    await ready;
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(extra, false);
});

test('clients without the handshake keep the original immediate setup', { timeout: 5000 }, async context => {
    const { upstream, port } = await startRelay(context, { initTimeoutMs: 60_000 });
    const { TUTOR_INSTRUCTION } = await import('../live-service.mjs');
    const connection = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${port}/ws/gemini-live`);
    context.after(() => client.terminate());
    const [gemini] = await connection;
    const setup = await nextMessage(gemini);
    assert.equal(setup.setup.systemInstruction.parts[0].text, TUTOR_INSTRUCTION);
});

test('lesson context is sanitized and length-limited before prompt binding', async () => {
    const { buildTeachingInstruction, normalizeLessonContext } = await import('../teaching-prompt.mjs');
    const normalized = normalizeLessonContext({ lessonTitle: `a{{keyConcept}}\n${'x'.repeat(500)}`, targetExpressions: ['  Hi  ', 'Hi', 3, ''], keyConcept: '$& kept' });
    assert.equal(normalized.lessonTitle.length, 120);
    assert.doesNotMatch(normalized.lessonTitle, /\{\{|\n/);
    assert.deepEqual(normalized.targetExpressions, ['Hi']);
    assert.match(buildTeachingInstruction(normalized), /핵심 개념\/뉘앙스: \$& kept/);
    assert.equal(normalizeLessonContext({ keyConcept: 'only concept' }), null);
});

test('LiveService sends INIT_SESSION on every proxy socket open when configured', async () => {
    const { LiveService } = await import('../live-service.mjs');
    const sockets = [];
    class MockSocket {
        static OPEN = 1;
        constructor(url) { this.url = url; this.sent = []; this.readyState = 0; sockets.push(this); }
        send(data) { this.sent.push(JSON.parse(data)); }
        close() { this.readyState = 3; }
    }
    const service = new LiveService({ endpoint: 'wss://example.test/ws', sessionInit: () => ({ mode: 'TEACHING', context: lesson }), WebSocketClass: MockSocket });
    const started = service.start();
    sockets[0].readyState = 1;
    sockets[0].onopen();
    assert.equal(new URL(sockets[0].url).searchParams.get('handshake'), 'init');
    assert.deepEqual(sockets[0].sent, [{ mode: 'TEACHING', context: lesson, type: 'INIT_SESSION' }]);
    sockets[0].onmessage({ data: JSON.stringify({ setupComplete: {} }) });
    await started;
    service.stop();
    const plain = new LiveService({ endpoint: 'wss://example.test/ws', WebSocketClass: MockSocket });
    plain.start().catch(() => { });
    sockets[1].onopen();
    assert.equal(new URL(sockets[1].url).searchParams.has('handshake'), false);
    assert.deepEqual(sockets[1].sent, []);
    plain.stop();
});
