import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { course } from '../course.mjs';
import { root } from './audio.mjs';

const records = [];
for (const lesson of course.lessons) {
    const id = String(lesson.episode).padStart(2, '0');
    const receipt = JSON.parse(await readFile(path.join(root, 'video-reports', `${id}-render.json`), 'utf8'));
    const check = JSON.parse(await readFile(path.join(root, 'video-reports', `${id}-check.json`), 'utf8'));
    assert.ok(check.ok && !check.browserSkipped);
    assert.equal(receipt.episode, lesson.episode);
    assert.equal(Number(receipt.metadata.format.duration), 130);
    assert.equal((await stat(path.join(root, receipt.output))).size, Number(receipt.metadata.format.size));
    assert.ok((await stat(path.join(root, receipt.contact))).size > 0);
    records.push({ episode: lesson.episode, title: lesson.title, video: receipt.output, contact: receipt.contact, bytes: Number(receipt.metadata.format.size), duration: 130, browserChecked: true, decodedAudioPeakDb: receipt.audioPeakDb, listeningReviewed: false });
}
const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0);
await writeFile(path.join(root, 'VIDEO.md'), [
    '# BASIC COURSE · 개편 21강 완성 영상', '',
    `21강 MP4 출력 및 규격·오디오 검증 완료. 총 45분 30초 / ${(totalBytes / 1024 / 1024).toFixed(1)}MB.`, '',
    '각 강의 130초, 1080×1920, 30fps, 3,900프레임. 지정 성우, 한국어→영어 예문, 대조 표시, #FF6648 핵심 강조와 실제 타임코드 기반 확대를 포함한다.', '',
    '강의별 실제 발화 기준 35개 시점의 브라우저 실행·배치·모션·색상 대비 검사와 최종 MP4 오디오 디코딩을 통과했다. 단어별 자동 정렬은 근사값이며 전 강의 청취 검수가 완료된 상태는 아니다.', '',
    '**웹사이트 게시와 courses.json 변경은 하지 않았다.**', '',
    '| 강 | 주제 | 완성 영상 | 출력 장면 모음 | 크기 |', '|---|---|---|---|---|',
    ...records.map(record => `| ${record.episode} | ${record.title} | [MP4](${record.video}) | [장면 모음](${record.contact}) | ${(record.bytes / 1024 / 1024).toFixed(1)}MB |`), '',
    '## 재현 명령', '',
    '```sh',
    'node scripts/build-video.mjs all',
    'node scripts/render-videos.mjs',
    'node scripts/finalize-videos.mjs',
    '```', '',
    '원본 음성이나 대본 변경 시 오디오·정렬을 먼저 재생성한다. 렌더링은 입력 해시가 같은 검증된 결과를 재사용하며 각 강의 검사 실패 시 중단한다.', '',
].join('\n'));
const productionFile = path.join(root, 'production-status.json');
const production = JSON.parse(await readFile(productionFile, 'utf8'));
production.renderStatus = '21-rendered-and-probed';
production.videos = records;
for (const lesson of production.lessons) lesson.renderStatus = 'rendered-and-probed';
await writeFile(productionFile, `${JSON.stringify(production, null, 2)}\n`);
console.log(JSON.stringify({ result: 'PASS', videos: records.length, totalSeconds: records.length * 130, totalBytes, listeningReviewed: false, published: false }));