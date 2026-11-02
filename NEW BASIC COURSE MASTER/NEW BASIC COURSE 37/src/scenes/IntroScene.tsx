import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf} from './shared';
import {Demo} from './lesson';

const Recall: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '17강 가정법 → 18강 조건문', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 320,
        size: 52,
        items: [
          {text: '가정법', kind: 'plain', at: wf('i1', 'i1', '가정법을')},
          {text: '≠', kind: 'sym', at: wf('i1', 'i1', '비슷해')},
          {text: '조건문', kind: 'if', at: wf('i1', 'i1', '조건문은'), glowAt: wf('i1', 'i1', '완전히')},
        ],
      },
    ]}
    footer={{text: '뉘앙스가 완전히 달라요!', at: wf('i1', 'i1', '뉘앙스가'), y: 500, size: 50}}
  />
);

const Imaginary: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '가정법 · 가상의 세계', at: 0, color: COLORS.sand}}
    emojis={[{emoji: '💭', x: 540, y: 640, size: 190, at: wf('i2', 'i2', '가상의'), motion: 'float'}]}
    rows={[
      {y: 310, size: 46, items: [{text: '지금 안 그런데…', kind: 'plain', at: wf('i2', 'i2', '안')}]},
      {y: 450, size: 50, items: [{text: '만약 ~라면 얼마나 좋을까?', kind: 'plain', at: wf('i2', 'i2', '만약')}]},
    ]}
  />
);

const Realistic: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '조건문 · 현실적인 조건과 결과', at: 0, color: WORD.if.main}}
    emojis={[{emoji: '✅', x: 540, y: 660, size: 170, at: wf('i3', 'i3', '현실적인'), motion: 'pulse'}]}
    rows={[
      {y: 300, size: 50, items: [{text: '만약 이렇게 한다면,', kind: 'if', at: wf('i3', 'i3', '이렇게')}]},
      {y: 450, size: 54, items: [{text: '진짜로 이렇게 될 거야!', kind: 'will', at: wf('i3', 'i3', '진짜로'), glowAt: wf('i3', 'i3', '거야')}]},
    ]}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <Recall d={d} />},
    {ids: ['i2'], node: (d) => <Imaginary d={d} />},
    {ids: ['i3'], node: (d) => <Realistic d={d} />},
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
