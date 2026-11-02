import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const timelinePath = join(root, 'timeline.json');
const outputDirectory = join(root, 'public', 'audio');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'daynize-timeline-audio-'));

// 기본 추천 성우 음성 (macOS 프리미엄 한국어 성우)
const VOICE_KO = 'Jian (Premium)';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const FFPROBE = '/opt/homebrew/bin/ffprobe';
const SAY = '/usr/bin/say';

const run = (command, args) => execFileSync(command, args, { stdio: 'pipe' });

/** 대본에서 자막/화면 지문을 제거하고 자연스러운 낭독용 텍스트로 정제 */
function cleanForSpeech(text) {
    if (!text || text.trim() === '-' || text.trim() === '') return '';

    return text
        // 연출 지문 제거 (/: ... :/)
        .replace(/\/:\s*[\s\S]*?\s*:\//g, '')
        // 마크다운 볼드 제거
        .replace(/\*\*/g, '')
        // 앞머리 불릿/대시 기호 제거
        .replace(/^[\s-•*]+/gm, '')
        // (X), (O) 표기를 자연스러운 음성으로 변환
        .replace(/\(X\)/gi, '틀린 문장으로, ')
        .replace(/\(O\)/gi, '올바른 문장으로, ')
        // LaTeX 화살표 및 기호 변환
        .replace(/\$\\rightarrow\$/g, '는, ')
        .replace(/->|→/g, '는, ')
        // 발음상 어색한 오타를 자연스러운 발음으로 교정
        .replace(/움작이는/g, '움직이는')
        .replace(/움직아는/g, '움직이는')
        .replace(/어던 동사/g, '어떤 동사')
        // 특수문자 및 불필요한 괄호 정리
        .replace(/[~]/g, ' ')
        .replace(/[()[\]{}"'“”‘’]/g, ' ')
        // 공백 정리
        .replace(/\s+/g, ' ')
        .trim();
}

/** ffprobe를 사용해 오디오 파일의 실제 재생 시간(초) 측정 */
function getAudioDuration(filePath) {
    try {
        const output = run(FFPROBE, [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ]).toString('utf8').trim();
        return parseFloat(output) || 0;
    } catch {
        return 0;
    }
}

/** 무음 오디오 파일 생성 (구분선/브레이크용) */
function generateSilence(outputPath, duration = 0.5) {
    run(FFMPEG, [
        '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono`,
        '-t', String(duration),
        '-codec:a', 'libmp3lame', '-b:a', '128k',
        outputPath
    ]);
}

try {
    console.log('🎙️ [Daynize] 타임라인 성우 음성 생성 스크립트 시작');
    console.log(`- 타임라인 파일: ${timelinePath}`);
    console.log(`- 출력 디렉토리: ${outputDirectory}`);
    console.log(`- 사용 성우: ${VOICE_KO}`);

    mkdirSync(outputDirectory, { recursive: true });

    const timeline = JSON.parse(readFileSync(timelinePath, 'utf8'));
    const scenes = timeline.scenes;
    let currentTimelineStart = 0;
    const fileListForConcat = [];

    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const sceneNum = String(scene.id).padStart(2, '0');
        const fileName = `scene-${sceneNum}.mp3`;
        const aiffTempPath = join(temporaryDirectory, `scene-${sceneNum}.aiff`);
        const mp3OutputPath = join(outputDirectory, fileName);

        const speechText = cleanForSpeech(scene.text);

        if (!speechText) {
            // 빈 문장이나 구분선은 0.5초 무음 파일 생성
            generateSilence(mp3OutputPath, 0.5);
        } else {
            // macOS say 엔진으로 고음질 AIFF 생성 후 ffmpeg로 mp3 인코딩
            run(SAY, ['-v', VOICE_KO, '-o', aiffTempPath, '--', speechText]);
            run(FFMPEG, [
                '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                '-i', aiffTempPath,
                '-vn', '-codec:a', 'libmp3lame', '-q:a', '2',
                mp3OutputPath
            ]);
        }

        const measuredDuration = parseFloat(getAudioDuration(mp3OutputPath).toFixed(2));
        
        // 씬 메타데이터 업데이트
        scene.audioFile = `/public/audio/${fileName}`;
        scene.speechText = speechText;
        scene.measuredAudioDuration = measuredDuration;
        
        // 실측 오디오 기반 타임라인 자동 재정렬 (문장 간 자연스러운 호흡 0.35초 추가)
        const pauseBetweenScenes = 0.35;
        scene.actualStart = parseFloat(currentTimelineStart.toFixed(2));
        scene.actualEnd = parseFloat((currentTimelineStart + measuredDuration).toFixed(2));
        scene.actualDuration = measuredDuration;

        currentTimelineStart = scene.actualEnd + pauseBetweenScenes;
        fileListForConcat.push(mp3OutputPath);

        console.log(`  ✓ [Scene ${sceneNum}/${scenes.length}] (${measuredDuration}s) ${speechText.slice(0, 32)}${speechText.length > 32 ? '...' : ''}`);
    }

    // 전체 강의 합본 오디오 생성 (full-lecture.mp3)
    const concatListPath = join(temporaryDirectory, 'concat-list.txt');
    const concatContent = fileListForConcat.map(filePath => `file '${filePath}'`).join('\n');
    writeFileSync(concatListPath, concatContent, 'utf8');

    const fullLecturePath = join(outputDirectory, 'full-lecture.mp3');
    run(FFMPEG, [
        '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'concat', '-safe', '0', '-i', concatListPath,
        '-codec:a', 'libmp3lame', '-q:a', '2',
        fullLecturePath
    ]);

    const totalLectureDuration = getAudioDuration(fullLecturePath).toFixed(1);
    timeline.fullAudioFile = '/public/audio/full-lecture.mp3';
    timeline.totalMeasuredDuration = parseFloat(totalLectureDuration);

    // timeline.json에 오디오 파일 경로 및 실측 타임코드 저장
    writeFileSync(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`, 'utf8');

    console.log('\n🎉 성우 음성 파일 생성 완료!');
    console.log(`- 개별 음성 파일: ${scenes.length}개 (/public/audio/scene-01.mp3 ~ scene-36.mp3)`);
    console.log(`- 전체 통합 음성: ${fullLecturePath} (총 ${totalLectureDuration}초)`);
    console.log(`- timeline.json에 audioFile 및 실측 시간 동기화 완료!`);

} catch (error) {
    console.error('❌ 음성 생성 중 오류 발생:', error);
    process.exit(1);
} finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
}
