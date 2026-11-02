import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, wf, wfe} from './shared';
import {Demo} from './lesson';

// Hook: "같은 조건이었으면 나도 그랬겠지" - how do we say it?
const Hook: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '“나도 그랬겠지…” 영어로?', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '💭', x: 540, y: 700, size: 170, at: wf('i1', 'i1', '그랬겠지'), motion: 'float'}]}
    rows={[
      {y: 300, size: 54, items: [{text: '같은 조건이었으면', kind: 'plain', at: wf('i1', 'i1', '조건이었으면')}]},
      {
        y: 470,
        size: 54,
        items: [
          {text: '나도 했지…', kind: 'plain', at: wf('i1', 'i1', '했지')},
          {text: '나도 그랬겠지…', kind: 'will', at: wf('i1', 'i1', '그랬겠지'), glowAt: wf('i1', 'i1', '그랬겠지') + 6},
        ],
      },
    ]}
  />
);

// "I did so" is a fact; it cannot say "그랬겠지".
const DidSo: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '과거형 I did so ?', at: 0}}
    rows={[
      {y: 310, size: 74, items: [{text: 'I did so', kind: 'plain', at: wfe('i2', 'i2', 'I')}]},
      {
        y: 500,
        size: 52,
        items: [
          {text: '“그랬겠지”는', kind: 'plain', at: wf('i2', 'i2', '그랬겠지는')},
          {text: '표현 안 됨 ✕', kind: 'warn', at: wf('i2', 'i2', '안됩니다')},
        ],
      },
    ]}
    footer={{text: '오늘 그 표현을 배웁니다', at: wf('i2', 'i2', '오늘'), y: 680, color: COLORS.yellow, size: 50}}
  />
);

// Verb = action; helping verb = colour of attitude / ability / will / certainty.
const HelpingVerb: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '조동사 · Helping Verb', at: 0, color: COLORS.sand}}
    rows={[
      {y: 290, size: 52, items: [{text: '동사 = 행동 🏃', kind: 'plain', at: wf('i3', 'i3', '동사는')}]},
      {y: 450, size: 52, items: [{text: '조동사 = 마음의 색깔 🎨', kind: 'shall', at: wf('i3', 'i3', '조동사는'), glowAt: wf('i3', 'i3', '색깔을')}]},
      {
        y: 640,
        size: 46,
        items: [
          {text: '태도', kind: 'shall', at: wf('i3', 'i3', '태도,')},
          {text: '능력', kind: 'can', at: wf('i3', 'i3', '능력,')},
          {text: '의지', kind: 'will', at: wf('i3', 'i3', '의지,')},
          {text: '확신', kind: 'must', at: wf('i3', 'i3', '확신의')},
        ],
      },
    ]}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <Hook d={d} />},
    {ids: ['i2'], node: (d) => <DidSo d={d} />},
    {ids: ['i3'], node: (d) => <HelpingVerb d={d} />},
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
