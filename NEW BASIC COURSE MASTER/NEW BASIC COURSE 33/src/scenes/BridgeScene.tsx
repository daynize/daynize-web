import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf, wfe} from './shared';
import {CardBoard, CardItem, Demo, PairBoard, PairCard} from './lesson';

// ---- 1. What is a syllable? --------------------------------------------------

const NotLetters: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '음절이란?', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '👂', x: 540, y: 700, size: 150, at: wf('a1', 'a1', '들리는가'), motion: 'float'}]}
    rows={[
      {y: 300, size: 56, items: [{text: '글자 수 ✕', kind: 'warn', at: wf('a1', 'a1', '글자')}]},
      {y: 470, size: 56, items: [{text: '모음 소리가 들리는 횟수 ✓', kind: 'syl', at: wf('a1', 'a1', '모음'), glowAt: wf('a1', 'a1', '들리는가')}]},
    ]}
  />
);

const NoEu: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '핵심 원칙', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 330,
        size: 62,
        items: [
          {text: '“으” 발음', kind: 'warn', at: wf('a2', 'a2', '으')},
          {text: '≠', kind: 'sym', at: wf('a2', 'a2', '소리,')},
          {text: '음절', kind: 'syl', at: wf('a2', 'a2', '음절이'), glowAt: wf('a2', 'a2', '아닙니다')},
        ],
      },
    ]}
    footer={{text: '영어에서 “으”는 소리가 아니다!', at: wf('a2', 'a2', '아닙니다'), y: 500, size: 46}}
  />
);

const OldWord: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'old = 1음절', at: 0, color: WORD.syl.main}}
    rows={[
      {y: 290, size: 90, items: [{text: 'old', kind: 'syl', at: wfe('a3', 'a3', 'Old'), glowAt: wf('a3', 'a3', '하나뿐이므로')}]},
      {
        y: 450,
        size: 54,
        items: [
          {text: '올', kind: 'plain', at: wf('a3', 'a3', '올드,')},
          {text: '드', kind: 'warn', at: wfe('a3', 'a3', 'd')},
        ],
      },
      {y: 600, size: 44, items: [{text: '● 모음 소리 1개 = 1음절', kind: 'syl', at: wf('a3', 'a3', '하나뿐이므로')}]},
    ]}
  />
);

const PrettyWord: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'pretty = 2음절', at: 0, color: WORD.syl.main}}
    rows={[
      {y: 270, size: 74, items: [{text: 'pretty', kind: 'plain', at: wfe('a4', 'a4', 'Pretty')}]},
      {y: 410, size: 46, items: [{text: '프-리-티 → 3? ✕', kind: 'warn', at: wf('a4', 'a4', '세')}]},
      {
        y: 560,
        size: 58,
        items: [
          {text: 'Pre', kind: 'syl', at: wfe('a4', 'a4', 'Pre')},
          {text: 'tty', kind: 'syl', at: wfe('a4', 'a4', 'tty')},
        ],
      },
      {y: 690, size: 44, items: [{text: '● ● 모음 소리 2개 = 2음절', kind: 'syl', at: wf('a4', 'a4', '2음절입니다'), glowAt: wf('a4', 'a4', '2음절입니다')}]},
    ]}
  />
);

const Rules: React.FC<{d: number}> = ({d}) => {
  const cards: CardItem[] = [
    {name: '-er', tag: '1음절 · 짧은 2음절', meaning: 'old→older, pretty→prettier', kind: 'er', at: wf('r1', 'r1', '첫째,')},
    {name: 'more', tag: '3음절 이상', meaning: 'beautiful→more beautiful', kind: 'more', at: wf('r1', 'r2', '둘째,')},
  ];
  return <CardBoard duration={d} title="음절에 따른 비교급 규칙" cards={cards} />;
};

// ---- 2. Gap control -----------------------------------------------------------

const ThanPhase: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '비교의 기준 · than', at: 0, color: WORD.than.main}}
    rows={[
      {
        y: 330,
        size: 62,
        items: [
          {text: 'A is', kind: 'plain', at: wf('b1', 'b1', '비교급')},
          {text: 'older', kind: 'er', at: wf('b1', 'b1', '비교급')},
          {text: 'than', kind: 'than', at: wfe('b1', 'b1', 'than'), glowAt: wfe('b1', 'b1', 'than') + 6},
          {text: 'B', kind: 'plain', at: wf('b1', 'b1', '대상을')},
        ],
      },
    ]}
    footer={{text: 'than = ~보다', at: wf('b1', 'b1', '보다가'), y: 520, size: 52, color: WORD.than.main}}
  />
);

const Intensifier: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '격차 조절하기', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 330,
        size: 56,
        items: [
          {text: '강조 어휘', kind: 'strong', at: wf('b2', 'b2', '강조', 1)},
          {text: '+', kind: 'sym', at: wf('b2', 'b2', '앞에')},
          {text: '비교급', kind: 'er', at: wf('b2', 'b2', '비교급')},
        ],
      },
    ]}
    footer={{text: '비교급 앞에 붙여요!', at: wf('b2', 'b2', '앞에'), y: 500, size: 50}}
  />
);

const Gaps: React.FC<{d: number}> = ({d}) => {
  const pairs: PairCard[] = [
    {
      base: 'older',
      past: 'much · even · far older',
      kind: 'strong',
      baseKind: 'er',
      baseNote: '그냥 비교급',
      pastNote: '훨씬 더 (격차 ↑)',
      pct: [30, 92],
      hideValue: true,
      baseAt: wf('b3', 'b3', '훨씬'),
      pastAt: wfe('b3', 'b3', 'much'),
    },
    {
      base: 'older',
      past: 'a little · slightly older',
      kind: 'soft',
      baseKind: 'er',
      baseNote: '그냥 비교급',
      pastNote: '조금 더 (부드러운 차이)',
      pct: [30, 42],
      hideValue: true,
      baseAt: wf('b3', 'b4', '조금'),
      pastAt: wfe('b3', 'b4', 'little'),
    },
  ];
  return <PairBoard duration={d} title="비교급 앞 강조 어휘" pairs={pairs} />;
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['a1'], node: (d) => <NotLetters d={d} />},
    {ids: ['a2'], node: (d) => <NoEu d={d} />},
    {ids: ['a3'], node: (d) => <OldWord d={d} />},
    {ids: ['a4'], node: (d) => <PrettyWord d={d} />},
    {ids: ['r1', 'r2'], node: (d) => <Rules d={d} />},
    {ids: ['b1'], node: (d) => <ThanPhase d={d} />},
    {ids: ['b2'], node: (d) => <Intensifier d={d} />},
    {ids: ['b3', 'b4'], node: (d) => <Gaps d={d} />},
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
