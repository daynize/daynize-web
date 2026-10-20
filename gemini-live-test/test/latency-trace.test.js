const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { WebSocket, WebSocketServer } = require('ws');
const { createRelayServer } = require('../server');
const { createLatencyTrace } = require('../latency-trace');

const parse = lines => lines.filter(line => line.startsWith('[latency] ')).map(line => JSON.parse(line.slice(10)));
const audioReply = { serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAA=', mimeType: 'audio/pcm;rate=24000' } }] } } };

test('trace reports first-audio gaps, relay processing, arrival jitter and turn milestones without content', () => {
    let clock = 0;
    const lines = [];
    const trace = createLatencyTrace({ log: line => lines.push(line), now: () => clock, id: 'abc123', summaryMs: 1000 });
    trace.event('setup_complete');
    clock = 100; trace.event('kickoff_sent');
    clock = 400; trace.modelMessage(audioReply, 0.5, 100);
    clock = 440; trace.modelMessage(audioReply, 1.5, 200);
    clock = 600; trace.modelMessage({ serverContent: { turnComplete: true } }, 0.1, 0);
    clock = 700; trace.clientAudio(0.2, 10);
    clock = 900; trace.clientAudio(0.4, 50);
    clock = 1000; trace.modelMessage({ serverContent: { inputTranscription: { text: 'secret words' } } }, 0.1, 0);
    clock = 1600; trace.modelMessage(audioReply, 0.3, 0);
    clock = 2000; trace.close('done');
    const events = parse(lines);
    assert.ok(events.every(event => event.id === 'abc123'));
    assert.deepEqual(events.find(event => event.event === 'first_audio'), { id: 'abc123', t: 400, event: 'first_audio', sinceKickoffMs: 300, relayForwardMs: 0.5 });
    const second = events.filter(event => event.event === 'first_audio')[1];
    assert.equal(second.sinceLastInputTranscriptionMs, 600);
    assert.ok(events.some(event => event.event === 'turn_complete'));
    const summary = events.find(event => event.event === 'summary');
    assert.equal(summary.upstreamToClient.relayMaxMs, 1.5);
    assert.equal(summary.upstreamToClient.arrivalGapMaxMs, 40);
    assert.equal(summary.clientToUpstream.arrivalGapMaxMs, 200);
    assert.equal(summary.clientToUpstream.upstreamBufferedMaxBytes, 50);
    assert.ok(events.at(-1).event === 'session_close');
    assert.ok(!lines.join('\n').includes('secret words'));
});

test('relay writes [latency] lines for the whole call path when enabled, and nothing when disabled', { timeout: 6000 }, async context => {
    for (const enabled of [true, false]) {
        const lines = [];
        const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1' });
        await once(upstream, 'listening');
        const relay = createRelayServer({ apiKey: 'k', upstreamUrl: `ws://127.0.0.1:${upstream.address().port}`, latencyLog: enabled, latencyLogger: line => lines.push(line) });
        relay.server.listen(0, '127.0.0.1');
        await once(relay.server, 'listening');
        const connection = once(upstream, 'connection');
        const client = new WebSocket(`ws://127.0.0.1:${relay.server.address().port}`);
        const [gemini] = await connection;
        await once(gemini, 'message');
        const ready = once(client, 'message');
        gemini.send(JSON.stringify({ setupComplete: {} }));
        await ready;
        const received = once(gemini, 'message');
        client.send(JSON.stringify({ realtimeInput: { audio: { data: 'AAA=', mimeType: 'audio/pcm;rate=16000' } } }));
        await received;
        const played = once(client, 'message');
        gemini.send(JSON.stringify(audioReply));
        await played;
        client.close(1000, 'User ended call');
        await once(gemini, 'close');
        await new Promise(resolve => setTimeout(resolve, 50));
        await relay.close();
        for (const socket of upstream.clients) socket.terminate();
        await new Promise(resolve => upstream.close(resolve));
        const names = parse(lines).map(event => event.event);
        if (enabled) {
            for (const name of ['session_open', 'upstream_open', 'setup_sent', 'setup_complete', 'first_audio', 'session_close']) assert.ok(names.includes(name), `${name} missing in ${names}`);
        } else assert.deepEqual(names, []);
    }
});
