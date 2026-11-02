import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {Label, useFade, WORD, WordName} from './shared';

export const CX = WIDTH / 2;

/** one = white, another = teal, other = blue, theother = orange; warn = red; which-like plain = cream. */
export type WordKind = 'plain' | WordName | 'warn' | 'sym';

const wordStyle = (k: WordName) => ({
  bg: k === 'one' ? 'linear-gradient(135deg, #FFFFFF, #D6D6E8)' : `linear-gradient(135deg, ${WORD[k].main}, ${WORD[k].edge})`,
  color: COLORS.ink,
  border: WORD[k].edge,
  glow: WORD[k].rgb,
});

const STYLE: Record<WordKind, {bg: string; color: string; border: string; glow: string}> = {
  plain: {bg: 'rgba(255,246,229,0.12)', color: COLORS.cream, border: 'rgba(255,246,229,0.4)', glow: '255,246,229'},
  one: wordStyle('one'),
  another: wordStyle('another'),
  other: wordStyle('other'),
  theother: wordStyle('theother'),
  warn: {bg: 'rgba(255,77,90,0.22)', color: '#FF9CA0', border: '#FF4D5A', glow: '255,77,90'},
  sym: {bg: 'transparent', color: COLORS.cream, border: 'transparent', glow: '255,246,229'},
};

const WORD_KINDS = new Set<WordKind>(['one', 'another', 'other', 'theother']);

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

// ---- Apple basket ------------------------------------------------------------

export interface AppleSpec {
  /** Home position inside the basket. */
  x: number;
  y: number;
  appearAt: number;
  /** Optional move out of the basket (eased over ~20 frames). */
  move?: {at: number; x: number; y: number};
  fadeAt?: number;
  glow?: {at: number; word: WordName};
}

export interface BoardLabel {
  text: string;
  word: WordName;
  at: number;
  x: number;
  y: number;
  size?: number;
}

const BASKET = {left: 215, top: 400, width: 650, height: 290};

/** Ten apples at their basket positions: 5 columns x 2 rows. */
export const basketSlots = () =>
  Array.from({length: 10}, (_, i) => ({x: 305 + (i % 5) * 117, y: 485 + Math.floor(i / 5) * 118}));

/** A basket with apples that can leave it, glow and get labelled. */
export const AppleBoard: React.FC<{duration: number; apples: AppleSpec[]; labels: BoardLabel[]; title?: string; pointerAt?: number}> = ({duration, apples, labels, title, pointerAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  const basketIn = ramp(frame, 0, 16);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT}}>
      {title ? <Label x={CX} y={50} text={title} size={42} color={COLORS.cream} opacity={ramp(frame, 0, 14)} /> : null}
      <div style={{position: 'absolute', left: BASKET.left, top: BASKET.top, width: BASKET.width, height: BASKET.height, boxSizing: 'border-box', borderRadius: '30px 30px 90px 90px', background: 'linear-gradient(180deg, rgba(140,90,40,0.35), rgba(140,90,40,0.7))', border: '5px solid #B07A3C', boxShadow: '0 14px 30px rgba(10,8,30,0.4)', opacity: basketIn, transform: `translateY(${(1 - basketIn) * 40}px)`}} />
      {apples.map((a, i) => {
        const s = spring({frame: frame - a.appearAt, fps, config: {damping: 9, stiffness: 150}});
        const m = a.move ? easeInOutCubic((frame - a.move.at) / 22) : 0;
        const x = a.x + (a.move ? (a.move.x - a.x) * m : 0);
        const y = a.y + (a.move ? (a.move.y - a.y) * m : 0) - (a.move ? Math.sin(m * Math.PI) * 40 : 0);
        const out = a.fadeAt === undefined ? 1 : 1 - ramp(frame, a.fadeAt, a.fadeAt + 14);
        const g = a.glow ? ramp(frame, a.glow.at, a.glow.at + 16) * (0.75 + 0.25 * Math.sin(frame / 6)) : 0;
        const col = a.glow ? WORD[a.glow.word].edge : '#fff';
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, fontSize: 92, lineHeight: 1, opacity: (frame >= a.appearAt ? Math.min(1, s * 2) : 0) * out, transform: `translate(-50%,-50%) scale(${(0.4 + 0.6 * s) * (1 + 0.12 * g)})`, filter: g ? `drop-shadow(0 0 ${26 * g}px ${col}) drop-shadow(0 0 ${12 * g}px ${col})` : 'drop-shadow(0 6px 10px rgba(10,8,30,0.4))'}}>
            🍎
          </div>
        );
      })}
      {labels.map((l, i) => {
        const c = WORD[l.word];
        const s = spring({frame: frame - l.at, fps, config: {damping: 8, stiffness: 150}});
        return (
          <div key={i} style={{position: 'absolute', left: l.x - 300, width: 600, top: l.y - 40, textAlign: 'center', opacity: frame >= l.at ? Math.min(1, s * 2) : 0, transform: `scale(${0.6 + 0.4 * s})`}}>
            <span style={{display: 'inline-block', padding: '6px 28px', borderRadius: 30, background: l.word === 'one' ? 'linear-gradient(135deg, #FFFFFF, #D6D6E8)' : `linear-gradient(135deg, ${c.main}, ${c.edge})`, color: COLORS.ink, fontWeight: 900, fontSize: l.size ?? 46, boxShadow: `0 0 ${30 * s}px ${c.edge}`}}>{l.text}</span>
          </div>
        );
      })}
      {pointerAt !== undefined ? (
        <div style={{position: 'absolute', left: BASKET.left + BASKET.width - 120, top: BASKET.top + 60 - Math.sin(Math.max(0, frame - pointerAt) / 5) * 10, fontSize: 120, lineHeight: 1, opacity: ramp(frame, pointerAt, pointerAt + 10), transform: 'rotate(-20deg)'}}>👆</div>
      ) : null}
    </div>
  );
};
