import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrameOf} from '../timeline';
import {ED, ING} from './shared';

const Tile: React.FC<{y: number; label: string; sub: string; color: string; bg: string; s: number; glow?: number}> = ({y, label, sub, color, bg, s, glow = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: WIDTH / 2 - 440,
      top: y,
      width: 880,
      height: 190,
      boxSizing: 'border-box',
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
      gap: 4,
      opacity: Math.min(1, s * 2),
      transform: `translateY(${(1 - s) * 80}px) scale(${(0.6 + 0.4 * s) * (1 + 0.04 * glow)})`,
    }}
  >
    <div style={{fontSize: 56, fontWeight: 900}}>{label}</div>
    <div style={{fontSize: 40, fontWeight: 700, color: COLORS.cream}}>{sub}</div>
  </div>
);

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = (id: string) => cueById(id).start - scene.from;
  const o1 = local('o1');
  const o2 = local('o2');
  const o3 = local('o3');
  const o4 = local('o4');
  const o5 = local('o5');
  const at = (id: string, needle: string) => wordFrameOf(id, needle) - scene.from;
  const advAt = at('o1', 'fast');
  const adjAt = at('o2', 'friendly');

  const pop = (start: number) => spring({frame: frame - start, fps, config: {damping: 10, stiffness: 130}});
  const advGlow = ramp(frame, advAt, advAt + 20) * (0.7 + 0.3 * Math.sin(frame / 7));
  const adjGlow = ramp(frame, adjAt, adjAt + 20) * (0.7 + 0.3 * Math.sin(frame / 7));
  const examplesOut = 1 - ramp(frame, o5 - 6, o5 + 8);
  const thanks = spring({frame: frame - o5 - 6, fps, config: {damping: 8, stiffness: 120}});

  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Sequence from={advAt} durationInFrames={30}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={adjAt} durationInFrames={30}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={o5 + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>

      <div style={{opacity: examplesOut}}>
        <Tile y={30} label="-ly 없어도 부사" sub="fast · hard · late" color={ING.main} bg={`rgba(${ING.rgb},0.2)`} s={pop(Math.max(o1 + 6, advAt - 10))} glow={advGlow} />
        <div style={{position: 'absolute', left: WIDTH / 2 - 40, top: 235, fontSize: 60, lineHeight: 1, textAlign: 'center', width: 80, opacity: ramp(frame, o2, o2 + 12)}}>⇅</div>
        <Tile y={320} label="-ly 붙어도 형용사" sub="friendly · lovely" color={ED.main} bg={`rgba(${ED.rgb},0.22)`} s={pop(Math.max(o2 + 6, adjAt - 10))} glow={adjGlow} />
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 560, textAlign: 'center', opacity: Math.min(1, pop(o3) * 2), transform: `scale(${0.6 + 0.4 * pop(o3)})`}}>
          <span style={{display: 'inline-block', padding: '10px 40px', borderRadius: 32, background: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 48, boxShadow: `0 0 ${30 + 40 * advGlow}px ${COLORS.orange}`}}>
            🧠 형태의 함정에 속지 않기
          </span>
        </div>
      </div>

      {frame >= o4 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 800, textAlign: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 800, color: COLORS.yellow, opacity: ramp(frame, o4, o4 + 14) * examplesOut, transform: `scale(${1 + 0.04 * Math.sin(frame / 6)})`, textShadow: `0 0 26px ${COLORS.orange}`}}>
          🗣️ 소리 내어 스스로 설명해 보세요!
        </div>
      ) : null}

      {frame >= o5 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 480, textAlign: 'center', fontFamily: FONT, color: COLORS.cream, opacity: Math.min(1, thanks * 2), transform: `scale(${0.6 + 0.4 * thanks})`, textShadow: `0 0 ${40 * thanks}px ${COLORS.orange}`}}>
          <div style={{fontSize: 130, fontWeight: 900}}>Thank you</div>
          <div style={{fontSize: 64, fontWeight: 700, color: COLORS.sand, marginTop: 6}}>감사합니다 ❤️</div>
        </div>
      ) : null}
    </div>
  );
};
