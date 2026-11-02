import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, wf, wfe} from './shared';
import {Demo} from './lesson';

// Overview of the lesson: the roots of more, the five intensifiers, the superlative.
const Overview: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '15강 · 오늘의 핵심 세 가지', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 300,
        size: 56,
        items: [
          {text: 'much', kind: 'much', at: wfe('i1', 'i1', 'much')},
          {text: '→', kind: 'sym', at: wfe('i1', 'i1', 'more')},
          {text: 'more', kind: 'most', at: wfe('i1', 'i1', 'more'), glowAt: wf('i1', 'i1', '뿌리,')},
        ],
      },
      {y: 470, size: 52, items: [{text: '비교급 강조 5대장', kind: 'smurf', at: wf('i1', 'i1', '강조'), glowAt: wf('i1', 'i1', '5대장')}]},
      {y: 630, size: 56, items: [{text: 'the 최상급', kind: 'est', at: wf('i1', 'i1', '최상급을'), glowAt: wf('i1', 'i1', '정리합니다')}]},
    ]}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [{ids: ['i1'], node: (d) => <Overview d={d} />}];
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
