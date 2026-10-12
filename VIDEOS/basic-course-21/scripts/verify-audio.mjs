import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { course } from '../course.mjs';
import { root } from './audio.mjs';
import { validateWords, verifySourceHash } from './align-audio.mjs';

const run = promisify(execFile);
const records = [];
const directory = path.join(root, 'audio-timelines');
await mkdir(directory, { recursive: true });
const stamp = seconds => {
    const milliseconds = Math.round(seconds * 1000);
    return `${String(Math.floor(milliseconds / 3600000)).padStart(2, '0')}:${String(Math.floor(milliseconds / 60000) % 60).padStart(2, '0')}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}.${String(milliseconds % 1000).padStart(3, '0')}`;
};
for (const lesson of course.lessons) {
    const id = String(lesson.episode).padStart(2, '0');
    const timeline = JSON.parse(await readFile(path.join(root, 'timelines', `${id}.json`), 'utf8'));
    verifySourceHash(timeline, lesson);
    assert.equal(timeline.timingStatus, 'audio-measured-words-aligned');
    assert.equal(timeline.scenes.flatMap(scene => scene.narration).length, 25);
    assert.ok(timeline.duration >= 100 && timeline.duration <= 135);
    let cursor = 0;
    let previousEnd = 0;
    let words = 0;
    let pointTokens = 0;
    for (const scene of timeline.scenes) {
        assert.ok(Math.abs(scene.start - cursor) < 0.00001);
        for (const clip of scene.narration) {
            assert.ok(clip.actualStart >= previousEnd && clip.actualStart >= scene.start && clip.actualEnd <= scene.end);
            assert.equal(clip.voice, clip.lang === 'en' ? 'Samantha' : timeline.voices.ko);
            await readFile(path.join(root, clip.file));
            previousEnd = clip.actualEnd;
        }
        if (scene.kind === 'example') {
            const [ko, en] = scene.narration;
            assert.ok(en.actualStart - ko.actualEnd >= 0.3);
            const aligned = validateWords(scene.words, scene.en, en, scene.focus);
            assert.deepEqual(scene.sync.focusTimes, aligned.focusTimes);
            for (const span of aligned.focusTimes) assert.ok(span.actualEnd > span.actualStart, 'Emphasis needs a nonzero observed speech span');
            words += scene.words.length;
            pointTokens += scene.words.filter(word => word.start === word.end).length;
        }
        cursor = scene.end;
    }
    assert.equal(cursor, timeline.duration);
    const file = path.join(root, timeline.audioFile);
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', file]);
    const probe = JSON.parse(stdout).format;
    assert.ok(Math.abs(Number(probe.duration) - timeline.duration) < 0.002);
    assert.ok(Number(probe.size) > 0);
    const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { maxBuffer: 8 * 1024 * 1024 });
    const peak = Number(stderr.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1]);
    const mean = Number(stderr.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
    assert.ok(Number.isFinite(peak) && peak < 0 && Number.isFinite(mean) && mean > -50, 'Silent or clipped mix');
    const clips = timeline.scenes.flatMap(scene => scene.narration);
    const vtt = ['WEBVTT', '', ...clips.flatMap(clip => [clip.id, `${stamp(clip.actualStart)} --> ${stamp(clip.actualEnd)}`, clip.text, ''])].join('\n');
    await writeFile(path.join(directory, `${id}.vtt`), vtt);
    await writeFile(path.join(directory, `${id}.md`), [
        `# ${id}강 실제 오디오 타임코드 · ${lesson.title}`, '',
        `실제 ${timeline.duration.toFixed(3)}초 / ${timeline.voices.ko} + Samantha / 25개 발화 / 영어 ${words}단어 정렬`, '',
        '문장 시작·종료는 실제 WAV 길이 기반이며 단어 시각은 자동 정렬 근사값이다. 청취 검수가 끝난 완벽한 동기화라고 주장하지 않는다.', '',
        `길이 미확정 시점 토큰: ${pointTokens}개. 강조 구문은 모두 양의 관측 구간을 가진다.`, '',
        '| 발화 | 시작 | 종료 | 성우 | 대본 |', '|---|---|---|---|---|',
        ...clips.map(clip => `| ${clip.id} | ${stamp(clip.actualStart)} | ${stamp(clip.actualEnd)} | ${clip.voice} | ${clip.text.replaceAll('|', '\\|')} |`), '',
        '## 영어 강조 구문', '',
        ...timeline.scenes.filter(scene => scene.kind === 'example').flatMap(scene => scene.sync.focusTimes.map(span => `- 예문 ${scene.number}: ${span.text} / ${stamp(span.actualStart)}–${stamp(span.actualEnd)}`)), '',
    ].join('\n'));
    records.push({ episode: lesson.episode, title: lesson.title, audioFile: timeline.audioFile, timeline: `timelines/${id}.json`, captions: `audio-timelines/${id}.vtt`, timingDocument: `audio-timelines/${id}.md`, duration: timeline.duration, voice: timeline.voices.ko, clips: 25, words, pointTokens, peakDb: peak, meanDb: mean, audioStatus: 'generated-and-decoded', alignmentStatus: 'automatic-validated-listening-review-pending', renderStatus: 'not-rendered' });
    console.log(`PASS ${id}: WAV ${timeline.duration.toFixed(2)}s / ${words} words / peak ${peak}dB / points ${pointTokens}`);
}
const report = { id: course.id, lessons: records, totals: { lessons: records.length, originalClips: records.length * 25, englishExamples: records.length * 10, alignedWords: records.reduce((sum, record) => sum + record.words, 0), pointTokens: records.reduce((sum, record) => sum + record.pointTokens, 0) }, renderStatus: 'not-rendered', reviewedByListening: false };
await writeFile(path.join(root, 'production-status.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(root, 'AUDIO.md'), [
    '# BASIC COURSE · 21강 실제 오디오', '',
    `21강 음성 525개와 믹스 트랙 21개 생성·디코딩 완료. 영어 예문 210개 / ${report.totals.alignedWords}개 단어 / 강조 구문 자동 정렬 완료.`, '',
    '모든 믹스는 130초다. 단어 시각은 원본 문장별 자동 정렬 근사값이며 청취 검수가 남아 있다. 6강 so 한 토큰은 시작 시점만 있고 길이는 미확정이다. 임의의 길이는 만들지 않았다.', '',
    '**개편 21강 MP4는 아직 렌더링하지 않았다. 기존 catalog와 lessons 문서는 대본 단계의 계획 스냅샷이며 최신 제작 상태는 production-status.json과 이 문서를 기준으로 확인한다.**', '',
    '| 강 | 주제 | 음성 듣기 | 실제 타임코드 | 자막 | 피크 |', '|---|---|---|---|---|---|',
    ...records.map(record => `| ${record.episode} | ${record.title} | [WAV](${record.audioFile}) | [타임코드](${record.timingDocument}) | [VTT](${record.captions}) | ${record.peakDb}dB |`), '',
    '재생성: node scripts/audio.mjs [강 번호] / 정렬: ALIGN_MODEL=small.en node scripts/align-audio.mjs [강 번호] / 검수: node scripts/verify-audio.mjs', '',
    '음성 재생성은 측정 타임라인을 다시 만들므로 이후 정렬 명령도 다시 실행해야 한다. 콘텐츠 해시 캐시는 대본·성우·말속도 변경 시 새 파일을 사용한다.', '',
].join('\n'));
console.log(JSON.stringify(report.totals));