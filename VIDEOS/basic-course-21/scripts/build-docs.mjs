import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { course, planLesson } from '../course.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const docs = path.join(root, 'lessons');
const plans = path.join(root, 'plans');
await mkdir(docs, { recursive: true });
await mkdir(plans, { recursive: true });
const time = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const clean = text => text.replaceAll('|', '\\|').replaceAll('\n', ' ');
const windowText = scene => `${time(scene.start)}–${time(scene.end)}`;
const catalog = [];
let audioReady = false;
let videoReady = false;
try {
    const production = JSON.parse(await readFile(path.join(root, 'production-status.json'), 'utf8'));
    audioReady = production.totals?.lessons === 21 && production.lessons.every(lesson => lesson.audioStatus === 'generated-and-decoded');
    videoReady = production.renderStatus === '21-rendered-and-probed' && production.videos?.length === 21;
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
}
assert.equal(course.lessons.length, 21);
for (const lesson of course.lessons) {
    assert.equal(lesson.examples.length, 10);
    assert.equal(lesson.concept.length, 4);
    const plan = planLesson(lesson);
    const id = String(lesson.episode).padStart(2, '0');
    const lines = [
        `# BASIC COURSE ${id} · ${lesson.title}`, '',
        `분류: ${lesson.category}`, '',
        `학습 목표: ${lesson.objective}`, '',
        `썸네일·목록 문구: **${lesson.hook}**`, '',
        '## 제작 상태', '',
        '**대본·제작 지시서 완료 / TTS 미생성 / MP4 미렌더링.** 아래는 목표 장면 슬롯이다. 한국어·영어의 실제 시작·종료 시각과 단어 강조 시각은 오디오 생성 후 확정한다.', '',
        `목표 130초, 허용 100–135초 / 1080×1920 / 30fps / 한국어 ${plan.voices.ko} / 영어 Samantha.`, '',
        '## 개념·대조 전체 대본', '',
        '| 목표 슬롯 | 한국어 실제 발화 원고 | 중앙 화면 | 그래픽 지시 |',
        '|---|---|---|---|',
        ...plan.scenes.slice(0, 4).map(scene => `| ${windowText(scene)} | ${clean(scene.text)} | ${clean(scene.screen)} | ${clean(scene.visual)} |`), '',
        '도입 영어는 화면으로만 표시한다. 예문·표현을 재사용하고 독립적인 영어 예문 발화를 추가하지 않는다.', '',
        '## 대조 예문 10개', '',
        '각 행은 한국어 발화 후 영어 정답을 읽는다. 오답은 발화하지 않는다. 영어로도 가능하지만 의도한 뜻이 다른 대비는 교정 설명에서 구분한다.', '',
        ...plan.scenes.filter(scene => scene.kind === 'example').flatMap(scene => [
            `### ${String(scene.number).padStart(2, '0')} · ${scene.level} · ${windowText(scene)}`, '',
            `- 한국어 / ${plan.voices.ko}: ${scene.ko}`,
            `- Correct / Samantha: **${scene.en}**`,
            `- Incorrect 또는 의도한 뜻과 불일치 / 화면만: ${scene.wrong}`,
            `- 교정 포인트: ${scene.note}`,
            `- 주황색 강조: ${scene.focus.join(' / ')}`,
            `- 그래픽·구조: ${scene.visual}`, '',
        ]),
        '## 한 줄 요약 · 02:05–02:10', '',
        `${plan.voices.ko}: “${lesson.summary}”`, '',
        '## 강의별 모션·자막 지시', '',
        '- 한글 중앙 (540,650), 오답 (540,890), 정답 (540,1120), 교정 (540,1460). 안전 여백 좌우 100px, 주요 내용 y=300–1540.',
        '- 한글 48–56px, 영어 정답 58–68px, 오답 42–48px. 긴 문장은 의미 단위로 2–3줄. 확대 여유 공간을 포함해 실제 폰트로 검수한다.',
        '- 크림 #F6F1E8, 차콜 #252525, 필수 강조 #FF6648. 작은 주황색 글자는 차콜 강조면 위에 둔다. 오답은 연한 레드 면 #FBE3E0와 진한 레드 #A33C35.',
        '- 한글 발화 시작에 번역 공개 → 한글 끝에 오답 공개 → 0.3초 이상의 간격 후 영어 발화와 정답 동시 공개. 영어 정답 선공개 금지.',
        '- 동사·핵심 표현의 실제 발화 시작에 중앙 기준 scale 1.00→1.10(0.10초), 1.10→1.00(0.14초). 다른 단어·줄바꿈은 이동하지 않는다.',
        '- 설명용 연결선은 양쪽 대상 공개 후 나타난다. 새로운 규칙을 암시하는 장식·불필요한 캐릭터·효과는 추가하지 않는다.',
        '- seek-safe 단일 paused GSAP 타임라인. 영상 중 타이머·네트워크·무작위 값에 의존하지 않고 역방향 탐색에서 정답 숨김도 복원한다.', '',
        '## 실제 오디오 확정 절차', '',
        '1. 지정 성우로 개념 4개, 한글 예문 10개, 영어 정답 10개, 요약 1개를 각각 생성한다.',
        '2. ffprobe로 25개 원본 오디오 길이를 측정한다. 무음·읽기 여유를 더한 합이 135초를 넘으면 원고를 줄여 다시 생성한다. 말속도만 무리하게 올리지 않는다.',
        '3. 문장별 원본에서 단어 시각을 정렬하고 원문 일치·발화 구간 내부 여부를 검사한다. 긴 무음이 섞인 전체 트랙의 보간 시각은 사용하지 않는다.',
        '4. 실제 시작·종료 시각을 plans 데이터의 null 필드에 기록하고 목표 슬롯을 실제 길이에 맞게 재배분한다. 요약까지 100–135초 안에 배치한다.',
        '5. 자막과 확대를 최종 오디오 시각에 연결하고 실제 청취·프레임 검수 후 확정한다. 자동 정렬만으로 100% 또는 1프레임 정확도를 보장하지 않는다.', '',
        '## 교육 정확성 주의', '',
        ...lesson.accuracyNotes.map(note => `- ${note}`), '',
        '## 출력 검수', '',
        '- 예문 10개·난도 3/4/3·한글 선행·영어 정답 후행·오답 무발화·지정 성우 일치.',
        '- 모든 장면 브라우저 검사, 텍스트 넘침·색상 대비·역방향 seek 검사, 최종 MP4 대표 장면과 오디오 디코딩 확인.',
        '- 로컬 제작은 별도 강의별 평가 요청 없이 진행하되 실제 게시·외부 서비스 변경은 별도 작업 범위다.', '',
    ];
    await writeFile(path.join(docs, `${id}.md`), `${lines.join('\n')}\n`);
    await writeFile(path.join(plans, `${id}.json`), `${JSON.stringify(plan, null, 2)}\n`);
    catalog.push({ id: plan.id, episode: lesson.episode, category: lesson.category, title: lesson.title, hook: lesson.hook, objective: lesson.objective, voices: plan.voices, durationTarget: 130, timingStatus: course.timingStatus, exampleCount: 10, document: `lessons/${id}.md`, plan: `plans/${id}.json`, audioStatus: 'not-generated', renderStatus: 'not-rendered' });
}
await writeFile(path.join(root, 'catalog.json'), `${JSON.stringify({ ...course, lessons: catalog }, null, 2)}\n`);
await writeFile(path.join(root, 'INDEX.md'), [
    '# BASIC COURSE · 21강 제작 목차', '',
    course.positioning, '',
    videoReady ? '**개편 21강 MP4 출력·검증 완료. [완성 영상 목차](VIDEO.md) / [실제 오디오와 타임코드](AUDIO.md). 전체 청취 검수와 사이트 게시 미완료.**' : audioReady ? '**21강 대본·음성 생성·자동 타임코드 정렬 완료. [실제 오디오와 타임코드](AUDIO.md). 개편 MP4는 아직 미렌더링.**' : '**21강 대본·210개 대조 예문·제작 지시서 완료. 개편 영상의 음성 생성·렌더링은 아직 미실행.**', '',
    '| 강 | 주제 | 목록·썸네일 문구 | 한국어 성우 | 제작 문서 |', '|---|---|---|---|---|',
    ...catalog.map(item => `| ${item.episode} | ${clean(item.title)} | ${clean(item.hook)} | ${item.voices.ko} | [${String(item.episode).padStart(2, '0')}강](${item.document}) |`), '',
    '각 강의의 목표 130초는 확정 오디오 타임코드가 아니다. plans JSON의 actualStart/actualEnd/focusTimes는 실제 음성을 정렬하기 전까지 null을 유지한다.', '',
    '기존 ../basic-course-01/renders/basic-course-01.mp4는 개편 전 단일 강의이며, 이 21강 세트의 새 1강이나 새 2강 완성본으로 분류하지 않는다.', '',
].join('\n'));
console.log('PASS: 21 lesson documents, 21 machine-readable plans, 210 contrast examples, course catalog');