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
    engine.nextPlayback = 4;
    assert.throws(() => engine.play(audio), /지연/);
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
