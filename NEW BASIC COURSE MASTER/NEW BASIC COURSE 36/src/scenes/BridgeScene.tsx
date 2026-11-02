import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf, wfe} from './shared';
import {CardBoard, CardItem, Demo} from './lesson';

// ---- Push the tense back ----------------------------------------------------------

const PushBack: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '가장 재미있는 포인트', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 320,
        size: 56,
        items: [
          {text: '현재 시제', kind: 'plain', at: wf('a1', 'a1', '시제를')},
          {text: '→', kind: 'sym', at: wf('a1', 'a1', '밀어내서')},
          {text: '과거로 쓱', kind: 'past', at: wf('a1', 'a1', '과거로'), glowAt: wf('a1', 'a1', '밀어내서')},
        ],
      },
      {y: 500, size: 46, items: [{text: '가상의 상상 = 과거로 밀기', kind: 'if', at: wf('a1', 'a1', '가상의')}]},
    ]}
  />
);

const LinkToModals: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '13강 조동사 과거형 기억나시죠?', at: 0, color: COLORS.yellow, size: 40}}
    rows={[
      {
        y: 320,
        size: 54,
        items: [
          {text: 'could', kind: 'past', at: wf('a2', 'a2', '조동사')},
          {text: 'would', kind: 'would', at: wf('a2', 'a2', '과거형')},
          {text: 'might', kind: 'if', at: wf('a2', 'a2', '배울')},
        ],
      },
      {
        y: 500,
        size: 44,
        items: [
          {text: '현실과의 거리 ↔', kind: 'plain', at: wf('a2', 'a2', '거리가')},
          {text: '불확실 · 가상', kind: 'hadpp', at: wf('a2', 'a2', '불확실함이나'), glowAt: wf('a2', 'a2', '뉘앙스가')},
        ],
      },
    ]}
  />
);

// ---- Past subjunctive ---------------------------------------------------------------

const PastRule: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '가정법 과거 · 지금 사실과 반대', at: 0, color: WORD.past.main, size: 40}}
    rows={[
      {
        y: 310,
        size: 52,
        items: [
          {text: 'If', kind: 'if', at: wf('b1', 'b1', '만약')},
          {text: '+ 과거동사', kind: 'past', at: wf('b1', 'b1', '과거동사를'), glowAt: wf('b1', 'b1', '과거동사를')},
        ],
      },
      {
        y: 470,
        size: 52,
        items: [
          {text: ', would / could / might', kind: 'would', at: wf('b1', 'b1', '할')},
          {text: '+ 동사', kind: 'plain', at: wf('b1', 'b1', '텐데')},
        ],
      },
    ]}
    footer={{text: '“지금 ~라면, ~할 텐데”', at: wf('b1', 'b1', '상상할'), y: 640, size: 46}}
  />
);

const WereRule: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'be동사는 인칭 상관없이 were', at: 0, color: WORD.were.main}}
    rows={[
      {
        y: 310,
        size: 50,
        items: [
          {text: 'I', kind: 'plain', at: wf('b2', 'b2', '인칭')},
          {text: 'you', kind: 'plain', at: wf('b2', 'b2', '인칭')},
          {text: 'he / she', kind: 'plain', at: wf('b2', 'b2', '상관없이')},
        ],
      },
      {y: 480, size: 80, items: [{text: 'were', kind: 'were', at: wfe('b2', 'b2', 'were'), glowAt: wfe('b2', 'b2', 'were') + 6}]},
    ]}
    footer={{text: 'If I were ~ / If she were ~', at: wf('b2', 'b2', '매력적인'), y: 660, size: 46, color: WORD.were.main}}
  />
);

// ---- Past perfect subjunctive --------------------------------------------------------

const PerfectRule: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '지나간 일을 후회하거나 상상할 때', at: 0, color: WORD.hadpp.main, size: 40}}
    rows={[
      {
        y: 310,
        size: 52,
        items: [
          {text: 'If', kind: 'if', at: wf('c1', 'c1', '그때')},
          {text: '+ had p.p.', kind: 'hadpp', at: wfe('c1', 'c1', 'had'), glowAt: wfe('c1', 'c1', 'had')},
        ],
      },
      {
        y: 470,
        size: 52,
        items: [
          {text: ', would / could / might have p.p.', kind: 'wouldhave', at: wf('c1', 'c1', '했을'), glowAt: wf('c1', 'c1', '써줍니다')},
        ],
      },
    ]}
    footer={{text: '과거보다 한 단계 더 옛날', at: wf('c1', 'c1', '단계'), y: 640, size: 46}}
  />
);

const Compare: React.FC<{d: number}> = ({d}) => {
  const cards: CardItem[] = [
    {name: 'If + 과거', tag: '가정법 과거', meaning: '지금 현실의 반대', kind: 'past', at: 0},
    {name: 'If + had p.p.', tag: '가정법 과거완료', meaning: '지난 일의 후회 · 상상', kind: 'hadpp', at: wf('c2', 'c2', '가정법')},
  ];
  return <CardBoard duration={d} title="가정법 두 가지" cards={cards} />;
};

// ---- Story intro ---------------------------------------------------------------------

const StoryIntro: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '도심 동화 · 일상으로 돌아온 주인공', at: 0, color: COLORS.yellow, size: 40}}
    emojis={[
      {emoji: '📚', x: 300, y: 540, size: 150, at: wf('d1', 'd1', '서재의'), motion: 'float'},
      {emoji: '🏠', x: 540, y: 520, size: 190, at: wf('d1', 'd1', '일상으로'), motion: 'pulse'},
      {emoji: '💭', x: 790, y: 520, size: 160, at: wf('d1', 'd1', '가상의'), motion: 'float'},
    ]}
    footer={{text: '가상의 순간들을 하나씩 느껴봐요', at: wf('d1', 'd1', '하나씩'), y: 700, size: 42}}
  />
);

const HowToListen: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '이렇게 들어보세요', at: 0, color: COLORS.yellow}}
    rows={[
      {y: 320, size: 54, items: [{text: '① 한글 의미 먼저 마음에 담기', kind: 'past', at: wf('d2', 'd2', '한글')}]},
      {y: 500, size: 54, items: [{text: '② 영어 소리에 귀 기울이기', kind: 'would', at: wf('d2', 'd2', '영어'), glowAt: wf('d2', 'd2', '귀를')}]},
    ]}
    emojis={[{emoji: '👂', x: 540, y: 690, size: 130, at: wf('d2', 'd2', '귀를'), motion: 'pulse'}]}
  />
);

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['a1'], node: (d) => <PushBack d={d} />},
    {ids: ['a2'], node: (d) => <LinkToModals d={d} />},
    {ids: ['b1'], node: (d) => <PastRule d={d} />},
    {ids: ['b2'], node: (d) => <WereRule d={d} />},
    {ids: ['c1'], node: (d) => <PerfectRule d={d} />},
    {ids: ['c2'], node: (d) => <Compare d={d} />},
    {ids: ['d1'], node: (d) => <StoryIntro d={d} />},
    {ids: ['d2'], node: (d) => <HowToListen d={d} />},
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
