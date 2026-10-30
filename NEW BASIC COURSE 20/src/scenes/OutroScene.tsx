import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrame} from '../timeline';

const EXAMPLES: {v: string; p: string; rest: string; kr: string}[] = [
  {v: 'arrived', p: 'at', rest: 'the airport', kr: '공항에 도착했다'},
  {v: 'lied', p: 'to', rest: 'him', kr: '그에게 거짓말했다'},
  {v: 'sat', p: 'on', rest: 'the chair', kr: '의자에 앉았다'},
  {v: 'talked', p: 'about', rest: 'their dreams', kr: '꿈에 대해 이야기했다'},
];

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
      height: 150,
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
    <div style={{fontSize: 30, fontWeight: 600, color: COLORS.cream}}>{sub}</div>
  </div>
);

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o1 = cueById('o1').start - scene.from;
  const o3 = cueById('o3').start - scene.from;
  const o4 = cueById('o4').start - scene.from;
  // o2: 자동사(0) 뒤에는(1) 목적어가(2) 바로(3) 올(4) 수(5) 없고,(6) 반드시(7) 전치사라는(8) 다리가(9)
  const bridgeAt = wordFrame('o2', 8) - scene.from;
  const exampleAt = [1, 4, 7, 9].map((i) => wordFrame('o2', i) - scene.from);

  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 10, stiffness: 130}});
  const bridgeGlow = ramp(frame, bridgeAt, bridgeAt + 20) * (0.7 + 0.3 * Math.sin(frame / 7));
  const examplesOut = 1 - ramp(frame, o4 - 6, o4 + 8);
  const thanks = spring({frame: frame - o4 - 6, fps, config: {damping: 8, stiffness: 120}});

  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Sequence from={bridgeAt} durationInFrames={30}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={o4 + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>

      <div style={{opacity: examplesOut}}>
        <Tile x={WIDTH / 2} y={40} w={640} label="자동사" sub="Intransitive verb" color={COLORS.tealBright} bg="rgba(46,196,182,0.22)" s={pop(o1 + 6)} />
        <div style={{position: 'absolute', left: WIDTH / 2 - 22, top: 190, fontFamily: FONT, fontSize: 64, fontWeight: 900, color: COLORS.cream, opacity: ramp(frame, o1 + 20, o1 + 32)}}>+</div>
        <Tile x={WIDTH / 2} y={270} w={640} label="전치사" sub="Bridge · 다리" color={COLORS.orange} bg="rgba(255,154,31,0.22)" s={pop(o1 + 22)} glow={bridgeGlow} />
        <div style={{position: 'absolute', left: WIDTH / 2 - 22, top: 420, fontFamily: FONT, fontSize: 64, fontWeight: 900, color: COLORS.cream, opacity: ramp(frame, o1 + 36, o1 + 48)}}>+</div>
        <Tile x={WIDTH / 2} y={500} w={640} label="대상·장소" sub="Object / Place" color={COLORS.cream} bg="rgba(255,246,229,0.14)" s={pop(o1 + 38)} />
      </div>

      <div style={{opacity: examplesOut}}>
        {EXAMPLES.map((ex, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const s = pop(exampleAt[i]);
          const cx = WIDTH / 2;
          const cy = 760 + (row * 2 + col) * 100;
          return (
            <div
              key={ex.v}
              style={{
                position: 'absolute',
                left: cx - 500,
                top: cy - 42,
                width: 1000,
                height: 84,
                borderRadius: 32,
                background: 'rgba(255,246,229,0.1)',
                border: '2px solid rgba(255,246,229,0.3)',
                fontFamily: FONT,
                fontSize: 38,
                fontWeight: 800,
                color: COLORS.cream,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                opacity: Math.min(1, s * 2),
                transform: `translateY(${(1 - s) * 50}px) scale(${0.8 + 0.2 * s})`,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{color: COLORS.tealBright}}>{ex.v}</span>
              <span style={{color: COLORS.ink, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, borderRadius: 18, padding: '0 14px', textShadow: 'none'}}>{ex.p}</span>
              <span>{ex.rest}</span>
              <span style={{fontSize: 24, fontWeight: 600, color: COLORS.sand, marginLeft: 8}}>{ex.kr}</span>
            </div>
          );
        })}
      </div>

      {frame >= o3 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 1130, textAlign: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 800, color: COLORS.yellow, opacity: ramp(frame, o3, o3 + 14) * examplesOut, transform: `scale(${1 + 0.04 * Math.sin(frame / 6)})`, textShadow: `0 0 26px ${COLORS.orange}`}}>
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
