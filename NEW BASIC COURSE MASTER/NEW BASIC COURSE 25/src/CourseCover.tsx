import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import gsap from 'gsap';

export type CourseCoverProps = {
  episodeNumber: number; // e.g. 1, 2, 3...
  title: string; // e.g. "자동사"
};

export const COURSE_COVER_FRAMES = 90;

/** Official course sound (cover + "예문활용" section break). */
export const REVEAL_STING = 'sfx/MAGShim-Epic_magical_reveal_-Elevenlabs.mp3';

const BRAND = '#FF6648';
const FONT =
  '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Helvetica Neue", Arial, sans-serif';

// GSAP easing evaluated as a pure function of progress, so seeking and rendering stay deterministic.
const power3Out = gsap.parseEase('power3.out') as (t: number) => number;
const progress = (frame: number, from: number, to: number) =>
  Math.min(1, Math.max(0, (frame - from) / (to - from)));

export const CourseCover: React.FC<CourseCoverProps> = ({episodeNumber, title}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 0-15: fade-in + slide-up
  const enter = power3Out(progress(frame, 0, 15));
  // 15-75: pulse 1.00 -> 1.03 (spring), alternating every 20 frames so it keeps breathing
  const cycle = Math.max(0, frame - 15);
  const pulseIndex = Math.floor(cycle / 20);
  const pulse = spring({
    frame: cycle - pulseIndex * 20,
    fps,
    config: {damping: 12, stiffness: 140, mass: 0.7},
  });
  const pulseScale = frame < 15 ? 1 : 1 + 0.03 * (pulseIndex % 2 === 0 ? pulse : 1 - pulse);
  // 75-90: fade-out + slight scale-down toward the next scene
  const exit = progress(frame, 75, 90);
  const exitEase = exit * exit;

  const opacity = enter * (1 - exitEase);
  const slideY = (1 - enter) * 80 - exitEase * 30;
  const glow = 0.5 + 0.5 * Math.sin(frame / 8);

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(165deg, #0F0F1A 0%, #151527 55%, #1A1A2E 100%)',
        fontFamily: FONT,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '58%',
          width: 1100,
          height: 1100,
          marginLeft: -550,
          marginTop: -550,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND}33 0%, ${BRAND}10 40%, transparent 68%)`,
          opacity: (0.6 + 0.3 * glow) * (1 - exitEase),
        }}
      />

      {/* 3 s reveal sting (ElevenLabs), exactly as long as the cover */}
      <Sequence from={0} durationInFrames={COURSE_COVER_FRAMES} layout="none">
        <Audio src={staticFile(REVEAL_STING)} volume={1} />
      </Sequence>

      <AbsoluteFill style={{alignItems: 'center', opacity, transform: `translateY(${slideY}px)`}}>
        <div style={{marginTop: 260, width: '100%', display: 'flex', justifyContent: 'center'}}>
          <Img src={staticFile('logo.png')} style={{width: 300, height: 'auto', objectFit: 'contain'}} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            display: 'flex',
            justifyContent: 'center',
            transform: `translateY(-50%) scale(${pulseScale})`,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              lineHeight: 1.25,
              textAlign: 'center',
              color: '#FFFFFF',
              wordBreak: 'keep-all',
              padding: '0 70px',
              textShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}
          >
            {episodeNumber}강{' '}
            <span style={{color: BRAND, textShadow: `0 0 ${24 + 20 * glow}px ${BRAND}88`}}>{title}</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
