import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, wf, wfe} from './shared';
import {Demo} from './lesson';

// Hook: comparing two things.
const Compare: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '두 대상을 비교할 때', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 330,
        size: 76,
        items: [
          {text: 'A', kind: 'plain', at: wf('i1', 'i1', '대상을')},
          {text: '>', kind: 'sym', at: wf('i1', 'i1', '비교할')},
          {text: 'B', kind: 'plain', at: wf('i1', 'i1', '비교할')},
        ],
      },
    ]}
    footer={{text: '“보다 더 한”', at: wf('i1', 'i1', '“보다'), y: 480, size: 62}}
  />
);

// The rule that decides -er vs. more is the syllable.
const Criterion: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '비교급의 절대 기준', at: 0}}
    rows={[
      {
        y: 300,
        size: 64,
        items: [
          {text: '-er', kind: 'er', at: wfe('i2', 'i2', 'er'), glowAt: wfe('i2', 'i2', 'er') + 6},
          {text: 'or', kind: 'sym', at: wfe('i2', 'i2', 'more')},
          {text: 'more', kind: 'more', at: wfe('i2', 'i2', 'more'), glowAt: wfe('i2', 'i2', 'more') + 6},
        ],
      },
      {y: 500, size: 66, items: [{text: '음절 Syllable', kind: 'syl', at: wf('i2', 'i2', '음절,'), glowAt: wfe('i2', 'i2', 'Syllable')}]},
    ]}
    footer={{text: '결정하는 단 하나의 기준 🎯', at: wf('i2', 'i2', '결정하는'), y: 660, size: 44}}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <Compare d={d} />},
    {ids: ['i2'], node: (d) => <Criterion d={d} />},
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
