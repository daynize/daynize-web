// macOS only: say -> afconvert -> ffprobe -> src/timeline.json
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const TIMELINE_PATH = path.join(ROOT, "src", "timeline.json");

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

// Scene design targets (seconds); audio length can only extend them.
const START_DELAY_SEC = 0.5; // per-sentence wait before the intro
const INTRO_MIN_SEC = 1.5;
const STEP_SEC = 0.8; // stack interval between rows
const CLICK_GAP_FRAMES = 2; // gap between clicks within one row
const SPARKLE_TO_TTS_DELAY_SEC = 1.0;
const FLIP_SEC = 1.3;
const FLIP_STAGGER_SEC = 0.08;
const PAD_SEC = 0.25;
const OUTRO_TAIL_SEC = 0.8; // wait after Samantha = transition to the next sentence

// Each item = one lesson in the single video. Chunks are in English word order (ko = shifted Korean, en = English chunk).
const ITEMS = [
    {
        id: "s1",
        koOriginal: "당신은 내면의 가치를 지키며 성장에 집중하는 삶을 산다.",
        chunks: [
            { ko: "당신은", en: "You" },
            { ko: "산다", en: "live" },
            { ko: "삶을", en: "a life" },
            { ko: "집중하는", en: "focusing on" },
            { ko: "개인적인 성장에", en: "personal growth" },
            { ko: "지키면서", en: "while staying true" },
            { ko: "내면의 가치들을", en: "to your inner values" },
        ],
    },
    {
        id: "s2",
        koOriginal: "당신은 외부의 결과나 타인의 시선에 휘둘리지 않는다.",
        chunks: [
            { ko: "당신은", en: "You" },
            { ko: "휘둘리지 않는다", en: "are not swayed" },
            { ko: "외부의 결과나", en: "by external results" },
            { ko: "타인의 시선에", en: "or others' opinions" },
        ],
    },
    {
        id: "s3",
        koOriginal: "당신은 매 순간 마음을 열고 배움과 성장을 선택한다.",
        chunks: [
            { ko: "당신은", en: "You" },
            { ko: "선택한다", en: "choose" },
            { ko: "배움과 성장을", en: "learning and growth" },
            { ko: "마음을 열고", en: "with an open heart" },
            { ko: "매 순간", en: "at every moment" },
        ],
    },
    {
        id: "s4",
        koOriginal: "당신은 결과에 집착하지 않고 삶의 과정을 즐긴다.",
        chunks: [
            { ko: "당신은", en: "You" },
            { ko: "즐긴다", en: "enjoy" },
            { ko: "삶의 과정을", en: "the process of life" },
            { ko: "집착하지 않고", en: "without clinging" },
            { ko: "결과에", en: "to results" },
        ],
    },
    {
        id: "s5",
        koOriginal: "당신은 매일 자신에게 감사하며 스스로를 진심으로 믿어준다.",
        chunks: [
            { ko: "당신은", en: "You" },
            { ko: "믿어준다", en: "trust" },
            { ko: "스스로를", en: "yourself" },
            { ko: "진심으로", en: "sincerely" },
            { ko: "감사하며", en: "while thanking" },
            { ko: "자신에게", en: "yourself" },
            { ko: "매일", en: "every day" },
        ],
    },
];

const buildSegments = (item) => {
    const koShifted = item.chunks.map((c) => c.ko).join(" ");
    const enFinal = item.chunks.map((c) => c.en).join(" ") + (item.koOriginal.trim().endsWith("?") ? "?" : ".");
    return {
        koShifted,
        enFinal,
        segments: [
            { id: "seg_1", role: "intro", voiceName: "Jian", lang: "ko", text: item.koOriginal },
            { id: "seg_2", role: "shifted", voiceName: "Jian", lang: "ko", text: koShifted },
            { id: "seg_3", role: "outro", voiceName: "Samantha", lang: "en", text: enFinal },
        ],
    };
};

const sec2frames = (sec) => Math.ceil(sec * FPS);

// 16-bit mono WAV from a sample function fn(t, rand) -> [-1, 1].
function synthWav(durationSec, fn) {
    const rate = 44100;
    const n = Math.floor(rate * durationSec);
    const buf = Buffer.alloc(44 + n * 2);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(36 + n * 2, 4);
    buf.write("WAVEfmt ", 8);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(rate, 24);
    buf.writeUInt32LE(rate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(n * 2, 40);
    let seed = 12345;
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed / 0xffffffff) * 2 - 1;
    };
    for (let i = 0; i < n; i++) {
        const v = fn(i / rate, rand);
        buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767 * 0.9), 44 + i * 2);
    }
    return buf;
}

// Bubble pop: upward-chirping sine (420Hz + 9000Hz/s) with a soft octave pluck and fast decay.
const synthClickWav = () =>
    synthWav(0.12, (t) => {
        const phase = 2 * Math.PI * (420 * t + 4500 * t * t);
        const env = Math.exp(-t * 38) * Math.min(1, t * 400);
        return (Math.sin(phase) + 0.25 * Math.sin(2 * phase)) * env * 0.8;
    });

// Rising pentatonic arpeggio with octave shimmer.
const SPARKLE_NOTES = [1047, 1319, 1568, 2093, 2637, 3136, 4186];
const synthSparkleWav = () =>
    synthWav(1.4, (t) => {
        let v = 0;
        SPARKLE_NOTES.forEach((f, i) => {
            const dt = t - i * 0.07;
            if (dt < 0) return;
            const env = Math.exp(-dt * 5) * Math.min(1, dt * 400);
            v += (Math.sin(2 * Math.PI * f * dt) + 0.4 * Math.sin(2 * Math.PI * f * 2 * dt)) * env * 0.22;
        });
        return v;
    });

// Seconds after flip start when card i hits 90deg (mirrors WordOrderShift: stagger + half of the per-card flip).
const flipSnapTimes = (count) => {
    const staggerFrames = FLIP_STAGGER_SEC * FPS;
    const flipDurFrames = sec2frames(FLIP_SEC) - Math.ceil(staggerFrames * (count - 1));
    return Array.from({ length: count }, (_, i) => (i * staggerFrames + flipDurFrames / 2) / FPS);
};

// Snap-flip per card: 15ms white-noise friction burst + 25ms exponential 1200->300Hz sine thwack; pitch x1.05 per card.
const SNAP_NOISE_SEC = 0.015;
const SNAP_SINE_SEC = 0.025;
const SNAP_F0 = 1200;
const SNAP_F1 = 300;
const synthFlipCascadeWav = (count) => {
    const times = flipSnapTimes(count);
    const ratio = SNAP_F1 / SNAP_F0;
    return synthWav(times[count - 1] + 0.1, (t, rand) => {
        const n = rand();
        let v = 0;
        times.forEach((start, i) => {
            const dt = t - start;
            if (dt < 0 || dt > SNAP_SINE_SEC) return;
            const pitch = 1.05 ** i;
            const noise = dt < SNAP_NOISE_SEC ? n * Math.exp(-dt / 0.005) * 0.7 : 0;
            const f0 = SNAP_F0 * pitch;
            const phase = 2 * Math.PI * ((f0 * SNAP_SINE_SEC) / Math.log(ratio)) * (ratio ** (dt / SNAP_SINE_SEC) - 1);
            const thwack = Math.sin(phase) * Math.exp(-dt / 0.009) * Math.min(1, dt * 2000) * 0.8;
            v += noise + thwack;
        });
        return v;
    });
};

async function writeSfx(workDir, name, wav) {
    const tmp = path.join(workDir, `${name}.wav`);
    const out = path.join(AUDIO_DIR, `${name}.m4a`);
    await writeFile(tmp, wav);
    await run("afconvert", ["-f", "m4af", "-d", "aac", tmp, out]);
    return { file: `audio/${name}.m4a`, durationInFrames: sec2frames(await probeDuration(out)) };
}

async function listVoices() {
    const { stdout } = await run("say", ["-v", "?"]);
    return stdout
        .split("\n")
        .map((line) => line.match(/^(.+?)\s{2,}([a-z]{2,3}[_-][A-Za-z]{2,4})\s+#/))
        .filter(Boolean)
        .map((m) => ({ name: m[1].trim(), locale: m[2] }));
}

function pickVoice(voices, base, localePrefix) {
    const candidates = voices.filter(
        (v) => v.name.toLowerCase().startsWith(base.toLowerCase()) && v.locale.toLowerCase().startsWith(localePrefix),
    );
    const premium = candidates.find((v) => /premium|프리미엄|enhanced|고급/i.test(v.name));
    const picked = premium ?? candidates[0];
    if (!picked) {
        throw new Error(
            `Voice "${base}" (${localePrefix}) not installed. Install it in System Settings > Accessibility > Spoken Content > System Voice > Manage Voices.`,
        );
    }
    if (!premium && base === "Jian") console.warn(`[warn] Jian Premium not found; using "${picked.name}".`);
    return picked.name;
}

async function probeDuration(file) {
    const { stdout } = await run("ffprobe", [
        "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file,
    ]);
    const sec = Number.parseFloat(stdout.trim());
    if (!Number.isFinite(sec) || sec <= 0) throw new Error(`ffprobe failed for ${file}: "${stdout}"`);
    return sec;
}

// Character-count-weighted proportional estimate (NOT forced alignment / Whisper).
function estimateWordTimings(text, durationSec) {
    const words = text.split(/\s+/).filter(Boolean);
    const weights = words.map((w) => Math.max(1, w.replace(/[^\p{L}\p{N}]/gu, "").length));
    const total = weights.reduce((a, b) => a + b, 0);
    const totalMs = durationSec * 1000;
    let acc = 0;
    return words.map((word, i) => {
        const startMs = Math.round((acc / total) * totalMs);
        acc += weights[i];
        const endMs = Math.round((acc / total) * totalMs);
        return { word, startMs, endMs };
    });
}

async function buildItem(item, ctx) {
    const { workDir, voices, sfxStack, sfxSparkle, startDelayFrames } = ctx;
    const { chunks } = item;
    const { koShifted, enFinal, segments: segDefs } = buildSegments(item);

    const measured = [];
    for (const [i, seg] of segDefs.entries()) {
        const voice = pickVoice(voices, seg.voiceName, seg.lang);
        const aiff = path.join(workDir, `${item.id}_${seg.id}.aiff`);
        const name = `${item.id}_seg_${i + 1}`;
        const m4a = path.join(AUDIO_DIR, `${name}.m4a`);
        console.log(`[${item.id}/${seg.id}] ${voice}: ${seg.text}`);
        await run("say", ["-v", voice, "-o", aiff, seg.text]);
        await run("afconvert", ["-f", "m4af", "-d", "aac", aiff, m4a]);
        const durationSec = await probeDuration(m4a);
        measured.push({
            ...seg,
            voice,
            file: `audio/${name}.m4a`,
            durationSec,
            durationInFrames: sec2frames(durationSec),
            words: estimateWordTimings(seg.text, durationSec),
        });
    }
    const [intro, shifted, outro] = measured;

    const enWordCount = chunks.reduce((n, c) => n + c.en.split(/\s+/).length, 0);
    if (outro.words.length !== enWordCount) {
        throw new Error(`[${item.id}] English word count mismatch: ${outro.words.length} vs ${enWordCount}`);
    }
    const sfxFlip = await writeSfx(workDir, `card_flip_cascade_${chunks.length}`, synthFlipCascadeWav(chunks.length));

    // Scene timeline (frames), accumulated.
    const introFrames = Math.max(sec2frames(INTRO_MIN_SEC), intro.durationInFrames + sec2frames(PAD_SEC));
    const buildStart = startDelayFrames + introFrames;
    const stepFrames = sec2frames(STEP_SEC);
    const lastStepStart = buildStart + stepFrames * (chunks.length - 1);

    // Row i gets i+1 clicks (one per chunk), pitch rising with each chunk.
    const stackHits = chunks.flatMap((_, row) =>
        Array.from({ length: row + 1 }, (_, j) => ({
            startFrame: buildStart + row * stepFrames + j * CLICK_GAP_FRAMES,
            playbackRate: Math.round((1 + j * 0.12) * 100) / 100,
        })),
    );

    // Sparkle fires once the last row and its clicks are done; Jian's 2nd reading follows after 1s.
    const sparkleStart = lastStepStart + chunks.length * CLICK_GAP_FRAMES;
    const shiftedStart = sparkleStart + sfxSparkle.durationInFrames + sec2frames(SPARKLE_TO_TTS_DELAY_SEC);
    const buildEnd = shiftedStart + shifted.durationInFrames + sec2frames(PAD_SEC);
    const flipStart = buildEnd;
    const flipEnd = flipStart + sec2frames(FLIP_SEC);
    const outroStart = flipEnd;
    const outroEnd = outroStart + outro.durationInFrames + sec2frames(OUTRO_TAIL_SEC);

    const audioStart = { seg_1: startDelayFrames, seg_2: shiftedStart, seg_3: outroStart };
    const segments = measured.map((s) => ({
        ...s,
        startFrame: audioStart[s.id],
        endFrame: audioStart[s.id] + s.durationInFrames,
    }));

    return {
        id: item.id,
        startDelayFrames,
        totalFrames: outroEnd,
        texts: { koOriginal: item.koOriginal, koShifted, enFinal },
        chunks,
        scenes: {
            intro: { startFrame: startDelayFrames, endFrame: startDelayFrames + introFrames },
            building: { startFrame: buildStart, endFrame: buildEnd, stepFrames },
            flip: {
                startFrame: flipStart,
                endFrame: flipEnd,
                staggerFrames: Math.round(FLIP_STAGGER_SEC * FPS * 100) / 100,
            },
            outro: { startFrame: outroStart, endFrame: outroEnd },
        },
        sfx: {
            stack: { ...sfxStack, hits: stackHits },
            sparkle: { ...sfxSparkle, startFrame: sparkleStart },
            flip: { ...sfxFlip, startFrame: flipStart },
        },
        segments,
    };
}

async function main() {
    const workDir = await mkdtemp(path.join(tmpdir(), "tts-"));
    try {
        await mkdir(AUDIO_DIR, { recursive: true });
        const voices = await listVoices();
        const sfxStack = await writeSfx(workDir, "sfx_stack", synthClickWav());
        const sfxSparkle = await writeSfx(workDir, "magical_sparkle", synthSparkleWav());
        const startDelayFrames = sec2frames(START_DELAY_SEC);

        const items = [];
        let cursor = 0;
        for (const item of ITEMS) {
            const built = await buildItem(item, { workDir, voices, sfxStack, sfxSparkle, startDelayFrames });
            // scenes/segments/sfx frames inside an item are item-local; startFrame/endFrame are global.
            items.push({ ...built, startFrame: cursor, endFrame: cursor + built.totalFrames });
            cursor += built.totalFrames;
        }

        const timeline = {
            fps: FPS,
            width: WIDTH,
            height: HEIGHT,
            totalVideoDurationFrames: cursor,
            transitionFrames: sec2frames(OUTRO_TAIL_SEC),
            timingNote:
                "Word startMs/endMs are estimated by proportional distribution of segment duration weighted by character count. They are NOT forced alignment or Whisper output. Scene boundaries are audio-driven: they extend when TTS is longer than the nominal marks. Item scenes/segments/sfx frames are item-local; item startFrame/endFrame are global.",
            items,
        };

        await writeFile(TIMELINE_PATH, JSON.stringify(timeline, null, 2) + "\n");
        for (const it of items) console.log(`${it.id}: ${it.startFrame}-${it.endFrame} (${(it.totalFrames / FPS).toFixed(2)}s)`);
        console.log(`Total ${cursor} frames (${(cursor / FPS).toFixed(2)}s). Wrote ${path.relative(ROOT, TIMELINE_PATH)}`);
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
