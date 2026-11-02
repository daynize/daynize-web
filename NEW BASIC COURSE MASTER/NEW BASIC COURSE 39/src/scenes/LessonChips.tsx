import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, WIDTH} from '../theme';
import {LESSONS} from '../timeline';
import {WORD} from './shared';

/**
 * The seven reviewed lessons as colour chips (13강 조동사 ... 19강 도치).
 * `popAt` returns the local frame at which chip i appears (or undefined = visible from the start).
 */
export const LessonChips: React.FC<{y: number; popAt: (i: number) => number; size?: number; glow?: number}> = ({y, popAt, size = 40, glow = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cols = 4;
  const cellW = 250;
  const cellH = size * 2.7;
  return (
    <>
      {LESSONS.map((l, i) => {
        const c = WORD[l.kind];
        const at = popAt(i);
        const s = spring({frame: frame - at, fps, config: {damping: 9, stiffness: 140}});
        const row = Math.floor(i / cols);
        const inRow = row === 0 ? cols : LESSONS.length - cols;
        const col = i % cols;
        const left = (WIDTH - inRow * cellW) / 2 + col * cellW;
        const pulse = glow ? 0.75 + 0.25 * Math.sin((frame - i * 5) / 6) : 0;
        return (
          <div
            key={l.no}
            style={{
              position: 'absolute',
              left: left + 8,
              width: cellW - 16,
              top: y + row * (cellH + 16),
              height: cellH,
              boxSizing: 'border-box',
              borderRadius: 30,
              background: `linear-gradient(135deg, ${c.main}, ${c.edge})`,
              color: COLORS.ink,
              fontFamily: FONT,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: frame >= at ? Math.min(1, s * 2) : 0,
              transform: `translateY(${(1 - s) * 50}px) scale(${0.6 + 0.4 * s})`,
              boxShadow: `0 0 ${24 + 40 * pulse * glow}px rgba(${c.rgb},${0.55 + 0.35 * pulse * glow})`,
            }}
          >
            <div style={{fontSize: size * 0.8, fontWeight: 800, lineHeight: 1}}>{l.no}강</div>
            <div style={{fontSize: size, fontWeight: 900, lineHeight: 1.2}}>{l.title}</div>
          </div>
        );
      })}
    </>
  );
};
