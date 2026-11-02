import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf, wfe} from './shared';
import {CardBoard, CardItem, Demo} from './lesson';

const NotWrong: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '도치는 틀린 문법이 아니에요', at: 0, color: COLORS.yellow}}
    rows={[
      {y: 300, size: 50, items: [{text: '강조하고 싶은 단어', kind: 'neg', at: wf('c1', 'c1', '강조하고'), glowAt: wf('c1', 'c1', '단어를')}]},
      {y: 460, size: 56, items: [{text: '→ 문장 맨 앞으로!', kind: 'plain', at: wf('c1', 'c1', '맨')}]},
    ]}
    emojis={[{emoji: '🎯', x: 540, y: 680, size: 150, at: wf('c1', 'c1', '던질'), motion: 'pulse'}]}
    footer={{text: '자연스러운 어순 변화', at: wf('c1', 'c1', '자연스러운'), y: 560, size: 48}}
  />
);

const QuestionOrder: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '질문할 때처럼 자리를 비켜줘요', at: 0, color: COLORS.yellow, size: 40}}
    emojis={[{emoji: '🔦', x: 540, y: 690, size: 150, at: wf('c2', 'c2', '스포트라이트를'), motion: 'pulse'}]}
    rows={[
      {
        y: 320,
        size: 46,
        items: [
          {text: '강조어', kind: 'neg', at: wf('c2', 'c2', '강조어가'), glowAt: wf('c2', 'c2', '앞으로')},
          {text: '+', kind: 'sym', at: wf('c2', 'c2', '조동사')},
          {text: '조동사 / be', kind: 'verb', at: wf('c2', 'c2', '조동사')},
        ],
      },
      {
        y: 470,
        size: 46,
        items: [
          {text: '+', kind: 'sym', at: wf('c2', 'c2', '주어', 1)},
          {text: '주어', kind: 'subj', at: wf('c2', 'c2', '주어', 1)},
          {text: '+', kind: 'sym', at: wf('c2', 'c2', '순서로')},
          {text: '동사', kind: 'verb', at: wf('c2', 'c2', '순서로')},
        ],
      },
    ]}
  />
);

const Families: React.FC<{d: number}> = ({d}) => {
  const cards: CardItem[] = [
    {name: '부정어', tag: '맨 앞으로 튀어나가요', meaning: 'Never · Seldom · Rarely · Little', kind: 'neg', at: wfe('c3', 'c3', 'Never')},
    {name: '장소 · 방향', tag: '맨 앞으로 튀어나가요', meaning: 'Here · There · Down', kind: 'place', at: wfe('c3', 'c3', 'Here')},
    {name: 'Only', tag: '이끄는 말이 앞으로', meaning: 'Only + 부사(구) + 조동사 + 주어', kind: 'place', at: wfe('c3', 'c3', 'Only')},
  ];
  return <CardBoard duration={d} title="이런 단어들이 앞으로 나가면 도치!" cards={cards} />;
};

const StoryIntro: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '도심 동화 · 서재와 밤의 골목길', at: 0, color: COLORS.yellow, size: 40}}
    emojis={[
      {emoji: '☕', x: 300, y: 540, size: 150, at: wf('d1', 'd1', '카페'), motion: 'float'},
      {emoji: '📚', x: 540, y: 520, size: 190, at: wf('d1', 'd1', '서재와'), motion: 'pulse'},
      {emoji: '🌃', x: 790, y: 520, size: 160, at: wf('d1', 'd1', '골목길에서'), motion: 'float'},
    ]}
    footer={{text: '도치 문장으로 만나요!', at: wf('d1', 'd1', '도치'), y: 700, size: 46, color: WORD.neg.main}}
  />
);

const HowToListen: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '이렇게 들어보세요', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '👂', x: 540, y: 690, size: 130, at: wf('d2', 'd2', '귀를'), motion: 'pulse'}]}
    rows={[
      {y: 320, size: 54, items: [{text: '① 한글 의미 먼저 가슴에 담기', kind: 'subj', at: wf('d2', 'd2', '한글')}]},
      {y: 500, size: 54, items: [{text: '② 영어 소리에 귀 기울이기', kind: 'verb', at: wf('d2', 'd2', '영어'), glowAt: wf('d2', 'd2', '귀를')}]},
    ]}
  />
);

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['c1'], node: (d) => <NotWrong d={d} />},
    {ids: ['c2'], node: (d) => <QuestionOrder d={d} />},
    {ids: ['c3'], node: (d) => <Families d={d} />},
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
