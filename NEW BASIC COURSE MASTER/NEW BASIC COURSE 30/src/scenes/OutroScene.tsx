import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan} from '../timeline';
import {WORD, WordName, wfe} from './shared';

const Chip: React.FC<{x: number; y: number; w: number; word: WordName; label: string; s: number; glow: number}> = ({x, y, w, word, label, s, glow}) => {
  const c = WORD[word];
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y,
        width: w,
        height: 110,
        boxSizing: 'border-box',
        borderRadius: 34,
        background: `rgba(${c.rgb},0.2)`,
        border: `4px solid ${c.edge}`,
        boxShadow: `0 0 ${24 + 36 * glow}px ${c.edge}aa`,
        fontFamily: FONT,
        color: c.main,
        fontSize: 54,
        fontWeight: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: Math.min(1, s * 2),
        transform: `translateY(${(1 - s) * 50}px) scale(${(0.6 + 0.4 * s) * (1 + 0.04 * glow)})`,
      }}
    >
      {label}
    </div>
  );
};

const Banner: React.FC<{y: number; text: string; s: number; word: WordName}> = ({y, text, s, word}) => {
  const c = WORD[word];
  return (
    <div style={{position: 'absolute', left: 0, width: WIDTH, top: y, textAlign: 'center', opacity: Math.min(1, s * 2), transform: `scale(${0.6 + 0.4 * s})`}}>
      <span style={{display: 'inline-block', padding: '10px 36px', borderRadius: 32, background: `linear-gradient(135deg, ${c.main}, ${c.edge})`, color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 40, boxShadow: `0 0 36px ${c.edge}`}}>{text}</span>
    </div>
  );
};

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = (id: string) => cueById(id).start - scene.from;
  const wordAt = (id: string, word: string) => wfe(id, id, word) + local(id);
  const anotherAt = wordAt('o1', 'another');
  const otherAt = wordAt('o1', 'other');
  const theAt = wordAt('o1', 'the');
  const o3 = local('o3');
  const o4 = local('o4');
  const vague = wordAt('o2', 'another');
  const fixed = wordAt('o2', 'the');

  const pop = (start: number) => spring({frame: frame - start, fps, config: {damping: 10, stiffness: 130}});
  const glow = (start: number) => ramp(frame, start, start + 20) * (0.7 + 0.3 * Math.sin(frame / 7));
  const examplesOut = 1 - ramp(frame, o4 - 6, o4 + 8);
  const thanks = spring({frame: frame - o4 - 6, fps, config: {damping: 8, stiffness: 120}});

  return (
    <div style={{position: 'absolute', inset: 0}}>
      {[anotherAt, otherAt, theAt].map((t, i) => (
        <Sequence key={i} from={t} durationInFrames={30}>
          <Audio src={staticFile('sfx/ding.wav')} volume={0.45} />
        </Sequence>
      ))}
      <Sequence from={o4 + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>

      <div style={{opacity: examplesOut}}>
        <Chip x={WIDTH / 2 - 250} y={20} w={440} word="another" label="another" s={pop(anotherAt)} glow={glow(anotherAt)} />
        <Chip x={WIDTH / 2 + 250} y={20} w={440} word="other" label="other(s)" s={pop(otherAt)} glow={glow(otherAt)} />
        <Chip x={WIDTH / 2} y={160} w={640} word="theother" label="the other(s)" s={pop(theAt)} glow={glow(theAt)} />
        {frame >= vague ? <Banner y={330} text="🍎🍎🍎 남은 게 많아 막연 → another / other" s={pop(vague)} word="another" /> : null}
        {frame >= fixed ? <Banner y={440} text="👆 눈에 딱 정해짐 → the other(s)" s={pop(fixed)} word="theother" /> : null}
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
