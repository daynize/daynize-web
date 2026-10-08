// macOS 전용: say(Jian/Samantha) -> ffmpeg 믹스 -> Remotion 렌더 -> courses.json 갱신
// 사용법: node scripts/build.mjs [audio|render|meta|all] [field-01 ...]
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LESSONS } from "./lessons.mjs";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.resolve(ROOT, "..");
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const TIMELINE_DIR = path.join(ROOT, "src", "timelines");
const OUT_DIR = path.join(SITE, "VIDEOS", "field-specific");
const COURSES = path.join(SITE, "courses.json");

const FPS = 30;
const TARGET_SEC = 30;
const LEAD_SEC = 0.4; // 시작 전 여유
const KO_TO_EN_GAP = 0.4; // 한국어 안내 후 영어 시작까지
const REST_SEC = 3; // 문장 간 휴식
const TAIL_SEC = 0.5;
const KO_RATE = Number(process.env.KO_RATE || 160);
const EN_RATE = Number(process.env.EN_RATE || 150);
const KO_VOICES = ["Jian (Premium)", "Jian (Enhanced)"];
const EN_VOICE = "Samantha";

const [mode = "all", ...ids] = process.argv.slice(2);
const targets = ids.length ? LESSONS.filter((l) => ids.includes(l.id)) : LESSONS;

const duration = async (file) => {
    const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
    return Number(stdout.trim());
};

const speak = async (voices, rate, text, out) => {
    let lastError;
    for (const voice of voices) {
        try {
            await run("say", ["-v", voice, "-r", String(rate), "-o", out, "--data-format=LEI16@44100", text]);
            return voice;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};

const buildAudio = async (lesson) => {
    const tmp = await mkdtemp(path.join(tmpdir(), `${lesson.id}-`));
    try {
        const clips = [];
        const sentences = [];
        let cursor = LEAD_SEC;
        for (let i = 0; i < lesson.sentences.length; i++) {
            const { ko, en } = lesson.sentences[i];
            const koFile = path.join(tmp, `ko${i}.wav`);
            const enFile = path.join(tmp, `en${i}.wav`);
            await speak(KO_VOICES, KO_RATE, ko, koFile);
            await speak([EN_VOICE], EN_RATE, en, enFile);
            const koDur = await duration(koFile);
            const enDur = await duration(enFile);
            const T = Math.ceil(enDur * 10) / 10; // 영어 발화 구간 T
            const blockStart = i === 0 ? 0 : cursor;
            const koStart = cursor;
            const koEnd = koStart + koDur;
            const enStart = koEnd + KO_TO_EN_GAP;
            const enEnd = enStart + T;
            const followEnd = enEnd + (T + 1); // 따라하기 구간 T+1초 무음
            const restEnd = followEnd + (i < lesson.sentences.length - 1 ? REST_SEC : 0);
            clips.push({ file: koFile, at: koStart }, { file: enFile, at: enStart });
            sentences.push({ ko, en, T, blockStart, koStart, koEnd, enStart, enEnd, followEnd, restEnd });
            cursor = restEnd;
        }
        const totalSec = Math.max(TARGET_SEC, Math.ceil(cursor + TAIL_SEC));
        const filter = clips.map((c, i) => `[${i}:a]adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`).join(";")
            + `;${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:normalize=0,apad=whole_dur=${totalSec},atrim=0:${totalSec}[out]`;
        await mkdir(AUDIO_DIR, { recursive: true });
        await run("ffmpeg", ["-y", ...clips.flatMap((c) => ["-i", c.file]), "-filter_complex", filter, "-map", "[out]", "-ar", "44100", "-ac", "1", path.join(AUDIO_DIR, `${lesson.id}.wav`)]);
        const timeline = { id: lesson.id, title: lesson.title, episode: Number(lesson.id.slice(-2)), totalSec, speechEndSec: Number(cursor.toFixed(2)), audioFile: `audio/${lesson.id}.wav`, sentences };
        await mkdir(TIMELINE_DIR, { recursive: true });
        await writeFile(path.join(TIMELINE_DIR, `${lesson.id}.json`), JSON.stringify(timeline, null, 2));
        console.log(`${lesson.id}: 음성 종료 ${cursor.toFixed(1)}s / 영상 ${totalSec}s${cursor + TAIL_SEC > TARGET_SEC ? "  ⚠ 30초 초과" : ""}`);
    } finally {
        await rm(tmp, { recursive: true, force: true });
    }
};

const renderVideo = async (lesson) => {
    await mkdir(OUT_DIR, { recursive: true });
    const out = path.join(OUT_DIR, `${lesson.id}.mp4`);
    await run("npx", ["remotion", "render", "src/index.ts", "FieldVideo", out, `--props=${path.join(TIMELINE_DIR, `${lesson.id}.json`)}`, "--codec=h264", "--log=error"], { cwd: ROOT, maxBuffer: 1 << 26 });
    console.log(`${lesson.id}: ${path.relative(SITE, out)} ${(await duration(out)).toFixed(1)}s`);
};

const updateCourses = async () => {
    const data = JSON.parse(await readFile(COURSES, "utf8"));
    const category = data.find((c) => c.categoryId === "situations");
    for (const lesson of LESSONS) {
        const item = category.lessons.find((l) => l.id === lesson.id);
        if (!item) throw new Error(`courses.json에 ${lesson.id} 항목이 없습니다.`);
        item.videoUrl = `VIDEOS/field-specific/${lesson.id}.mp4`;
        item.script = lesson.sentences.map(({ ko, en }) => ({ ko, en }));
    }
    await writeFile(COURSES, `${JSON.stringify(data, null, 4)}\n`);
    console.log("courses.json 갱신 완료");
};

if (mode === "audio" || mode === "all") for (const lesson of targets) await buildAudio(lesson);
if (mode === "render" || mode === "all") for (const lesson of targets) await renderVideo(lesson);
if (mode === "meta" || mode === "all") await updateCourses();
