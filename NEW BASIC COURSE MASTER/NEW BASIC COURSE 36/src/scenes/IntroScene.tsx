import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, wf} from './shared';
import {Demo} from './lesson';

const Easy: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '17강 · 가정법', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🤔', x: 540, y: 520, size: 240, at: wf('i1', 'i1', '어렵게'), motion: 'float'}]}
    footer={{text: '알고 보면 정말 별거 아니에요 ✌️', at: wf('i1', 'i1', '별거'), y: 700, size: 46}}
  />
);

const Imagine: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '가정법 = 마음속 예쁜 상상', at: 0, color: COLORS.yellow}}
    rows={[
      {y: 290, size: 48, items: [{text: '지금 현실은 전혀 안 그런데', kind: 'plain', at: wf('i2', 'i2', '현실은')}]},
      {y: 450, size: 54, items: [{text: '만약 ~라면 얼마나 좋을까?', kind: 'if', at: wf('i2', 'i2', '만약'), glowAt: wf('i2', 'i2', '좋을까')}]},
      {y: 620, size: 44, items: [{text: '현실과 살짝 거리를 두고 💭', kind: 'plain', at: wf('i2', 'i2', '거리를')}]},
    ]}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <Easy d={d} />},
    {ids: ['i2'], node: (d) => <Imagine d={d} />},
  ];
  return (
    <>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`intro-${p.ids[0]}`}>
            {p.node(s.duration)}
          </Sequence>
        );
      })}
    </>
  );
};
