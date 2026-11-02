import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONT, FPS, Kind, KIND_COLOR, SUBTITLE_TOP, WIDTH, HEIGHT} from './theme';
import {cueAt, ResolvedCue, stripMarkup, WordTime} from './timeline';

interface Seg {
  text: string;
  kind: Kind;
}

const parseMarkup = (s: string): Seg[] => {
  const out: Seg[] = [];
  const re = /\{([vpeyc])\|([^}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({text: s.slice(last, m.index), kind: 'e'});
    out.push({text: m[2], kind: m[1] as Kind});
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({text: s.slice(last), kind: 'e'});
  return out;
};

// A "word" is a whitespace-delimited token that may span several coloured segments.
const toWords = (s: string): Seg[][] => {
  const words: Seg[][] = [];
  let cur: Seg[] = [];
  for (const seg of parseMarkup(s)) {
    const parts = seg.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) {
        if (cur.length) words.push(cur);
        cur = [];
      } else {
        cur.push({text: p, kind: seg.kind});
      }
    }
  }
  if (cur.length) words.push(cur);
  return words;
};

interface TimedWord {
  segs: Seg[];
  /** Spoken span in seconds from the cue start (measured; see scripts/sync_timing.py). */
  from: number;
  to: number;
}

// The highlight stays on a word until the next one starts, so it never flickers over pauses.
const timeWords = (words: Seg[][], times: WordTime[], offset: number): TimedWord[] =>
  words.map((segs, i) => {
    const t = times[offset + i];
    const next = times[offset + i + 1];
    return {segs, from: t.s, to: next ? next.s : t.e};
  });

const Word: React.FC<{word: TimedWord; time: number; size: number}> = ({word, time, size}) => {
  const active = time >= word.from && time < word.to;
  const spoken = time >= word.to;
  return (
    <span
      style={{
        display: 'inline-block',
        marginRight: size * 0.36,
        transform: `scale(${active ? 1.06 : 1})`,
        transformOrigin: '50% 80%',
        opacity: spoken || active ? 1 : 0.5,
        textShadow: active ? `0 0 18px rgba(255,214,120,0.85)` : '0 2px 6px rgba(10,8,30,0.55)',
      }}
    >
      {word.segs.map((seg, i) => (
        <span
          key={i}
          style={{
            color: seg.kind === 'e' ? (active ? '#FFFFFF' : COLORS.cream) : KIND_COLOR[seg.kind],
            fontWeight: seg.kind === 'e' ? 600 : 800,
          }}
        >
          {seg.text}
        </span>
      ))}
    </span>
  );
};

const CueSubtitle: React.FC<{cue: ResolvedCue; frame: number}> = ({cue, frame}) => {
  const local = frame - cue.start;
  const krWords = toWords(cue.kr);
  const enWords = cue.en ? toWords(cue.en) : [];
  const timeKr = timeWords(krWords, cue.words, 0);
  const timeEn = timeWords(enWords, cue.words, krWords.length);
  const time = local / FPS;

  const krLen = stripMarkup(cue.kr).length;
  const krSize = cue.en ? 44 : krLen > 80 ? 42 : krLen > 55 ? 46 : 52;
  const enSize = 60;

  const opacity = interpolate(local, [0, 6, cue.duration - 5, cue.duration], [0, 1, 1, 0.85], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lift = interpolate(local, [0, 8], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        opacity,
        transform: `translateY(${lift}px)`,
        textAlign: 'center',
        fontFamily: FONT,
      }}
    >
      <div style={{fontSize: krSize, lineHeight: 1.4, wordBreak: 'keep-all', color: COLORS.sand}}>
        {timeKr.map((w, i) => (
          <Word key={i} word={w} time={time} size={krSize} />
        ))}
      </div>
      {cue.en ? (
        <div style={{fontSize: enSize, lineHeight: 1.2, letterSpacing: 0.5}}>
          {timeEn.map((w, i) => (
            <Word key={i} word={w} time={time} size={enSize} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const Subtitle: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = cueAt(frame);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: SUBTITLE_TOP,
        width: WIDTH,
        height: HEIGHT - SUBTITLE_TOP,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(20,16,44,0.55) 0%, rgba(20,16,44,0.88) 18%, rgba(14,11,34,0.94) 100%)',
          borderTop: '2px solid rgba(235,217,180,0.22)',
        }}
      />
      {cue ? <CueSubtitle cue={cue} frame={frame} /> : null}
    </div>
  );
};
