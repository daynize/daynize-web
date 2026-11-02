import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf, wfe} from './shared';
import {Demo} from './lesson';

const TenseSecret: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '시제의 비밀 · If절 안에서는', at: 0, color: COLORS.yellow, size: 40}}
    rows={[
      {
        y: 320,
        size: 60,
        items: [
          {text: 'If', kind: 'if', at: wfe('b1', 'b1', 'If')},
          {text: 'will ✕', kind: 'warn', at: wfe('b1', 'b1', 'will'), glowAt: wfe('b1', 'b1', 'will') + 4},
        ],
      },
      {y: 500, size: 60, items: [{text: '현재시제 ✓', kind: 'present', at: wf('b1', 'b1', '현재시제를'), glowAt: wf('b1', 'b1', '현재시제를')}]},
    ]}
    footer={{text: '미래의 일이라도 If절은 현재시제!', at: wf('b1', 'b1', '미래의'), y: 680, size: 42}}
  />
);

const ResultClause: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '조건 → 결과', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 310,
        size: 50,
        items: [
          {text: 'If절', kind: 'if', at: wf('b2', 'b2', '조건이')},
          {text: '현재시제', kind: 'present', at: wf('b2', 'b2', '현재로'), glowAt: wf('b2', 'b2', '현재로')},
        ],
      },
      {
        y: 480,
        size: 50,
        items: [
          {text: '결과절', kind: 'plain', at: wf('b2', 'b2', '결과')},
          {text: 'will', kind: 'will', at: wfe('b2', 'b2', 'will'), glowAt: wfe('b2', 'b2', 'will') + 4},
          {text: 'can', kind: 'will', at: wfe('b2', 'b2', 'can'), glowAt: wfe('b2', 'b2', 'can') + 4},
        ],
      },
    ]}
    footer={{text: '앞으로 일어날 미래를 보여줘요 ➡️', at: wf('b2', 'b2', '미래를'), y: 650, size: 44}}
  />
);

const UnlessRule: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '부정 조건 · Unless', at: 0, color: WORD.unless.main}}
    rows={[
      {
        y: 320,
        size: 66,
        items: [
          {text: 'If', kind: 'if', at: wfe('c1', 'c1', 'If')},
          {text: 'not', kind: 'not', at: wfe('c1', 'c1', 'not')},
        ],
      },
      {y: 480, size: 50, items: [{text: '↓ 줄여서', kind: 'sym', at: wf('c1', 'c1', '줄여서')}]},
      {y: 640, size: 80, items: [{text: 'Unless', kind: 'unless', at: wfe('c1', 'c1', 'Unless'), glowAt: wfe('c1', 'c1', 'Unless') + 6}]},
    ]}
  />
);

const StoryIntro: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '도심 동화 · 다음 이야기', at: 0, color: COLORS.yellow}}
    emojis={[
      {emoji: '☕', x: 300, y: 540, size: 150, at: wf('d1', 'd1', '카페'), motion: 'float'},
      {emoji: '📚', x: 540, y: 520, size: 190, at: wf('d1', 'd1', '서재의'), motion: 'pulse'},
      {emoji: '🔮', x: 790, y: 520, size: 160, at: wf('d1', 'd1', '펼쳐질'), motion: 'float'},
    ]}
    footer={{text: '앞으로 펼쳐질 일들을 전제로!', at: wf('d1', 'd1', '전제로'), y: 700, size: 44}}
  />
);

const HowToListen: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '이렇게 들어보세요', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '👂', x: 540, y: 690, size: 130, at: wf('d2', 'd2', '들어보세요'), motion: 'pulse'}]}
    rows={[
      {y: 320, size: 54, items: [{text: '① 한글 의미 먼저 마음에 새기기', kind: 'present', at: wf('d2', 'd2', '한글')}]},
      {y: 500, size: 54, items: [{text: '② 영어 소리 들어보기', kind: 'will', at: wf('d2', 'd2', '영어'), glowAt: wf('d2', 'd2', '들어보세요')}]},
    ]}
  />
);

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['b1'], node: (d) => <TenseSecret d={d} />},
    {ids: ['b2'], node: (d) => <ResultClause d={d} />},
    {ids: ['c1'], node: (d) => <UnlessRule d={d} />},
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
