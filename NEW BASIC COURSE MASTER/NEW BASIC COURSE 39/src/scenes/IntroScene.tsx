import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, useFade, wf} from './shared';
import {Demo} from './lesson';
import {LessonChips} from './LessonChips';

const Journey: React.FC<{d: number}> = ({d}) => {
  const fade = useFade(d);
  const start = wf('i1', 'i1', '13강');
  const end = wf('i1', 'i1', '도치까지');
  const popAt = (i: number) => Math.round(start + ((end - start) * i) / 6);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Demo
        duration={d}
        title={{text: '20강 · 마침내 완성된 이야기', at: 0, color: COLORS.yellow}}
        footer={{text: '문법의 뼈대 위에 마음의 결을 입히며 🦴➡️💗', at: wf('i1', 'i1', '단단한'), y: 740, size: 38}}
      />
      <LessonChips y={190} popAt={popAt} size={40} />
    </div>
  );
};

const Finale: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '대단원 종합 예문 12선', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🎭', x: 540, y: 470, size: 250, at: wf('i2', 'i2', '완성된'), motion: 'pulse'}]}
    footer={{text: '눈부시게 피어나는 표현들 ✨', at: wf('i2', 'i2', '눈부시게'), y: 700, size: 46}}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['i1'], node: (d) => <Journey d={d} />},
    {ids: ['i2'], node: (d) => <Finale d={d} />},
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
