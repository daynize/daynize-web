import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveService, createSetup, resolveWebSocketUrl } from '../live-service.mjs';

class MockSocket {
    static OPEN = 1;
    static instances = [];
    constructor(url) { this.url = url; this.readyState = 1; this.bufferedAmount = 0; this.sent = []; MockSocket.instances.push(this); }
    send(value) { this.sent.push(JSON.parse(value)); }
    message(value) { return this.onmessage?.({ data: JSON.stringify(value) }); }
    close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
}

test('recovery deadline exits repeated setup stalls and cancels every timer', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const service = new LiveService({ endpoint: 'wss://example.test/ws', recoveryTimeout: 1000, timeout: 100, retryDelay: 10, maxRetries: 100, WebSocketClass: MockSocket });
    const failures = [];
    service.addEventListener('error', event => failures.push(event.detail));
    const rejected = assert.rejects(service.start());
    context.mock.timers.tick(1000);
    await rejected;
    assert.equal(service.connectionState, 'DISCONNECTED');
    assert.equal(service.active, false);
    assert.equal(service.retryTimer, undefined);
    assert.equal(service.recoveryTimer, undefined);
    assert.match(failures.at(-1).message, /복구하지 못/);
    const count = MockSocket.instances.length;
    context.mock.timers.tick(60000);
    assert.equal(MockSocket.instances.length, count);
});

test('manual retry keeps session identity and a throwing send enters recovery', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const service = new LiveService({ endpoint: 'wss://example.test/ws', WebSocketClass: MockSocket });
    context.after(() => service.stop());
    const started = service.start();
    await service.socket.message({ setupComplete: {} });
    await started;
    const sessionId = new URL(service.socket.url).searchParams.get('session');
    service.socket.send = () => { throw new Error('Transport lost'); };
    assert.equal(service.sendAudio('AAA='), false);
    assert.equal(service.connectionState, 'RECONNECTING');
    assert.equal(service.retryNow(), true);
    assert.equal(service.retryNow(), false);
    assert.equal(new URL(service.socket.url).searchParams.get('session'), sessionId);
    await service.socket.message({ setupComplete: {} });
    assert.equal(service.sendAudio('AAA='), true);
    assert.equal(service.connectionState, 'CONNECTED');
});

test('a stable connection clears the recovery deadline and future outages get a fresh deadline', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const service = new LiveService({ endpoint: 'wss://example.test/ws', recoveryTimeout: 1000, stableConnectionTime: 100, WebSocketClass: MockSocket });
    context.after(() => service.stop());
    const started = service.start();
    await service.socket.message({ setupComplete: {} });
    await started;
    context.mock.timers.tick(100);
    assert.equal(service.recoveryTimer, undefined);
    service.socket.close(1006);
    assert.ok(service.recoveryTimer);
    context.mock.timers.tick(1000);
    assert.equal(service.connectionState, 'DISCONNECTED');
});

test('setup includes tutor voice and protocol waits for setupComplete', async () => {
    const setup = createSetup();
    assert.deepEqual(setup.setup.generationConfig.thinkingConfig, { thinkingBudget: 0 });
    assert.deepEqual(setup.setup.inputAudioTranscription, {});
    assert.deepEqual(setup.setup.outputAudioTranscription, {});
    assert.equal(setup.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');
    assert.match(setup.setup.systemInstruction.parts[0].text, /senior learners/);
    assert.deepEqual(setup.setup.realtimeInputConfig.automaticActivityDetection, {
        disabled: false,
        startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
        endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
        prefixPaddingMs: 200,
        silenceDurationMs: 450
    });
    const service = new LiveService({ endpoint: 'wss://example.test/ws', WebSocketClass: MockSocket });
    const started = service.start();
    const socket = service.socket;
    assert.match(socket.url, /voice=Kore/);
    assert.equal(service.sendAudio('AAA='), false);
    await socket.message({ setupComplete: {} });
    await started;
    assert.equal(service.sendAudio('AAA='), true);
    assert.deepEqual(socket.sent[0], { realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: 'AAA=' } } });
    service.options.protocol = 'media_chunks';
    service.sendAudio('AAA=');
    assert.equal(socket.sent[1].realtime_input.media_chunks[0].mime_type, 'audio/pcm;rate=16000');
    let interrupted = false;
    service.addEventListener('interrupted', () => { interrupted = true; });
    await socket.message({ serverContent: { interrupted: true } });
    assert.equal(interrupted, true);
    const transcripts = [];
    service.addEventListener('transcript', event => transcripts.push(event.detail));
    await socket.message({ serverContent: { inputTranscription: { text: 'Hello' }, outputTranscription: { text: 'Welcome!' } } });
    assert.deepEqual(transcripts.map(item => [item.speaker, item.text]), [['user', 'Hello'], ['tutor', 'Welcome!']]);
    service.stop();
});

test('transient disconnect reconnects; stopping cancels pending retries', async () => {
    const service = new LiveService({ endpoint: 'wss://example.test/ws', retryDelay: 1, WebSocketClass: MockSocket });
    const start = service.start();
    await service.socket.message({ setupComplete: {} });
    await start;
    const reconnecting = new Promise(resolve => service.addEventListener('state', event => { if (event.detail === 'reconnecting') resolve(); }, { once: true }));
    service.socket.close(1006);
    await reconnecting;
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(service.retries, 1);
    await service.socket.message({ setupComplete: {} });
    assert.equal(service.retries, 0);
    assert.equal(service.ready, true);
    service.socket.close(1006);
    service.stop();
    const count = MockSocket.instances.length;
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(MockSocket.instances.length, count);
});

test('fatal API errors do not retry and pending setup can be cancelled', async () => {
    const service = new LiveService({ endpoint: 'wss://example.test/ws', WebSocketClass: MockSocket });
    const failed = service.start();
    const rejection = assert.rejects(failed, /denied/);
    await service.socket.message({ error: { message: 'denied' } });
    await rejection;
    assert.equal(service.active, false);
    assert.equal(service.retryTimer, undefined);
    const pending = service.start();
    const cancelled = assert.rejects(pending, /취소/);
    service.stop();
    await cancelled;
});

test('initial network errors recover even without a close event and start waits for readiness', async () => {
    const service = new LiveService({ endpoint: 'wss://example.test/ws', retryDelay: 1, WebSocketClass: MockSocket });
    const started = service.start();
    const socket = service.socket;
    socket.close = () => { socket.readyState = 3; };
    socket.onerror();
    assert.ok(service.retryTimer);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.notEqual(service.socket, socket);
    await service.socket.message({ setupComplete: {} });
    await started;
    assert.equal(service.connectionState, 'CONNECTED');
    service.stop();
});

test('retryable upstream error and backpressure use browser-safe close codes', async () => {
    const service = new LiveService({ endpoint: 'wss://example.test/ws', retryDelay: 100, WebSocketClass: MockSocket });
    const started = service.start();
    await service.socket.message({ setupComplete: {} });
    await started;
    await service.socket.message({ error: { message: 'Temporary upstream failure', retryable: true } });
    assert.ok(service.retryTimer);
    assert.equal(service.active, true);
    service.stop();
    const next = service.start();
    await service.socket.message({ setupComplete: {} });
    await next;
    service.socket.bufferedAmount = 1024 * 1024;
    assert.equal(service.sendAudio('AAA='), false);
    assert.ok(service.retryTimer);
    service.stop();
});

test('URL configuration is explicit, environment-aware and secure on HTTPS', () => {
    const page = { hostname: 'www.daynize.co.kr', host: 'www.daynize.co.kr', protocol: 'https:' };
    assert.equal(resolveWebSocketUrl({ env: {}, config: {}, page: null }), 'ws://localhost:8080/ws/gemini-live');
    assert.equal(resolveWebSocketUrl({ env: { NODE_ENV: 'production' }, config: {}, page: null }), 'wss://daynize-relay-api.fly.dev/ws/gemini-live');
    assert.equal(resolveWebSocketUrl({ env: {}, config: {}, page }), 'wss://daynize-relay-api.fly.dev/ws/gemini-live');
    assert.equal(resolveWebSocketUrl({ env: { NEXT_PUBLIC_WS_URL: 'wss://relay.example/ws' }, config: {}, page }), 'wss://relay.example/ws');
    assert.equal(resolveWebSocketUrl({ endpoint: 'wss://override.example/ws', env: { WS_URL: 'wss://env.example/ws' }, page }), 'wss://override.example/ws');
    assert.equal(resolveWebSocketUrl({ config: { wsUrl: 'wss://runtime.example/ws' }, page }), 'wss://runtime.example/ws');
    assert.equal(resolveWebSocketUrl({ env: {}, config: {}, page: { hostname: 'localhost', host: 'localhost:8091', protocol: 'http:' } }), 'ws://localhost:8091/ws/gemini-live');
    for (const endpoint of ['https://relay.example', 'ws://relay.example', 'wss://user:secret@relay.example', 'wss://relay.example/#fragment']) {
        assert.throws(() => resolveWebSocketUrl({ endpoint, page }));
    }
});

test('consecutive failures back off and reject only when the retry budget is exhausted', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const changes = [];
    const service = new LiveService({ endpoint: 'wss://example.test/ws', maxRetries: 4, maxRetryDelay: 4000, onConnectionState: detail => changes.push(detail), WebSocketClass: MockSocket });
    context.after(() => service.stop());
    const rejected = assert.rejects(service.start(), /네트워크/);
    for (const delay of [1000, 2000, 4000, 4000]) {
        const previous = service.socket;
        previous.onerror();
        assert.equal(changes.at(-1).state, 'RECONNECTING');
        assert.equal(changes.at(-1).delay, delay);
        context.mock.timers.tick(delay - 1);
        assert.equal(service.socket, previous);
        context.mock.timers.tick(1);
        assert.notEqual(service.socket, previous);
    }
    service.socket.onerror();
    await rejected;
    assert.equal(service.active, false);
    assert.equal(service.connectionState, 'DISCONNECTED');
    assert.equal(service.retryTimer, undefined);
});

test('normal backend completion renews the session but user stop cancels it', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const service = new LiveService({ endpoint: 'wss://example.test/ws', WebSocketClass: MockSocket });
    context.after(() => service.stop());
    const started = service.start();
    await service.socket.message({ setupComplete: {} });
    await started;
    const previous = service.socket;
    previous.close(1000);
    assert.equal(service.connectionState, 'RECONNECTING');
    context.mock.timers.tick(1000);
    assert.notEqual(service.socket, previous);
    await previous.message({ setupComplete: {} });
    assert.equal(service.ready, false);
    await service.socket.message({ setupComplete: {} });
    assert.equal(service.ready, true);
    service.stop();
    const count = MockSocket.instances.length;
    context.mock.timers.tick(60000);
    assert.equal(MockSocket.instances.length, count);
    assert.equal(service.heartbeatTimer, undefined);
});

test('proxy heartbeat matches pong IDs and reconnects on missing pong', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const service = new LiveService({ endpoint: 'wss://example.test/ws', WebSocketClass: MockSocket });
    context.after(() => service.stop());
    const started = service.start();
    const socket = service.socket;
    await socket.message({ setupComplete: {} });
    await started;
    context.mock.timers.tick(20000);
    assert.deepEqual(socket.sent.at(-1), { type: 'ping', id: 1 });
    await socket.message({ type: 'pong', id: 99 });
    assert.equal(service.pendingPing, 1);
    await socket.message({ type: 'pong', id: 1 });
    assert.equal(service.pongTimer, undefined);
    context.mock.timers.tick(20000);
    assert.deepEqual(socket.sent.at(-1), { type: 'ping', id: 2 });
    context.mock.timers.tick(10000);
    assert.equal(service.connectionState, 'RECONNECTING');
    assert.equal(service.heartbeatTimer, undefined);
    context.mock.timers.tick(1000);
    assert.notEqual(service.socket, socket);
});

test('setup timeout retries even without a close event; policy rejection is terminal', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const service = new LiveService({ endpoint: 'wss://example.test/ws', timeout: 100, WebSocketClass: MockSocket });
    context.after(() => service.stop());
    const rejected = assert.rejects(service.start(), /종료/);
    service.socket.close = () => { };
    context.mock.timers.tick(100);
    assert.equal(service.connectionState, 'RECONNECTING');
    context.mock.timers.tick(1000);
    service.socket.close(1008);
    await rejected;
    assert.equal(service.active, false);
});

test('direct Gemini mode resumes sessions without unsupported application pings', async context => {
    context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    const service = new LiveService({ endpoint: 'wss://example.test/ws', mode: 'direct', apiKey: 'test-key', WebSocketClass: MockSocket });
    context.after(() => service.stop());
    const started = service.start();
    service.socket.onopen();
    await service.socket.message({ setupComplete: {} });
    await started;
    await service.socket.message({ sessionResumptionUpdate: { resumable: true, newHandle: 'resume-test' } });
    await service.socket.message({ goAway: {} });
    context.mock.timers.tick(1000);
    service.socket.onopen();
    assert.equal(service.socket.sent[0].setup.sessionResumption.handle, 'resume-test');
    await service.socket.message({ setupComplete: {} });
    context.mock.timers.tick(40000);
    assert.equal(service.socket.sent.some(message => message.type === 'ping'), false);
});