import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, GROUND_Y} from '../theme';

interface ActorProps {
  who: 'he' | 'she';
  x: number;
  flip?: boolean;
  walking?: boolean;
  wave?: boolean;
  scale?: number;
  lift?: number;
  opacity?: number;
  /** Phase offset so two actors never bob in lockstep. */
  phase?: number;
}

const SKIN = '#F4C9A0';

// Minimal storybook silhouette: big head, soft body, swinging legs/arms.
export const Actor: React.FC<ActorProps> = ({who, x, flip, walking, wave, scale = 1, lift = 0, opacity = 1, phase = 0}) => {
  const frame = useCurrentFrame() + phase;
  const body = who === 'he' ? COLORS.he : COLORS.she;
  const hair = who === 'he' ? '#2A2231' : '#4A2B2B';
  const swing = walking ? Math.sin(frame / 3.2) * 24 : 0;
  const bob = walking ? Math.abs(Math.sin(frame / 3.2)) * -9 : Math.sin(frame / 22) * -3;
  const waveA = wave ? -120 + Math.sin(frame / 4) * 22 : 20;

  return (
    <svg
      width={220}
      height={300}
      viewBox="-110 -250 220 300"
      style={{
        position: 'absolute',
        left: x - 110,
        top: GROUND_Y - 238 - lift,
        overflow: 'visible',
        opacity,
        transform: `scale(${flip ? -scale : scale}, ${scale})`,
        transformOrigin: '110px 250px',
      }}
    >
      <ellipse cx={0} cy={44} rx={70} ry={12} fill="rgba(10,8,30,0.35)" />
      <g transform={`translate(0,${bob})`}>
        <line x1={-16} y1={-70} x2={-16 - swing * 0.6} y2={36} stroke="#2B2A4A" strokeWidth={22} strokeLinecap="round" />
        <line x1={16} y1={-70} x2={16 + swing * 0.6} y2={36} stroke="#2B2A4A" strokeWidth={22} strokeLinecap="round" />
        <line x1={-34} y1={-140} x2={-34 - swing * 0.5} y2={-82} stroke={body} strokeWidth={20} strokeLinecap="round" />
        <g transform={`rotate(${waveA} 36 -140)`}>
          <line x1={36} y1={-140} x2={46} y2={-80} stroke={body} strokeWidth={20} strokeLinecap="round" />
          <circle cx={47} cy={-72} r={11} fill={SKIN} />
        </g>
        <path
          d={who === 'he' ? 'M-44 -150 Q0 -170 44 -150 L40 -64 L-40 -64 Z' : 'M-40 -150 Q0 -168 40 -150 L62 -56 L-62 -56 Z'}
          fill={body}
        />
        <circle cx={0} cy={-190} r={42} fill={SKIN} />
        <path
          d={who === 'he' ? 'M-44 -196 Q-40 -240 0 -238 Q42 -240 44 -196 Q20 -214 -44 -196 Z' : 'M-48 -180 Q-52 -244 0 -240 Q52 -244 48 -180 Q44 -214 0 -216 Q-44 -214 -48 -180 Z'}
          fill={hair}
        />
        <circle cx={14} cy={-188} r={4.5} fill="#2A2231" />
        <circle cx={-14} cy={-188} r={4.5} fill="#2A2231" />
        <path d="M-10 -174 Q0 -166 10 -174" stroke="#B5563F" strokeWidth={4} fill="none" strokeLinecap="round" />
        <circle cx={-28} cy={-176} r={7} fill="#FF9AA2" opacity={0.55} />
        <circle cx={28} cy={-176} r={7} fill="#FF9AA2" opacity={0.55} />
      </g>
    </svg>
  );
};
