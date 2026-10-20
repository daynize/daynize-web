import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PcmResampler } from '../audio.mjs';

test('resampler keeps emitting after AudioWorklet transfers and detaches each buffer', () => {
    for (const inputRate of [16000, 44100, 48000]) {
        const resampler = new PcmResampler(inputRate);
        const samples = new Float32Array(inputRate * 3).fill(0.25);
        const received = [];
        for (let offset = 0; offset < samples.length; offset += 128) {
            resampler.push(samples.subarray(offset, offset + 128), chunk => {
                received.push(structuredClone(chunk, { transfer: [chunk.buffer] }));
                assert.equal(chunk.byteLength, 0);
            });
        }
        assert.equal(received.length, 30);
        assert.ok(received.every(chunk => chunk.length === 1600 && chunk.every(sample => sample === 0.25)));
        assert.equal(resampler.chunk.length, 1600);
    }
});
import { NoiseGate } from '../audio.mjs';

test('noise gate silences steady ambient noise, passes speech, and holds briefly after it', () => {
    const gate = new NoiseGate(16000);
    const block = level => new Float32Array(128).fill(level);
    for (let i = 0; i < 20; i++) assert.equal(gate.process(block(0.004)), false);
    assert.equal(gate.process(block(0.1)), true);
    assert.equal(gate.process(block(0.002)), true);
    for (let i = 0; i < 40; i++) gate.process(block(0.002));
    assert.equal(gate.process(block(0.002)), false);
});

test('noise gate floor adapts to louder rooms but caps the threshold', () => {
    const gate = new NoiseGate(16000);
    for (let i = 0; i < 2000; i++) gate.process(new Float32Array(128).fill(0.007));
    assert.ok(gate.threshold > 0.008 && gate.threshold <= 0.03);
    assert.equal(gate.process(new Float32Array(128).fill(0.2)), true);
});

import { MIC_CHUNK_SAMPLES } from '../audio.mjs';
import { encodePcm } from '../audio.mjs';

test('microphone packets are fixed at 40 ms (640 samples, 1280 PCM bytes) for every device rate', () => {
    assert.equal(MIC_CHUNK_SAMPLES, 640);
    for (const inputRate of [16000, 44100, 48000]) {
        const resampler = new PcmResampler(inputRate, 16000, MIC_CHUNK_SAMPLES);
        const sizes = [];
        for (let block = 0; block < inputRate / 128; block++) resampler.push(new Float32Array(128).fill(0.1), chunk => sizes.push(atob(encodePcm(chunk)).length));
        assert.ok(sizes.length >= 24);
        assert.ok(sizes.every(bytes => bytes === 1280));
    }
});
