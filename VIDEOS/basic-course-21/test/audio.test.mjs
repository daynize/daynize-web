import test from 'node:test';
import assert from 'node:assert/strict';
import { course, planLesson } from '../course.mjs';
import { audioKey, scheduleAudio } from '../scripts/audio.mjs';

const fixture = duration => {
    const plan = planLesson(course.lessons[0]);
    for (const scene of plan.scenes) for (const clip of scene.narration) clip.duration = duration;
    return plan;
};
test('content cache changes with text, voice, or speed', () => {
    const original = audioKey('I sleep.', 'Samantha', 155);
    assert.equal(original, audioKey('I sleep.', 'Samantha', 155));
    assert.notEqual(original, audioKey('I slept.', 'Samantha', 155));
    assert.notEqual(original, audioKey('I sleep.', 'Jian (Premium)', 155));
    assert.notEqual(original, audioKey('I sleep.', 'Samantha', 160));
});
test('measured schedule preserves Korean first and gives every clip room', () => {
    const original = fixture(3);
    const timeline = scheduleAudio(original);
    assert.equal(timeline.duration, 130);
    let cursor = 0;
    for (const scene of timeline.scenes) {
        assert.ok(Math.abs(scene.start - cursor) < 0.00001);
        for (const clip of scene.narration) {
            assert.ok(clip.actualStart >= scene.start);
            assert.ok(clip.actualEnd < scene.end);
        }
        if (scene.kind === 'example') assert.ok(scene.narration[1].actualStart - scene.narration[0].actualEnd >= 0.3);
        cursor = scene.end;
    }
    assert.equal(cursor, 130);
    assert.equal(original.scenes[0].narration[0].actualStart, null);
});
test('overlong natural speech stops rather than trimming or speeding audio', () => {
    assert.throws(() => scheduleAudio(fixture(6)), /revise script/);
});