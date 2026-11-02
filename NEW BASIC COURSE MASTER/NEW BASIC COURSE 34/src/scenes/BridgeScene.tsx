import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf, wfe} from './shared';
import {CardBoard, CardItem, Demo} from './lesson';
import {SmurfBoard} from './SmurfBoard';

// ---- 0. Roots of more: countable many / uncountable much ---------------------

const Many: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '선행 개념 1 · 가산 명사 (셀 수 있다)', at: 0, color: WORD.many.main, size: 40}}
    emojis={[{emoji: '📚', x: 540, y: 690, size: 130, at: wf('c1', 'c1', '복수형'), motion: 'float'}]}
    rows={[
      {
        y: 320,
        size: 64,
        items: [
          {text: 'many', kind: 'many', at: wfe('c1', 'c1', 'many'), glowAt: wfe('c1', 'c1', 'many') + 4},
          {text: 'books', kind: 'plain', at: wfe('c1', 'c1', 'books')},
        ],
      },
    ]}
    footer={{text: '복수형 앞에는 many', at: wf('c1', 'c1', '앞에는'), y: 480, size: 48, color: WORD.many.main}}
  />
);

const Much: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '선행 개념 1 · 불가산 명사 (셀 수 없다)', at: 0, color: WORD.much.main, size: 40}}
    emojis={[{emoji: '💧', x: 540, y: 690, size: 130, at: wf('c2', 'c2', '불가산명사'), motion: 'float'}]}
    rows={[
      {
        y: 320,
        size: 64,
        items: [
          {text: 'much', kind: 'much', at: wfe('c2', 'c2', 'much'), glowAt: wfe('c2', 'c2', 'much') + 4},
          {text: 'water', kind: 'plain', at: wfe('c2', 'c2', 'water')},
        ],
      },
    ]}
    footer={{text: '불가산명사 앞에는 much', at: wf('c2', 'c2', '앞에는'), y: 480, size: 48, color: WORD.much.main}}
  />
);

const BecomeMore: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '“더 많은”으로 변신!', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🦋', x: 540, y: 690, size: 140, at: wf('c3', 'c3', '변신한'), motion: 'float'}]}
    rows={[
      {
        y: 340,
        size: 62,
        items: [
          {text: 'many', kind: 'many', at: wfe('c3', 'c3', 'many')},
          {text: 'much', kind: 'much', at: wfe('c3', 'c3', 'much')},
          {text: '→', kind: 'sym', at: wf('c3', 'c3', '변신한')},
          {text: 'more', kind: 'most', at: wfe('c3', 'c3', 'more'), glowAt: wfe('c3', 'c3', 'more') + 6},
        ],
      },
    ]}
  />
);

const MoreBoth: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'more = 가산 + 불가산 모두 OK', at: 0, color: WORD.most.main}}
    rows={[
      {y: 290, size: 70, items: [{text: 'more', kind: 'most', at: wfe('c4', 'c4', 'more'), glowAt: wf('c4', 'c4', '있습니다')}]},
      {y: 450, size: 56, items: [{text: 'more books 📚', kind: 'most', at: wfe('c4', 'c4', 'books')}]},
      {y: 590, size: 56, items: [{text: 'more water 💧', kind: 'most', at: wfe('c4', 'c4', 'water')}]},
    ]}
  />
);

// ---- 0. The mnemonic ------------------------------------------------------------

const SmurfIntro: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '선행 개념 2 · 비교급 강조 5대장', at: 0, color: WORD.smurf.main, size: 40}}
    emojis={[{emoji: '🖐️', x: 540, y: 660, size: 150, at: wf('k1', 'k1', '5대장입니다'), motion: 'pulse'}]}
    rows={[{y: 340, size: 62, items: [{text: '어라? 이봐, 스머프!', kind: 'smurf', at: wf('k1', 'k1', '어라?'), glowAt: wf('k1', 'k1', '스머프!')}]}]}
  />
);

const GapGrow: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '“더 한” → “훨씬 더 한”', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 310,
        size: 54,
        items: [
          {text: 'older', kind: 'plain', at: wfe('k2', 'k2', 'older')},
          {text: 'more beautiful', kind: 'plain', at: wfe('k2', 'k2', 'beautiful')},
        ],
      },
      {y: 490, size: 56, items: [{text: '격차를 팍! ⬆️', kind: 'smurf', at: wf('k2', 'k2', '팍'), glowAt: wf('k2', 'k2', '있습니다')}]},
    ]}
    footer={{text: '단어 딱 5개', at: wf('k2', 'k2', '5개가'), y: 650, size: 46, color: WORD.smurf.main}}
  />
);

const MemorizeOnce: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '딱 한 번에 외우기', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🧠', x: 540, y: 640, size: 190, at: wf('k3', 'k3', '번에'), motion: 'pulse'}]}
    rows={[{y: 330, size: 62, items: [{text: '어라? 이봐, 스머프!', kind: 'smurf', at: wf('k3', 'k3', '딱'), glowAt: wf('k3', 'k3', '외웁니다')}]}]}
  />
);

// ---- 1. Superlative: why "the"? -------------------------------------------------

const WhyThe: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '핵심 원칙', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 330,
        size: 70,
        items: [
          {text: 'the', kind: 'the', at: wfe('t1', 't1', 'the'), glowAt: wfe('t1', 't1', 'the') + 6},
          {text: '+', kind: 'sym', at: wf('t1', 't1', '항상')},
          {text: '최상급', kind: 'est', at: wf('t1', 't1', '최상급', 1)},
        ],
      },
    ]}
    footer={{text: '왜 항상 짝꿍일까요?', at: wf('t1', 't1', '붙을까요'), y: 500, size: 48}}
  />
);

const OnlyOne: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '최고는 오직 단 하나', at: 0, color: WORD.the.main}}
    emojis={[{emoji: '🥇', x: 540, y: 690, size: 150, at: wf('t2', 't2', '최고는'), motion: 'pulse'}]}
    rows={[
      {y: 290, size: 50, items: [{text: '셋 이상 중 단 하나', kind: 'plain', at: wf('t2', 't2', '셋')}]},
      {
        y: 460,
        size: 60,
        items: [
          {text: 'the', kind: 'the', at: wfe('t2', 't2', 'the'), glowAt: wfe('t2', 't2', 'the') + 6},
          {text: '+', kind: 'sym', at: wf('t2', 't2', '최상급은')},
          {text: '최상급', kind: 'est', at: wf('t2', 't2', '최상급은')},
        ],
      },
    ]}
  />
);

const SuperlativeRules: React.FC<{d: number}> = ({d}) => {
  const cards: CardItem[] = [
    {name: 'the + -est', tag: '1음절 · 짧은 2음절', meaning: 'old → the oldest', kind: 'est', at: wf('t3', 't3', '1음절')},
    {name: 'the most', tag: '3음절 이상 · 긴 2음절', meaning: 'mysterious → the most mysterious', kind: 'most', at: wf('t3', 't4', '3음절')},
  ];
  return <CardBoard duration={d} title="최상급 만드는 법" cards={cards} />;
};

// ---- 2. in vs. of ---------------------------------------------------------------

const InOf: React.FC<{d: number}> = ({d}) => {
  const cards: CardItem[] = [
    {name: 'in', tag: '장소 · 단수 집단', meaning: 'in the city, in the world', kind: 'many', at: wf('n1', 'n1', '장소나')},
    {name: 'of', tag: '여러 개체 · 복수 대상', meaning: 'of all the books, of my life', kind: 'smurf', at: wf('n1', 'n2', '여러')},
  ];
  return <CardBoard duration={d} title="범위의 지정 · in vs of" cards={cards} />;
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['c1'], node: (d) => <Many d={d} />},
    {ids: ['c2'], node: (d) => <Much d={d} />},
    {ids: ['c3'], node: (d) => <BecomeMore d={d} />},
    {ids: ['c4'], node: (d) => <MoreBoth d={d} />},
    {ids: ['k1'], node: (d) => <SmurfIntro d={d} />},
    {ids: ['k2'], node: (d) => <GapGrow d={d} />},
    {ids: ['k3'], node: (d) => <MemorizeOnce d={d} />},
    {ids: ['k4', 'k5', 'k6'], node: (d) => <SmurfBoard duration={d} />},
    {ids: ['t1'], node: (d) => <WhyThe d={d} />},
    {ids: ['t2'], node: (d) => <OnlyOne d={d} />},
    {ids: ['t3', 't4'], node: (d) => <SuperlativeRules d={d} />},
    {ids: ['n1', 'n2'], node: (d) => <InOf d={d} />},
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
