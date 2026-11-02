import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {span, useFade, WORD, wf} from './shared';
import {Demo} from './lesson';

const TwoPoints: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '오늘의 도치 핵심', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '✌️', x: 540, y: 470, size: 260, at: wf('o1', 'o1', '두'), motion: 'pulse'}]}
    footer={{text: '딱 두 가지만 기억!', at: wf('o1', 'o1', '기억해'), y: 640, size: 54}}
  />
);

const Spotlight: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '첫째 · 도치 = 연출법', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🔦', x: 540, y: 690, size: 150, at: wf('o2', 'o2', '연출법이라는'), motion: 'pulse'}]}
    rows={[
      {y: 320, size: 52, items: [{text: '강조하고 싶은 말', kind: 'neg', at: wf('o2', 'o2', '강조하고'), glowAt: wf('o2', 'o2', '던져서')}]},
      {y: 480, size: 56, items: [{text: '→ 맨 앞으로! 🎬', kind: 'plain', at: wf('o2', 'o2', '맨')}]},
    ]}
  />
);

const Question: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '둘째 · 의문문처럼 자리 바꿈', at: 0, color: COLORS.yellow, size: 40}}
    rows={[
      {
        y: 320,
        size: 50,
        items: [
          {text: '강조어', kind: 'neg', at: wf('o3', 'o3', '강조하는')},
          {text: '주어', kind: 'subj', at: wf('o3', 'o3', '주어와')},
          {text: '동사', kind: 'verb', at: wf('o3', 'o3', '주어와')},
        ],
      },
      {y: 490, size: 50, items: [{text: '↓ 의문문처럼 ❓', kind: 'plain', at: wf('o3', 'o3', '의문문처럼')}]},
      {
        y: 650,
        size: 50,
        items: [
          {text: '강조어', kind: 'neg', at: wf('o3', 'o3', '바꾼다는')},
          {text: '동사', kind: 'verb', at: wf('o3', 'o3', '바꾼다는')},
          {text: '주어', kind: 'subj', at: wf('o3', 'o3', '바꾼다는'), glowAt: wf('o3', 'o3', '사실입니다')},
        ],
      },
    ]}
  />
);

const Practice: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '12개 도심 동화 문장', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🗣️', x: 540, y: 400, size: 240, at: wf('o4', 'o4', '입으로'), motion: 'pulse'}]}
    footer={{text: '한글 의미부터 천천히 새기며!', at: wf('o4', 'o4', '새기시면서'), y: 560, size: 46}}
  />
);

const Farewell: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nextAt = wf('o5', 'o5', '다음');
  const thanksAt = wf('o5', 'o5', '수고');
  const nextIn = spring({frame: frame - nextAt, fps, config: {damping: 10, stiffness: 130}});
  const nextOut = 1 - ramp(frame, thanksAt - 6, thanksAt + 8);
  const thanks = spring({frame: frame - thanksAt, fps, config: {damping: 8, stiffness: 120}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: useFade(d), fontFamily: FONT}}>
      <Sequence from={thanksAt + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>
      {frame >= nextAt ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 300, textAlign: 'center', opacity: Math.min(1, nextIn * 2) * nextOut, transform: `scale(${0.6 + 0.4 * nextIn})`}}>
          <span style={{display: 'inline-block', padding: '14px 48px', borderRadius: 40, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, fontSize: 70, fontWeight: 900, boxShadow: `0 0 40px ${COLORS.orange}`}}>NEXT · 20강 ▶</span>
          <div style={{fontSize: 40, fontWeight: 700, color: WORD.place.main, marginTop: 28}}>기초 과정 대단원의 마무리 🎓</div>
        </div>
      ) : null}
      {frame >= thanksAt ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 280, textAlign: 'center', color: COLORS.cream, opacity: Math.min(1, thanks * 2), transform: `scale(${0.6 + 0.4 * thanks})`, textShadow: `0 0 ${40 * thanks}px ${COLORS.orange}`}}>
          <div style={{fontSize: 130, fontWeight: 900}}>Thank you</div>
          <div style={{fontSize: 64, fontWeight: 700, color: COLORS.sand, marginTop: 6}}>수고 많으셨습니다 ❤️</div>
        </div>
      ) : null}
    </div>
  );
};

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['o1'], node: (d) => <TwoPoints d={d} />},
    {ids: ['o2'], node: (d) => <Spotlight d={d} />},
    {ids: ['o3'], node: (d) => <Question d={d} />},
    {ids: ['o4'], node: (d) => <Practice d={d} />},
    {ids: ['o5'], node: (d) => <Farewell d={d} />},
  ];
  return (
    <>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`outro-${p.ids[0]}`}>
            {p.node(s.duration)}
          </Sequence>
        );
      })}
    </>
  );
};
