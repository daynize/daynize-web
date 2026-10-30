import React, {useMemo} from 'react';
import {AbsoluteFill, interpolateColors, useCurrentFrame} from 'remotion';
import {GROUND_Y, hash, Mood, MOODS, STAGE_DY, STAGE_H, WIDTH} from './theme';
import {CUES} from './timeline';

const BLEND_FRAMES = 30;

const useMood = (frame: number): Mood => {
  let idx = CUES.findIndex((c) => frame >= c.start && frame < c.start + c.duration);
  if (idx < 0) idx = Math.max(0, CUES.filter((c) => c.start <= frame).length - 1); // silent gap: keep the last mood
  const cue = CUES[idx];
  const prev = CUES[Math.max(0, idx - 1)];
  const cur = MOODS[cue.mood];
  const t = Math.min(1, Math.max(0, (frame - cue.start) / BLEND_FRAMES));
  if (prev.mood === cue.mood || t >= 1) return cur;
  const old = MOODS[prev.mood];
  const mix = (a: string, b: string) => interpolateColors(t, [0, 1], [a, b]);
  return {
    top: mix(old.top, cur.top),
    mid: mix(old.mid, cur.mid),
    bottom: mix(old.bottom, cur.bottom),
    glow: mix(old.glow, cur.glow),
    building: mix(old.building, cur.building),
    windows: mix(old.windows, cur.windows),
  };
};

interface Building {
  x: number;
  w: number;
  h: number;
  windows: {x: number; y: number; on: number}[];
}

const makeSkyline = (seed: number, minH: number, maxH: number): Building[] => {
  const out: Building[] = [];
  let x = -80;
  let i = 0;
  while (x < 4800) {
    const w = 90 + hash(seed + i) * 110;
    const h = minH + hash(seed + i * 3.1) * (maxH - minH);
    const windows: Building['windows'] = [];
    for (let wy = 26; wy < h - 20; wy += 34) {
      for (let wx = 14; wx < w - 22; wx += 28) {
        windows.push({x: wx, y: wy, on: hash(seed * 7 + i * 31 + wx * 3 + wy)});
      }
    }
    out.push({x, w, h, windows});
    x += w + 8 + hash(seed + i * 9) * 20;
    i += 1;
  }
  return out;
};

const Skyline: React.FC<{
  buildings: Building[];
  color: string;
  windowColor: string;
  offset: number;
  base: number;
  opacity: number;
  frame: number;
  windowDensity: number;
}> = ({buildings, color, windowColor, offset, base, opacity, frame, windowDensity}) => (
  <svg
    width={WIDTH}
    height={STAGE_H}
    style={{position: 'absolute', left: 0, top: 0, opacity}}
    viewBox={`0 0 ${WIDTH} ${STAGE_H}`}
  >
    <g transform={`translate(${offset},0)`}>
      {buildings.map((b, i) => (
        <g key={i} transform={`translate(${b.x},${base - b.h})`}>
          <rect width={b.w} height={b.h + 200} rx={4} fill={color} />
          {b.windows.map((win, j) =>
            win.on < windowDensity ? (
              <rect
                key={j}
                x={win.x}
                y={win.y}
                width={12}
                height={16}
                rx={2}
                fill={windowColor}
                opacity={0.55 + 0.45 * Math.sin(frame / 22 + win.on * 40)}
              />
            ) : null,
          )}
        </g>
      ))}
    </g>
  </svg>
);

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const mood = useMood(frame);
  const far = useMemo(() => makeSkyline(3, 90, 210), []);
  const near = useMemo(() => makeSkyline(11, 60, 150), []);
  const stars = useMemo(
    () => Array.from({length: 46}, (_, i) => ({x: hash(i) * WIDTH, y: hash(i + 99) * (GROUND_Y + STAGE_DY - 300), r: 1 + hash(i + 7) * 2.2, p: hash(i + 3) * 6})),
    [],
  );

  const ground = GROUND_Y + STAGE_DY;
  const sunY = 300 + STAGE_DY + Math.sin(frame / 150) * 14;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WIDTH,
          height: STAGE_H + 40,
          background: `linear-gradient(180deg, ${mood.top} 0px, ${mood.mid} ${ground * 0.55}px, ${mood.bottom} ${ground}px, ${mood.bottom} 100%)`,
        }}
      />
      <svg width={WIDTH} height={STAGE_H} style={{position: 'absolute', left: 0, top: 0}}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF6E5" opacity={0.35 + 0.35 * Math.sin(frame / 18 + s.p)} />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: WIDTH * 0.72,
          top: sunY - 150,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${mood.glow} 0%, ${mood.glow}88 30%, transparent 70%)`,
          opacity: 0.8,
        }}
      />
      <Skyline buildings={far} color={mood.building} windowColor={mood.windows} offset={-frame * 0.12} base={ground - 20} opacity={0.55} frame={frame} windowDensity={0.15} />
      <Skyline buildings={near} color={mood.building} windowColor={mood.windows} offset={-frame * 0.3} base={ground + 10} opacity={0.95} frame={frame} windowDensity={0.4} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: ground,
          width: WIDTH,
          height: STAGE_H - ground + 40,
          background: `linear-gradient(180deg, ${mood.building} 0%, #0d0b25 100%)`,
          borderTop: `3px solid ${mood.glow}55`,
        }}
      />
      {/* Soft vignette keeps the centred sentence readable on bright moods. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WIDTH,
          height: STAGE_H,
          background: 'radial-gradient(ellipse at 50% 42%, rgba(12,10,36,0.34) 0%, rgba(12,10,36,0.05) 55%, rgba(12,10,36,0.3) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
