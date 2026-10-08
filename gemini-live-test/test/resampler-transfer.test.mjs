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