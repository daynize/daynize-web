import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fps = 30;
const width = 1080;
const height = 1920;
const transitionFrames = 24;
const introWaitFrames = 15;
const buildIntervalFrames = 24;
const sparkleWaitFrames = 30;
const flipDurationFrames = 39;
const sampleRate = 44100;
const audioDir = path.join(root, 'public', 'audio');
const timelinePath = path.join(root, 'src', 'timeline.json');
const wordDurationCache = new Map();
let wordProbeIndex = 0;

const ITEMS = [
    {
        id: 'lesson_01',
        original: '당신의 행복은 당신 스스로 책임지는 것입니다.',
        chunks: [
            { ko: '당신의 행복은', en: 'Your happiness' },
            { ko: '당신의 책임입니다', en: 'is your business.' },
        ],
    },
    {
        id: 'lesson_02',
        original: '자신에게 투자하세요, 후회하지 않을 것입니다.',
        chunks: [
            { ko: '투자하세요', en: 'Invest' },
            { ko: '당신 자신에게', en: 'in yourself' },
            { ko: '당신은 후회하지 않을 것입니다', en: "you won't regret it." },
        ],
    },
    {
        id: 'lesson_03',
        original: '하나의 계획 대신 항상 플랜 B(차선책)를 준비하세요.',
        chunks: [
            { ko: '항상 준비하세요', en: 'Always have' },
            { ko: '백업 계획들을', en: 'backup plans' },
            { ko: '하나의 계획 대신에', en: 'instead of a plan.' },
        ],
    },
    {
        id: 'lesson_04',
        original: '혼자 있는 법을 배우고, 그 시간을 사랑하세요.',
        chunks: [
            { ko: '배우세요', en: 'Learn' },
            { ko: '혼자 있는 법을', en: 'to be alone' },
            { ko: '그리고 사랑하세요', en: 'and love' },
            { ko: '그것을', en: 'it.' },
        ],
    },
    {
        id: 'lesson_05',
        original: '열심을 다해 일하고 늘 겸손하세요.',
        chunks: [
            { ko: '일하세요', en: 'Work' },
            { ko: '열심히', en: 'hard' },
            { ko: '그리고', en: 'and' },
            { ko: '유지하세요', en: 'stay' },
            { ko: '겸손함을', en: 'humble.' },
        ],
    },
];

const run = (command, args) => {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
    }
    return result.stdout.trim();
};

const listVoices = () => run('say', ['-v', '?']).split('\n');
const voiceName = (line) => line.trim().split(/\s{2,}/)[0];
const voices = listVoices();
const findVoice = (predicate) => voices.find(predicate);
const premiumKorean = findVoice((line) => /Jian \(Premium\)/i.test(line));
const enhancedKorean = findVoice((line) => /Jian \(Enhanced\)/i.test(line));
const anyKorean = findVoice((line) => /\bko_KR\b/.test(line));
const englishVoice = findVoice((line) => /^Samantha\s/.test(line));

if (!premiumKorean && !enhancedKorean) {
    console.warn('Warning: Jian Premium/Enhanced is not installed; using another Korean voice when available.');
}
if (!englishVoice) {
    throw new Error('Samantha voice is not installed. Install the Samantha English voice in macOS System Settings.');
}
if (!premiumKorean && !enhancedKorean && !anyKorean) {
    throw new Error('No Korean macOS voice is installed; install a Korean voice before generating audio.');
}

const koreanVoice = voiceName(premiumKorean ?? enhancedKorean ?? anyKorean);
const samantha = voiceName(englishVoice);
const colors = ['#FF6B6B', '#FFD166', '#06D6A0', '#4CC9F0', '#C77DFF'];

const durationSeconds = (file) => Number(run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file,
]));

const toFrames = (seconds) => Math.max(1, Math.ceil(seconds * fps));

const measureWordDuration = async (tempDir, word, voice) => {
    const cacheKey = `${voice}:${word}`;
    if (wordDurationCache.has(cacheKey)) return wordDurationCache.get(cacheKey);
    const probePath = path.join(tempDir, `word-probe-${wordProbeIndex++}.aiff`);
    run('say', ['-v', voice, '-o', probePath, word]);
    const durationMs = durationSeconds(probePath) * 1000;
    wordDurationCache.set(cacheKey, durationMs);
    return durationMs;
};

const estimateWordTimings = async (tempDir, text, durationMs, voice) => {
    const words = text.match(/[^\s]+/gu) ?? [];
    const weights = await Promise.all(words.map((word) => measureWordDuration(tempDir, word, voice)));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const pauses = words.map((word, index) => {
        if (index === words.length - 1) return 0;
        if (/[,;:]$/u.test(word)) return 110;
        if (/[.!?]$/u.test(word)) return 150;
        return 38;
    });
    const availableSpeechMs = Math.max(0, durationMs - pauses.reduce((sum, pause) => sum + pause, 0));
    let elapsed = 0;
    return words.map((word, index) => {
        const startMs = Math.round(elapsed);
        elapsed += (availableSpeechMs * weights[index]) / totalWeight;
        const endMs = Math.round(elapsed);
        elapsed += pauses[index];
        return { word, startMs, endMs };
    });
};

const writeWave = async (file, seconds, sampleAt) => {
    const frameCount = Math.ceil(sampleRate * seconds);
    const dataSize = frameCount * 2;
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    for (let index = 0; index < frameCount; index += 1) {
        const value = Math.max(-1, Math.min(1, sampleAt(index / sampleRate, index / frameCount)));
        buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
    }
    await writeFile(file, buffer);
};

const noiseAt = (time, seed) => {
    const sample = Math.floor(time * sampleRate);
    const value = Math.sin((sample + seed * 7919) * 12.9898) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
};

const convertWave = (wavePath, outputPath) => {
    run('afconvert', ['-f', 'm4af', '-d', 'aac', wavePath, outputPath]);
};

const makeFlipCascade = async (tempDir, count) => {
    const wavePath = path.join(tempDir, `card_flip_cascade_${count}.wav`);
    const outputPath = path.join(audioDir, `card_flip_cascade_${count}.m4a`);
    const duration = Math.max(0.12, (count - 1) * 0.08 + 0.1);
    await writeWave(wavePath, duration, (time) => {
        let sample = 0;
        for (let pulse = 0; pulse < count; pulse += 1) {
            const local = time - pulse * 0.08;
            if (local >= 0 && local <= 0.075) {
                const envelope = Math.min(1, local / 0.001) * Math.max(0, 1 - local / 0.075) ** 2;
                const frequency = 1200 + pulse * 60;
                const snap = Math.sin(2 * Math.PI * frequency * local) + 0.25 * Math.sin(4 * Math.PI * frequency * local);
                sample += envelope * (0.13 * snap + 0.18 * noiseAt(local, count + pulse) * Math.exp(-local * 55));
            }
        }
        return sample;
    });
    convertWave(wavePath, outputPath);
    return `public/audio/card_flip_cascade_${count}.m4a`;
};

const transcodeSpeech = async (tempDir, itemId, segment, text, voice) => {
    const base = `${itemId}_seg_${segment}`;
    const aiffPath = path.join(tempDir, `${base}.aiff`);
    const outputPath = path.join(audioDir, `${base}.m4a`);
    run('say', ['-v', voice, '-o', aiffPath, text]);
    run('afconvert', ['-f', 'm4af', '-d', 'aac', aiffPath, outputPath]);
    const durationMs = Math.round(durationSeconds(outputPath) * 1000);
    return {
        src: `public/audio/${base}.m4a`,
        durationMs,
        durationInFrames: toFrames(durationMs / 1000),
        timingNote: '동일 macOS 보이스로 단어별 시험 합성한 길이를 문장 M4A의 ffprobe 실측 길이에 정규화하고 문장부호 휴지를 반영한 추정 타이밍입니다. 실제 파형 forced alignment는 아닙니다.',
        wordTimings: await estimateWordTimings(tempDir, text, durationMs, voice),
    };
};

const buildTimeline = (audioByItem, effects) => {
    let cursorFrame = 0;
    const items = ITEMS.map((item, itemIndex) => {
        const speech = audioByItem[item.id];
        const introAudioStartFrame = cursorFrame + introWaitFrames;
        const buildStartFrame = introAudioStartFrame + speech.intro.durationInFrames;
        const buildUp = item.chunks.map((_, index) => item.chunks.slice(0, index + 1).map((chunk) => chunk.ko));
        const buildupEndFrame = buildStartFrame + (item.chunks.length - 1) * buildIntervalFrames;
        const sparkleStartFrame = buildupEndFrame;
        const flipSoundSource = effects.flipSources[item.chunks.length];
        const flipSoundDurationInFrames = effects.flipDurations[item.chunks.length];
        const alignedAudioStartFrame = sparkleStartFrame + flipSoundDurationInFrames + sparkleWaitFrames;
        const flipStartFrame = alignedAudioStartFrame + speech.aligned.durationInFrames;
        const englishAudioStartFrame = flipStartFrame + flipDurationFrames;
        const endFrame = englishAudioStartFrame + speech.english.durationInFrames;
        const stackSfxEvents = item.chunks.map((_, index) => ({
            startFrame: buildStartFrame + index * buildIntervalFrames,
            repeatCount: index + 1,
            sources: Array.from({ length: index + 1 }, () => flipSoundSource),
        }));
        let alignedWordIndex = 0;
        const chunks = item.chunks.map((chunk, index) => {
            const wordCount = chunk.ko.match(/\S+/gu)?.length ?? 1;
            const firstWord = speech.aligned.wordTimings[alignedWordIndex];
            const lastWord = speech.aligned.wordTimings[alignedWordIndex + wordCount - 1] ?? firstWord;
            alignedWordIndex += wordCount;
            const chunkStart = Math.floor((firstWord.startMs / speech.aligned.durationMs) * speech.aligned.durationInFrames);
            const chunkEnd = Math.ceil((lastWord.endMs / speech.aligned.durationMs) * speech.aligned.durationInFrames);
            return {
                ...chunk,
                color: colors[(itemIndex + index) % colors.length],
                alignedHighlightStartFrame: alignedAudioStartFrame + chunkStart,
                alignedHighlightEndFrame: alignedAudioStartFrame + chunkEnd,
            };
        });
        const result = {
            id: item.id,
            lessonNumber: itemIndex + 1,
            original: item.original,
            koreanOrder: item.chunks.map((chunk) => chunk.ko).join(' '),
            english: item.chunks.map((chunk) => chunk.en).join(' ').replace(/\s+([,.!?])/g, '$1'),
            chunks,
            buildUp,
            startFrame: cursorFrame,
            introWaitFrames,
            buildIntervalFrames,
            flipStaggerFrames: fps * 0.08,
            stackPulseIntervalFrames: 2,
            introAudioStartFrame,
            buildStartFrame,
            buildupEndFrame,
            sparkleStartFrame,
            alignedAudioStartFrame,
            flipStartFrame,
            flipDurationFrames,
            englishAudioStartFrame,
            endFrame,
            durationInFrames: endFrame - cursorFrame,
            audio: {
                intro: { ...speech.intro, startFrame: introAudioStartFrame },
                aligned: { ...speech.aligned, startFrame: alignedAudioStartFrame },
                english: {
                    ...speech.english,
                    startFrame: englishAudioStartFrame,
                    wordTimings: speech.english.wordTimings.map((timing) => ({
                        ...timing,
                        startFrame: englishAudioStartFrame + Math.floor((timing.startMs / speech.english.durationMs) * speech.english.durationInFrames),
                        endFrame: englishAudioStartFrame + Math.ceil((timing.endMs / speech.english.durationMs) * speech.english.durationInFrames),
                    })),
                },
            },
            stackSfxEvents,
            sparkle: { src: flipSoundSource, startFrame: sparkleStartFrame, durationInFrames: flipSoundDurationInFrames },
            flipSfx: { src: flipSoundSource, startFrame: flipStartFrame },
            transition: { startFrame: endFrame, durationInFrames: transitionFrames },
        };
        cursorFrame = endFrame + (itemIndex < ITEMS.length - 1 ? Math.ceil(transitionFrames / 2) : 0);
        return result;
    });
    return {
        fps,
        width,
        height,
        totalVideoDurationFrames: cursorFrame,
        timingNote: '구간 길이는 ffprobe로 측정한 M4A를 프레임화합니다. 단어 시점은 동일 보이스의 단어별 합성 길이를 문장 길이에 정규화한 추정치이며 forced alignment는 아닙니다.',
        items,
    };
};

await mkdir(audioDir, { recursive: true });
await mkdir(path.dirname(timelinePath), { recursive: true });
const maxChunks = Math.max(...ITEMS.map((item) => item.chunks.length));
for (const obsoleteFile of ['magical_sparkle.m4a', ...Array.from({ length: maxChunks }, (_, index) => `sfx_stack_${index + 1}.m4a`)]) {
    await rm(path.join(audioDir, obsoleteFile), { force: true });
}
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'word-order-shift-'));

try {
    const audioByItem = {};
    for (const item of ITEMS) {
        const koreanOrder = item.chunks.map((chunk) => chunk.ko).join(' ');
        const english = item.chunks.map((chunk) => chunk.en).join(' ').replace(/\s+([,.!?])/g, '$1');
        audioByItem[item.id] = {
            intro: await transcodeSpeech(tempDir, item.id, 1, item.original, koreanVoice),
            aligned: await transcodeSpeech(tempDir, item.id, 2, koreanOrder, koreanVoice),
            english: await transcodeSpeech(tempDir, item.id, 3, english, samantha),
        };
        console.log(`Generated ${item.id}: ${koreanVoice} + ${samantha}`);
    }

    const flipSources = {};
    const flipDurations = {};
    for (let count = 1; count <= maxChunks; count += 1) {
        flipSources[count] = await makeFlipCascade(tempDir, count);
        flipDurations[count] = toFrames(durationSeconds(path.join(root, flipSources[count])));
    }
    const timeline = buildTimeline(audioByItem, {
        flipSources,
        flipDurations,
    });
    await writeFile(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`);
    console.log(`Wrote ${path.relative(root, timelinePath)} (${timeline.totalVideoDurationFrames} frames, ${(timeline.totalVideoDurationFrames / fps).toFixed(1)}s)`);
} finally {
    await rm(tempDir, { recursive: true, force: true });
}