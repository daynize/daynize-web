import {FPS} from './theme';
import {CUE_DEFS, CueDef, SceneId} from './script';
import voiceTiming from './voiceTiming.json';

export * from './script';

// ---- Timing -----------------------------------------------------------------
// Everything below comes from the generated narration: src/voiceTiming.json is
// written by scripts/sync_timing.py from public/voice/manifest.json (measured mp3
// lengths) plus word start/end times measured with whisper.cpp + silencedetect.
// Re-run `python3 scripts/sync_timing.py` after regenerating any voice file.

const CUE_GAP_SEC = 0.25;

/** 2 s "예문활용" title card between the explanation (bridge) and the example story. */
export const SECTION_BREAK_FRAMES = 2 * FPS;
export const SECTION_BREAK_TITLE = '예문활용';
const DEFAULT_PAD_SEC = 0.3;

export interface WordTime {
  /** Seconds from the start of the cue's mp3. */
  s: number;
  e: number;
}

interface TimingEntry {
  seconds: number;
  words: WordTime[];
}

const timingFor = (id: string): TimingEntry => {
  const entry = (voiceTiming.cues as Record<string, TimingEntry | undefined>)[id];
  if (!entry) {
    throw new Error(`No voice timing for cue "${id}". Run scripts/generate_voice.py, then scripts/sync_timing.py.`);
  }
  return entry;
};

export interface ResolvedCue extends CueDef {
  index: number;
  /** First frame of the cue; its mp3 starts playing here. */
  start: number;
  /** Narration + hold + gap, in frames. */
  duration: number;
  /** Length of the narration mp3 in frames (rounded up, never cut). */
  audioFrames: number;
  words: WordTime[];
}

const sizes = CUE_DEFS.map((def) => {
  const {seconds} = timingFor(def.id);
  const audioFrames = Math.ceil(seconds * FPS);
  const hold = Math.round(((def.pad ?? DEFAULT_PAD_SEC) + CUE_GAP_SEC) * FPS);
  return {audioFrames, duration: audioFrames + hold};
});

export const SECTION_BREAK = {from: 0, duration: SECTION_BREAK_FRAMES};

export const CUES: ResolvedCue[] = (() => {
  let start = 0;
  return CUE_DEFS.map((def, index) => {
    if (def.scene === 'story' && CUE_DEFS[index - 1]?.scene !== 'story') {
      SECTION_BREAK.from = start;
      start += SECTION_BREAK_FRAMES;
    }
    const cue: ResolvedCue = {
      ...def,
      index,
      start,
      duration: sizes[index].duration,
      audioFrames: sizes[index].audioFrames,
      words: timingFor(def.id).words,
    };
    start += cue.duration;
    return cue;
  });
})();

export const TOTAL_FRAMES = CUES[CUES.length - 1].start + CUES[CUES.length - 1].duration;

/** The cue being narrated at `frame`, or undefined in silent gaps such as the section break. */
export const cueAt = (frame: number): ResolvedCue | undefined =>
  CUES.find((c) => frame >= c.start && frame < c.start + c.duration);

export const cueById = (id: string): ResolvedCue => {
  const cue = CUES.find((c) => c.id === id);
  if (!cue) throw new Error(`Unknown cue ${id}`);
  return cue;
};

/** Absolute frame at which word `index` of the cue starts (`edge: 'e'` = ends) being spoken. */
export const wordFrame = (id: string, index: number, edge: 's' | 'e' = 's'): number => {
  const cue = cueById(id);
  const word = cue.words[index];
  if (!word) throw new Error(`Cue ${id} has no word #${index}`);
  return cue.start + Math.round(word[edge] * FPS);
};

export interface SceneSpan {
  id: SceneId;
  from: number;
  duration: number;
  cues: ResolvedCue[];
}

export const SCENES: SceneSpan[] = (['intro', 'bridge', 'story', 'outro'] as SceneId[]).map((id) => {
  const cues = CUES.filter((c) => c.scene === id);
  const from = cues[0].start;
  const end = cues[cues.length - 1].start + cues[cues.length - 1].duration;
  return {id, from, duration: end - from, cues};
});
