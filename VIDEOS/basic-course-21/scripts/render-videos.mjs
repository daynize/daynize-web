import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { course } from '../course.mjs';
import { root } from './audio.mjs';

const run = promisify(execFile);
const args = process.argv.slice(2);
assert.ok(args.every(value => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 21));
const lessons = args.length ? course.lessons.filter(lesson => args.map(Number).includes(lesson.episode)) : course.lessons;
const outputs = path.join(root, 'renders');
const reports = path.join(root, 'video-reports');
await mkdir(outputs, { recursive: true });
await mkdir(reports, { recursive: true });
const atomic = async (file, value) => {
    await writeFile(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
    await rename(`${file}.tmp`, file);
};
const probe = async file => {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,duration', '-of', 'json', file]);
    const metadata = JSON.parse(stdout);
    const video = metadata.streams.find(stream => stream.codec_type === 'video');
    assert.ok(metadata.streams.some(stream => stream.codec_type === 'audio'), 'Missing audio');
    assert.equal(video.width, 1080);
    assert.equal(video.height, 1920);
    assert.equal(video.r_frame_rate, '30/1');
    assert.equal(Number(video.nb_frames), 3900);
    assert.ok(Math.abs(Number(metadata.format.duration) - 130) < 0.05);
    assert.ok(Number(metadata.format.size) > 0);
    return metadata;
};
for (const lesson of lessons) {
    const id = String(lesson.episode).padStart(2, '0');
    const project = path.join(root, 'projects', `basic-${id}`);
    const timeline = JSON.parse(await readFile(path.join(project, 'timeline.json'), 'utf8'));
    const samples = timeline.scenes.flatMap(scene => scene.kind === 'example'
        ? [scene.narration[0].actualStart + 0.5, scene.narration[1].actualStart + 0.5, scene.narration[1].actualEnd + 0.4]
        : [(scene.start + scene.end) / 2]);
    const index = await readFile(path.join(project, 'index.html'));
    const inputHash = createHash('sha256').update(index).update(await readFile(path.join(project, 'assets/audio/narration.wav'))).digest('hex');
    const output = path.join(outputs, `basic-${id}.mp4`);
    const receiptFile = path.join(reports, `${id}-render.json`);
    let receipt;
    try { receipt = JSON.parse(await readFile(receiptFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (receipt?.inputHash === inputHash) {
        try { await probe(output); console.log(`SKIP ${id}: previously verified matching render`); continue; } catch { }
    }
    console.log(`CHECK ${id}: ${samples.length} speech-aware samples`);
    const { stdout } = await run('npx', ['--yes', 'hyperframes@0.8.149', 'check', '--at', samples.map(time => time.toFixed(3)).join(','), '--timeout', '15000', '--json'], { cwd: project, maxBuffer: 16 * 1024 * 1024 });
    const check = JSON.parse(stdout);
    await atomic(path.join(reports, `${id}-check.json`), check);
    assert.ok(check.ok && !check.browserSkipped, `Lesson ${id} failed browser check; see video-reports/${id}-check.json`);
    try { await access(output); assert.ok(receipt, `Existing output ${id} has no matching receipt; preserve and inspect`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    console.log(`RENDER ${id}: 130 seconds, delivery quality`);
    const rendered = await run('npx', ['--yes', 'hyperframes@0.8.149', 'render', '--quality', 'delivery', '--fps', '30', '--workers', '4', '--strict', '--output', output], { cwd: project, maxBuffer: 32 * 1024 * 1024 });
    await writeFile(path.join(reports, `${id}-render.log`), rendered.stdout + rendered.stderr);
    const metadata = await probe(output);
    const decoded = await run('ffmpeg', ['-hide_banner', '-nostdin', '-i', output, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { maxBuffer: 8 * 1024 * 1024 });
    const peak = Number(decoded.stderr.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1]);
    assert.ok(Number.isFinite(peak), 'No decoded audio signal');
    const contact = path.join(outputs, `basic-${id}-contact.png`);
    const selected = [150, Math.round(timeline.scenes[3].start * 30 + 90), ...[0, 3, 7, 9].map(index => Math.round(timeline.scenes.filter(scene => scene.kind === 'example')[index].narration[1].actualStart * 30 + 20)), 3780, 3898];
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', output, '-vf', `select=${selected.map(frame => `eq(n\\,${frame})`).join('+')},scale=270:480,tile=4x2`, '-frames:v', '1', contact], { maxBuffer: 8 * 1024 * 1024 });
    await atomic(receiptFile, { episode: lesson.episode, title: lesson.title, inputHash, output: `renders/basic-${id}.mp4`, contact: `renders/basic-${id}-contact.png`, metadata, audioPeakDb: peak, browserCheck: true, listeningReviewed: false });
    console.log(`PASS ${id}: ${(Number(metadata.format.size) / 1024 / 1024).toFixed(1)}MB, 3900 frames, audio ${peak}dB`);
}
console.log('Requested render batch completed and probed.');