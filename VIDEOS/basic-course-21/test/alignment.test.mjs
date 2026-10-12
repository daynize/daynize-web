import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { course, planLesson } from '../course.mjs';
import { audioKey, scheduleAudio } from '../scripts/audio.mjs';
import { alignWords, cachePrefix, matchFocus, mergeTokens, validateWords, verifySourceHash } from '../scripts/align-audio.mjs';

const token = (text, from, to) => ({ text, offsets: { from, to } });
const raw = tokens => ({ transcription: [{ tokens }] });
const clip = { actualStart: 12, actualEnd: 14, duration: 2 };

test('import exposes pure helpers without running CLI or main', () => {
    assert.equal(typeof alignWords, 'function');
    assert.equal(typeof mergeTokens, 'function');
});

test('leading spaces split words and subword fragments merge using actual offsets', () => {
    const words = mergeTokens(raw([
        { text: '[_BEG_]', id: 50364 }, token(' I', 0, 120), token(' walk', 150, 350),
        token('ed', 350, 500), token(' home', 550, 900), token('.', 0, 0),
    ]));
    assert.deepEqual(words, [
        { text: 'I', start: 0, end: 0.12 }, { text: 'walked', start: 0.15, end: 0.5 },
        { text: 'home.', start: 0.55, end: 0.9 },
    ]);
});

test('apostrophe and contraction fragments merge even with a leading space', () => {
    const words = mergeTokens([
        token(' I', 0, 100), token(' can', 150, 300), token("'", 300, 300),
        token(' t', 300, 400), token(' go', 450, 700), token('!', 0, 0),
    ]);
    assert.equal(words[1].text, "can't");
    const alignment = alignWords(raw([
        token(' I', 0, 100), token(' can', 150, 300), token(" 't", 300, 400), token(' go', 450, 700),
    ]), "I can't go.", clip, ["can't"]);
    assert.deepEqual(alignment.focusTimes, [{ text: "can't", actualStart: 12.15, actualEnd: 12.4 }]);
    assert.equal(alignment.words[2].text, 'go.');
});

test('multiword focus matches contiguous whole words with absolute times', () => {
    const alignment = alignWords(raw([
        token(' I', 0, 100), token(' would', 150, 300), token(' have', 350, 500),
        token(' adapted', 550, 800), token(' to', 850, 1000), token(' using', 1050, 1250), token(' it', 1300, 1500),
    ]), 'I would have adapted to using it.', clip, ['would have', 'to using']);
    assert.deepEqual(alignment.focusTimes, [
        { text: 'would have', actualStart: 12.15, actualEnd: 12.5 },
        { text: 'to using', actualStart: 12.85, actualEnd: 13.25 },
    ]);
});

test('focus never matches a substring or noncontiguous words; repeated spans are retained', () => {
    const words = [{ text: 'adapted', start: 1, end: 2 }, { text: 'a', start: 2, end: 3 }, { text: 'a.', start: 3, end: 4 }];
    assert.deepEqual(matchFocus(words, ['a']).map(span => span.actualStart), [2, 3]);
    assert.throws(() => matchFocus(words.slice(0, 1), ['a']), /Focus phrase not found/);
    assert.throws(() => matchFocus(words, ['adapted a a a']), /Focus phrase not found/);
});

test('ASR mismatches fail without coercion, guessing, or mutation', () => {
    const input = raw([token(' I', 0, 100), token(' slept', 150, 400)]);
    const snapshot = structuredClone(input);
    assert.throws(() => alignWords(input, 'I sleep.', clip), /Transcript mismatch/);
    assert.deepEqual(input, snapshot);
    assert.throws(() => alignWords(raw([token(' cant', 0, 300)]), "can't", clip), /Transcript mismatch/);
    assert.throws(() => alignWords(raw([token(' can', 0, 200), token(' not', 200, 400)]), 'cannot', clip), /Transcript mismatch/);
});

test('normalization accepts case, curly apostrophes, and terminal punctuation only', () => {
    const alignment = alignWords(raw([token(" Can't", 0, 500), token(' stop', 600, 1000)]), 'can\u2019t stop!', clip);
    assert.equal(alignment.words[0].text, 'can\u2019t');
});

test('number spelling and accent differences preserve spoken word identity', () => {
    const alignment = alignWords(raw([token(' 10', 0, 300), token(' caf\u00e9', 400, 900)]), 'ten cafe', clip, ['ten', 'cafe']);
    assert.deepEqual(alignment.words.map(word => word.text), ['ten', 'cafe']);
    assert.throws(() => alignWords(raw([token(' 11', 0, 300)]), 'ten', clip), /Transcript mismatch/);
});

test('word durations must stay strictly within the measured window and be ordered', () => {
    assert.throws(() => alignWords(raw([token(' go', 0, 2001)]), 'go', clip), /outside speech window/);
    assert.throws(() => alignWords(raw([token(' go', -1, 100)]), 'go', clip), /Invalid token offsets/);
    assert.equal(alignWords(raw([token(' go', 100, 100)]), 'go', clip).words[0].start, 12.1);
    assert.throws(() => alignWords(raw([token(' go', 0, 400), token(' home', 300, 500)]), 'go home', clip), /overlapping/);
    assert.throws(() => alignWords(raw([token(' go', 0, 100)]), 'go', { ...clip, actualEnd: 15 }), /Invalid measured speech window/);
    assert.equal(alignWords(raw([token(' go', 0, 2000)]), 'go', clip).words[0].end, clip.actualEnd);
});

test('existing word cache must exactly match the source and measured window', () => {
    const words = [{ text: 'Go.', start: 12.2, end: 12.7 }];
    assert.equal(validateWords(words, 'go!', clip).words[0].text, 'go!');
    assert.throws(() => validateWords(words, 'stay!', clip), /Transcript mismatch/);
    assert.throws(() => validateWords([{ ...words[0], end: 15 }], 'go', clip), /outside speech window/);
});

test('raw JSON cache prefix changes with WAV bytes at the same path', () => {
    const prefix = cachePrefix('/audio/original.wav', Buffer.from('first'));
    assert.equal(prefix, cachePrefix('/audio/original.wav', Buffer.from('first')));
    assert.notEqual(prefix, cachePrefix('/audio/original.wav', Buffer.from('changed')));
    assert.match(prefix, /original\.whisper-base\.en-[a-f0-9]{64}$/);
});

const measuredFixture = () => {
    const plan = planLesson(course.lessons[0]);
    for (const scene of plan.scenes) {
        scene.narration = scene.narration.map(voice => {
            const rate = voice.lang === 'ko' ? 185 : 155;
            return { ...voice, rate, cacheKey: audioKey(voice.text, voice.voice, rate), file: `audio/01/${voice.id}.wav`, duration: 1 };
        });
    }
    return { plan, timeline: scheduleAudio(plan) };
};

test('source hash reconstructs the enriched plan using the audio.mjs algorithm', () => {
    const { plan, timeline } = measuredFixture();
    const snapshot = structuredClone(timeline);
    assert.equal(verifySourceHash(timeline, course.lessons[0]), createHash('sha256').update(JSON.stringify(plan)).digest('hex'));
    assert.deepEqual(timeline, snapshot);
    timeline.sourceHash = 'stale';
    assert.throws(() => verifySourceHash(timeline, course.lessons[0]), /Stale sourceHash/);
});

test('changed lesson content or measured metadata invalidates source hash', () => {
    const { timeline } = measuredFixture();
    const lesson = structuredClone(course.lessons[0]);
    lesson.examples[0].en = 'I slept on the bed.';
    assert.throws(() => verifySourceHash(timeline, lesson), /differs from current plan/);
    timeline.scenes[0].narration[0].duration = 2;
    assert.throws(() => verifySourceHash(timeline, course.lessons[0]), /Stale sourceHash/);
});

test('timeline English and focus edits cannot bypass current plan validation', () => {
    const { timeline } = measuredFixture();
    const example = timeline.scenes.find(scene => scene.kind === 'example');
    const original = example.en;
    example.en = 'I slept.';
    assert.throws(() => verifySourceHash(timeline, course.lessons[0]), /Timeline English differs/);
    example.en = original;
    example.focus = ['a'];
    assert.throws(() => verifySourceHash(timeline, course.lessons[0]), /Timeline focus differs/);
});