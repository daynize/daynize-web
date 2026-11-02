import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrameOf} from '../timeline';

/** at = gold (a point), on = orange (exactly 24 h / surface), in = coral (long span / enclosed). */
export const PREP_STYLE = {
  at: {main: '#FFE066', edge: '#FFC107', rgb: '255,213,74', tone: 'gold'},
  on: {main: '#FFB347', edge: '#FF9A1F', rgb: '255,154,31', tone: 'orange'},
  in: {main: '#FF8F66', edge: '#FF6648', rgb: '255,102,72', tone: 'coral'},
} as const;

export type RelName = 'who' | 'which' | 'that' | 'what';

/** who = teal (people), which = orange (things), that = gold (all-round glue), what = coral (~하는 것). */
export const REL = {
  who: {main: '#6AF0E2', edge: '#2EC4B6', rgb: '46,196,182', tone: 'teal', kind: 'v'},
  which: {main: '#FFB347', edge: '#FF9A1F', rgb: '255,154,31', tone: 'orange', kind: 'p'},
  that: {...PREP_STYLE.at, kind: 'y'},
  what: {...PREP_STYLE.in, kind: 'c'},
} as const;

export const span = (scene: SceneSpan, ids: string[]) => {
  const first = cueById(ids[0]);
  const last = cueById(ids[ids.length - 1]);
  return {from: first.start - scene.from, duration: last.start + last.duration - first.start};
};

/** Frame at which cue `to` starts, relative to the start of cue `from`. */
export const rel = (from: string, to: string) => cueById(to).start - cueById(from).start;

/**
 * Spoken frame of the word containing `needle` in cue `id`, relative to the start of cue `base`
 * (the first cue of the phase that is on screen). Throws if the script no longer contains it.
 */
export const wf = (base: string, id: string, needle: string, nth = 0, edge: 's' | 'e' = 's') =>
  wordFrameOf(id, needle, nth, edge) - cueById(base).start;

export const useFade = (duration: number) => {
  const frame = useCurrentFrame();
  return ramp(frame, 0, 10) * (1 - ramp(frame, duration - 10, duration));
};

export const Card: React.FC<{
  x: number;
  y: number;
  w: number;
  text: string;
  color?: string;
  bg?: string;
  size?: number;
  scale?: number;
  opacity?: number;
  glow?: number;
  border?: string;
}> = ({x, y, w, text, color = COLORS.cream, bg = 'rgba(255,246,229,0.12)', size = 56, scale = 1, opacity = 1, glow = 0, border}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - size * 0.8,
      width: w,
      height: size * 1.6,
      borderRadius: 28,
      background: bg,
      border: border ?? '2px solid rgba(255,246,229,0.35)',
      color,
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
      transform: `scale(${scale})`,
      boxShadow: glow ? `0 0 ${50 * glow}px ${color}` : '0 8px 24px rgba(10,8,30,0.3)',
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

export const Label: React.FC<{
  x: number;
  y: number;
  text: string;
  color?: string;
  size?: number;
  opacity?: number;
  align?: 'left' | 'center';
}> = ({x, y, text, color = COLORS.sand, size = 34, opacity = 1, align = 'center'}) => (
  <div
    style={{
      position: 'absolute',
      left: align === 'center' ? x - 600 : x,
      width: align === 'center' ? 1200 : undefined,
      top: y,
      textAlign: align,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      color,
      opacity,
      letterSpacing: 1,
      textShadow: '0 2px 8px rgba(10,8,30,0.6)',
    }}
  >
    {text}
  </div>
);

export const Caption: React.FC<{y: number; text: string; color?: string; size?: number; opacity?: number}> = ({
  y,
  text,
  color = COLORS.sand,
  size = 40,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      width: WIDTH,
      top: y,
      textAlign: 'center',
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      color,
      opacity,
      textShadow: '0 2px 10px rgba(10,8,30,0.65)',
    }}
  >
    {text}
  </div>
);

export interface GridItem {
  en: string;
  kr: string;
  emoji: string;
  /** Cue that contains the spoken word and the text to look for in it. */
  cue: string;
  needle: string;
}

/** 2 x 2 cards that light up one by one while the word is spoken. `tone` picks teal (-ing) or orange (-ed). */
export const WordGrid: React.FC<{
  items: GridItem[];
  base: string;
  tone: 'teal' | 'orange' | 'at' | 'on' | 'in';
  title: string;
  duration: number;
}> = ({items, base, tone, title, duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = ramp(frame, 0, 10) * (1 - ramp(frame, duration - 10, duration));
  const prep = tone === 'at' || tone === 'on' || tone === 'in' ? PREP_STYLE[tone] : null;
  const main = prep ? prep.main : tone === 'teal' ? COLORS.tealBright : COLORS.yellow;
  const edge = prep ? prep.edge : tone === 'teal' ? COLORS.teal : COLORS.orange;
  const rgb = prep ? prep.rgb : tone === 'teal' ? '46,196,182' : '255,154,31';
  const reveal = (i: number) => wordFrameOf(items[i].cue, items[i].needle) - cueById(base).start;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={WIDTH / 2} y={90} text={title} color={main} size={42} opacity={ramp(frame, 0, 14)} />
      {items.map((it, i) => {
        const lastOdd = items.length % 2 === 1 && i === items.length - 1;
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = lastOdd ? WIDTH / 2 : WIDTH / 2 + (col - 0.5) * 505;
        const cy = 280 + row * 200;
        const r = reveal(i);
        const s = spring({frame: frame - r, fps, config: {damping: 10, stiffness: 150}});
        const active = frame >= r && frame < (i < items.length - 1 ? reveal(i + 1) : r + 50);
        const f = Math.max(0, frame - r);
        return (
          <div
            key={it.en}
            style={{
              position: 'absolute',
              left: cx - 242,
              top: cy - 80,
              width: 484,
              height: 160,
              boxSizing: 'border-box',
              borderRadius: 34,
              background: active ? `rgba(${rgb},0.34)` : `rgba(${rgb},0.14)`,
              border: `3px solid ${active ? main : edge}`,
              boxShadow: active ? `0 0 44px ${edge}aa` : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '0 22px',
              fontFamily: FONT,
              opacity: Math.min(1, s * 2),
              transform: `scale(${(0.5 + 0.5 * s) * (active ? 1.05 : 1)}) translateY(${(1 - s) * 50}px)`,
            }}
          >
            <div style={{width: 80, fontSize: 70, lineHeight: 1, textAlign: 'center', transform: `translateY(${Math.sin(f / 9) * 6}px) scale(${1 + 0.06 * Math.sin(f / 7)})`}}>{it.emoji}</div>
            <div style={{display: 'flex', flexDirection: 'column', minWidth: 0}}>
              <div style={{fontSize: it.en.length > 13 ? 31 : it.en.length > 9 ? 38 : 46, fontWeight: 900, color: main, lineHeight: 1.1}}>{it.en}</div>
              <div style={{fontSize: 27, fontWeight: 600, color: COLORS.sand, whiteSpace: 'nowrap'}}>{it.kr}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
