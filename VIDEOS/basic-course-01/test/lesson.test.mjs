import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lesson } from '../lesson.mjs';

const timeline = JSON.parse(await readFile(new URL('../timeline.json', import.meta.url), 'utf8'));
test('exactly ten examples, specified voices, and 130 seconds', () => {
    assert.equal(lesson.examples.length, 10);
    assert.equal(timeline.duration, 130);
    assert.equal(timeline.fps, 30);
    assert.deepEqual(timeline.voices, { ko: 'Jian (Premium)', en: 'Samantha' });
});
test('all scenes and audio windows are contiguous and contained', () => {
    let cursor = 0;
    for (const scene of timeline.scenes) {
        assert.ok(Math.abs(scene.start - cursor) < 0.00001);
        for (const clip of scene.clips) {
            assert.ok(clip.start >= scene.start && clip.end <= scene.start + scene.duration);
        }
        cursor += scene.duration;
    }
    assert.ok(Math.abs(cursor - 130) < 0.00001);
});
test('Korean precedes English and all emphasis words have aligned timestamps', () => {
    for (const scene of timeline.scenes.filter(scene => scene.kind === 'example')) {
        const [ko, en] = scene.clips;
        assert.equal(ko.lang, 'ko');
        assert.equal(en.lang, 'en');
        assert.ok(ko.end < en.start);
        assert.equal(scene.words.length, scene.en.split(/\s+/).length);
        assert.equal(scene.words.filter(word => word.emphasis).length, 2);
        for (const word of scene.words) assert.ok(word.start >= en.start && word.end <= en.end + 0.05);
    }
});