import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, wf} from './shared';
import {Demo} from './lesson';

// Title: conjunctions are the bridge between sentences.
const Bridge: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '16강 · 접속사 & 관계부사 총정리', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🌉', x: 540, y: 520, size: 260, at: wf('i1', 'i1', '다리입니다'), motion: 'float'}]}
    footer={{text: '문장을 단단하고 풍성하게 이어주는 다리', at: wf('i1', 'i1', '단단하고'), y: 700, size: 42}}
  />
);

// From plain conjunctions to relative adverbs (place / time / reason / method).
const Overview: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '한 번에 정리!', at: 0, color: COLORS.yellow}}
    rows={[
      {y: 290, size: 52, items: [{text: '접속사', kind: 'and', at: wf('i2', 'i2', '접속사부터')}]},
      {
        y: 450,
        size: 46,
        items: [
          {text: '장소', kind: 'where', at: wf('i2', 'i2', '장소')},
          {text: '시간', kind: 'when', at: wf('i2', 'i2', '시간')},
          {text: '이유', kind: 'why', at: wf('i2', 'i2', '이유')},
          {text: '방법', kind: 'how', at: wf('i2', 'i2', '방법의')},
        ],
      },
      {y: 620, size: 54, items: [{text: '관계부사', kind: 'because', at: wf('i2', 'i2', '관계부사까지'), glowAt: wf('i2', 'i2', '정리합니다')}]},
    ]}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <Bridge d={d} />},
    {ids: ['i2'], node: (d) => <Overview d={d} />},
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
