import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {Label, useFade, WORD, WordName} from './shared';

export const CX = WIDTH / 2;

/** A modal family (see WORD in shared.tsx), plain = cream, warn = red, sym = bare symbol (+, →). */
export type WordKind = 'plain' | WordName | 'warn' | 'sym';

export const wordStyle = (k: WordName) => ({
  bg: `linear-gradient(135deg, ${WORD[k].main}, ${WORD[k].edge})`,
  color: COLORS.ink,
  border: WORD[k].edge,
  glow: WORD[k].rgb,
});

export const STYLE: Record<WordKind, {bg: string; color: string; border: string; glow: string}> = {
  plain: {bg: 'rgba(255,246,229,0.12)', color: COLORS.cream, border: 'rgba(255,246,229,0.4)', glow: '255,246,229'},
  can: wordStyle('can'),
  will: wordStyle('will'),
  shall: wordStyle('shall'),
  may: wordStyle('may'),
  must: wordStyle('must'),
  should: wordStyle('should'),
  warn: {bg: 'rgba(255,77,90,0.22)', color: '#FF9CA0', border: '#FF4D5A', glow: '255,77,90'},
  sym: {bg: 'transparent', color: COLORS.cream, border: 'transparent', glow: '255,246,229'},
};

const WORD_KINDS = new Set<WordKind>(['can', 'will', 'shall', 'may', 'must', 'should']);

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
              const s = spring({frame: frame - it.at, fps, config: WORD_KINDS.has(it.kind) ? {damping: 8, stiffness: 150} : POP});
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

// ---- Six core modals ---------------------------------------------------------

export interface ModalCard {
  name: string;
  tag: string;
  meaning: string;
  kind: WordName;
  at: number;
}

/** Six stacked cards; each pops in when its modal is spoken and glows until the next one. */
export const ModalBoard: React.FC<{duration: number; title: string; cards: ModalCard[]}> = ({duration, title, cards}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT}}>
      <Label x={CX} y={34} text={title} size={42} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      {cards.map((c, i) => {
        const st = STYLE[c.kind];
        const s = spring({frame: frame - c.at, fps, config: {damping: 10, stiffness: 150}});
        const nextAt = cards[i + 1]?.at ?? c.at + 90;
        const active = frame >= c.at && frame < nextAt;
        const g = active ? 0.75 + 0.25 * Math.sin(frame / 6) : 0;
        return (
          <div
            key={c.name}
            style={{
              position: 'absolute',
              left: 50,
              top: 100 + i * 148,
              width: 980,
              height: 126,
              boxSizing: 'border-box',
              borderRadius: 34,
              background: `linear-gradient(rgba(${st.glow},${active ? 0.3 : 0.14}), rgba(${st.glow},${active ? 0.3 : 0.14})), rgba(18,14,44,0.86)`,
              border: `3px solid ${st.border}`,
              boxShadow: g ? `0 0 ${46 * g}px rgba(${st.glow},${0.8 * g})` : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              padding: '0 30px',
              opacity: frame >= c.at ? Math.min(1, s * 2) : 0,
              transform: `translateX(${(1 - s) * 120}px) scale(${1 + 0.02 * g})`,
            }}
          >
            <div style={{width: 62, height: 62, borderRadius: 31, background: st.bg, color: COLORS.ink, fontSize: 38, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
            <div style={{width: 340, fontSize: c.name.length > 12 ? 36 : 48, fontWeight: 900, color: WORD[c.kind].main, whiteSpace: 'nowrap'}}>{c.name}</div>
            <div style={{display: 'flex', flexDirection: 'column', minWidth: 0}}>
              <div style={{fontSize: 34, fontWeight: 800, color: COLORS.cream, whiteSpace: 'nowrap'}}>{c.tag}</div>
              <div style={{fontSize: 27, fontWeight: 600, color: COLORS.sand, whiteSpace: 'nowrap'}}>{c.meaning}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---- Present -> past form (certainty drops) ----------------------------------

export interface PairCard {
  base: string;
  past: string;
  kind: WordName;
  /** Colour of the base modal when it differs from the past form (Shall = violet, Should = green). */
  baseKind?: WordName;
  baseNote: string;
  pastNote: string;
  /** Certainty (%) of the base and the past form; draws a gauge when present. */
  pct?: [number, number];
  /** Shown instead of the gauge. */
  foot?: string;
  /** Frame at which the foot text fades in (default: just after the past form pops). */
  footAt?: number;
  baseAt: number;
  pastAt: number;
}

const Pill: React.FC<{text: string; kind: WordName; size: number; s: number; glow?: number}> = ({text, kind, size, s, glow = 0}) => {
  const st = STYLE[kind];
  return (
    <div
      style={{
        padding: `${size * 0.12}px ${size * 0.5}px`,
        borderRadius: size * 0.55,
        background: st.bg,
        color: st.color,
        border: `3px solid ${st.border}`,
        fontSize: size,
        fontWeight: 900,
        whiteSpace: 'nowrap',
        opacity: Math.min(1, s * 2),
        transform: `translateY(${(1 - s) * 40}px) scale(${(0.6 + 0.4 * s) * (1 + 0.05 * glow)})`,
        boxShadow: glow ? `0 0 ${46 * glow}px rgba(${st.glow},${0.85 * glow})` : 'none',
      }}
    >
      {text}
    </div>
  );
};

/** Stacked cards: base modal -> past form, with a certainty gauge that drops. */
export const PairBoard: React.FC<{duration: number; title: string; pairs: PairCard[]}> = ({duration, title, pairs}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT}}>
      <Label x={CX} y={34} text={title} size={42} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      {pairs.map((p, i) => {
        const st = STYLE[p.kind];
        const sBase = spring({frame: frame - p.baseAt, fps, config: {damping: 9, stiffness: 150}});
        const sPast = spring({frame: frame - p.pastAt, fps, config: {damping: 8, stiffness: 150}});
        const arrow = ramp(frame, p.pastAt - 8, p.pastAt + 4);
        const glow = frame >= p.pastAt ? ramp(frame, p.pastAt, p.pastAt + 18) * (0.75 + 0.25 * Math.sin(frame / 6)) : 0;
        const top = 100 + i * 225;
        const fill = p.pct ? p.pct[0] + (p.pct[1] - p.pct[0]) * easeInOutCubic((frame - p.pastAt) / 24) : 0;
        return (
          <div
            key={p.base}
            style={{
              position: 'absolute',
              left: 50,
              top,
              width: 980,
              height: 205,
              boxSizing: 'border-box',
              borderRadius: 34,
              background: `linear-gradient(rgba(${st.glow},0.12), rgba(${st.glow},0.12)), rgba(18,14,44,0.86)`,
              border: `2px solid rgba(${st.glow},0.5)`,
              opacity: frame >= p.baseAt - 4 ? 1 : 0,
            }}
          >
            <div style={{position: 'absolute', left: 0, width: 980, top: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 44}}>
              <Pill text={p.base} kind={p.baseKind ?? p.kind} size={50} s={frame >= p.baseAt ? sBase : 0} />
              <div style={{fontSize: 56, fontWeight: 900, color: COLORS.cream, opacity: arrow, transform: `translateX(${(1 - arrow) * -20}px)`}}>→</div>
              <Pill text={p.past} kind={p.kind} size={50} s={frame >= p.pastAt ? sPast : 0} glow={glow} />
            </div>
            <div style={{position: 'absolute', left: 30, width: 400, top: 100, textAlign: 'center', fontSize: 28, fontWeight: 700, color: COLORS.sand, opacity: frame >= p.baseAt ? 1 : 0}}>{p.baseNote}</div>
            <div style={{position: 'absolute', left: 550, width: 400, top: 100, textAlign: 'center', fontSize: 28, fontWeight: 800, color: WORD[p.kind].main, opacity: ramp(frame, p.pastAt + 4, p.pastAt + 16)}}>{p.pastNote}</div>
            {p.pct ? (
              <div style={{position: 'absolute', left: 40, top: 158, width: 900, height: 26, borderRadius: 13, background: 'rgba(255,246,229,0.14)', overflow: 'hidden', opacity: frame >= p.baseAt ? 1 : 0}}>
                <div style={{width: `${fill}%`, height: '100%', borderRadius: 13, background: `linear-gradient(90deg, ${WORD[p.kind].edge}, ${WORD[p.kind].main})`}} />
                <div style={{position: 'absolute', right: 14, top: 0, lineHeight: '26px', fontSize: 20, fontWeight: 800, color: COLORS.ink}}>{Math.round(fill)}%</div>
              </div>
            ) : (
              <div style={{position: 'absolute', left: 30, width: 920, top: 152, textAlign: 'center', fontSize: 30, fontWeight: 800, color: COLORS.yellow, opacity: ramp(frame, p.footAt ?? p.pastAt + 10, (p.footAt ?? p.pastAt + 10) + 14)}}>{p.foot}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
