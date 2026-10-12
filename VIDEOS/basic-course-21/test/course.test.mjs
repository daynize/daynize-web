import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { course, planLesson, voiceFor } from '../course.mjs';

test('21 ordered lessons and 210 graded contrast examples', () => {
    assert.equal(course.lessons.length, 21);
    assert.deepEqual(course.lessons.map(lesson => lesson.episode), Array.from({ length: 21 }, (_, index) => index + 1));
    assert.equal(course.lessons.flatMap(lesson => lesson.examples).length, 210);
    for (const lesson of course.lessons) {
        assert.equal(lesson.concept.length, 4);
        assert.equal(lesson.examples.length, 10);
        assert.ok(lesson.accuracyNotes.length);
        for (const example of lesson.examples) {
            for (const field of ['ko', 'en', 'wrong', 'note', 'visual']) assert.ok(example[field]?.trim());
            assert.notEqual(example.en, example.wrong);
            assert.equal(example.focus.length, 2);
            for (const text of example.focus) assert.ok(example.en.toLowerCase().includes(text.toLowerCase()), `${lesson.episode}: ${text}`);
        }
    }
});
test('planned timing is contiguous and not misrepresented as real audio', () => {
    for (const lesson of course.lessons) {
        const plan = planLesson(lesson);
        assert.equal(plan.scenes.length, 15);
        assert.equal(plan.timingStatus, 'planned-not-synthesized');
        let cursor = 0;
        for (const scene of plan.scenes) {
            assert.equal(scene.start, cursor);
            assert.ok(scene.end > scene.start);
            cursor = scene.end;
            for (const narration of scene.narration) {
                assert.equal(narration.actualStart, null);
                assert.equal(narration.actualEnd, null);
            }
        }
        assert.equal(cursor, 130);
        assert.equal(plan.scenes.flatMap(scene => scene.narration).length, 25);
        assert.equal(plan.voices.ko, voiceFor(lesson.episode));
        assert.equal(plan.voices.en, 'Samantha');
        const examples = plan.scenes.filter(scene => scene.kind === 'example');
        assert.deepEqual(examples.map(scene => scene.level), ['기본', '기본', '기본', '중급', '중급', '중급', '중급', '고급', '고급', '고급']);
        for (const scene of examples) {
            assert.deepEqual(scene.narration.map(clip => clip.lang), ['ko', 'en']);
            assert.equal(scene.sync.wrongSpoken, false);
            assert.equal(scene.sync.englishReveal, 'english-audio-start');
        }
    }
});
test('generated documents and plans match authoritative content', async () => {
    const catalog = JSON.parse(await readFile(new URL('../catalog.json', import.meta.url), 'utf8'));
    assert.equal(catalog.lessons.length, 21);
    for (const lesson of course.lessons) {
        const id = String(lesson.episode).padStart(2, '0');
        const document = await readFile(new URL(`../lessons/${id}.md`, import.meta.url), 'utf8');
        const plan = JSON.parse(await readFile(new URL(`../plans/${id}.json`, import.meta.url), 'utf8'));
        assert.deepEqual(plan, planLesson(lesson));
        for (const example of lesson.examples) assert.ok(document.includes(example.en));
        assert.ok(document.includes('TTS 미생성'));
        assert.ok(document.includes('#FF6648'));
        assert.ok(document.includes('1.00→1.10'));
    }
});
test('linguistic regression: grammatical alternatives are not false errors', () => {
    assert.equal(course.lessons[3].examples[8].wrong, 'I consider that experience a valuably lesson.');
    assert.ok(course.lessons[4].examples[3].note.includes('명사'));
    assert.equal(course.lessons[14].examples[5].wrong, 'We were show the exit by the guide.');
    assert.ok(course.lessons[0].accuracyNotes.some(note => note.includes('타동사 용법')));
});