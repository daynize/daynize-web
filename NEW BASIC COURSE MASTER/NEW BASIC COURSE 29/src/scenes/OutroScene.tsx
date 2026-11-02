import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, PREP_NAMES, SceneSpan, wordFrameOf} from '../timeline';
import {PREP, PrepName} from './shared';

const PREPS: PrepName[] = PREP_NAMES;
const ROWS = Math.ceil(PREPS.length / 2);

const Chip: React.FC<{x: number; y: number; prep: PrepName; s: number; glow: number}> = ({x, y, prep, s, glow}) => {
  const c = PREP[prep];
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 230,
        top: y,
        width: 460,
        height: 90,
        boxSizing: 'border-box',
        borderRadius: 30,
        background: `rgba(${c.rgb},0.2)`,
        border: `4px solid ${c.edge}`,
        boxShadow: `0 0 ${24 + 36 * glow}px ${c.edge}aa`,
        fontFamily: FONT,
        color: c.main,
        fontSize: 46,
        fontWeight: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: Math.min(1, s * 2),
        transform: `translateY(${(1 - s) * 50}px) scale(${(0.6 + 0.4 * s) * (1 + 0.04 * glow)})`,
      }}
    >
      {prep} which
    </div>
  );
};

const Banner: React.FC<{y: number; text: string; s: number}> = ({y, text, s}) => (
  <div style={{position: 'absolute', left: 0, width: WIDTH, top: y, textAlign: 'center', opacity: Math.min(1, s * 2), transform: `scale(${0.6 + 0.4 * s})`}}>
    <span style={{display: 'inline-block', padding: '10px 36px', borderRadius: 32, background: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 42, boxShadow: `0 0 40px ${COLORS.orange}`}}>{text}</span>
  </div>
);

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = (id: string) => cueById(id).start - scene.from;
  const at = (id: string, needle: string) => wordFrameOf(id, needle) - scene.from;
  const o2 = at('o2', '“전치사의');
  const o3 = local('o3');
  const o4 = local('o4');
  const pull = at('o1', '당겨져');
  const times = PREPS.map((p, i) => at('o1', i === PREPS.length - 1 ? p : `${p},`));

  const pop = (start: number) => spring({frame: frame - start, fps, config: {damping: 10, stiffness: 130}});
  const glow = (start: number) => ramp(frame, start, start + 20) * (0.7 + 0.3 * Math.sin(frame / 7));
  const examplesOut = 1 - ramp(frame, o4 - 6, o4 + 8);
  const thanks = spring({frame: frame - o4 - 6, fps, config: {damping: 8, stiffness: 120}});

  return (
    <div style={{position: 'absolute', inset: 0}}>
      {times.map((t, i) => (
        <Sequence key={PREPS[i]} from={t} durationInFrames={30}>
          <Audio src={staticFile('sfx/ding.wav')} volume={0.4} />
        </Sequence>
      ))}
      <Sequence from={o4 + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>

      <div style={{opacity: examplesOut}}>
        {PREPS.map((p, i) => (
          <Chip key={p} x={i === PREPS.length - 1 && PREPS.length % 2 === 1 ? WIDTH / 2 : WIDTH / 2 + (i % 2 === 0 ? -250 : 250)} y={10 + Math.floor(i / 2) * 105} prep={p} s={pop(times[i])} glow={glow(times[i])} />
        ))}
        {frame >= pull ? <Banner y={ROWS * 105 + 25} text="🧲 혼자 남은 전치사 → which 앞으로 찰싹!" s={pop(pull)} /> : null}
        {frame >= o2 ? <Banner y={ROWS * 105 + 135} text="전치사의 원래 뜻 + 그런데 그것은!" s={pop(o2)} /> : null}
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
