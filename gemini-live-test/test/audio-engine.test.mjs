import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../audio-engine.mjs';
import { encodePcm } from '../audio.mjs';

function fakeContext() {
    const scheduled = [];
    const sources = [];
    return {
        currentTime: 1, state: 'running', sources, scheduled,
        createBuffer: (channels, length, rate) => ({ duration: length / rate, copyToChannel() { } }),
        createGain: () => ({ gain: { value: 1, setValueAtTime() { }, linearRampToValueAtTime() { }, cancelScheduledValues() { } }, connect(destination) { return destination; }, disconnect() { } }),
        createBufferSource: () => {
            const source = { connect(destination) { return destination; }, disconnect() { }, start(time) { scheduled.push(time); }, stop(time) { this.stopped = time; } };
            sources.push(source);
            return source;
        }
    };
}

test('24kHz PCM queue schedules contiguous audio and clears all sources on interrupt', () => {
    const engine = new AudioEngine();
    engine.context = fakeContext();
    engine.outputAnalyser = {};
    const audio = encodePcm(new Float32Array(2400));
    engine.play(audio);
    engine.play(audio);
    assert.equal(engine.sources.size, 2);
    assert.ok(Math.abs(engine.context.scheduled[1] - engine.context.scheduled[0] - 0.1) < 1e-9);
    engine.interrupt();
    assert.equal(engine.sources.size, 0);
    assert.equal(engine.nextPlayback, 0);
    assert.ok(engine.context.sources.every(source => source.stopped === 1.005));
});

test('mute disables capture tracks and playback rate/queue bounds are enforced', () => {
    const engine = new AudioEngine({ maxQueuedSeconds: 1 });
    const track = { enabled: true };
    engine.stream = { getAudioTracks: () => [track] };
    engine.setMuted(true);
    assert.equal(track.enabled, false);
    engine.setMuted(false);
    assert.equal(track.enabled, true);
    engine.context = fakeContext();
    const audio = encodePcm(new Float32Array(2400));
    assert.throws(() => engine.play(audio, 'audio/pcm;rate=999999'), /형식/);
    engine.outputAnalyser = {};
    engine.nextPlayback = 4;
    const skipped = [];
    engine.addEventListener('skipped', event => skipped.push(event.detail.seconds));
    assert.doesNotThrow(() => engine.play(audio));
    assert.deepEqual(skipped, [3]);
    assert.equal(engine.sources.size, 1);
    assert.equal(engine.stats.skipped, 1);
});

test('normal and bursty backlog is never cut; only a stalled backlog catches up faster, then skips', () => {
    const engine = new AudioEngine({ maxQueuedSeconds: 8, catchUpAfterSeconds: 4 });
    engine.context = fakeContext();
    engine.outputAnalyser = {};
    const rates = [];
    engine.addEventListener('playing', event => rates.push(event.detail.rate));
    const chunk = encodePcm(new Float32Array(24000));
    for (let index = 0; index < 4; index++) engine.play(chunk);
    assert.equal(engine.sources.size, 4);
    assert.ok(rates.every(rate => rate === 1));
    assert.ok(Math.abs(engine.queuedSeconds - (4 - 0.04)) < 0.05 || engine.queuedSeconds > 3.9);
    for (let index = 0; index < 3; index++) engine.play(chunk);
    assert.ok(rates.at(-1) > 1 && rates.at(-1) <= 1.15);
    assert.equal(engine.stats.skipped, 0);
});
test('play() drops chunks instead of connecting to a missing graph or closed context', () => {
    const engine = new AudioEngine();
    const audio = encodePcm(new Float32Array(2400));
    engine.context = fakeContext();
    assert.doesNotThrow(() => engine.play(audio));
    assert.equal(engine.sources.size, 0);
    engine.outputAnalyser = {};
    engine.context.state = 'closed';
    assert.doesNotThrow(() => engine.play(audio));
    assert.equal(engine.context.sources.length, 0);
});

test('stop() tolerates throwing nodes and an already-closed context', () => {
    const engine = new AudioEngine();
    const bad = { disconnect() { throw new Error('boom'); } };
    engine.microphone = engine.silence = engine.inputAnalyser = engine.outputAnalyser = engine.outputGain = bad;
    engine.processor = { port: { close() { throw new Error('boom'); } }, disconnect() { throw new Error('boom'); } };
    engine.context = { state: 'closed', close() { throw new Error('closed'); } };
    assert.doesNotThrow(() => engine.stop());
    assert.equal(engine.context, undefined);
    assert.equal(engine.active, false);
});

test('outputActive is true only while chunks are queued on a running context', () => {
    const engine = new AudioEngine();
    assert.equal(engine.outputActive, false);
    engine.context = fakeContext();
    engine.outputAnalyser = {};
    assert.equal(engine.outputActive, false);
    engine.play(encodePcm(new Float32Array(2400)));
    assert.equal(engine.outputActive, true);
    engine.context.state = 'suspended';
    assert.equal(engine.outputActive, false);
    engine.context.state = 'running';
    engine.interrupt();
    assert.equal(engine.outputActive, false);
});

test('first tutor chunk starts within a 40ms safety lead and later chunks continue gap-free in 100ms steps', () => {
    const engine = new AudioEngine();
    engine.context = fakeContext();
    engine.outputAnalyser = {};
    const chunk = encodePcm(new Float32Array(2400));
    const played = [];
    engine.addEventListener('playing', () => played.push(engine.context.scheduled.length));
    for (let index = 0; index < 5; index++) engine.play(chunk);
    const { scheduled } = engine.context;
    assert.ok(Math.abs(scheduled[0] - engine.context.currentTime - engine.startLeadSeconds) < 1e-9);
    assert.ok(engine.startLeadSeconds <= 0.05);
    for (let index = 1; index < 5; index++) assert.ok(Math.abs(scheduled[index] - scheduled[index - 1] - 0.1) < 1e-9);
    assert.deepEqual(played, [1, 2, 3, 4, 5]);
});

test('start() builds the playback graph before awaiting mic permission so the first chunk is never dropped', async () => {
    const created = [];
    const makeNode = name => ({ name, connect() { }, disconnect() { }, gain: { value: 1, setValueAtTime() { }, linearRampToValueAtTime() { }, cancelScheduledValues() { } }, frequencyBinCount: 128, fftSize: 256 });
    const context = {
        state: 'suspended', currentTime: 0, destination: makeNode('destination'),
        resume() { return new Promise(() => { }); },
        close() { return Promise.resolve(); },
        createAnalyser: () => { created.push('analyser'); return makeNode('analyser'); },
        createGain: () => { created.push('gain'); return makeNode('gain'); },
        createMediaStreamDestination: () => { created.push('sink'); return { ...makeNode('sink'), stream: {} }; },
        audioWorklet: { addModule: () => Promise.resolve() },
        createBuffer: (channels, length, rate) => ({ duration: length / rate, copyToChannel() { } }),
        createBufferSource: () => ({ connect() { }, disconnect() { }, start() { }, stop() { } })
    };
    const globals = ['isSecureContext', 'AudioContext', 'AudioWorkletNode', 'Audio', 'navigator'];
    const saved = Object.fromEntries(globals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    const define = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    define('isSecureContext', true);
    define('AudioContext', function () { return context; });
    define('AudioWorkletNode', function () { });
    define('Audio', function () { this.setAttribute = () => { }; this.play = () => Promise.resolve(); this.pause = () => { }; });
    define('navigator', { mediaDevices: { getUserMedia: () => new Promise(() => { }) } });
    const engine = new AudioEngine();
    try {
        void engine.start();
        assert.ok(engine.outputAnalyser);
        assert.ok(engine.outputGain);
        assert.ok(engine.sinkElement);
        assert.equal(engine.microphone, undefined);
        assert.doesNotThrow(() => engine.play(encodePcm(new Float32Array(2400))));
        assert.equal(engine.sources.size, 1);
    } finally {
        engine.stop();
        for (const name of globals) saved[name] ? Object.defineProperty(globalThis, name, saved[name]) : delete globalThis[name];
    }
});
