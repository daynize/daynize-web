import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, easeInOutCubic, FONT, FPS, ramp, WIDTH} from '../theme';
import {PAIR_CATS, PairDef, ResolvedCue, Role, stripMarkup} from '../timeline';
import {STYLE, WordKind} from './lesson';

const ROLE_KIND: Record<Role, WordKind> = {s: 'subj', v: 'verb', a: 'verb', e: 'neg', o: 'plain'};
const GLIDE = 18;
const SENTENCE_Y = 400;

/** Pill widths in em units; spelling differences make this an estimate, so it is deliberately generous. */
const unitWidth = (text: string) => text.length * 0.6 + 0.95;
const GAP = 0.28;

const layout = (texts: string[], fs: number) => {
  const widths = texts.map((t) => unitWidth(t) * fs);
  const total = widths.reduce((n, x) => n + x, 0) + GAP * fs * (texts.length - 1);
  let x = (WIDTH - total) / 2;
  return widths.map((wd) => {
    const left = x;
    x += wd + GAP * fs;
    return {left, width: wd};
  });
};

/**
 * Short-sentence card: the original sentence (subject teal -> verb orange) is spoken word by word, then the emphasis word
 * (coral) pops to the front while subject and verb cross over (subject hops above, verb dips below) and the auxiliary
 * pops in between. All timing comes from the measured word times of the cue (Korean meaning, original, inverted).
 */
export const InversionCard: React.FC<{pair: PairDef; cue: ResolvedCue}> = ({pair, cue}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = cue.duration;
  const krWords = stripMarkup(pair.kr).split(/\s+/).filter(Boolean).length;
  const n1 = pair.orig.length;
  const at = (i: number) => Math.round(cue.words[krWords + i].s * FPS);
  const T = at(n1);

  const maxUnits = Math.max(
    ...[pair.orig, pair.inv].map((s) => s.reduce((n, t) => n + unitWidth(t.text), 0) + GAP * (s.length - 1)),
  );
  const fs = Math.min(76, Math.floor(980 / maxUnits));
  const posO = layout(pair.orig.map((t) => t.text), fs);
  const posI = layout(pair.inv.map((t) => t.text), fs);

  const p = easeInOutCubic((frame - T) / GLIDE);
  const inverted = frame >= T;
  const cat = PAIR_CATS[pair.cat];
  const fade = ramp(frame, 0, 8) * (1 - ramp(frame, d - 8, d));
  const labelIn = ramp(frame, T - 2, T + 8);

  const pill = (key: string, text: string, role: Role, left: number, width: number, opts: {y?: number; scale?: number; opacity: number; glow?: number}) => {
    const st = STYLE[ROLE_KIND[role]];
    return (
      <div
        key={key}
        style={{
          position: 'absolute',
          left,
          width,
          top: SENTENCE_Y - fs * 0.62 + (opts.y ?? 0),
          height: fs * 1.24,
          borderRadius: fs * 0.6,
          background: st.bg,
          border: `3px solid ${st.border}`,
          color: st.color,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: fs,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          opacity: opts.opacity,
          transform: `scale(${opts.scale ?? 1})`,
          boxShadow: opts.glow ? `0 0 ${44 * opts.glow}px rgba(${st.glow},${0.9 * opts.glow})` : '0 8px 22px rgba(10,8,30,0.35)',
        }}
      >
        {text}
      </div>
    );
  };

  const nodes: React.ReactNode[] = [];
  pair.orig.forEach((t, i) => {
    const j = pair.inv.findIndex((x) => x.id === t.id);
    const appear = spring({frame: frame - at(i), fps, config: {damping: 11, stiffness: 150}});
    const visible = frame >= at(i);
    if (j < 0) {
      // only in the original (e.g. "it" in "I realized it only then"): fades out when the inversion starts
      const out = 1 - ramp(frame, T, T + 10);
      nodes.push(pill(`o${i}`, t.text, t.role, posO[i].left, posO[i].width, {opacity: visible ? Math.min(1, appear * 2) * out : 0, scale: 0.7 + 0.3 * appear, y: (1 - appear) * 40}));
      return;
    }
    const left = posO[i].left + (posI[j].left - posO[i].left) * p;
    const width = posO[i].width + (posI[j].width - posO[i].width) * p;
    const arc = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
    const hop = t.role === 's' ? -arc * 78 : t.role === 'v' || t.role === 'a' ? arc * 78 : 0;
    const isEmphasis = t.role === 'e';
    const pop = isEmphasis ? 1 + 0.32 * arc : 1;
    const glow = isEmphasis && inverted ? ramp(frame, T, T + 12) * (0.7 + 0.3 * Math.sin(frame / 5)) : 0;
    nodes.push(
      pill(`o${i}`, p < 0.5 ? t.text : pair.inv[j].text, t.role, left, width, {
        opacity: visible ? Math.min(1, appear * 2) : 0,
        scale: (0.7 + 0.3 * appear) * pop,
        y: (1 - appear) * 40 + hop,
        glow,
      }),
    );
  });

  pair.inv.forEach((t, j) => {
    if (pair.orig.some((x) => x.id === t.id)) return;
    // only in the inverted sentence: the auxiliary (did / does) pops in between when it is spoken
    const when = at(n1 + j);
    const s = spring({frame: frame - when, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
    nodes.push(
      <React.Fragment key={`n${j}`}>
        <Sequence from={when} durationInFrames={24}>
          <Audio src={staticFile('sfx/pop.wav')} volume={0.55} />
        </Sequence>
        {pill(`n${j}`, t.text, t.role, posI[j].left, posI[j].width, {opacity: frame >= when ? Math.min(1, s * 2) : 0, scale: 0.4 + 0.6 * s, y: (1 - s) * -150, glow: frame >= when ? ramp(frame, when, when + 10) * 0.6 : 0})}
      </React.Fragment>,
    );
  });

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT}}>
      <Sequence from={T} durationInFrames={30}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.5} />
      </Sequence>

      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 60, textAlign: 'center'}}>
        <div style={{display: 'inline-block', padding: '6px 28px', borderRadius: 26, border: `2px solid ${STYLE.neg.border}`, background: 'rgba(255,102,72,0.14)', color: '#FF8F66', fontSize: 30, fontWeight: 800}}>{cat.label}</div>
      </div>

      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 150, textAlign: 'center', fontSize: 46, fontWeight: 900}}>
        <span style={{position: 'absolute', left: 0, width: WIDTH, color: COLORS.sand, opacity: 1 - labelIn}}>원래 문장</span>
        <span style={{position: 'absolute', left: 0, width: WIDTH, color: '#FF8F66', opacity: labelIn, textShadow: '0 0 22px rgba(255,102,72,0.7)'}}>도치 문장 🔄</span>
      </div>

      {nodes}

      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 560, textAlign: 'center', fontSize: 40, fontWeight: 800}}>
        <span style={{position: 'absolute', left: 0, width: WIDTH, color: COLORS.cream, opacity: 1 - labelIn}}>
          <span style={{color: STYLE.subj.border}}>주어</span> + <span style={{color: STYLE.verb.border}}>동사</span>
        </span>
        <span style={{position: 'absolute', left: 0, width: WIDTH, color: COLORS.cream, opacity: labelIn}}>{cat.form}</span>
      </div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 660, textAlign: 'center', fontSize: 34, fontWeight: 700, color: COLORS.yellow, opacity: labelIn}}>{cat.note}</div>
    </div>
  );
};
