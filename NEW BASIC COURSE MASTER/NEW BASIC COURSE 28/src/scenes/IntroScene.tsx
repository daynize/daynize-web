import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {ED, ING, span, wf} from './shared';
import {Demo} from './lesson';

// Phase 1 - Korean already decorates actions: "그녀는 달린다" -> "그녀는 빠르게 달린다".
const RunVivid: React.FC<{d: number}> = ({d}) => {
  const a = wf('i1', 'i1', '“그녀는', 0);
  const b = wf('i1', 'i1', '“그녀는', 1);
  const fast = wf('i1', 'i1', '빠르게');
  return (
    <Demo
      duration={d}
      title={{text: '우리말 · 행동을 꾸민다', at: 0}}
      emojis={[
        {emoji: '🏃‍♀️', x: 440, y: 690, size: 130, at: a, motion: 'float'},
        {emoji: '💨', x: 640, y: 690, size: 120, at: fast, motion: 'pulse'},
      ]}
      rows={[
        {y: 250, size: 56, items: [{text: '그녀는', kind: 'plain', at: a}, {text: '달린다', kind: 'plain', at: wf('i1', 'i1', '달린다”라고도')}]},
        {
          y: 470,
          size: 56,
          items: [
            {text: '그녀는', kind: 'plain', at: b},
            {text: '빠르게', kind: 'adv', at: fast, glowAt: wf('i1', 'i1', '생생하게')},
            {text: '달린다', kind: 'plain', at: wf('i1', 'i1', '달린다”처럼')},
          ],
        },
      ]}
    />
  );
};

// Phase 2 - English: seasoning for a verb, an adjective or a whole sentence.
const SpiceTargets: React.FC<{d: number}> = ({d}) => {
  const spice = wf('i2', 'i2', '양념을');
  return (
    <Demo
      duration={d}
      title={{text: '영어 · 양념을 치는 단어', at: 0}}
      emojis={[
        {emoji: '🧂', x: 540, y: 560, size: 170, at: spice, motion: 'pulse'},
        {emoji: '✨', x: 260, y: 520, size: 90, at: spice + 6, motion: 'float'},
        {emoji: '✨', x: 820, y: 520, size: 90, at: spice + 10, motion: 'float'},
      ]}
      rows={[
        {
          y: 300,
          size: 54,
          items: [
            {text: '동사', kind: 'plain', at: wf('i2', 'i2', '동사나'), glowAt: spice},
            {text: '형용사', kind: 'adj', at: wf('i2', 'i2', '형용사,'), glowAt: spice},
            {text: '문장 전체', kind: 'plain', at: wf('i2', 'i2', '문장'), glowAt: spice},
          ],
        },
      ]}
      footer={{text: '뜻이 풍성해진다 ✨', at: wf('i2', 'i2', '풍성하게'), y: 700}}
    />
  );
};

// Phase 3 - the name: adverb.
const AdverbTitle: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '영어의 기초', at: wf('i3', 'i3', '영어의'), color: COLORS.cream}}
    emojis={[
      {emoji: '✨', x: 190, y: 300, size: 90, at: wf('i3', 'i3', '부사,'), motion: 'float'},
      {emoji: '✨', x: 890, y: 330, size: 90, at: wf('i3', 'i3', 'Adverb입니다.'), motion: 'pulse'},
    ]}
    rows={[
      {y: 330, size: 130, items: [{text: '부사', kind: 'adv', at: wf('i3', 'i3', '부사,'), glowAt: wf('i3', 'i3', 'Adverb입니다.')}]},
      {y: 560, size: 84, items: [{text: 'ADVERB', kind: 'adv', at: wf('i3', 'i3', 'Adverb입니다.')}]},
    ]}
  />
);

// Phase 4 - a bland sentence + the all-purpose sauce.
const Sauce: React.FC<{d: number}> = ({d}) => {
  const pop = wf('i4', 'i4', '부사입니다.');
  return (
    <Demo
      duration={d}
      title={{text: '부사 = 만능 양념장', at: 0, color: ING.main}}
      emojis={[
        {emoji: '😐', x: 200, y: 560, size: 110, at: wf('i4', 'i4', '밋밋한'), motion: 'float'},
        {emoji: '✨', x: 540, y: 560, size: 100, at: wf('i4', 'i4', '감칠맛을'), motion: 'pulse'},
        {emoji: '🥣', x: 880, y: 560, size: 130, at: wf('i4', 'i4', '양념장,'), motion: 'pulse'},
      ]}
      rows={[
        {
          y: 340,
          size: 84,
          items: [
            {text: 'She', kind: 'plain', at: wf('i4', 'i4', '밋밋한')},
            {text: 'runs', kind: 'plain', at: wf('i4', 'i4', '문장에')},
            {text: 'fast', kind: 'adv', at: pop, glowAt: pop + 8},
          ],
        },
      ]}
      footer={{text: '밋밋한 문장 + 부사 = 감칠맛!', at: wf('i4', 'i4', '더해주는'), y: 700}}
    />
  );
};

// Phase 5 - an adjective modifies a noun directly.
const AdjNoun: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '형용사 → 명사를 꾸민다', at: 0, color: ED.main}}
    emojis={[{emoji: '🌸', x: 540, y: 640, size: 150, at: wf('i5', 'i5', '명사를'), motion: 'float'}]}
    rows={[
      {
        y: 350,
        size: 76,
        items: [
          {text: 'a', kind: 'plain', at: wf('i5', 'i5', '명사를')},
          {text: 'beautiful', kind: 'adj', at: wf('i5', 'i5', '형용사와'), glowAt: wf('i5', 'i5', '달리,')},
          {text: 'flower', kind: 'plain', at: wf('i5', 'i5', '명사를')},
        ],
      },
    ]}
    footer={{text: '명사를 직접 꾸민다', at: wf('i5', 'i5', '직접'), y: 520, color: COLORS.cream}}
  />
);

// Phase 6 - an adverb modifies a verb: how does it happen?
const VerbAdverb: React.FC<{d: number}> = ({d}) => {
  const fast = wf('i6', 'i6', '빠르게,');
  const slow = wf('i6', 'i6', '천천히,');
  return (
    <Demo
      duration={d}
      title={{text: '부사 → 동사 · 어떻게?', at: 0, color: ING.main}}
      emojis={[
        {emoji: '💨', x: 290, y: 690, size: 120, at: fast, motion: 'pulse'},
        {emoji: '🐢', x: 790, y: 690, size: 120, at: slow, motion: 'float'},
      ]}
      rows={[
        {
          y: 300,
          size: 76,
          items: [
            {text: 'She', kind: 'plain', at: wf('i6', 'i6', '부사는')},
            {text: 'runs', kind: 'plain', at: wf('i6', 'i6', '동사가'), glowAt: wf('i6', 'i6', '어떻게')},
          ],
        },
        {
          y: 500,
          size: 66,
          items: [
            {text: 'fast', kind: 'adv', at: fast, glowAt: fast + 6},
            {text: 'slowly', kind: 'adv', at: slow, glowAt: slow + 6},
          ],
        },
      ]}
    />
  );
};

// Phase 7 - an adverb modifies an adjective: how strongly?
const AdjAdverb: React.FC<{d: number}> = ({d}) => {
  const very = wf('i7', 'i7', '매우,');
  const really = wf('i7', 'i7', '정말로,');
  return (
    <Demo
      duration={d}
      title={{text: '부사 → 형용사 · 얼마나?', at: 0, color: ING.main}}
      emojis={[
        {emoji: '🌸', x: 540, y: 690, size: 120, at: wf('i7', 'i7', '형용사가'), motion: 'float'},
        {emoji: '💥', x: 800, y: 660, size: 100, at: really, motion: 'pulse'},
      ]}
      rows={[
        {y: 300, size: 76, items: [{text: 'beautiful', kind: 'adj', at: wf('i7', 'i7', '형용사가'), glowAt: wf('i7', 'i7', '강력한지,')}]},
        {
          y: 500,
          size: 66,
          items: [
            {text: 'very', kind: 'adv', at: very, glowAt: very + 6},
            {text: 'really', kind: 'adv', at: really, glowAt: really + 6},
          ],
        },
      ]}
    />
  );
};

// Phase 8 - a sentence adverb sets the mood of the whole sentence.
const SentenceAdverb: React.FC<{d: number}> = ({d}) => {
  const mood = wf('i8', 'i8', '분위기를');
  return (
    <Demo
      duration={d}
      title={{text: '부사 → 문장 전체 · 분위기', at: 0, color: ING.main}}
      emojis={[
        {emoji: '🍀', x: 300, y: 600, size: 130, at: mood, motion: 'float'},
        {emoji: '🏆', x: 780, y: 600, size: 130, at: wf('i8', 'i8', '다채롭게'), motion: 'pulse'},
      ]}
      rows={[
        {
          y: 340,
          size: 70,
          items: [
            {text: 'Luckily,', kind: 'adv', at: mood, glowAt: wf('i8', 'i8', '다채롭게')},
            {text: 'she', kind: 'plain', at: wf('i8', 'i8', '문장')},
            {text: 'won.', kind: 'plain', at: wf('i8', 'i8', '전체의')},
          ],
        },
      ]}
    />
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <RunVivid d={d} />},
    {ids: ['i2'], node: (d) => <SpiceTargets d={d} />},
    {ids: ['i3'], node: (d) => <AdverbTitle d={d} />},
    {ids: ['i4'], node: (d) => <Sauce d={d} />},
    {ids: ['i5'], node: (d) => <AdjNoun d={d} />},
    {ids: ['i6'], node: (d) => <VerbAdverb d={d} />},
    {ids: ['i7'], node: (d) => <AdjAdverb d={d} />},
    {ids: ['i8'], node: (d) => <SentenceAdverb d={d} />},
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
