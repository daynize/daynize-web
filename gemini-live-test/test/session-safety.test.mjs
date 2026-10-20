import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionSafety, PHASES, SILENCE_WARNING_MS as WARN, SILENCE_LIMIT_MS as LIMIT } from '../session-safety.mjs';

// Steps the machine every 100ms like the widget's interval does.
function run(session, from, to, { rms = 0, output = false } = {}) {
    let result;
    for (let now = from; now <= to; now += 100) result = session.check(now, rms, output);
    return result;
}

function listening(start = 0) {
    const session = new SessionSafety(start);
    assert.equal(session.phase, PHASES.IDLE);
    session.setPhase(PHASES.LISTENING, start);
    return session;
}

test('inactivity does not count in IDLE', () => {
    const session = new SessionSafety(0);
    const result = run(session, 100, 120000);
    assert.equal(result.phase, PHASES.IDLE);
    assert.equal(result.warning, false);
    assert.equal(result.reason, undefined);
});

test('LISTENING warns at 45 seconds and ends at 60 seconds; sound resets the warning', () => {
    assert.equal(WARN, 45000);
    assert.equal(LIMIT, 60000);
    const session = listening(0);
    assert.equal(run(session, 100, WARN - 100).warning, false);
    const warned = run(session, WARN, WARN);
    assert.equal(warned.warning, true);
    assert.equal(warned.remaining, 15);
    assert.equal(session.check(WARN + 100, 0.03).warning, false);
    assert.equal(session.phase, PHASES.LISTENING);
});

test('LISTENING with no user sound ends the call at 60 seconds', () => {
    const session = listening(0);
    assert.equal(run(session, 100, LIMIT - 100).reason, undefined);
    assert.equal(run(session, LIMIT, LIMIT).reason, 'silence');
});

test('user speech then 800ms of quiet moves LISTENING to THINKING and the countdown stops', () => {
    const session = listening(0);
    run(session, 100, 1000, { rms: 0.05 });
    assert.equal(session.phase, PHASES.LISTENING);
    run(session, 1100, 1800);
    assert.equal(session.phase, PHASES.THINKING);
    for (let now = 2000; now <= 59000; now += 1000) {
        const result = session.check(now);
        assert.equal(result.phase, PHASES.THINKING);
        assert.equal(result.warning, false);
        assert.equal(result.reason, undefined);
    }
});

test('THINKING falls back to LISTENING after 60s with a fresh countdown, and resumes on user speech', () => {
    const session = listening(0);
    run(session, 100, 500, { rms: 0.05 });
    run(session, 600, 61500);
    assert.equal(session.phase, PHASES.LISTENING);
    assert.ok(run(session, 61600, 61600).silent < 1000);
    const other = listening(0);
    run(other, 100, 500, { rms: 0.05 });
    run(other, 600, 1500);
    assert.equal(other.phase, PHASES.THINKING);
    other.check(1600, 0.05);
    assert.equal(other.phase, PHASES.LISTENING);
});

test('SPEAKING never counts silence while output is queued, however long the answer', () => {
    const session = listening(0);
    run(session, 100, 500, { rms: 0.05 });
    run(session, 600, 1500);
    session.noteAudio(2000);
    session.setPhase(PHASES.SPEAKING, 2000);
    for (let now = 2000; now <= 180000; now += 500) {
        const result = session.check(now, 0, true);
        assert.equal(result.phase, PHASES.SPEAKING);
        assert.equal(result.warning, false);
        assert.equal(result.reason, undefined);
    }
});

test('a non-empty output queue forces SPEAKING even from LISTENING', () => {
    const session = listening(0);
    run(session, 100, 25000);
    assert.equal(session.check(25100, 0, true).phase, PHASES.SPEAKING);
});

test('returning to LISTENING after the answer restarts the countdown from zero', () => {
    const session = listening(0);
    session.setPhase(PHASES.SPEAKING, 1000);
    run(session, 1100, 90000, { output: true });
    session.setPhase(PHASES.LISTENING, 90000);
    assert.equal(run(session, 90100, 90000 + WARN - 100).warning, false);
    assert.equal(run(session, 90000 + WARN, 90000 + WARN).warning, true);
    assert.equal(run(session, 90000 + WARN + 100, 90000 + LIMIT - 100).reason, undefined);
    assert.equal(run(session, 90000 + LIMIT, 90000 + LIMIT).reason, 'silence');
});

test('SPEAKING with an empty queue and no new audio for 8s is treated as a stalled stream', () => {
    const session = listening(0);
    session.setPhase(PHASES.SPEAKING, 1000);
    assert.equal(run(session, 1100, 8800).phase, PHASES.SPEAKING);
    assert.equal(run(session, 8900, 9100).phase, PHASES.LISTENING);
});

test('a frozen/throttled clock (mobile background) is not counted as user silence', () => {
    const session = listening(0);
    run(session, 100, 5000);
    const result = session.check(120000);
    assert.equal(result.phase, PHASES.LISTENING);
    assert.equal(result.warning, false);
    assert.equal(result.reason, undefined);
});

test('resetActivity restarts the inactivity countdown', () => {
    const session = listening(0);
    run(session, 100, 19000);
    session.resetActivity(19000);
    assert.equal(run(session, 19100, 19000 + WARN - 100).warning, false);
    assert.equal(run(session, 19000 + WARN, 19000 + WARN).warning, true);
    assert.equal(run(session, 19000 + WARN + 100, 19000 + LIMIT - 100).reason, undefined);
    assert.equal(run(session, 19000 + LIMIT, 19000 + LIMIT).reason, 'silence');
});

test('wall-clock limit ends at 10 minutes in every phase', () => {
    for (const phase of Object.values(PHASES)) {
        const session = new SessionSafety(0);
        session.setPhase(phase, 0);
        assert.equal(session.check(599999, 0.05, phase === PHASES.SPEAKING).reason, undefined);
        assert.equal(session.check(600000, 0.05, phase === PHASES.SPEAKING).reason, 'timeout');
    }
});

test('faint sound just above the noise gate resets the countdown to zero', () => {
    const session = listening(0);
    run(session, 100, WARN);
    assert.equal(session.check(WARN + 100, 0.009).warning, false);
    assert.equal(session.check(WARN + 200, 0.009).silent, 0);
});

test('a non-empty output queue can never yield a warning or silence end, even on a stale LISTENING phase', () => {
    const session = listening(0);
    session.lastCheckAt = 0;
    const result = session.check(LIMIT + 100, 0, true);
    assert.equal(result.warning, false);
    assert.equal(result.reason, undefined);
});
