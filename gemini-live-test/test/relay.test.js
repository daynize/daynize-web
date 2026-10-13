const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { WebSocket, WebSocketServer } = require('ws');
const { createRelayServer } = require('../server');

function nextMessage(socket) {
    return once(socket, 'message').then(([data]) => JSON.parse(data.toString()));
}

test('setup gates audio; PCM and replies relay both ways; disconnect closes upstream', { timeout: 5000 }, async context => {
    const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await once(upstream, 'listening');
    const relay = createRelayServer({ apiKey: 'test-key', model: 'gemini-2.0-flash-exp', upstreamUrl: `ws://127.0.0.1:${upstream.address().port}` });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    const port = relay.server.address().port;
    context.after(async () => {
        await relay.close();
        for (const socket of upstream.clients) socket.terminate();
        await new Promise(resolve => upstream.close(resolve));
    });
    assert.deepEqual(Object.keys(require('../server')), ['createRelayServer']);
    const connection = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    context.after(() => client.terminate());
    const [gemini, request] = await connection;
    const setup = await nextMessage(gemini);
    assert.equal(new URL(request.url, 'http://localhost').searchParams.get('key'), 'test-key');
    assert.equal(setup.setup.model, 'models/gemini-2.0-flash-exp');
    assert.deepEqual(setup.setup.generationConfig.responseModalities, ['AUDIO']);
    assert.equal(setup.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');
    assert.match(setup.setup.systemInstruction.parts[0].text, /Daynize/);
    const premature = nextMessage(client);
    client.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    assert.match((await premature).error.message, /setupComplete/);
    const ready = nextMessage(client);
    gemini.send(JSON.stringify({ setupComplete: {} }));
    assert.deepEqual(await ready, { setupComplete: {} });
    const pong = nextMessage(client);
    let forwardedPing = false;
    const inspectHeartbeat = data => { if (JSON.parse(data.toString()).type === 'ping') forwardedPing = true; };
    gemini.on('message', inspectHeartbeat);
    client.send(JSON.stringify({ type: 'ping', id: 1 }));
    assert.deepEqual(await pong, { type: 'pong', id: 1 });
    const audio = { realtimeInput: { audio: { data: 'AAA=', mimeType: 'audio/pcm;rate=16000' } } };
    const received = nextMessage(gemini);
    client.send(JSON.stringify(audio));
    assert.deepEqual(await received, audio);
    assert.equal(forwardedPing, false);
    gemini.off('message', inspectHeartbeat);
    const legacyReceived = nextMessage(gemini);
    client.send(JSON.stringify({ realtime_input: { media_chunks: [{ mime_type: 'audio/pcm;rate=16000', data: 'AAA=' }] } }));
    assert.deepEqual(await legacyReceived, audio);
    const reply = { serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAA=', mimeType: 'audio/pcm;rate=24000' } }] } } };
    const played = nextMessage(client);
    gemini.send(JSON.stringify(reply));
    assert.deepEqual(await played, reply);
    const invalid = nextMessage(client);
    client.send(JSON.stringify({ setup: {} }));
    assert.match((await invalid).error.message, /Expected/);
    const end = nextMessage(gemini);
    client.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    assert.deepEqual(await end, { realtimeInput: { audioStreamEnd: true } });
    const page = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /DAYNIZE/);
    assert.equal((await fetch(`http://127.0.0.1:${port}/.env`)).status, 404);
    const rejected = new WebSocket(`ws://127.0.0.1:${port}`, { origin: 'https://evil.example' });
    const [error] = await once(rejected, 'error');
    assert.match(error.message, /403/);
    const closed = once(gemini, 'close');
    client.close();
    await closed;

    const prefixedRelay = createRelayServer({ apiKey: 'test-key', model: 'models/gemini-2.0-flash-exp', upstreamUrl: `ws://127.0.0.1:${upstream.address().port}` });
    context.after(() => prefixedRelay.close());
    prefixedRelay.server.listen(0, '127.0.0.1');
    await once(prefixedRelay.server, 'listening');
    const prefixedConnection = once(upstream, 'connection');
    const prefixedClient = new WebSocket(`ws://127.0.0.1:${prefixedRelay.server.address().port}/ws/gemini-live?voice=Puck`);
    context.after(() => prefixedClient.terminate());
    const [prefixedGemini] = await prefixedConnection;
    const prefixedSetup = await nextMessage(prefixedGemini);
    assert.equal(prefixedSetup.setup.model, 'models/gemini-2.0-flash-exp');
    assert.equal(prefixedSetup.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Puck');
    assert.deepEqual(prefixedSetup.setup.inputAudioTranscription, {});
    assert.deepEqual(prefixedSetup.setup.outputAudioTranscription, {});
    const prefixedClosed = once(prefixedGemini, 'close');
    prefixedClient.close();
    await prefixedClosed;
});

test('transcription websocket enables input transcription and relays PCM without audio replies', { timeout: 5000 }, async context => {
    const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await once(upstream, 'listening');
    const relay = createRelayServer({ apiKey: 'test-key', upstreamUrl: `ws://127.0.0.1:${upstream.address().port}` });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(async () => {
        await relay.close();
        for (const socket of upstream.clients) socket.terminate();
        await new Promise(resolve => upstream.close(resolve));
    });
    const port = relay.server.address().port;
    const accepted = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${port}/ws/transcribe`, { origin: `http://127.0.0.1:${port}` });
    context.after(() => client.terminate());
    const [gemini] = await accepted;
    const setup = await nextMessage(gemini);
    assert.deepEqual(setup.setup.generationConfig.responseModalities, ['AUDIO']);
    assert.deepEqual(setup.setup.inputAudioTranscription, {});
    assert.equal(setup.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');
    const ready = nextMessage(client);
    gemini.send(JSON.stringify({ setupComplete: {} }));
    await ready;
    const audio = { realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: 'AAA=' } } };
    const forwarded = nextMessage(gemini);
    client.send(JSON.stringify(audio));
    assert.deepEqual(await forwarded, audio);
    const transcript = { serverContent: { inputTranscription: { text: 'This is a live transcript.' } } };
    const received = nextMessage(client);
    gemini.send(JSON.stringify(transcript));
    assert.deepEqual(await received, transcript);
    const completion = nextMessage(client);
    gemini.send(JSON.stringify({
        serverContent: {
            modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'AAA=' } }] },
            turnComplete: true
        }
    }));
    assert.deepEqual(await completion, { serverContent: { turnComplete: true } });
    client.close();
});

test('invalid model names and duplicate prefixes are rejected', () => {
    for (const model of ['', 'models/', 'models/models/gemini-2.0-flash-exp', 123, ' gemini-2.0-flash-exp']) {
        assert.throws(() => createRelayServer({ model }), /GEMINI_MODEL/);
    }
});

test('proxy reconnect restores Gemini handle for the same session and voice only', { timeout: 5000 }, async context => {
    const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await once(upstream, 'listening');
    const relay = createRelayServer({ apiKey: 'test-key', upstreamUrl: `ws://127.0.0.1:${upstream.address().port}` });
    context.after(async () => {
        await relay.close();
        for (const socket of upstream.clients) socket.terminate();
        await new Promise(resolve => upstream.close(resolve));
    });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    const session = '55aeb789-d879-4355-90aa-145a2112a70a';
    const address = `ws://127.0.0.1:${relay.server.address().port}/ws/gemini-live?session=${session}`;
    const connect = async voice => {
        const connection = once(upstream, 'connection');
        const client = new WebSocket(`${address}&voice=${voice}`);
        const [gemini] = await connection;
        const setup = await nextMessage(gemini);
        return { client, gemini, setup };
    };
    const first = await connect('Kore');
    assert.equal(first.setup.setup.sessionResumption.handle, undefined);
    const ready = nextMessage(first.client);
    first.gemini.send(JSON.stringify({ setupComplete: {} }));
    await ready;
    const handle = nextMessage(first.client);
    first.gemini.send(JSON.stringify({ sessionResumptionUpdate: { resumable: true, newHandle: 'cached-gemini-handle' } }));
    await handle;
    const closed = once(first.gemini, 'close');
    first.client.close();
    await closed;
    const resumed = await connect('Kore');
    assert.equal(resumed.setup.setup.sessionResumption.handle, 'cached-gemini-handle');
    const discarded = nextMessage(resumed.client);
    resumed.gemini.send(JSON.stringify({ error: { code: 400, message: 'Invalid resumption handle' } }));
    assert.equal((await discarded).error.retryable, true);
    await once(resumed.client, 'close');
    const fresh = await connect('Kore');
    assert.equal(fresh.setup.setup.sessionResumption.handle, undefined);
    fresh.client.close();
    const otherVoice = await connect('Puck');
    assert.equal(otherVoice.setup.setup.sessionResumption.handle, undefined);
    otherVoice.client.close();
});

test('runtime configuration exposes only the public WebSocket URL', async context => {
    const relay = createRelayServer({ apiKey: 'private-test-key', wsUrl: 'wss://stable.example/ws/gemini-live' });
    context.after(() => relay.close());
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    const response = await fetch(`http://127.0.0.1:${relay.server.address().port}/runtime-config.json`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { wsUrl: 'wss://stable.example/ws/gemini-live' });
    assert.throws(() => createRelayServer({ wsUrl: 'https://invalid.example' }), /WebSocket/);
});

test('transcription endpoint validates origin and WAV then returns Gemini text without caching', async context => {
    let upstreamRequest;
    const relay = createRelayServer({
        apiKey: 'private-test-key',
        allowedOrigins: ['https://www.daynize.co.kr'],
        fetchImpl: async (url, options) => {
            upstreamRequest = { url, options, body: JSON.parse(options.body) };
            return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'I would like a cup of tea.' }] } }] }), { status: 200 });
        }
    });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    const address = `http://127.0.0.1:${relay.server.address().port}/transcribe`;
    const headers = { Origin: 'https://www.daynize.co.kr', 'Content-Type': 'audio/wav' };
    const wav = Buffer.alloc(48);
    wav.write('RIFF', 0, 'ascii');
    wav.write('WAVE', 8, 'ascii');
    const response = await fetch(address, { method: 'POST', headers, body: wav });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://www.daynize.co.kr');
    assert.deepEqual(await response.json(), { transcript: 'I would like a cup of tea.' });
    assert.match(upstreamRequest.url, /models\/gemini-3\.8-flash:generateContent/);
    assert.equal(new URL(upstreamRequest.url).searchParams.get('key'), 'private-test-key');
    assert.equal(upstreamRequest.body.contents[0].parts[1].inlineData.mimeType, 'audio/wav');

    const forbidden = await fetch(address, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: wav });
    assert.equal(forbidden.status, 403);
    const invalidAudio = await fetch(address, { method: 'POST', headers, body: Buffer.alloc(48) });
    assert.equal(invalidAudio.status, 400);
    const unsupportedType = await fetch(address, { method: 'POST', headers: { ...headers, 'Content-Type': 'audio/webm' }, body: wav });
    assert.equal(unsupportedType.status, 415);
    const preflight = await fetch(address, { method: 'OPTIONS', headers: { Origin: headers.Origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
});

test('transcription endpoint rejects oversized uploads before Gemini', async context => {
    let upstreamCalls = 0;
    const relay = createRelayServer({ apiKey: 'test-key', allowedOrigins: ['https://www.daynize.co.kr'], maxTranscriptionBytes: 128, fetchImpl: async () => { upstreamCalls++; } });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    const response = await fetch(`http://127.0.0.1:${relay.server.address().port}/transcribe`, {
        method: 'POST',
        headers: { Origin: 'https://www.daynize.co.kr', 'Content-Type': 'audio/wav' },
        body: Buffer.alloc(256)
    });
    assert.equal(response.status, 413);
    assert.equal(upstreamCalls, 0);
});

test('missing upstream native pong terminates the stale relay with a retryable error', { timeout: 5000 }, async context => {
    const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1', autoPong: false });
    await once(upstream, 'listening');
    const relay = createRelayServer({ apiKey: 'test-key', heartbeatInterval: 100, upstreamUrl: `ws://127.0.0.1:${upstream.address().port}` });
    context.after(async () => {
        await relay.close();
        for (const socket of upstream.clients) socket.terminate();
        await new Promise(resolve => upstream.close(resolve));
    });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    const connected = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${relay.server.address().port}`);
    const [gemini] = await connected;
    await nextMessage(gemini);
    const failure = await nextMessage(client);
    assert.equal(failure.error.retryable, true);
    assert.match(failure.error.message, /heartbeat timed out/);
    await once(client, 'close');
});

test('public access needs no password but validates websocket origin and protects private files', { timeout: 5000 }, async context => {
    assert.throws(() => createRelayServer({ publicOrigin: 'http://test.example' }), /requires/);
    const relay = createRelayServer({ apiKey: '', publicOrigin: 'https://test.example', allowedOrigins: ['https://www.daynize.co.kr'] });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    const address = `http://127.0.0.1:${relay.server.address().port}`;
    const page = await fetch(address);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('set-cookie'), null);
    assert.equal(page.headers.get('www-authenticate'), null);
    assert.equal((await fetch(`${address}/.access-password`)).status, 404);
    assert.equal((await fetch(`${address}/.env`)).status, 404);
    const wrongOrigin = new WebSocket(address.replace('http:', 'ws:'), { origin: 'https://evil.example' });
    assert.match((await once(wrongOrigin, 'error'))[0].message, /403/);
    const accepted = new WebSocket(address.replace('http:', 'ws:'), { origin: 'https://test.example', headers: { host: 'test.example' } });
    assert.match((await nextMessage(accepted)).error.message, /GEMINI_API_KEY is missing/);
    await once(accepted, 'close');
    const homepage = new WebSocket(address.replace('http:', 'ws:') + '/ws/gemini-live', { origin: 'https://www.daynize.co.kr', headers: { host: 'test.example' } });
    assert.match((await nextMessage(homepage)).error.message, /GEMINI_API_KEY is missing/);
    await once(homepage, 'close');
    const invalidVoice = new WebSocket(address.replace('http:', 'ws:') + '/ws/gemini-live?voice=invalid');
    assert.match((await once(invalidVoice, 'error'))[0].message, /400/);
});

test('missing key returns an actionable error without contacting Gemini', { timeout: 5000 }, async context => {
    const relay = createRelayServer({ apiKey: '' });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    const client = new WebSocket(`ws://127.0.0.1:${relay.server.address().port}`);
    const message = await nextMessage(client);
    assert.match(message.error.message, /GEMINI_API_KEY is missing/);
    await once(client, 'close');
});

test('application authorization fails closed and session limits are validated', async context => {
    assert.throws(() => createRelayServer({ maxConnections: 0 }), /limits/);
    const relay = createRelayServer({ apiKey: '', authorizeRequest: request => request.headers['x-test-session'] === 'valid' });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    const address = `http://127.0.0.1:${relay.server.address().port}`;
    assert.equal((await fetch(address)).status, 401);
    assert.equal((await fetch(address, { headers: { 'x-test-session': 'valid' } })).status, 200);
});

test('PCM is signed little-endian and resampling preserves duration across blocks', async () => {
    const { encodePcm, decodePcm, PcmResampler } = await import('../audio.mjs');
    const encoded = encodePcm(new Float32Array([-1, 0, 1]));
    assert.deepEqual([...Buffer.from(encoded, 'base64')], [0, 128, 0, 0, 255, 127]);
    const decoded = decodePcm(encoded);
    assert.equal(decoded[0], -1);
    assert.equal(decoded[1], 0);
    assert.ok(Math.abs(decoded[2] - 1) < 0.0001);
    assert.throws(() => decodePcm('AA=='), /byte length/);
    for (const rate of [16000, 44100, 48000]) {
        const resampler = new PcmResampler(rate);
        const chunks = [];
        const input = new Float32Array(rate).fill(0.5);
        for (let offset = 0; offset < input.length; offset += 128) resampler.push(input.subarray(offset, offset + 128), chunk => chunks.push(chunk));
        assert.equal(chunks.length, 10);
        assert.equal(chunks.reduce((count, chunk) => count + chunk.length, 0), 16000);
        assert.ok(chunks.every(chunk => chunk.every(sample => Math.abs(sample - 0.5) < 0.000001)));
    }
});

test('server session deadline closes client and upstream independently of browser', { timeout: 5000 }, async context => {
    const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await once(upstream, 'listening');
    const relay = createRelayServer({ apiKey: 'test-key', maxSessionMs: 1000, upstreamUrl: `ws://127.0.0.1:${upstream.address().port}` });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(async () => { await relay.close(); for (const socket of upstream.clients) socket.terminate(); await new Promise(resolve => upstream.close(resolve)); });
    const connected = once(upstream, 'connection');
    const client = new WebSocket(`ws://127.0.0.1:${relay.server.address().port}`);
    const [gemini] = await connected;
    await nextMessage(gemini);
    const ready = nextMessage(client);
    gemini.send(JSON.stringify({ setupComplete: {} }));
    await ready;
    const deadline = nextMessage(client);
    const closedClient = once(client, 'close');
    const closedUpstream = once(gemini, 'close');
    assert.match((await deadline).error.message, /time limit/);
    await closedClient;
    await closedUpstream;
});