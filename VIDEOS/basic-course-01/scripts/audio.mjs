import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { lesson } from '../lesson.mjs';

const run = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const audioDir = path.join(root, 'assets/audio');
await mkdir(audioDir, { recursive: true });
assert.equal(lesson.examples.length, 10);
const synthesize = async (id, text, lang) => {
    const file = path.join(audioDir, `${id}.wav`);
    const voice = lesson.voices[lang];
    try { await access(file); } catch {
        await run('say', ['-v', voice, '-r', lang === 'ko' ? '185' : '155', '-o', file, '--data-format=LEI16@44100', text]);
    }
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    const duration = Number(stdout.trim());
    assert.ok(duration > 0 && Number.isFinite(duration));
    return { id, text, lang, voice, file: `assets/audio/${id}.wav`, duration };
};
const scenes = [];
for (const [index, intro] of lesson.intro.entries()) {
    const audio = await synthesize(`intro-${index + 1}`, intro.text, 'ko');
    scenes.push({ kind: 'intro', ...intro, clips: [audio], minimum: audio.duration + 0.6 });
}
for (const [index, example] of lesson.examples.entries()) {
    const ko = await synthesize(`example-${index + 1}-ko`, example.ko, 'ko');
    const en = await synthesize(`example-${index + 1}-en`, example.en, 'en');
    scenes.push({ kind: 'example', number: index + 1, ...example, clips: [ko, en], minimum: ko.duration + en.duration + 1.15 });
}
const summary = await synthesize('summary', lesson.summary, 'ko');
scenes.push({ kind: 'summary', clips: [summary], minimum: summary.duration + 0.8 });
const minimum = scenes.reduce((sum, scene) => sum + scene.minimum, 0);
assert.ok(minimum <= lesson.duration, `Natural speech requires ${minimum.toFixed(2)}s; revise pacing before continuing.`);
const slack = (lesson.duration - minimum) / scenes.length;
let cursor = 0;
for (const [index, scene] of scenes.entries()) {
    scene.id = `scene-${index + 1}`;
    scene.start = cursor;
    scene.duration = scene.minimum + slack;
    let audioCursor = cursor + 0.2;
    for (const clip of scene.clips) {
        clip.start = audioCursor;
        clip.end = audioCursor + clip.duration;
        audioCursor = clip.end + 0.35;
    }
    assert.ok(scene.clips.at(-1).end <= scene.start + scene.duration - 0.15);
    if (scene.kind === 'example') assert.ok(scene.clips[0].end < scene.clips[1].start);
    cursor += scene.duration;
}
assert.ok(Math.abs(cursor - 130) < 0.001);
const timeline = { id: lesson.id, fps: lesson.fps, duration: lesson.duration, voices: lesson.voices, scenes };
await writeFile(path.join(root, 'timeline.json'), JSON.stringify(timeline, null, 2));
const clips = scenes.flatMap(scene => scene.clips);
const mix = async (output, selected) => {
    const delays = selected.map((clip, index) => `[${index}:a]adelay=${Math.round(clip.start * 1000)}:all=1[a${index}]`);
    const filter = `${delays.join(';')};${selected.map((clip, index) => `[a${index}]`).join('')}amix=inputs=${selected.length}:normalize=0,apad=whole_dur=130,atrim=0:130[out]`;
    await run('ffmpeg', ['-y', ...selected.flatMap(clip => ['-i', path.join(root, clip.file)]), '-filter_complex', filter, '-map', '[out]', '-ar', '44100', '-ac', '1', path.join(audioDir, output)], { maxBuffer: 8 * 1024 * 1024 });
};
await mix('narration.wav', clips);
await mix('english.wav', clips.filter(clip => clip.lang === 'en'));
console.log(JSON.stringify({ result: 'PASS', examples: 10, naturalMinimum: minimum, duration: cursor, voices: lesson.voices }, null, 2));