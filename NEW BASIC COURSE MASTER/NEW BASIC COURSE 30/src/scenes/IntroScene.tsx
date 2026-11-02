import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf, wfe} from './shared';
import {Demo} from './lesson';

// Phase 1 - how many are left, and is the number certain?
const Count: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '상자에서 하나씩 꺼낼 때', at: 0}}
    emojis={[
      {emoji: '🍎', x: 330, y: 690, size: 120, at: wf('i1', 'i1', '사과나'), motion: 'float'},
      {emoji: '🖊️', x: 750, y: 690, size: 110, at: wf('i1', 'i1', '볼펜을'), motion: 'float'},
    ]}
    rows={[
      {y: 300, size: 50, items: [{text: '남은 나머지는 몇 개?', kind: 'plain', at: wf('i1', 'i1', '몇')}]},
      {y: 460, size: 50, items: [{text: '그 개수가 확실히 정해졌나?', kind: 'plain', at: wf('i1', 'i1', '확실히')}]},
    ]}
  />
);

// Phase 2 - the three words.
const ThreeWords: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '영어의 기초', at: wf('i2', 'i2', '영어의')}}
    rows={[
      {
        y: 330,
        size: 62,
        items: [
          {text: 'another', kind: 'another', at: wfe('i2', 'i2', 'another'), glowAt: wfe('i2', 'i2', 'another') + 4},
          {text: 'other', kind: 'other', at: wfe('i2', 'i2', 'other'), glowAt: wfe('i2', 'i2', 'other') + 4},
        ],
      },
      {y: 500, size: 70, items: [{text: 'the other', kind: 'theother', at: wfe('i2', 'i2', 'the'), glowAt: wfe('i2', 'i2', 'the') + 4}]},
    ]}
  />
);

const JustCount: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '문법 용어 ✕ · 사과 개수 ✓', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🍎', x: 540, y: 420, size: 220, at: wf('i3', 'i3', '사과의'), motion: 'pulse'}]}
    footer={{text: '손에 남은 사과의 개수만!', at: wf('i3', 'i3', '개수만'), y: 600}}
  />
);

// another = an + other, one more, singular.
const AnotherMeaning: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'another · 나머지가 있는 하나 더', at: 0, color: WORD.another.main}}
    emojis={[{emoji: '🍎', x: 540, y: 690, size: 110, at: wf('i4', 'i4', '하나'), motion: 'float'}]}
    rows={[
      {
        y: 300,
        size: 56,
        items: [
          {text: 'an', kind: 'plain', at: wfe('i4', 'i4', 'an')},
          {text: '+', kind: 'sym', at: wfe('i4', 'i4', 'other')},
          {text: 'other', kind: 'other', at: wfe('i4', 'i4', 'other') + 4},
          {text: '=', kind: 'sym', at: wf('i4', 'i4', '합쳐진')},
          {text: 'another', kind: 'another', at: wf('i4', 'i4', '합쳐진'), glowAt: wf('i4', 'i4', '하나')},
        ],
      },
      {y: 480, size: 48, items: [{text: '단수 (1개)', kind: 'plain', at: wf('i4', 'i4', '단수입니다.')}]},
    ]}
  />
);

const OtherMeaning: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'other / others · 나머지가 있는 여러 개', at: 0, color: WORD.other.main}}
    emojis={[{emoji: '🍎🍎🍎', x: 540, y: 690, size: 100, at: wf('i5', 'i5', '여러'), motion: 'float'}]}
    rows={[
      {
        y: 300,
        size: 66,
        items: [
          {text: 'other', kind: 'other', at: wfe('i5', 'i5', 'other'), glowAt: wfe('i5', 'i5', 'other') + 4},
          {text: 'others', kind: 'other', at: wfe('i5', 'i5', 'others'), glowAt: wfe('i5', 'i5', 'others') + 4},
        ],
      },
      {y: 480, size: 48, items: [{text: '복수 (여러 개)', kind: 'plain', at: wf('i5', 'i5', '복수입니다.')}]},
    ]}
  />
);

const TheOtherMeaning: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'the other · 딱 정해진 나머지', at: 0, color: WORD.theother.main}}
    emojis={[{emoji: '🎯', x: 540, y: 700, size: 110, at: wf('i6', 'i6', '정해진'), motion: 'pulse'}]}
    rows={[
      {
        y: 290,
        size: 58,
        items: [
          {text: 'the other', kind: 'theother', at: wfe('i6', 'i6', 'the'), glowAt: wfe('i6', 'i6', 'the') + 4},
          {text: '단수 (1개)', kind: 'plain', at: wf('i6', 'i6', '단수이거나,')},
        ],
      },
      {
        y: 470,
        size: 58,
        items: [
          {text: 'the others', kind: 'theother', at: wfe('i6', 'i6', 'the', 1), glowAt: wfe('i6', 'i6', 'the', 1) + 4},
          {text: '복수 (여러 개)', kind: 'plain', at: wf('i6', 'i6', '복수입니다.')},
        ],
      },
    ]}
  />
);

const ThePointer: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'the = 족집게 손가락', at: 0, color: WORD.theother.main}}
    emojis={[{emoji: '👆', x: 540, y: 560, size: 190, at: wf('i7', 'i7', '족집게'), motion: 'pulse'}]}
    rows={[{y: 300, size: 96, items: [{text: 'the', kind: 'theother', at: wfe('i7', 'i7', 'the'), glowAt: wf('i7', 'i7', '딱')}]}]}
    footer={{text: '“너도 알고 나도 아는 정해진 그것”', at: wf('i7', 'i7', '“너도'), y: 420, color: COLORS.cream, size: 42}}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <Count d={d} />},
    {ids: ['i2'], node: (d) => <ThreeWords d={d} />},
    {ids: ['i3'], node: (d) => <JustCount d={d} />},
    {ids: ['i4'], node: (d) => <AnotherMeaning d={d} />},
    {ids: ['i5'], node: (d) => <OtherMeaning d={d} />},
    {ids: ['i6'], node: (d) => <TheOtherMeaning d={d} />},
    {ids: ['i7'], node: (d) => <ThePointer d={d} />},
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
