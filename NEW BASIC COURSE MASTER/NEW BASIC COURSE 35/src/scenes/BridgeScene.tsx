import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, wf, wfe} from './shared';
import {CardBoard, CardItem, Demo} from './lesson';

// ---- 1. Three coordinating conjunctions ----------------------------------------

const ThreeBig: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '3대 등위접속사', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 330,
        size: 74,
        items: [
          {text: 'And', kind: 'and', at: wfe('a0', 'a0', 'And'), glowAt: wfe('a0', 'a0', 'And') + 6},
          {text: 'But', kind: 'but', at: wfe('a0', 'a0', 'But'), glowAt: wfe('a0', 'a0', 'But') + 6},
          {text: 'Or', kind: 'or', at: wfe('a0', 'a0', 'Or'), glowAt: wfe('a0', 'a0', 'Or') + 6},
        ],
      },
    ]}
    footer={{text: '문장과 문장을 대등하게 연결!', at: wf('a0', 'a0', '등위접속사입니다'), y: 520, size: 46}}
  />
);

const Coordinating: React.FC<{d: number}> = ({d}) => {
  const cards: CardItem[] = [
    {name: 'And', tag: '그리고 · 하고', meaning: '내용의 덧붙임', kind: 'and', at: wfe('a1', 'a1', 'And')},
    {name: 'But', tag: '하지만 · 그러나', meaning: '앞뒤 내용의 반전', kind: 'but', at: wfe('a1', 'a2', 'But')},
    {name: 'Or', tag: '또는 · 아니면', meaning: '선택의 기로', kind: 'or', at: wfe('a1', 'a3', 'Or')},
  ];
  return <CardBoard duration={d} title="3대 등위접속사" cards={cards} />;
};

// ---- 2. Relative adverbs = conjunction + adverb ---------------------------------

const Secret: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '관계부사의 비밀', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 300,
        size: 50,
        items: [
          {text: '접속사', kind: 'and', at: wf('b0', 'b0', '접속사', 1)},
          {text: '+', kind: 'sym', at: wf('b0', 'b0', '더하기')},
          {text: '부사', kind: 'where', at: wf('b0', 'b0', '부사의', 1)},
          {text: '=', kind: 'sym', at: wf('b0', 'b0', '동시에')},
          {text: '관계부사', kind: 'because', at: wf('b0', 'b0', '동시에'), glowAt: wf('b0', 'b0', '선행사를')},
        ],
      },
      {
        y: 500,
        size: 46,
        items: [
          {text: '선행사 (명사)', kind: 'plain', at: wf('b0', 'b0', '명사')},
          {text: '← 뒤에서 설명', kind: 'when', at: wf('b0', 'b0', '뒤에서'), glowAt: wf('b0', 'b0', '설명해')},
        ],
      },
    ]}
    footer={{text: '아주 편리한 연결 도구 🔗', at: wf('b0', 'b0', '편리한'), y: 660, size: 44}}
  />
);

const Relative: React.FC<{d: number}> = ({d}) => {
  const cards: CardItem[] = [
    {name: 'Because', tag: '원인 · 이유', meaning: '~때문에', kind: 'because', at: wfe('b1', 'b1', 'Because')},
    {name: 'the place where', tag: '장소', meaning: '~하는 그 장소', kind: 'where', at: wfe('b1', 'b2', 'Where')},
    {name: 'the time when', tag: '시간', meaning: '~하는 그 시간', kind: 'when', at: wfe('b1', 'b3', 'When')},
    {name: 'the reason why', tag: '이유', meaning: '~하는 그 이유', kind: 'why', at: wfe('b1', 'b4', 'Why')},
    {name: 'the way / how', tag: '방법 · 하는 방식', meaning: '둘 중 하나만 쓰임', kind: 'how', at: wfe('b1', 'b5', 'How')},
  ];
  return <CardBoard duration={d} title="종속접속사 & 관계부사" cards={cards} />;
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['a0'], node: (d) => <ThreeBig d={d} />},
    {ids: ['a1', 'a2', 'a3'], node: (d) => <Coordinating d={d} />},
    {ids: ['b0'], node: (d) => <Secret d={d} />},
    {ids: ['b1', 'b2', 'b3', 'b4', 'b5'], node: (d) => <Relative d={d} />},
  ];
  return (
    <>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`bridge-${p.ids[0]}`}>
            {p.node(s.duration)}
          </Sequence>
        );
      })}
    </>
  );
};
