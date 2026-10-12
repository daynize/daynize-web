import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { course } from '../course.mjs';
import { validateWords, verifySourceHash } from './align-audio.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const original = path.resolve(root, '../basic-course-01');
export const cliVersion = '0.8.149';
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const summaries = [
    '목적어 없이 완성, 추가 정보는 따로 연결',
    '대상을 연결할 때는 동사에 맞는 전치사',
    '목적어와 사람의 연결은 동사별로 확인',
    '목적격 보어는 목적어의 상태와 정체',
    '사역은 동사별로, 지각은 전체와 진행 구분',
    '명사는 단위로 세고 중심 명사에 수 일치',
    '현재와 연결은 현재완료, 끝난 시점은 과거형',
    '조동사 뒤 원형, 금지와 의무 없음은 구별',
    'to부정사는 행동을 하나의 내용으로',
    'to부정사는 명사 설명과 목적을 구별',
    '목적어의 행동은 to do, 부정은 not to',
    'doing과 to do는 동사와 의도로 선택',
    '직접 하는 명사와 작용을 받은 명사 구별',
    '감정의 원인과 느끼는 대상 구별',
    '수동태는 be + 과거분사, 전환은 동사별로',
    '수동태에도 보어 유지, 형태는 동사별로',
    '관계절의 빈자리 확인, 제한적 목적격만 생략',
    'whose 뒤 명사, what 앞 선행사 없음',
    '관계절의 빈자리에 맞는 연결 표현',
    '현재와 과거 가정, 결과와 가능성 구별',
    '강조 뒤 원형, 비교급과 강조어 중복 금지',
];

export function compactNote(note, focus = []) {
    const text = note.trim();
    if (text.length <= 90) return text;
    const sentence = text.match(/^.*?[.!?](?:\s|$)/u)?.[0].trim();
    if (sentence && sentence.length <= 90) return sentence;
    return `${focus.join(' / ')} → 문맥과 동사 결합을 확인`;
}

export function assertReady(timeline, lesson = course.lessons.find(entry => entry.episode === timeline.episode)) {
    assert.ok(lesson, 'Unknown lesson');
    verifySourceHash(timeline, lesson);
    assert.equal(timeline.id, `basic-${String(lesson.episode).padStart(2, '0')}`);
    assert.equal(timeline.timingStatus, 'audio-measured-words-aligned', 'Alignment must be ready');
    assert.equal(timeline.alignment?.sourceHash, timeline.sourceHash, 'Stale alignment');
    assert.deepEqual(timeline.alignment?.issues, [], 'Unresolved alignment issues');
    assert.ok(Number.isFinite(timeline.duration) && timeline.duration > 0);
    let previousEnd = 0;
    for (const scene of timeline.scenes) {
        assert.ok(scene.start >= previousEnd - 1e-6 && scene.end > scene.start && scene.end <= timeline.duration + 1e-6, 'Invalid scene window');
        for (const clip of scene.narration) {
            assert.ok(Number.isFinite(clip.actualStart) && Number.isFinite(clip.actualEnd)
                && clip.actualStart >= scene.start && clip.actualEnd > clip.actualStart && clip.actualEnd <= scene.end, 'Invalid speech window');
        }
        if (scene.kind === 'example') {
            const english = scene.narration.find(clip => clip.lang === 'en');
            const korean = scene.narration.find(clip => clip.lang === 'ko');
            assert.equal(english.text, scene.en, 'Only the correct English sentence may be spoken');
            assert.equal(scene.sync.wrongSpoken, false);
            assert.ok(english.actualStart >= korean.actualEnd + 0.1, 'Missing correction reveal gap');
            const aligned = validateWords(scene.words, scene.en, english, scene.focus);
            assert.deepEqual(scene.sync.focusTimes, aligned.focusTimes, 'Focus timings differ from aligned words');
        }
        previousEnd = scene.end;
    }
    assert.ok(Math.abs(previousEnd - timeline.duration) < 1e-6, 'Summary must reach the final frame');
}

export function prepareScenes(timeline) {
    return timeline.scenes.map(scene => {
        const korean = scene.narration.find(clip => clip.lang === 'ko');
        const english = scene.narration.find(clip => clip.lang === 'en');
        const words = (scene.words ?? []).map((word, index) => {
            const focused = (scene.sync?.focusTimes ?? []).some(focus => word.end > focus.actualStart && word.start < focus.actualEnd
                || word.start === word.end && word.start >= focus.actualStart && word.start < focus.actualEnd);
            return { ...word, index, focused, pulseAt: Math.max(word.start, (english?.actualStart ?? 0) + 0.1) };
        });
        return {
            ...scene, koAt: korean.actualStart, wrongAt: korean.actualEnd + 0.01,
            enAt: english?.actualStart, noteAt: english?.actualEnd, words,
            displayNote: scene.note ? compactNote(scene.note, scene.focus) : undefined
        };
    });
}

function diagram(scene, episode) {
    const labels = scene.screen.split(/\s*\/\s*/).map(part => part.trim());
    const mode = episode <= 2 ? (episode === 1 ? 'sleep' : 'sit')
        : [7, 20].includes(episode) ? 'time-axis'
            : [13, 14, 15, 16].includes(episode) ? 'relation'
                : [17, 18, 19].includes(episode) ? 'clause-merge' : 'syntax';
    const art = mode === 'sleep'
        ? '<path d="M65 120h225v60H65zM65 180v28m225-28v28"/><circle cx="105" cy="98" r="22"/><path d="M135 100h110l30 20M85 77l12-4m13 0l12 4"/>'
        : mode === 'sit'
            ? '<path d="M170 100v90h100m-100-40h100v60"/><circle cx="125" cy="55" r="22"/><path d="M125 80v60h100v60M125 110l45 20"/>'
            : mode === 'time-axis'
                ? '<path d="M55 125h240m-12-12l12 12-12 12"/><circle cx="90" cy="125" r="10"/><circle cx="255" cy="125" r="10"/>'
                : mode === 'clause-merge'
                    ? '<path d="M55 50h95v65h70m-165 85h95v-65h70m-10-10l10 10-10 10"/>'
                    : mode === 'relation'
                        ? '<circle cx="85" cy="125" r="35"/><path d="M130 125h90m-12-12l12 12-12 12"/><rect x="235" y="90" width="65" height="70" rx="4"/>'
                        : '<path d="M60 70h235M60 125h180M60 180h235"/><circle cx="80" cy="70" r="10"/><circle cx="175" cy="125" r="10"/><circle cx="275" cy="180" r="10"/>';
    const nodes = labels.map(label => `<div class="diagram-node">${escape(label)}</div>`).join('');
    return `<div class="diagram" data-diagram="${mode}"><svg viewBox="0 0 340 250" role="img" aria-label="${escape(scene.visual || scene.screen)}"><g fill="none" stroke="#252525" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${art}</g></svg><div class="diagram-nodes">${nodes}</div></div>`;
}

function sceneHTML(scene, episode) {
    const opening = `<section id="${scene.id}" class="clip" data-start="${scene.start}" data-duration="${scene.end - scene.start}" data-track-index="0"><div class="inner">`;
    const eyebrow = `<div class="eyebrow">${scene.kind === 'example' ? `${String(scene.number).padStart(2, '0')} / ${escape(scene.level)}` : scene.kind === 'summary' ? '오늘의 원리' : '동사 중심으로 보기'}</div>`;
    if (scene.kind === 'example') {
        const wordSize = scene.words.some(word => word.text.length >= 12) ? 58 : 60;
        return `${opening}${eyebrow}<div class="ko">${escape(scene.ko)}</div><div class="wrong"><div class="label">❌ ${scene.contrastType === 'intended-meaning-or-context' ? '의도와 다른 표현' : 'Incorrect · 고쳐 볼 표현'}</div><div>${escape(scene.wrong)}</div></div><div class="correct"><div class="label">⭕ Correct · 이렇게 말해요</div><div class="words" style="font-size:${wordSize}px">${scene.words.map(word => `<span class="word word-${word.index}${word.focused ? ' key' : ''}">${escape(word.text)}</span>`).join('')}</div></div><div class="note">${escape(scene.displayNote)}</div></div></section>`;
    }
    if (scene.kind === 'summary') {
        return `${opening}${eyebrow}<div class="summary-lines">${escape(summaries[episode - 1])}</div><div class="concept-copy">${escape(scene.text)}</div></div></section>`;
    }
    const size = scene.screen.length > 90 ? 44 : scene.screen.length > 65 ? 48 : scene.screen.length > 45 ? 52 : 58;
    const copySize = scene.text.length > 140 ? 34 : scene.text.length > 105 ? 36 : 38;
    return `${opening}${eyebrow}<div class="hero" style="font-size:${size}px">${scene.screen.split(/\s*\/\s*/).map(line => `<div>${escape(line)}</div>`).join('')}</div>${diagram(scene, episode)}<div class="concept-copy" style="font-size:${copySize}px">${escape(scene.text)}</div></div></section>`;
}

export function buildHTML(timeline, template, lesson) {
    assertReady(timeline, lesson);
    const scenes = prepareScenes(timeline);
    const motion = scenes.map(scene => ({
        id: scene.id, kind: scene.kind, start: scene.start, end: scene.end,
        koAt: scene.koAt, wrongAt: scene.wrongAt, enAt: scene.enAt, noteAt: scene.noteAt,
        pulses: scene.words.filter(word => word.focused).map(word => ({ index: word.index, at: word.pulseAt }))
    }));
    const values = {
        TITLE: escape(timeline.title), EPISODE: String(timeline.episode).padStart(2, '0'),
        ID: timeline.id, DURATION: timeline.duration, SCENES: scenes.map(scene => sceneHTML(scene, timeline.episode)).join('\n'), TIMELINE: json(motion)
    };
    return template.replace(/\{\{([A-Z]+)\}\}/g, (_, key) => {
        assert.ok(Object.hasOwn(values, key), `Unknown template key ${key}`);
        return values[key];
    });
}

export function motionAssertions(timeline) {
    return {
        duration: timeline.duration, assertions: [
            { kind: 'keepsMoving', withinSelector: '#root', maxStaticSec: Math.max(...timeline.scenes.map(scene => scene.end - scene.start)) + 0.5 },
            { kind: 'appearsBy', selector: '#summary .summary-lines', bySec: timeline.scenes.at(-1).narration[0].actualStart + 0.7 },
            { kind: 'staysInFrame', selector: '.progress-rail' },
        ]
    };
}

async function copyTree(source, destination) {
    await mkdir(destination, { recursive: true });
    for (const entry of await readdir(source, { withFileTypes: true })) {
        if (entry.isDirectory()) await copyTree(path.join(source, entry.name), path.join(destination, entry.name));
        else {
            assert.ok(entry.isFile(), 'Only local regular assets are supported');
            await copyFile(path.join(source, entry.name), path.join(destination, entry.name));
        }
    }
}

export async function main(args = process.argv.slice(2)) {
    assert.ok(!args.length || args.length === 1 && args[0] === 'all'
        || args.every(value => /^(?:[1-9]|1[0-9]|2[01])$/.test(value)), 'Use lesson numbers 1-21 or all');
    const lessons = !args.length || args[0] === 'all' ? course.lessons : course.lessons.filter(lesson => args.map(Number).includes(lesson.episode));
    const template = await readFile(path.join(root, 'templates/video.tpl'), 'utf8');
    const config = JSON.parse(await readFile(path.join(original, 'hyperframes.json'), 'utf8'));
    const inputs = await Promise.all(lessons.map(async lesson => {
        const timeline = JSON.parse(await readFile(path.join(root, 'timelines', `${String(lesson.episode).padStart(2, '0')}.json`), 'utf8'));
        return { timeline, html: buildHTML(timeline, template, lesson) };
    }));
    for (const { timeline, html } of inputs) {
        const destination = path.join(root, 'projects', timeline.id);
        await mkdir(path.join(destination, 'assets/audio'), { recursive: true });
        for (const directory of ['fonts', 'vendor']) await copyTree(path.join(original, 'assets', directory), path.join(destination, 'assets', directory));
        assert.equal(timeline.audioFile, `audio/${String(timeline.episode).padStart(2, '0')}/narration.wav`);
        await copyFile(path.join(root, timeline.audioFile), path.join(destination, 'assets/audio/narration.wav'));
        const packageJSON = {
            name: timeline.id, private: true, version: '1.0.0', devDependencies: { hyperframes: cliVersion },
            scripts: Object.fromEntries(['lint', 'check', 'render'].map(command => [command, `npx hyperframes@${cliVersion} ${command} .`]))
        };
        const files = {
            'index.html': html, 'package.json': packageJSON,
            'hyperframes.json': { ...config, registryItems: [] }, 'timeline.json': timeline,
            'meta.json': {
                id: timeline.id, episode: timeline.episode, title: timeline.title, duration: timeline.duration,
                ...course.format, cliVersion, sourceHash: timeline.sourceHash, timingStatus: timeline.timingStatus,
                alignmentReviewed: timeline.alignment.reviewed, audioFile: 'assets/audio/narration.wav'
            },
            'index.motion.json': motionAssertions(timeline)
        };
        for (const [name, value] of Object.entries(files)) await writeFile(path.join(destination, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
        console.log(`PASS ${timeline.id}: ${timeline.scenes.length} scenes / ${timeline.duration.toFixed(2)}s / projects/${timeline.id}`);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();