// Google Cloud Text-to-Speech for the 5강 "in" intro line (cue i9).
// Usage (from the course folder):
//   GOOGLE_TTS_API_KEY=... node scripts/generate-google-tts.mjs ["custom text"]
// Korean parts use ko-KR-Neural2-C; Latin words ("in") use an English voice, because the Korean
// Neural2 voice ignores SSML <lang>/<phoneme> and always reads "in" as Korean "인".
// Writes public/voice/preposition_in_intro.mp3 and the files the Remotion pipeline reads
// (public/voice/i9.mp3, parts/i9_NN_<kr|en>.mp3, manifest.json entry for i9).
// Then run: python3 scripts/sync_timing.py --only i9 --gap 0.05
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VOICE_DIR = join(ROOT, 'public', 'voice');
const CUE_ID = 'i9';
const VOICES = {
  kr: {languageCode: 'ko-KR', name: 'ko-KR-Neural2-C'},
  en: {languageCode: 'en-US', name: 'en-US-Neural2-D'},
};
const GAP = 0.05;
const FPS = 30;

const apiKey = process.env.GOOGLE_TTS_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_TTS_API_KEY is not set.');
  process.exit(1);
}

const cues = JSON.parse(readFileSync(join(ROOT, 'scripts', 'cues.json'), 'utf8'));
const cue = cues.find((c) => c.id === CUE_ID);
const defaultText = cue.kr.replace(/\{[vpehk]\|([^}]*)\}/g, '$1').replace(/\s+/g, ' ').trim();
const text = (process.argv[2] ?? defaultText).trim();

// [{lang, text}] - Latin runs go to the English voice (mirrors split_segments in generate_voice.py).
const segments = text
  .split(/([A-Za-z][A-Za-z' ]*[A-Za-z]|[A-Za-z])/)
  .map((t) => t.trim())
  .filter(Boolean)
  .map((t) => ({lang: /[A-Za-z]/.test(t) && !/[ㄱ-ㆎ가-힣]/.test(t) ? 'en' : 'kr', text: t}));

async function synthesize(lang, input) {
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey},
    body: JSON.stringify({
      input: {text: input},
      voice: VOICES[lang],
      audioConfig: {audioEncoding: 'MP3', sampleRateHertz: 44100},
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}: ${JSON.stringify(body.error ?? body)}`);
  return Buffer.from(body.audioContent, 'base64');
}

const seconds = (file) =>
  parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'}));

function merge(parts, out) {
  if (parts.length === 1) return copyFileSync(parts[0], out);
  const args = ['-y', '-loglevel', 'error'];
  const labels = [];
  let index = 0;
  parts.forEach((part, i) => {
    args.push('-i', part);
    labels.push(`[${index}:a]aresample=44100,aformat=channel_layouts=mono[a${index}]`);
    index += 1;
    if (i < parts.length - 1) {
      args.push('-f', 'lavfi', '-t', GAP.toFixed(3), '-i', 'anullsrc=r=44100:cl=mono');
      labels.push(`[${index}:a]aformat=channel_layouts=mono[a${index}]`);
      index += 1;
    }
  });
  const joined = Array.from({length: index}, (_, i) => `[a${i}]`).join('');
  args.push('-filter_complex', `${labels.join(';')};${joined}concat=n=${index}:v=0:a=1[out]`, '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '128k', out);
  execFileSync('ffmpeg', args);
}

mkdirSync(join(VOICE_DIR, 'parts'), {recursive: true});
const partPaths = [];
const segInfo = [];
for (const [n, seg] of segments.entries()) {
  const voice = VOICES[seg.lang];
  console.log(`  ${String(n + 1).padStart(2, '0')} ${seg.lang.toUpperCase()} ${voice.name}: ${seg.text}`);
  const rel = `parts/${CUE_ID}_${String(n + 1).padStart(2, '0')}_${seg.lang}.mp3`;
  const path = join(VOICE_DIR, rel);
  writeFileSync(path, await synthesize(seg.lang, seg.text));
  partPaths.push(path);
  segInfo.push({
    lang: seg.lang,
    text: seg.text,
    file: rel,
    hash: createHash('sha1').update(`google|${voice.name}|${seg.text}`).digest('hex').slice(0, 16),
    seconds: Math.round(seconds(path) * 1000) / 1000,
  });
}

const merged = join(VOICE_DIR, `${CUE_ID}.mp3`);
merge(partPaths, merged);
copyFileSync(merged, join(VOICE_DIR, 'preposition_in_intro.mp3'));

const len = seconds(merged);
const manifestPath = join(VOICE_DIR, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {fps: FPS, cues: {}};
manifest.cues[CUE_ID] = {
  segments: segInfo,
  file: `${CUE_ID}.mp3`,
  seconds: Math.round(len * 1000) / 1000,
  frames: Math.round(len * FPS),
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`-> public/voice/preposition_in_intro.mp3 (${len.toFixed(2)}s). Next: python3 scripts/sync_timing.py --only ${CUE_ID} --gap ${GAP}`);
