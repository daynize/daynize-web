import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {span, useFade, WORD, wf, wfe} from './shared';
import {Demo} from './lesson';

const TwoPoints: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '오늘의 가정법 핵심', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '✌️', x: 540, y: 470, size: 260, at: wf('o1', 'o1', '두'), motion: 'pulse'}]}
    footer={{text: '딱 두 가지만 마음속에!', at: wf('o1', 'o1', '마음속에'), y: 640, size: 54}}
  />
);

const MindImagination: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '첫째 · 가정법의 본질', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '💭', x: 540, y: 690, size: 150, at: wf('o2', 'o2', '상상이라는'), motion: 'float'}]}
    rows={[
      {
        y: 320,
        size: 52,
        items: [
          {text: '과거 시제', kind: 'past', at: wf('o2', 'o2', '과거')},
          {text: '→ 현실과 거리', kind: 'plain', at: wf('o2', 'o2', '거리를')},
        ],
      },
      {y: 490, size: 58, items: [{text: '마음의 상상', kind: 'if', at: wf('o2', 'o2', '마음의'), glowAt: wf('o2', 'o2', '상상이라는')}]},
    ]}
  />
);

const TwoForms: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '둘째 · 시제 고르기', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 310,
        size: 50,
        items: [
          {text: '지금 일 상상', kind: 'plain', at: wf('o3', 'o3', '지금')},
          {text: '과거동사', kind: 'past', at: wf('o3', 'o3', '과거동사를'), glowAt: wf('o3', 'o3', '과거동사를')},
        ],
      },
      {
        y: 490,
        size: 50,
        items: [
          {text: '지난 옛일 상상', kind: 'plain', at: wf('o3', 'o3', '지나간')},
          {text: 'had p.p.', kind: 'hadpp', at: wfe('o3', 'o3', 'had'), glowAt: wfe('o3', 'o3', 'had')},
        ],
      },
    ]}
  />
);

const Practice: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '12개 도심 동화 예문', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🗣️', x: 540, y: 400, size: 240, at: wf('o4', 'o4', '입으로'), motion: 'pulse'}]}
    footer={{text: '한글 의미부터 느끼며 중얼중얼!', at: wf('o4', 'o4', '중얼거려'), y: 560, size: 48}}
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
          <span style={{display: 'inline-block', padding: '14px 48px', borderRadius: 40, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, fontSize: 70, fontWeight: 900, boxShadow: `0 0 40px ${COLORS.orange}`}}>NEXT · 18강 ▶</span>
          <div style={{fontSize: 40, fontWeight: 700, color: WORD.if.main, marginTop: 28}}>진짜 일어날 법한 일 · 조건문</div>
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
    {ids: ['o2'], node: (d) => <MindImagination d={d} />},
    {ids: ['o3'], node: (d) => <TwoForms d={d} />},
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
