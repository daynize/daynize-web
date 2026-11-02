import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {PREP_NAMES, SceneSpan} from '../timeline';
import {PREP, PrepName, span, wf} from './shared';
import {Demo, MeaningCard} from './lesson';

const PREPS: PrepName[] = PREP_NAMES;
const chunk = <T,>(items: T[], size: number): T[][] => Array.from({length: Math.ceil(items.length / size)}, (_, i) => items.slice(i * size, i * size + size));

// Phase 1 - the relative pronoun = conjunction + pronoun in one wand.
const Wand: React.FC<{d: number}> = ({d}) => {
  const wand = wf('i1', 'i1', '요술봉이라고');
  return (
    <Demo
      duration={d}
      title={{text: '지난 시간 · 관계대명사', at: 0}}
      emojis={[{emoji: '🪄', x: 540, y: 640, size: 150, at: wand, motion: 'pulse'}]}
      rows={[
        {
          y: 300,
          size: 56,
          items: [
            {text: '접속사', kind: 'plain', at: wf('i1', 'i1', '접속사와')},
            {text: '+', kind: 'sym', at: wf('i1', 'i1', '접속사와')},
            {text: '대명사', kind: 'plain', at: wf('i1', 'i1', '대명사가')},
          ],
        },
        {y: 480, size: 70, items: [{text: '관계대명사', kind: 'which', at: wf('i1', 'i1', '합쳐진'), glowAt: wand}]},
      ]}
    />
  );
};

// Phase 2 - which glues "그런데 이것은..." after a thing.
const WhichGlue: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '사물 뒤 · 그런데 이것은...', at: 0, color: PREP.on.main}}
    emojis={[{emoji: '🔗', x: 540, y: 690, size: 120, at: wf('i2', 'i2', '이어주는'), motion: 'pulse'}]}
    rows={[
      {
        y: 300,
        size: 62,
        items: [
          {text: '사물', kind: 'plain', at: wf('i2', 'i2', '사물')},
          {text: '+', kind: 'sym', at: wf('i2', 'i2', '뒤에서')},
          {text: 'which', kind: 'which', at: wf('i2', 'i2', 'which였죠.'), glowAt: wf('i2', 'i2', 'which였죠.') + 6},
        ],
      },
      {y: 500, size: 50, items: [{text: '“그런데 이것은...”', kind: 'plain', at: wf('i2', 'i2', '“그런데')}]},
    ]}
  />
);

// Phase 3 - why are they long and complicated? (eight pills, two per row)
const LongForms: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '왜 이렇게 길고 복잡할까?', at: 0, color: '#FF9CA0'}}
    emojis={[{emoji: '🤔', x: 900, y: 700, size: 110, at: wf('i3', 'i3', '복잡해'), motion: 'float'}]}
    rows={chunk(PREPS, 2).map((group, r) => ({
      y: 215 + r * 115,
      size: 46,
      items: group.map((p) => ({text: `${p} which`, kind: p, at: wf('i3', 'i3', p)})),
    }))}
  />
);

const EasyReason: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '이유는 아주 간단!', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '💡', x: 540, y: 420, size: 200, at: wf('i4', 'i4', '명쾌합니다!'), motion: 'pulse'}]}
  />
);

// Phase 5 - prepositions that used to sit next to their noun, now stranded and lonely.
const FourPreps: React.FC<{d: number}> = ({d}) => {
  const sad = wf('i5', 'i5', '외로워졌기');
  return (
    <Demo
      duration={d}
      title={{text: '명사와 짝꿍이던 전치사', at: 0}}
      emojis={[{emoji: '🥺', x: 540, y: 690, size: 120, at: sad, motion: 'float'}]}
      rows={chunk(PREPS, 4).map((group, r) => ({
        y: 280 + r * 140,
        size: 52,
        items: group.map((p) => ({text: p, kind: p, at: wf('i5', 'i5', p), glowAt: sad})),
      }))}
      footer={{text: '혼자 덩그러니 남겨졌어요...', at: wf('i5', 'i5', '덩그러니'), y: 560, color: COLORS.cream}}
    />
  );
};

// Phase 6 - it slides in front of which.
const Attach: React.FC<{d: number}> = ({d}) => {
  const glue = wf('i6', 'i6', '찰싹');
  return (
    <Demo
      duration={d}
      title={{text: '전치사 → which 바로 앞으로!', at: 0, color: COLORS.yellow}}
      emojis={[{emoji: '🧲', x: 540, y: 690, size: 120, at: glue, motion: 'pulse'}]}
      rows={[
        {
          y: 290,
          size: 60,
          items: [
            {text: 'in', kind: 'lonely', at: wf('i6', 'i6', '전치사가')},
            {text: '→', kind: 'sym', at: wf('i6', 'i6', '짝꿍이었던')},
            {text: 'which', kind: 'which', at: wf('i6', 'i6', 'which')},
          ],
        },
        {y: 480, size: 80, items: [{text: 'in which', kind: 'in', at: glue, glowAt: wf('i6', 'i6', '이동한')}]},
      ]}
    />
  );
};

const Intuitive: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '원리를 알면 해석도 직관적!', at: 0}}
    emojis={[{emoji: '🧭', x: 540, y: 420, size: 200, at: wf('i7', 'i7', '직관적입니다.'), motion: 'pulse'}]}
  />
);

const MEANINGS: {id: string; prep: PrepName; lines: string[]}[] = [
  {id: 'i8', prep: 'in', lines: ['“그런데 그 공간, 시간 안에서...”']},
  {id: 'i9', prep: 'on', lines: ['“그런데 그 표면, 날짜 위에...”']},
  {id: 'i10', prep: 'at', lines: ['“그런데 그 특정 시점, 장소에서...”']},
  {id: 'i11', prep: 'of', lines: ['“그런데 그것의...”', '“그런데 그것 중에서...”']},
  {id: 'i12', prep: 'for', lines: ['“그런데 그것을 위해...”', '“그런데 그것 때문에...”']},
  {id: 'i13', prep: 'from', lines: ['“그런데 그것으로부터...”', '“그런데 그 출처에서...”']},
  {id: 'i14', prep: 'by', lines: ['“그런데 그것에 의해...”', '“그런데 그 수단으로...”']},
  {id: 'i15', prep: 'with', lines: ['“그런데 그것을 가지고...”', '“그런데 그 도구, 동반으로...”']},
];

const Formula: React.FC<{d: number}> = ({d}) => {
  const hi = wf('i16', 'i16', '해석하면');
  return (
    <Demo
      duration={d}
      title={{text: '이것만 기억하세요', at: 0, color: COLORS.yellow}}
      emojis={[{emoji: '😌', x: 540, y: 690, size: 120, at: wf('i16', 'i16', '깔끔하게'), motion: 'float'}]}
      rows={[
        {
          y: 330,
          size: 52,
          items: [
            {text: '전치사 뜻', kind: 'in', at: wf('i16', 'i16', '“전치사'), glowAt: hi},
            {text: '+', kind: 'sym', at: wf('i16', 'i16', '+')},
            {text: '그런데 그것은!', kind: 'which', at: wf('i16', 'i16', '그런데'), glowAt: hi},
          ],
        },
      ]}
    />
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <Wand d={d} />},
    {ids: ['i2'], node: (d) => <WhichGlue d={d} />},
    {ids: ['i3'], node: (d) => <LongForms d={d} />},
    {ids: ['i4'], node: (d) => <EasyReason d={d} />},
    {ids: ['i5'], node: (d) => <FourPreps d={d} />},
    {ids: ['i6'], node: (d) => <Attach d={d} />},
    {ids: ['i7'], node: (d) => <Intuitive d={d} />},
    ...MEANINGS.filter((m) => PREPS.includes(m.prep)).map((m) => ({
      ids: [m.id],
      node: (d: number) => (
        <MeaningCard
          duration={d}
          prep={m.prep}
          title={`${m.prep} which`}
          at={wf(m.id, m.id, m.prep)}
          lines={m.lines.map((text, i) => ({text, at: wf(m.id, m.id, '그런데', i)}))}
        />
      ),
    })),
    {ids: ['i16'], node: (d) => <Formula d={d} />},
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
