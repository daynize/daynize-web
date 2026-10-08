import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionSafety } from '../session-safety.mjs';

test('silence warns at 20 seconds and ends at 30 seconds; sound resets warning', () => {
    const session = new SessionSafety(100);
    assert.equal(session.check(20099).warning, false);
    assert.equal(session.check(20100).remaining, 10);
    assert.equal(session.check(20100).warning, true);
    assert.equal(session.check(25000, 0.03).warning, false);
    assert.equal(session.check(54999).reason, undefined);
    assert.equal(session.check(55000).reason, 'silence');
});

test('wall-clock limit ends at 10 minutes regardless of ongoing input', () => {
    const session = new SessionSafety(0);
    assert.equal(session.check(599999, 0.05).reason, undefined);
    assert.equal(session.check(600000, 0.05).reason, 'timeout');
    assert.equal(session.check(900000, 0.05).reason, 'timeout');
});