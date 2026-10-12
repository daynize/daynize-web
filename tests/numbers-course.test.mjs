import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const dataSource = readFileSync(new URL('../src/data/numbersCourseData.js', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(dataSource, context);
const course = context.window.NUMBERS_COURSE_DATA;

test('NUMBERS contains eight lessons with ten Korean-first examples each', () => {
    assert.equal(course.categoryId, 'numbers');
    assert.equal(course.lessons.length, 8);
    assert.equal(course.lessons.map((lesson) => lesson.id).join(','), Array.from({ length: 8 }, (_, index) => `numbers-${String(index + 1).padStart(2, '0')}`).join(','));

    for (const lesson of course.lessons) {
        assert.ok(lesson.title);
        assert.ok(lesson.concept);
        assert.equal(lesson.examples.length, 10, `${lesson.id} must have ten examples`);
        for (const example of lesson.examples) {
            assert.ok(example.ko, `${lesson.id} example is missing Korean`);
            assert.ok(example.en, `${lesson.id} example is missing English`);
            assert.ok(example.explanation, `${lesson.id} example is missing an explanation`);
        }
    }
});

test('homepage connects the course outline, example controls, TTS, and Voice Studio', () => {
    assert.match(homepage, /src\/data\/numbersCourseData\.js/);
    assert.match(homepage, /window\.NUMBERS_COURSE_DATA\?\.lessons/);
    assert.match(homepage, /numbers-study-content/);
    assert.match(homepage, /dataset\.numbersSpeak/);
    assert.match(homepage, /dataset\.numbersReveal/);
    assert.match(homepage, /dataset\.numbersVoice/);
    assert.match(homepage, /setVoicePractice\(example, selectedLesson\)/);
    assert.match(homepage, /new SpeechSynthesisUtterance\(text\)/);
    assert.match(homepage, /new MediaRecorder\(mediaStream/);
});