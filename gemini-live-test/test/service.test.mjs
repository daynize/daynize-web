import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveService, createSetup } from '../live-service.mjs';

class MockSocket {
    static OPEN = 1;
    static instances = [];
    constructor(url) { this.url = url; this.readyState = 1; this.bufferedAmount = 0; this.sent = []; MockSocket.instances.push(this); }
    send(value) { this.sent.push(JSON.parse(value)); }
    message(value) { return this.onmessage?.({ data: JSON.stringify(value) }); }
    close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
}

test('setup includes tutor voice and protocol waits for setupComplete', async () => {
    const setup = createSetup();
    assert.deepEqual(setup.setup.inputAudioTranscription, {});
    assert.deepEqual(setup.setup.outputAudioTranscription, {});
    assert.equal(setup.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');
    assert.match(setup.setup.systemInstruction.parts[0].text, /senior learners/);
    assert.deepEqual(setup.setup.realtimeInputConfig.automaticActivityDetection, {
        disabled: false,
        startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
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

test('initial network errors schedule reconnection before rejecting setup', async () => {
    const service = new LiveService({ endpoint: 'wss://example.test/ws', retryDelay: 100, WebSocketClass: MockSocket });
    const started = service.start();
    const rejected = assert.rejects(started, /네트워크/);
    service.socket.onerror();
    service.socket.close(1006);
    await rejected;
    assert.ok(service.retryTimer);
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