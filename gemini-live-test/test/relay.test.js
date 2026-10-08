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
    const audio = { realtimeInput: { audio: { data: 'AAA=', mimeType: 'audio/pcm;rate=16000' } } };
    const received = nextMessage(gemini);
    client.send(JSON.stringify(audio));
    assert.deepEqual(await received, audio);
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
    const prefixedClient = new WebSocket(`ws://127.0.0.1:${prefixedRelay.server.address().port}`);
    context.after(() => prefixedClient.terminate());
    const [prefixedGemini] = await prefixedConnection;
    const prefixedSetup = await nextMessage(prefixedGemini);
    assert.equal(prefixedSetup.setup.model, 'models/gemini-2.0-flash-exp');
    const prefixedClosed = once(prefixedGemini, 'close');
    prefixedClient.close();
    await prefixedClosed;
});

test('invalid model names and duplicate prefixes are rejected', () => {
    for (const model of ['', 'models/', 'models/models/gemini-2.0-flash-exp', 123, ' gemini-2.0-flash-exp']) {
        assert.throws(() => createRelayServer({ model }), /GEMINI_MODEL/);
    }
});

test('public access requires authentication and validates websocket origin', { timeout: 5000 }, async context => {
    assert.throws(() => createRelayServer({ publicOrigin: 'https://test.example', accessPassword: '' }), /requires/);
    const relay = createRelayServer({ apiKey: '', publicOrigin: 'https://test.example', accessPassword: 'live:test-password' });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    const address = `http://127.0.0.1:${relay.server.address().port}`;
    assert.equal((await fetch(address)).status, 401);
    const authorization = `Basic ${Buffer.from('live:test-password').toString('base64')}`;
    const page = await fetch(address, { headers: { authorization } });
    assert.equal(page.status, 200);
    assert.match(page.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
    assert.equal((await fetch(`${address}/.access-password`, { headers: { authorization } })).status, 404);
    const rejected = new WebSocket(address.replace('http:', 'ws:'), { origin: 'https://test.example' });
    assert.match((await once(rejected, 'error'))[0].message, /401/);
    const wrongOrigin = new WebSocket(address.replace('http:', 'ws:'), { origin: 'https://evil.example', headers: { cookie: 'live_access=live:test-password' } });
    assert.match((await once(wrongOrigin, 'error'))[0].message, /403/);
    const accepted = new WebSocket(address.replace('http:', 'ws:'), { origin: 'https://test.example', headers: { cookie: 'live_access=live:test-password', host: 'test.example' } });
    assert.match((await nextMessage(accepted)).error.message, /GEMINI_API_KEY is missing/);
    await once(accepted, 'close');
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