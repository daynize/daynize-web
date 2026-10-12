import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const run = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const timeline = JSON.parse(await readFile(path.join(root, 'timeline.json'), 'utf8'));
const model = process.env.WHISPER_MODEL || path.join(homedir(), '.cache/hyperframes/whisper/models/ggml-base.en.bin');
const normalize = text => text.toLowerCase().replace(/[^a-z]/g, '');
for (const scene of timeline.scenes.filter(scene => scene.kind === 'example')) {
    const clip = scene.clips[1];
    const prefix = path.join(root, `assets/audio/example-${scene.number}-aligned`);
    try { await access(`${prefix}.json`); } catch {
        await run('whisper-cli', ['-m', model, '-f', path.join(root, clip.file), '-l', 'en', '-dtw', 'base.en', '-ojf', '-of', prefix, '-np'], { maxBuffer: 8 * 1024 * 1024 });
    }
    const result = JSON.parse(await readFile(`${prefix}.json`, 'utf8'));
    const tokens = result.transcription.flatMap(segment => segment.tokens).filter(token => !token.text.startsWith('[') && normalize(token.text));
    const words = [];
    for (const token of tokens) {
        if (/^\s/.test(token.text) || !words.length) {
            words.push({ text: token.text.trim(), start: token.offsets.from / 1000, end: token.offsets.to / 1000 });
        } else {
            words.at(-1).text += token.text;
            words.at(-1).end = token.offsets.to / 1000;
        }
    }
    const expected = scene.en.split(/\s+/);
    assert.deepEqual(words.map(word => normalize(word.text)), expected.map(normalize), `Transcript mismatch in example ${scene.number}; review audio, do not guess timings.`);
    scene.words = words.map((word, index) => {
        assert.ok(word.start >= 0 && word.end <= clip.duration + 0.05 && word.start <= word.end);
        return { text: expected[index], start: clip.start + word.start, end: clip.start + word.end, emphasis: scene.emphasis.includes(normalize(expected[index])) };
    });
    for (const key of scene.emphasis) assert.ok(scene.words.some(word => normalize(word.text) === key));
    console.log(`PASS example ${scene.number}: ${words.length} words inside original speech window`);
}
timeline.alignment = { engine: 'whisper.cpp base.en token offsets', source: 'per-sentence original audio', reviewed: false, note: 'ASR timing is approximate; frame-accurate perceptual synchronization requires listening review.' };
await writeFile(path.join(root, 'timeline.json'), JSON.stringify(timeline, null, 2));