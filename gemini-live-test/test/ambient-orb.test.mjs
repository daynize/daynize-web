import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrbMotion } from '../ambient-orb.mjs';

test('orb motion damps abrupt volume and state changes and stays within subtle bounds', () => {
    const motion = new OrbMotion();
    const first = motion.step({ input: 1, output: 1, speaking: true });
    assert.ok(first.ripple < 0.07);
    assert.ok(first.warmth < 0.03);
    for (let index = 0; index < 1200; index++) {
        const frame = motion.step({ input: 1, output: 1, thinking: true });
        assert.ok(frame.ripple <= 2.4);
        assert.ok(Math.abs(frame.breath) <= 0.55);
        assert.ok(frame.mist <= 0.035);
        assert.ok(frame.glow <= 0.095);
    }
    const previous = motion.warmth;
    motion.step();
    assert.ok(motion.warmth > previous * 0.97);
});

test('orb damping is frame-rate independent and reduced motion freezes drift', () => {
    const slow = new OrbMotion();
    const fast = new OrbMotion();
    for (let index = 0; index < 30; index++) slow.step({ input: 0.6, delta: 1 / 30 });
    for (let index = 0; index < 120; index++) fast.step({ input: 0.6, delta: 1 / 120 });
    assert.ok(Math.abs(slow.input - fast.input) < 1e-10);
    const phase = fast.phase;
    const reduced = fast.step({ input: 1, thinking: true, reduced: true });
    assert.equal(reduced.phase, phase);
    assert.equal(reduced.breath, 0);
    assert.equal(reduced.ripple, 0);
    assert.equal(reduced.mist, 0);
});