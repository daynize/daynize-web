import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {ED, ING, Label, useFade} from './shared';

export const CX = WIDTH / 2;

/** adverb = teal, adjective = orange, -ly = yellow; warn = red. */
export type WordKind = 'plain' | 'adj' | 'adv' | 'ly' | 'lyx' | 'warn' | 'sym';

const STYLE: Record<WordKind, {bg: string; color: string; border: string; glow: string}> = {
  plain: {bg: 'rgba(255,246,229,0.12)', color: COLORS.cream, border: 'rgba(255,246,229,0.4)', glow: '255,246,229'},
  adj: {bg: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, border: ED.edge, glow: ED.rgb},
  adv: {bg: `linear-gradient(135deg, ${COLORS.tealBright}, ${COLORS.teal})`, color: COLORS.ink, border: ING.edge, glow: ING.rgb},
  ly: {bg: 'linear-gradient(135deg, #FFF0A0, #FFD54A)', color: COLORS.ink, border: '#FFC107', glow: '255,213,74'},
  lyx: {bg: 'rgba(255,213,74,0.16)', color: '#FFD54A', border: '#FFC107', glow: '255,213,74'},
  warn: {bg: 'rgba(255,77,90,0.22)', color: '#FF9CA0', border: '#FF4D5A', glow: '255,77,90'},
  sym: {bg: 'transparent', color: COLORS.cream, border: 'transparent', glow: '255,246,229'},
};

export interface WordItem {
  text: string;
  kind: WordKind;
  /** Frame (local to the phase) at which the word pops in. */
  at: number;
  /** Frame at which a glow starts (optional). */
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
          <div key={r} style={{position: 'absolute', left: 0, width: WIDTH, top: row.y - size, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: size * 0.25, fontFamily: FONT}}>
            {row.items.map((it, i) => {
              const st = STYLE[it.kind];
              const s = spring({frame: frame - it.at, fps, config: it.kind === 'adv' || it.kind === 'adj' ? {damping: 8, stiffness: 150} : POP});
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
                    textDecoration: it.kind === 'lyx' ? 'line-through' : 'none',
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

const Banner: React.FC<{text: string; sub?: string; at: number; tone: 'red' | 'gold'}> = ({text, sub, at, tone}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 8, stiffness: 160}});
  const color = tone === 'red' ? '#FF9CA0' : COLORS.yellow;
  const edge = tone === 'red' ? '#FF4D5A' : '#FFC107';
  const shake = tone === 'red' ? Math.sin(Math.max(0, frame - at) * 1.9) * 6 * Math.max(0, 1 - (frame - at) / 18) : 0;
  return (
    <div style={{position: 'absolute', left: 90, width: WIDTH - 180, top: 650, boxSizing: 'border-box', padding: '16px 24px', borderRadius: 36, background: tone === 'red' ? 'rgba(255,77,90,0.2)' : 'rgba(255,213,74,0.18)', border: `3px solid ${edge}`, boxShadow: `0 0 ${40 * s}px ${edge}88`, fontFamily: FONT, textAlign: 'center', color, opacity: frame >= at ? Math.min(1, s * 2) : 0, transform: `translateX(${shake}px) scale(${0.7 + 0.3 * s})`}}>
      <div style={{fontSize: 52, fontWeight: 900}}>{text}</div>
      {sub ? <div style={{fontSize: 34, fontWeight: 700, color: COLORS.cream, marginTop: 4}}>{sub}</div> : null}
    </div>
  );
};

const WordCard: React.FC<{x: number; kind: 'adj' | 'adv'; label: string; word: string; kr: string; at: number}> = ({x, kind, label, word, kr, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = kind === 'adj' ? ED : ING;
  const s = spring({frame: frame - at, fps, config: {damping: 10, stiffness: 140}});
  const g = ramp(frame, at, at + 16) * (0.8 + 0.2 * Math.sin(frame / 6));
  return (
    <div style={{position: 'absolute', left: x - 225, top: 300, width: 450, height: 300, boxSizing: 'border-box', borderRadius: 44, background: `rgba(${c.rgb},0.2)`, border: `4px solid ${c.edge}`, boxShadow: `0 0 ${50 * g}px ${c.edge}99`, fontFamily: FONT, color: c.main, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: frame >= at ? Math.min(1, s * 2) : 0, transform: `translateY(${(1 - s) * 60}px) scale(${0.6 + 0.4 * s})`}}>
      <div style={{fontSize: 36, fontWeight: 800, color: COLORS.cream}}>{label}</div>
      <div style={{fontSize: 96, fontWeight: 900, lineHeight: 1.1}}>{word}</div>
      <div style={{fontSize: kr.length > 6 ? 38 : 52, fontWeight: 800}}>{kr}</div>
    </div>
  );
};

/** Trap 1: one word that is both an adjective and an adverb. */
export const TwinWord: React.FC<{
  duration: number;
  word: string;
  adj: {kr: string; at: number};
  adv: {kr: string; at: number};
  wordAt?: number;
  warn?: {text: string; sub?: string; at: number; tone: 'red' | 'gold'};
}> = ({duration, word, adj, adv, wordAt = 0, warn}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  const s = spring({frame: frame - wordAt, fps, config: {damping: 9, stiffness: 120}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="함정 1 · 모양이 똑같은 형용사 = 부사" size={38} color="#FF9CA0" opacity={ramp(frame, 0, 14)} />
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 120, textAlign: 'center', fontFamily: FONT, fontSize: 150, fontWeight: 900, color: COLORS.cream, textShadow: `0 0 ${40 * s}px ${COLORS.yellow}`, opacity: Math.min(1, s * 2), transform: `scale(${0.6 + 0.4 * s})`}}>
        {word}
      </div>
      <WordCard x={CX - 245} kind="adj" label="형용사" word={word} kr={adj.kr} at={adj.at} />
      <div style={{position: 'absolute', left: CX - 25, top: 410, width: 50, textAlign: 'center', fontFamily: FONT, fontSize: 70, fontWeight: 900, color: COLORS.cream, opacity: ramp(frame, adv.at, adv.at + 10)}}>=</div>
      <WordCard x={CX + 245} kind="adv" label="부사" word={word} kr={adv.kr} at={adv.at} />
      {warn ? <Banner {...warn} /> : null}
    </div>
  );
};

export interface StackItem {
  word: string;
  kr: string;
  emoji: string;
  /** Frame the card appears (the word is spoken). */
  at: number;
  /** Frame the "형용사" badge appears. */
  tagAt: number;
}

/** Trap 2: words ending in -ly that are adjectives (friendly / lovely / lonely). */
export const AdjStack: React.FC<{duration: number; items: StackItem[]; wrongAt: number; rightAt: number}> = ({duration, items, wrongAt, rightAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  const wrong = ramp(frame, wrongAt, wrongAt + 10) * (1 - ramp(frame, rightAt - 4, rightAt + 6));
  const right = ramp(frame, rightAt, rightAt + 16);
  const glow = right * (0.75 + 0.25 * Math.sin(frame / 6));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={40} text="함정 2 · -ly가 붙어도 형용사" size={38} color="#FF9CA0" opacity={ramp(frame, 0, 14)} />
      {items.map((it, i) => {
        const s = spring({frame: frame - it.at, fps, config: {damping: 10, stiffness: 140}});
        const tag = spring({frame: frame - it.tagAt, fps, config: {damping: 8, stiffness: 160}});
        const top = 110 + i * 175;
        return (
          <div key={it.word} style={{position: 'absolute', left: 90, top, width: WIDTH - 180, height: 150, boxSizing: 'border-box', borderRadius: 40, background: `rgba(${ED.rgb},${0.16 + 0.12 * glow})`, border: `3px solid ${ED.edge}`, boxShadow: `0 0 ${50 * glow}px ${ED.edge}aa`, display: 'flex', alignItems: 'center', gap: 22, padding: '0 28px', fontFamily: FONT, opacity: frame >= it.at ? Math.min(1, s * 2) : 0, transform: `translateX(${(1 - s) * -160}px) scale(${0.85 + 0.15 * s})`}}>
            <div style={{fontSize: 72, lineHeight: 1}}>{it.emoji}</div>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <div style={{fontSize: 64, fontWeight: 900, color: ED.main, lineHeight: 1.05}}>{it.word}</div>
              <div style={{fontSize: 32, fontWeight: 700, color: COLORS.sand}}>{it.kr}</div>
            </div>
            <div style={{marginLeft: 'auto', padding: '6px 24px', borderRadius: 28, background: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, fontSize: 38, fontWeight: 900, opacity: frame >= it.tagAt ? Math.min(1, tag * 2) : 0, transform: `scale(${0.6 + 0.4 * tag})`}}>형용사</div>
            <div style={{position: 'absolute', right: 28, top: -26, padding: '4px 20px', borderRadius: 26, background: '#FF4D5A', color: '#fff', fontSize: 32, fontWeight: 900, opacity: wrong, transform: `scale(${0.6 + 0.4 * wrong}) rotate(${(1 - wrong) * -10}deg)`}}>부사? ✕</div>
          </div>
        );
      })}
      <Label x={CX} y={650} text="✓ 명사를 꾸며주는 어엿한 형용사!" size={42} color={ED.main} opacity={right} />
    </div>
  );
};
