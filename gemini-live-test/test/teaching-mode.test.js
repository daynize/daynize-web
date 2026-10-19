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
    const client = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    context.after(() => client.terminate());
    await once(client, 'open');
    const [gemini] = await connection;
    client.send(JSON.stringify({ type: 'INIT_SESSION', mode: 'TEACHING', context: lesson }));
    const setup = await nextMessage(gemini);
    const instruction = setup.setup.systemInstruction.parts[0].text;
    assert.match(instruction, /데이나\(Dayna\)/);
    assert.match(instruction, /학습 주제: FOREVER 속의 WILL/);
    assert.ok(instruction.includes(lesson.keyConcept));
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
    const extra = [];
    gemini.on('message', data => extra.push(JSON.parse(data.toString())));
    client.send(JSON.stringify({ type: 'INIT_SESSION', mode: 'FREE', context: null }));
    gemini.send(JSON.stringify({ setupComplete: {} }));
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.deepEqual(extra, []);
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
    const bounded = normalizeLessonContext({ lessonTitle: 'Lesson', targetExpressions: Array.from({ length: 30 }, (_, i) => `${i}${'x'.repeat(200)}`), keyConcept: 'x'.repeat(500) });
    assert.equal(bounded.targetExpressions.length, 6);
    assert.ok(bounded.targetExpressions.every(expression => expression.length === 160));
    assert.equal(bounded.keyConcept.length, 400);
});

test('LiveService defaults to teaching; explicit null keeps legacy and transcription sockets unchanged', async () => {
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
    const teaching = new LiveService({ endpoint: 'wss://example.test/ws', WebSocketClass: MockSocket });
    teaching.start().catch(() => { });
    sockets[1].onopen();
    assert.equal(new URL(sockets[1].url).searchParams.get('handshake'), 'init');
    assert.deepEqual(sockets[1].sent, [{ mode: 'TEACHING', context: null, type: 'INIT_SESSION' }]);
    teaching.stop();
    const plain = new LiveService({ endpoint: 'wss://example.test/ws/transcribe', sessionInit: null, WebSocketClass: MockSocket });
    plain.start().catch(() => { });
    sockets[2].onopen();
    assert.equal(new URL(sockets[2].url).searchParams.has('handshake'), false);
    assert.deepEqual(sockets[2].sent, []);
    plain.stop();
});

test('automatic reconnect reuses the initial lesson snapshot', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const { LiveService } = await import('../live-service.mjs');
    let calls = 0;
    class MockSocket {
        static OPEN = 1;
        readyState = 1;
        sent = [];
        send(data) { this.sent.push(JSON.parse(data)); }
        close() { this.readyState = 3; }
    }
    const service = new LiveService({
        endpoint: 'wss://example.test/ws',
        sessionInit: () => { calls++; return { context: { ...lesson, lessonTitle: `Lesson ${calls}` } }; },
        WebSocketClass: MockSocket
    });
    context.after(() => service.stop());
    const started = service.start();
    service.socket.onopen();
    service.socket.onmessage({ data: JSON.stringify({ setupComplete: {} }) });
    await started;
    const init = service.socket.sent[0];
    service.socket.onclose({ code: 1006 });
    context.mock.timers.tick(1000);
    service.socket.onopen();
    assert.equal(calls, 1);
    assert.deepEqual(service.socket.sent[0], init);
});

test('session initialization errors reject the call instead of starting without lesson data', async () => {
    const { LiveService } = await import('../live-service.mjs');
    const service = new LiveService({ sessionInit: () => { throw new Error('broken tracker'); } });
    const errors = [];
    service.addEventListener('error', event => errors.push(event.detail));
    await assert.rejects(service.start(), /학습 정보를 준비하지 못/);
    assert.equal(service.active, false);
    assert.equal(errors[0].cause.message, 'broken tracker');
});

test('teaching reconnection resumes history without asking the opening question again', { timeout: 5000 }, async context => {
    const { upstream, port } = await startRelay(context);
    const session = '12345678-1234-4234-8234-123456789abc';
    const connect = async () => {
        const connection = once(upstream, 'connection');
        const client = new WebSocket(`ws://127.0.0.1:${port}/ws?session=${session}`);
        context.after(() => client.terminate());
        await once(client, 'open');
        const [gemini] = await connection;
        const setup = nextMessage(gemini);
        client.send(JSON.stringify({ type: 'INIT_SESSION', context: lesson }));
        return { client, gemini, setup: await setup };
    };
    const first = await connect();
    const greeting = nextMessage(first.gemini);
    const ready = nextMessage(first.client);
    first.gemini.send(JSON.stringify({ setupComplete: {} }));
    await Promise.all([ready, greeting]);
    const update = nextMessage(first.client);
    first.gemini.send(JSON.stringify({ sessionResumptionUpdate: { resumable: true, newHandle: 'teaching-history' } }));
    await update;
    const closed = once(first.gemini, 'close');
    first.client.close();
    await closed;
    const resumed = await connect();
    assert.equal(resumed.setup.setup.sessionResumption.handle, 'teaching-history');
    const turns = [];
    resumed.gemini.on('message', data => turns.push(JSON.parse(data.toString())));
    const resumedReady = nextMessage(resumed.client);
    resumed.gemini.send(JSON.stringify({ setupComplete: {} }));
    await resumedReady;
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.deepEqual(turns, []);
});
