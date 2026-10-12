import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { course, planLesson } from '../course.mjs';
import { audioKey, root } from './audio.mjs';

const run = promisify(execFile);
const modelName = process.env.ALIGN_MODEL || 'base.en';
assert.ok(['base.en', 'small.en'].includes(modelName), 'Unsupported alignment model');
const engine = `whisper.cpp ${modelName} token offsets`;
const executable = '/opt/homebrew/bin/whisper-cli';
const model = path.join(homedir(), `.cache/hyperframes/whisper/models/ggml-${modelName}.bin`);
const hash = value => createHash('sha256').update(value).digest('hex');
const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const normalize = text => {
    const word = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');
    return /^\d+$/.test(word) && numberWords[Number(word)] ? numberWords[Number(word)] : word;
};
const sourceWords = text => text.trim().split(/\s+/).filter(Boolean);

export function mergeTokens(input) {
    const tokens = Array.isArray(input) ? input : input?.transcription?.flatMap(segment => segment.tokens ?? []);
    assert.ok(Array.isArray(tokens), 'Missing full JSON token transcription');
    const words = [];
    for (const token of tokens) {
        assert.equal(typeof token.text, 'string', 'Invalid token text');
        if (token.id >= 50256 || /^\[(?:_.*_|BLANK_AUDIO|SILENCE)\]$/.test(token.text.trim())) continue;
        const text = token.text.replace(/[\u2018\u2019]/g, "'");
        if (!/[a-z0-9]/i.test(text)) {
            if (words.length && /\S/.test(text)) words.at(-1).text += text.trim();
            continue;
        }
        const start = token.offsets?.from / 1000;
        const end = token.offsets?.to / 1000;
        assert.ok(Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start, 'Invalid token offsets');
        const previous = words.at(-1);
        const contraction = previous && (/^'/.test(text.trim()) || /'$/.test(previous.text));
        if (!previous || (/^\s/.test(text) && !contraction)) {
            words.push({ text: text.trim(), start, end });
        } else {
            assert.ok(start >= previous.start && end >= previous.end, 'Nonmonotonic fragment offsets');
            previous.text += text.trim();
            previous.end = end;
        }
    }
    return words;
}

export function matchFocus(words, focus) {
    const normalized = words.map(word => normalize(word.text));
    return focus.flatMap(text => {
        const phrase = sourceWords(text).map(normalize);
        assert.ok(phrase.length && phrase.every(Boolean), `Invalid focus: ${text}`);
        const matches = [];
        for (let index = 0; index <= words.length - phrase.length; index++) {
            if (phrase.every((word, offset) => word === normalized[index + offset])) {
                matches.push({ text, actualStart: words[index].start, actualEnd: words[index + phrase.length - 1].end });
            }
        }
        assert.ok(matches.length, `Focus phrase not found: ${text}`);
        return matches;
    });
}

export function validateWords(words, source, clip, focus = []) {
    const expected = sourceWords(source);
    assert.ok(expected.length && expected.every(word => normalize(word)), 'Empty source words');
    assert.deepEqual(words.map(word => normalize(word.text)), expected.map(normalize), 'Transcript mismatch; review audio, do not guess timings');
    assert.ok(Number.isFinite(clip.actualStart) && Number.isFinite(clip.actualEnd) && Number.isFinite(clip.duration)
        && clip.actualStart >= 0 && clip.duration > 0 && Math.abs(clip.actualEnd - clip.actualStart - clip.duration) < 0.000001, 'Invalid measured speech window');
    let previousEnd = clip.actualStart;
    for (const word of words) {
        assert.ok(Number.isFinite(word.start) && Number.isFinite(word.end) && word.start >= clip.actualStart
            && word.end <= clip.actualEnd && word.end >= word.start && word.start >= previousEnd, 'Word outside speech window or overlapping/negative duration');
        previousEnd = word.end;
    }
    const aligned = words.map((word, index) => ({ text: expected[index], start: word.start, end: word.end }));
    return { words: aligned, focusTimes: matchFocus(aligned, focus) };
}

export function alignWords(raw, source, clip, focus = []) {
    const words = mergeTokens(raw).map(word => ({ ...word, start: clip.actualStart + word.start, end: clip.actualStart + word.end }));
    return validateWords(words, source, clip, focus);
}

export function verifySourceHash(timeline, lesson) {
    const plan = planLesson(lesson);
    assert.equal(timeline.scenes.length, plan.scenes.length, 'Timeline scene count differs from current plan');
    for (const [index, scene] of plan.scenes.entries()) {
        const measured = timeline.scenes[index];
        assert.equal(measured.id, scene.id, 'Timeline scene differs from current plan');
        if (scene.kind === 'example') {
            assert.equal(measured.en, scene.en, 'Timeline English differs from current plan');
            assert.deepEqual(measured.focus, scene.focus, 'Timeline focus differs from current plan');
        }
        assert.equal(measured.narration.length, scene.narration.length, 'Timeline narration count differs from current plan');
        scene.narration = scene.narration.map((clip, clipIndex) => {
            const audio = measured.narration[clipIndex];
            assert.equal(audio.id, clip.id, 'Timeline clip differs from current plan');
            assert.equal(audio.lang, clip.lang, 'Timeline language differs from current plan');
            assert.equal(audio.text, clip.text, 'Timeline text differs from current plan');
            assert.equal(audio.voice, clip.voice, 'Timeline voice differs from current plan');
            const rate = clip.lang === 'ko' ? 185 : 155;
            assert.equal(audio.rate, rate, 'Timeline speech rate differs from current plan');
            assert.equal(audio.cacheKey, audioKey(clip.text, clip.voice, rate), 'Timeline audio key differs from current plan');
            assert.ok(typeof audio.file === 'string' && Number.isFinite(audio.duration) && audio.duration > 0, 'Missing measured audio metadata');
            return { ...clip, rate, cacheKey: audio.cacheKey, file: audio.file, duration: audio.duration };
        });
    }
    const sourceHash = hash(JSON.stringify(plan));
    assert.equal(timeline.sourceHash, sourceHash, 'Stale sourceHash; regenerate audio for the current plan before alignment');
    return sourceHash;
}

export function cachePrefix(file, bytes) {
    return `${file.slice(0, -path.extname(file).length)}.whisper-${modelName}-${hash(bytes)}`;
}

async function atomicJSON(file, value) {
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temporary, file);
}

async function transcribe(file, bytes) {
    const prefix = cachePrefix(file, bytes);
    try {
        return JSON.parse(await readFile(`${prefix}.json`, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    await access(executable);
    await access(model);
    await run(executable, ['-m', model, '-f', file, '-l', 'en', '-dtw', modelName, '-ojf', '-of', prefix, '-np'], { maxBuffer: 8 * 1024 * 1024 });
    assert.equal(hash(await readFile(file)), hash(bytes), 'WAV changed during transcription; retry after audio generation finishes');
    return JSON.parse(await readFile(`${prefix}.json`, 'utf8'));
}

export async function alignLesson(lesson) {
    const id = String(lesson.episode).padStart(2, '0');
    const destination = path.join(root, 'timelines', `${id}.json`);
    const report = { episode: lesson.episode, engine, reviewed: false, passed: 0, issues: [], warnings: [] };
    let original;
    let timeline;
    try {
        original = await readFile(destination, 'utf8');
        timeline = JSON.parse(original);
        verifySourceHash(timeline, lesson);
    } catch (error) {
        report.issues.push({ scene: null, message: error.message });
        return report;
    }
    const examples = timeline.scenes.filter(scene => scene.kind === 'example');
    if (timeline.alignment?.reviewed === true || examples.some(scene => scene.alignment?.reviewed === true)) {
        const warning = 'Reviewed alignment preserved; explicit review reset is required before replacement';
        console.warn(`WARN ${id}: ${warning}`);
        report.warnings.push(warning);
        report.preservedReviewed = true;
        return report;
    }
    if (examples.length !== 10) report.issues.push({ scene: null, message: `Expected 10 examples, found ${examples.length}` });
    const clipHashes = {};
    const wavSnapshots = [];
    for (const scene of examples) {
        try {
            const english = scene.narration.filter(clip => clip.lang === 'en');
            assert.equal(english.length, 1, 'Expected one original English WAV');
            const clip = english[0];
            assert.equal(clip.text, scene.en, 'English clip differs from intended sentence');
            assert.ok(clip.actualStart >= scene.start && clip.actualEnd <= scene.end, 'Speech outside scene window');
            const file = path.resolve(root, clip.file);
            const relative = path.relative(root, file);
            assert.ok(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`), 'Audio file outside project');
            const bytes = await readFile(file);
            const audioHash = hash(bytes);
            wavSnapshots.push({ file, audioHash });
            let alignment;
            if (scene.words?.length && timeline.alignment?.sourceHash === timeline.sourceHash && timeline.alignment?.clipHashes?.[clip.id] === audioHash) {
                try { alignment = validateWords(scene.words, scene.en, clip, scene.focus); } catch { }
            }
            alignment ??= alignWords(await transcribe(file, bytes), scene.en, clip, scene.focus);
            scene.words = alignment.words;
            scene.sync.focusTimes = alignment.focusTimes;
            const pointWords = alignment.words.filter(word => word.start === word.end);
            if (pointWords.length) report.warnings.push(`${scene.id}: onset-only token(s) ${pointWords.map(word => word.text).join(', ')}; no duration invented`);
            clipHashes[clip.id] = audioHash;
            report.passed++;
        } catch (error) {
            delete scene.words;
            scene.sync.focusTimes = scene.focus.map(text => ({ text, actualStart: null, actualEnd: null }));
            report.issues.push({ scene: scene.id, number: scene.number, source: scene.en, message: error.message });
        }
    }
    timeline.alignment = {
        engine, reviewed: false, source: 'per-sentence original English WAV', sourceHash: timeline.sourceHash, clipHashes, issues: report.issues,
        note: 'ASR token offsets are approximate; listening review is required.'
    };
    timeline.timingStatus = report.passed === 10 && !report.issues.length ? 'audio-measured-words-aligned' : 'audio-measured-alignment-review';
    try {
        for (const { file, audioHash } of wavSnapshots) assert.equal(hash(await readFile(file)), audioHash, 'WAV changed while aligning; timeline not written');
        assert.equal(await readFile(destination, 'utf8'), original, 'Timeline changed while aligning; timeline not written');
        await atomicJSON(destination, timeline);
        report.timingStatus = timeline.timingStatus;
    } catch (error) {
        report.issues.push({ scene: null, message: error.message });
        report.notWritten = true;
    }
    return report;
}

export async function main(args = process.argv.slice(2)) {
    assert.ok(args.every(value => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 21), 'Lesson arguments must be 1-21');
    const requested = args.map(Number);
    const targets = requested.length ? course.lessons.filter(lesson => requested.includes(lesson.episode)) : course.lessons;
    const destination = path.join(root, 'alignment-report.json');
    let previous = { lessons: [] };
    try { previous = JSON.parse(await readFile(destination, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const lesson of targets) {
        console.log(`ALIGN ${String(lesson.episode).padStart(2, '0')}: original English WAVs`);
        const report = await alignLesson(lesson);
        previous.lessons = [...previous.lessons.filter(entry => entry.episode !== lesson.episode), report].sort((first, second) => first.episode - second.episode);
        await atomicJSON(destination, { ...previous, engine, reviewed: false });
        console.log(`${report.issues.length || report.warnings.length ? 'REVIEW' : 'PASS'} ${String(lesson.episode).padStart(2, '0')}: ${report.passed}/10 aligned, ${report.issues.length} issues, ${report.warnings.length} warnings`);
        if (report.issues.length) process.exitCode = 1;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}