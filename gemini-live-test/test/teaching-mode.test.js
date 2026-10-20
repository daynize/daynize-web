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

test('learner PCM and tutor feedback share one session without another greeting', { timeout: 5000 }, async context => {
    const { upstream, port } = await startRelay(context);
    const connection = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    context.after(() => client.terminate());
    await once(client, 'open');
    const [gemini] = await connection;
    const setupMessage = nextMessage(gemini);
    client.send(JSON.stringify({ type: 'INIT_SESSION', mode: 'TEACHING', context: lesson }));
    const { setup } = await setupMessage;
    assert.equal(setup.realtimeInputConfig.activityHandling, 'START_OF_ACTIVITY_INTERRUPTS');
    assert.equal(setup.realtimeInputConfig.automaticActivityDetection.silenceDurationMs, 450);
    assert.deepEqual(setup.inputAudioTranscription, {});
    assert.match(setup.systemInstruction.parts[0].text, /딱 한 번/);
    const kickoff = nextMessage(gemini);
    const ready = nextMessage(client);
    gemini.send(JSON.stringify({ setupComplete: {} }));
    await Promise.all([ready, kickoff]);
    const messages = [];
    gemini.on('message', data => messages.push(JSON.parse(data.toString())));
    const forward = async message => {
        const received = nextMessage(client);
        gemini.send(JSON.stringify(message));
        assert.deepEqual(await received, message);
    };
    await forward({ serverContent: { turnComplete: true } });
    for (let i = 0; i < 3; i++) {
        const received = nextMessage(gemini);
        const audio = { realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: Buffer.alloc(3200, i).toString('base64') } } };
        client.send(JSON.stringify(audio));
        assert.deepEqual(await received, audio);
    }
    await forward({ serverContent: { interrupted: true } });
    await forward({ serverContent: { inputTranscription: { text: 'Will you wait for me forever?' } } });
    await forward({ serverContent: { outputTranscription: { text: '참 잘하셨어요! 확신을 잘 표현하셨어요.' }, turnComplete: true } });
    await forward({ setupComplete: {} });
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(messages.length, 3);
    assert.ok(messages.every(message => message.realtimeInput?.audio));
    assert.equal(client.readyState, WebSocket.OPEN);
    assert.equal(upstream.clients.size, 1);
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

test('tracked course progress is injected into the instruction and the opening prompt; short-turn rules are present', async () => {
    const { buildTeachingInstruction, createTeachingKickoff, normalizeLessonContext } = await import('../teaching-prompt.mjs');
    const context = { courseName: 'BASIC COURSE', lessonNumber: 5, totalLessons: 21, lessonTitle: '5강 · 동사 GO', targetExpressions: ['I go to work by bus.'], keyConcept: '이동 동사' };
    const instruction = buildTeachingInstruction(context);
    assert.match(instruction, /수강 강좌: BASIC COURSE/);
    assert.match(instruction, /수강 진도: 5회차까지 수강 완료 \(전체 21회차\)/);
    assert.match(instruction, /지난번 수강하신 'BASIC COURSE · 5강 · 동사 GO'까지 완수하셨네요/);
    assert.match(instruction, /1~2문장/);
    assert.match(instruction, /Aha!/);
    assert.match(instruction, /Oh, I see!/);
    assert.match(instruction, /Great!/);
    assert.match(instruction, /즉시 말하기를 멈추고/);
    const kickoff = createTeachingKickoff(context).clientContent.turns[0].parts[0].text;
    assert.match(kickoff, /수강 강좌: BASIC COURSE/);
    assert.match(kickoff, /5회차까지 수강 완료/);
    assert.match(kickoff, /I go to work by bus\./);
    assert.match(createTeachingKickoff().clientContent.turns[0].parts[0].text, /먼저/);
    assert.equal(normalizeLessonContext({ lessonTitle: 'x', lessonNumber: 9, totalLessons: 3 }).totalLessons, undefined);
    assert.doesNotMatch(buildTeachingInstruction({ lessonTitle: 'x', courseName: '{{keyConcept}}' }), /\{\{/);
    assert.match(buildTeachingInstruction({ lessonTitle: 'x' }), /수강 강좌: 기록 없음/);
});
