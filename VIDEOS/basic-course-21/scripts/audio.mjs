import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { course, planLesson } from '../course.mjs';

const run = promisify(execFile);
export const root = fileURLToPath(new URL('..', import.meta.url));
export const audioKey = (text, voice, rate) => createHash('sha256').update(JSON.stringify({ text, voice, rate, format: 'LEI16@44100', version: 1 })).digest('hex');

export function scheduleAudio(plan) {
    const scenes = structuredClone(plan.scenes);
    const minima = scenes.map(scene => 0.2 + scene.narration.reduce((sum, clip) => sum + clip.duration, 0) + (scene.narration.length - 1) * 0.35 + (scene.kind === 'example' ? 0.85 : 0.6));
    const minimum = minima.reduce((sum, value) => sum + value, 0);
    assert.ok(minimum <= course.duration.maximum, `${plan.id}: natural speech needs ${minimum.toFixed(2)}s; revise script before continuing`);
    const duration = Math.ceil(Math.max(course.duration.target, minimum) * course.format.fps) / course.format.fps;
    const slack = (duration - minimum) / scenes.length;
    let cursor = 0;
    for (const [index, scene] of scenes.entries()) {
        scene.plannedStart = scene.start;
        scene.plannedEnd = scene.end;
        scene.start = cursor;
        scene.end = cursor + minima[index] + slack;
        let clipCursor = cursor + 0.2;
        for (const clip of scene.narration) {
            assert.ok(Number.isFinite(clip.duration) && clip.duration > 0);
            clip.actualStart = clipCursor;
            clip.actualEnd = clipCursor + clip.duration;
            clipCursor = clip.actualEnd + 0.35;
        }
        assert.ok(scene.narration.at(-1).actualEnd < scene.end);
        cursor = scene.end;
    }
    scenes.at(-1).end = duration;
    return { ...plan, timingStatus: 'audio-measured-words-pending', duration, naturalMinimum: minimum, sourceHash: createHash('sha256').update(JSON.stringify(plan)).digest('hex'), scenes };
}

async function synthesize(clip, directory) {
    const rate = clip.lang === 'ko' ? 185 : 155;
    const key = audioKey(clip.text, clip.voice, rate);
    const file = path.join(directory, `${clip.id}-${key.slice(0, 16)}.wav`);
    try { await access(file); } catch {
        const temporary = `${file}.tmp.wav`;
        await run('say', ['-v', clip.voice, '-r', String(rate), '-o', temporary, '--data-format=LEI16@44100', clip.text]);
        await rename(temporary, file);
    }
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    const duration = Number(stdout.trim());
    assert.ok(Number.isFinite(duration) && duration > 0, file);
    return { ...clip, rate, cacheKey: key, file: path.relative(root, file), duration };
}

export async function generateAudio(lesson) {
    const id = String(lesson.episode).padStart(2, '0');
    const directory = path.join(root, 'audio', id);
    await mkdir(directory, { recursive: true });
    const plan = planLesson(lesson);
    for (const scene of plan.scenes) {
        const clips = [];
        for (const clip of scene.narration) clips.push(await synthesize(clip, directory));
        scene.narration = clips;
    }
    const timeline = scheduleAudio(plan);
    timeline.audioFile = `audio/${id}/narration.wav`;
    const clips = timeline.scenes.flatMap(scene => scene.narration);
    const filters = clips.map((clip, index) => `[${index}:a]adelay=${Math.round(clip.actualStart * 1000)}:all=1[a${index}]`);
    filters.push(`${clips.map((clip, index) => `[a${index}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad=whole_dur=${timeline.duration},atrim=0:${timeline.duration}[out]`);
    const temporary = path.join(directory, 'narration.tmp.wav');
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...clips.flatMap(clip => ['-i', path.join(root, clip.file)]), '-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '44100', '-ac', '1', temporary], { maxBuffer: 8 * 1024 * 1024 });
    await rename(temporary, path.join(root, timeline.audioFile));
    await mkdir(path.join(root, 'timelines'), { recursive: true });
    const destination = path.join(root, 'timelines', `${id}.json`);
    await writeFile(`${destination}.tmp`, `${JSON.stringify(timeline, null, 2)}\n`);
    await rename(`${destination}.tmp`, destination);
    console.log(`PASS ${id}: 25 clips / ${timeline.duration.toFixed(2)}s / natural minimum ${timeline.naturalMinimum.toFixed(2)}s / ${timeline.voices.ko} + Samantha`);
    return timeline;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const requested = process.argv.slice(2).map(Number);
    assert.ok(requested.every(value => Number.isInteger(value) && value >= 1 && value <= 21), 'Lesson arguments must be 1–21');
    const { stdout } = await run('say', ['-v', '?']);
    for (const voice of Object.values(course.voices)) assert.ok(stdout.includes(voice), `Required voice unavailable: ${voice}`);
    const targets = requested.length ? course.lessons.filter(lesson => requested.includes(lesson.episode)) : course.lessons;
    for (const lesson of targets) await generateAudio(lesson);
}