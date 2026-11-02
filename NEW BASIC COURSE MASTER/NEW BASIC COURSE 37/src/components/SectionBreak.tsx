import React from 'react';
import {Audio, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {REVEAL_STING} from '../CourseCover';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {SECTION_BREAK_TITLE} from '../timeline';

const CARD_W = 820;
const CARD_H = 330;
// Vertical centre of the card inside the motion stage (the stage is 1300 px tall).
const CENTER_Y = 650;

/** 2 s mid-screen title card that tells the viewer the explanation is over and the examples begin. */
export const SectionBreak: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({frame, fps, config: {damping: 12, stiffness: 130, mass: 0.8}});
  const out = ramp(frame, duration - 10, duration);
  const opacity = Math.min(1, enter * 1.6) * (1 - out);
  const scale = (0.7 + 0.3 * enter) * (1 + 0.04 * out);
  const lineW = ramp(frame, 8, 26) * 300;
  const glow = 0.6 + 0.4 * Math.sin(frame / 5);

  return (
    <div style={{position: 'absolute', inset: 0}}>
      {/* Same sting as the cover; the 3 s file is cut to the 2 s card with a short fade-out. */}
      <Audio
        src={staticFile(REVEAL_STING)}
        volume={(f) => 1 - Math.min(1, Math.max(0, (f - (duration - 12)) / 12))}
      />
      <div
        style={{
          position: 'absolute',
          left: (WIDTH - CARD_W) / 2,
          top: CENTER_Y - CARD_H / 2,
          width: CARD_W,
          height: CARD_H,
          boxSizing: 'border-box',
          borderRadius: 48,
          background: 'linear-gradient(145deg, rgba(40,28,70,0.88), rgba(20,14,44,0.92))',
          border: `3px solid ${COLORS.orange}`,
          boxShadow: `0 0 ${50 + 30 * glow}px rgba(255,154,31,${0.45 + 0.2 * glow}), 0 24px 60px rgba(8,6,24,0.55)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          fontFamily: FONT,
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div style={{fontSize: 34, fontWeight: 700, letterSpacing: 8, color: COLORS.sand, opacity: ramp(frame, 6, 18)}}>
          STORY · 도시동화
        </div>
        <div
          style={{
            fontSize: 132,
            fontWeight: 900,
            lineHeight: 1,
            color: COLORS.yellow,
            textShadow: `0 0 ${24 + 20 * glow}px rgba(255,154,31,0.85)`,
          }}
        >
          {SECTION_BREAK_TITLE}
        </div>
        <div style={{width: lineW, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${COLORS.orange}, ${COLORS.yellow})`}} />
      </div>
    </div>
  );
};
