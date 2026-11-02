import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Label, PREP, PrepName, useFade} from './shared';

export const CX = WIDTH / 2;

/** The eight prepositions use their own colour; which = bright plain; warn = red; lonely = faded preposition. */
export type WordKind = 'plain' | PrepName | 'which' | 'warn' | 'sym' | 'lonely';

const prepStyle = (k: PrepName) => ({
  bg: `linear-gradient(135deg, ${PREP[k].main}, ${PREP[k].edge})`,
  color: COLORS.ink,
  border: PREP[k].edge,
  glow: PREP[k].rgb,
});

const STYLE: Record<WordKind, {bg: string; color: string; border: string; glow: string}> = {
  plain: {bg: 'rgba(255,246,229,0.12)', color: COLORS.cream, border: 'rgba(255,246,229,0.4)', glow: '255,246,229'},
  which: {bg: 'rgba(255,246,229,0.2)', color: '#FFFFFF', border: 'rgba(255,246,229,0.75)', glow: '255,246,229'},
  in: prepStyle('in'),
  on: prepStyle('on'),
  at: prepStyle('at'),
  of: prepStyle('of'),
  for: prepStyle('for'),
  from: prepStyle('from'),
  by: prepStyle('by'),
  with: prepStyle('with'),
  warn: {bg: 'rgba(255,77,90,0.22)', color: '#FF9CA0', border: '#FF4D5A', glow: '255,77,90'},
  lonely: {bg: 'rgba(106,240,226,0.12)', color: PREP.in.main, border: PREP.in.edge, glow: '46,196,182'},
  sym: {bg: 'transparent', color: COLORS.cream, border: 'transparent', glow: '255,246,229'},
};

const PREP_KINDS = new Set<WordKind>(['in', 'on', 'at', 'of', 'for', 'from', 'by', 'with']);

export interface WordItem {
  text: string;
  kind: WordKind;
  /** Frame (local to the phase) at which the word pops in. */
  at: number;
  glowAt?: number;
}

export interface EmojiItem {
  emoji: string;
  x: number;
  y: number;
  size: number;
  at: number;
  motion?: 'float' | 'pulse';
}

export interface RowDef {
  y: number;
  size?: number;
  items: WordItem[];
}

const POP = {damping: 11, stiffness: 140};

/** A phase made of centred rows of word pills that pop in when they are spoken. */
export const Demo: React.FC<{
  duration: number;
  title?: {text: string; color?: string; at?: number; size?: number};
  rows?: RowDef[];
  emojis?: EmojiItem[];
  footer?: {text: string; color?: string; at: number; size?: number; y?: number};
}> = ({duration, title, rows = [], emojis = [], footer}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      {title ? (
        <Label x={CX} y={60} text={title.text} size={title.size ?? 44} color={title.color ?? COLORS.cream} opacity={ramp(frame, title.at ?? 0, (title.at ?? 0) + 14)} />
      ) : null}
      {emojis.map((e, i) => {
        const s = spring({frame: frame - e.at, fps, config: POP});
        const f = Math.max(0, frame - e.at);
        const bob = e.motion === 'float' ? Math.sin(f / 14 + i) * 10 : 0;
        const pulse = e.motion === 'pulse' ? 1 + 0.08 * Math.sin(f / 6 + i) : 1;
        return (
          <div key={i} style={{position: 'absolute', left: e.x, top: e.y + bob, fontSize: e.size, lineHeight: 1, opacity: frame >= e.at ? Math.min(1, s * 2) : 0, transform: `translate(-50%,-50%) scale(${(0.4 + 0.6 * s) * pulse})`, filter: 'drop-shadow(0 8px 14px rgba(10,8,30,0.4))'}}>
            {e.emoji}
          </div>
        );
      })}
      {rows.map((row, r) => {
        const size = row.size ?? 54;
        return (
          <div key={r} style={{position: 'absolute', left: 0, width: WIDTH, top: row.y - size, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', rowGap: size * 0.2, columnGap: size * 0.25, fontFamily: FONT}}>
            {row.items.map((it, i) => {
              const st = STYLE[it.kind];
              const s = spring({frame: frame - it.at, fps, config: PREP_KINDS.has(it.kind) ? {damping: 8, stiffness: 150} : POP});
              const g = it.glowAt === undefined ? 0 : ramp(frame, it.glowAt, it.glowAt + 18) * (0.75 + 0.25 * Math.sin(frame / 6));
              const sym = it.kind === 'sym';
              return (
                <div
                  key={i}
                  style={{
                    padding: sym ? '0 6px' : `${size * 0.14}px ${size * 0.42}px`,
                    borderRadius: size * 0.5,
                    background: st.bg,
                    color: st.color,
                    border: sym ? 'none' : `3px solid ${st.border}`,
                    fontWeight: 900,
                    fontSize: sym ? size * 1.1 : size,
                    whiteSpace: 'nowrap',
                    boxShadow: g ? `0 0 ${50 * g}px rgba(${st.glow},${0.9 * g})` : 'none',
                    opacity: frame >= it.at ? Math.min(1, s * 2) : 0,
                    transform: `translateY(${(1 - s) * 50}px) scale(${(0.6 + 0.4 * s) * (1 + 0.05 * g)})`,
                  }}
                >
                  {it.text}
                </div>
              );
            })}
          </div>
        );
      })}
      {footer ? (
        <Label x={CX} y={footer.y ?? 640} text={footer.text} size={footer.size ?? 44} color={footer.color ?? COLORS.yellow} opacity={ramp(frame, footer.at, footer.at + 14)} />
      ) : null}
    </div>
  );
};

/** A big card for one "<전치사> which" with its meaning, used when each one is introduced. */
export const MeaningCard: React.FC<{
  duration: number;
  prep: PrepName;
  title: string;
  lines: {text: string; at: number}[];
  at: number;
}> = ({duration, prep, title, lines, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  const c = PREP[prep];
  const s = spring({frame: frame - at, fps, config: {damping: 9, stiffness: 130}});
  const g = ramp(frame, at, at + 16) * (0.8 + 0.2 * Math.sin(frame / 6));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: 90, top: 90, width: WIDTH - 180, height: 520, boxSizing: 'border-box', borderRadius: 56, background: `rgba(${c.rgb},0.18)`, border: `4px solid ${c.edge}`, boxShadow: `0 0 ${60 * g}px ${c.edge}99`, fontFamily: FONT, color: c.main, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, opacity: frame >= at ? Math.min(1, s * 2) : 0, transform: `scale(${0.7 + 0.3 * s})`}}>
        <div style={{fontSize: 120, fontWeight: 900, lineHeight: 1}}>{title}</div>
        {lines.map((l, i) => (
          <div key={i} style={{fontSize: 52, fontWeight: 800, color: COLORS.cream, textAlign: 'center', opacity: ramp(frame, l.at, l.at + 12), transform: `translateY(${(1 - ramp(frame, l.at, l.at + 12)) * 20}px)`}}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Example card: the preposition + meaning, the English sentence (pill coloured) and its Korean gloss. */
export const SampleCard: React.FC<{
  duration: number;
  prep: PrepName;
  label: string;
  emoji: string;
  left: string;
  rest: string;
  gloss: string;
  titleAt: number;
  labelAt: number;
  leftAt: number;
  pillAt: number;
  restAt: number;
  glossAt: number;
}> = ({duration, prep, label, emoji, left, rest, gloss, titleAt, labelAt, leftAt, pillAt, restAt, glossAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  const c = PREP[prep];
  const s = spring({frame: frame - titleAt, fps, config: {damping: 9, stiffness: 130}});
  const pill = spring({frame: frame - pillAt, fps, config: {damping: 8, stiffness: 150}});
  const g = ramp(frame, pillAt, pillAt + 16) * (0.8 + 0.2 * Math.sin(frame / 6));
  const word = (at: number): React.CSSProperties => ({opacity: ramp(frame, at, at + 10), transform: `translateY(${(1 - ramp(frame, at, at + 10)) * 24}px)`});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 120, top: 40, width: WIDTH - 240, height: 250, boxSizing: 'border-box', borderRadius: 48, background: `rgba(${c.rgb},0.2)`, border: `4px solid ${c.edge}`, boxShadow: `0 0 ${50 * g}px ${c.edge}99`, color: c.main, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: frame >= titleAt ? Math.min(1, s * 2) : 0, transform: `scale(${0.7 + 0.3 * s})`}}>
        <div style={{fontSize: 60, lineHeight: 1}}>{emoji}</div>
        <div style={{fontSize: 96, fontWeight: 900, lineHeight: 1.05}}>{prep} which</div>
        <div style={{fontSize: 44, fontWeight: 800, color: COLORS.cream, opacity: ramp(frame, labelAt, labelAt + 12)}}>{label}</div>
      </div>
      <div style={{position: 'absolute', left: 50, width: WIDTH - 100, top: 350, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '8px 16px', fontSize: 58, fontWeight: 800, color: COLORS.cream, textShadow: '0 2px 10px rgba(10,8,30,0.6)'}}>
        <span style={word(leftAt)}>{left}</span>
        <span style={{display: 'inline-block', padding: '2px 22px', borderRadius: 26, background: `linear-gradient(135deg, ${c.main}, ${c.edge})`, color: COLORS.ink, textShadow: 'none', boxShadow: `0 0 ${40 * g}px ${c.edge}`, opacity: frame >= pillAt ? Math.min(1, pill * 2) : 0, transform: `scale(${0.6 + 0.4 * pill})`}}>{prep} which</span>
        <span style={word(restAt)}>{rest}</span>
      </div>
      <div style={{position: 'absolute', left: 90, width: WIDTH - 180, top: 590, textAlign: 'center', fontSize: 42, fontWeight: 700, color: COLORS.sand, textShadow: '0 2px 8px rgba(10,8,30,0.6)', opacity: ramp(frame, glossAt, glossAt + 14)}}>
        → {gloss}
      </div>
    </div>
  );
};
