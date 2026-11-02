import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrameOf} from '../timeline';
import {ED, ING} from './shared';

const Tile: React.FC<{x: number; y: number; w: number; label: string; sub: string; color: string; bg: string; s: number; glow?: number}> = ({
  x,
  y,
  w,
  label,
  sub,
  color,
  bg,
  s,
  glow = 0,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y,
      width: w,
      height: 160,
      borderRadius: 40,
      background: bg,
      border: `4px solid ${color}`,
      boxShadow: `0 0 ${30 + 50 * glow}px ${color}aa`,
      fontFamily: FONT,
      color,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: Math.min(1, s * 2),
      transform: `translateY(${(1 - s) * 80}px) scale(${(0.6 + 0.4 * s) * (1 + 0.04 * glow)})`,
    }}
  >
    <div style={{fontSize: 64, fontWeight: 900}}>{label}</div>
    <div style={{fontSize: 32, fontWeight: 600, color: COLORS.cream}}>{sub}</div>
  </div>
);

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o1 = cueById('o1').start - scene.from;
  const o4 = cueById('o4').start - scene.from;
  const o3 = cueById('o3').start - scene.from;
  const at = (needle: string) => wordFrameOf('o2', needle) - scene.from;
  const ingAt = at('-ing');
  const edAt = at('-ed');

  const pop = (start: number) => spring({frame: frame - start, fps, config: {damping: 10, stiffness: 130}});
  const edGlow = ramp(frame, edAt, edAt + 20) * (0.7 + 0.3 * Math.sin(frame / 7));
  const ingGlow = ramp(frame, ingAt, ingAt + 20) * (0.7 + 0.3 * Math.sin(frame / 7));
  const examplesOut = 1 - ramp(frame, o4 - 6, o4 + 8);
  const thanks = spring({frame: frame - o4 - 6, fps, config: {damping: 8, stiffness: 120}});

  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Sequence from={ingAt} durationInFrames={30}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={edAt} durationInFrames={30}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={o4 + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>

      <div style={{opacity: examplesOut}}>
        <Tile x={WIDTH / 2} y={40} w={800} label="-ing · 감정을 내뿜는 원인" sub="The movie was boring." color={ING.main} bg={`rgba(${ING.rgb},0.2)`} s={pop(Math.max(o1 + 6, ingAt - 10))} glow={ingGlow} />
        <div style={{position: 'absolute', left: WIDTH / 2 - 40, top: 220, fontSize: 64, lineHeight: 1, textAlign: 'center', width: 80, opacity: ramp(frame, o1 + 20, o1 + 32)}}>🔄</div>
        <Tile x={WIDTH / 2} y={310} w={800} label="-ed · 감정을 느끼는 사람" sub="I am bored." color={ED.main} bg={`rgba(${ED.rgb},0.22)`} s={pop(Math.max(o1 + 22, edAt - 10))} glow={edGlow} />
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 540, textAlign: 'center', opacity: Math.min(1, pop(edAt) * 2), transform: `scale(${0.6 + 0.4 * pop(edAt)})`}}>
          <span style={{display: 'inline-block', padding: '10px 40px', borderRadius: 32, background: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 52, boxShadow: `0 0 ${30 + 40 * edGlow}px ${COLORS.orange}`}}>
            🌉 감정의 화살표 방향
          </span>
        </div>
      </div>

      {frame >= o3 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 800, textAlign: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 800, color: COLORS.yellow, opacity: ramp(frame, o3, o3 + 14) * examplesOut, transform: `scale(${1 + 0.04 * Math.sin(frame / 6)})`, textShadow: `0 0 26px ${COLORS.orange}`}}>
          🗣️ 소리 내어 스스로 설명해 보세요!
        </div>
      ) : null}

      {frame >= o4 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 480, textAlign: 'center', fontFamily: FONT, color: COLORS.cream, opacity: Math.min(1, thanks * 2), transform: `scale(${0.6 + 0.4 * thanks})`, textShadow: `0 0 ${40 * thanks}px ${COLORS.orange}`}}>
          <div style={{fontSize: 130, fontWeight: 900}}>Thank you</div>
          <div style={{fontSize: 64, fontWeight: 700, color: COLORS.sand, marginTop: 6}}>감사합니다 ❤️</div>
        </div>
      ) : null}
    </div>
  );
};
