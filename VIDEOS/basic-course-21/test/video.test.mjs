import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { course } from '../course.mjs';
import { assertReady, buildHTML, cliVersion, compactNote, motionAssertions, prepareScenes } from '../scripts/build-video.mjs';

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('templates/video.tpl', root), 'utf8');
const timeline = JSON.parse(await readFile(new URL('timelines/01.json', root), 'utf8'));

test('pure HTML builder preserves the timeline and ships 15 scenes and local assets', () => {
    const before = JSON.stringify(timeline);
    const html = buildHTML(timeline, template);
    assert.equal(JSON.stringify(timeline), before);
    assert.equal((html.match(/class="clip"/g) ?? []).length, 15);
    assert.match(html, /data-width="1080" data-height="1920"/);
    assert.match(html, /<audio id="narration" src="assets\/audio\/narration.wav"/);
    for (const asset of ['assets/fonts/NotoSansKR.ttf', 'assets/fonts/Manrope.ttf', 'assets/vendor/gsap.min.js']) assert.ok(html.includes(asset));
    assert.equal((html.match(/gsap.timeline\(/g) ?? []).length, 1);
    assert.ok(html.includes(`window.__timelines['${timeline.id}'] = timeline`));
    assert.equal(cliVersion, '0.8.149');
    assert.ok(!html.includes('{{'));
});

test('caption reveals and pulses use actual speech times with a visible parent', () => {
    const scenes = prepareScenes(timeline);
    for (const scene of scenes.filter(entry => entry.kind === 'example')) {
        const korean = scene.narration.find(clip => clip.lang === 'ko');
        const english = scene.narration.find(clip => clip.lang === 'en');
        assert.equal(scene.koAt, korean.actualStart);
        assert.equal(scene.enAt, english.actualStart);
        assert.ok(scene.wrongAt > korean.actualEnd && scene.wrongAt < english.actualStart);
        assert.equal(english.text, scene.en);
        assert.ok(!scene.narration.some(clip => clip.text === scene.wrong));
        for (const word of scene.words.filter(entry => entry.focused)) assert.equal(word.pulseAt, Math.max(word.start, english.actualStart + 0.1));
    }
    assert.match(template, /\.ko, \.wrong, \.correct, \.note, \.summary-lines \{ opacity: 0; \}/);
    assert.ok(template.includes('immediateRender: false'));
    assert.ok(template.includes("scene.kind !== 'summary'"));
});

test('focus uses overlapping aligned words, never substring matches', () => {
    const synthetic = {
        scenes: [{
            narration: [{ lang: 'ko', actualStart: 0, actualEnd: 1 }, { lang: 'en', actualStart: 2, actualEnd: 4 }],
            words: [{ text: 'on', start: 2, end: 2.2 }, { text: 'only', start: 2.3, end: 2.6 }, { text: 'on', start: 3, end: 3.2 }],
            sync: { focusTimes: [{ text: 'on', actualStart: 3, actualEnd: 3.2 }] }
        }]
    };
    assert.deepEqual(prepareScenes(synthetic)[0].words.map(word => word.focused), [false, false, true]);
});

test('source hash and readiness reject stale or unresolved alignment', () => {
    const stale = structuredClone(timeline);
    stale.sourceHash = 'stale';
    assert.throws(() => assertReady(stale), /sourceHash/);
    const pending = structuredClone(timeline);
    pending.timingStatus = 'audio-measured-alignment-review';
    assert.throws(() => assertReady(pending), /Alignment must be ready/);
    const wrongFocus = structuredClone(timeline);
    wrongFocus.scenes[4].sync.focusTimes[0].actualStart += 0.01;
    assert.throws(() => assertReady(wrongFocus), /Focus timings/);
});

test('registered timeline reveals captions on speech, pulses aligned words, and holds summary', () => {
    const html = buildHTML(timeline, template);
    const calls = [];
    const recorder = {
        fromTo(selector, from, to, at) { calls.push({ selector, from, to, at }); return this; },
        to(selector, to, at) { calls.push({ selector, to, at }); return this; },
    };
    const window = {};
    vm.runInNewContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1], {
        window, gsap: { timeline(options) { assert.equal(options.paused, true); return recorder; } },
    });
    assert.equal(window.__timelines[timeline.id], recorder);
    for (const scene of prepareScenes(timeline).filter(entry => entry.kind === 'example')) {
        for (const [element, expected] of [['ko', scene.koAt], ['wrong', scene.wrongAt], ['correct', scene.enAt], ['note', scene.noteAt]]) {
            const reveal = calls.find(call => call.selector === `#${scene.id} .${element}`);
            assert.equal(reveal.at, expected);
            assert.equal(reveal.from.opacity, 0);
            assert.equal(reveal.to.immediateRender, false);
        }
        for (const word of scene.words.filter(entry => entry.focused)) {
            const pulse = calls.find(call => call.selector === `#${scene.id} .word-${word.index}` && call.to.scale === 1.10);
            assert.equal(pulse.at, word.pulseAt);
        }
    }
    assert.ok(!calls.some(call => call.selector === '#summary .inner'));
    assert.equal(calls.find(call => call.selector === '.progress').to.duration, timeline.duration);
    assert.ok(html.includes('❌ I sleep the bed.'));
});

test('long notes stay compact without changing original educational notes', () => {
    const note = '목적어는 동사에 맞게 연결하세요. ' + '원문 설명은 타임라인에 보존합니다. '.repeat(10);
    assert.equal(compactNote(note), '목적어는 동사에 맞게 연결하세요.');
    assert.ok(compactNote('긴 설명'.repeat(60), ['listen', 'to']).length <= 90);
    assert.match(template, /\.note \{[^}]*font-size: 30px;/);
    assert.deepEqual(motionAssertions(timeline).assertions[0], { kind: 'keepsMoving', withinSelector: '#root', maxStaticSec: Math.max(...timeline.scenes.map(scene => scene.end - scene.start)) + 0.5 });
});

test('all 21 ready lessons compile deterministic JS with meaningful diagrams', async () => {
    for (const lesson of course.lessons) {
        const measured = JSON.parse(await readFile(new URL(`timelines/${String(lesson.episode).padStart(2, '0')}.json`, root), 'utf8'));
        const html = buildHTML(measured, template, lesson);
        const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
        new vm.Script(script);
        assert.equal((html.match(/<svg /g) ?? []).length, 4);
        assert.equal((html.match(/class="clip"/g) ?? []).length, 15);
        assert.ok(!/Date\.now|performance\.now|Math\.random|setInterval|requestAnimationFrame|\.play\(/.test(script));
        for (const scene of prepareScenes(measured).filter(entry => entry.kind === 'example')) assert.ok(scene.displayNote.length <= 90);
    }
});