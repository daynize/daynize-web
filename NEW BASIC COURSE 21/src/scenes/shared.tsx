import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrameOf} from '../timeline';

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
