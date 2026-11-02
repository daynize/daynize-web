import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {PAIRS, SceneSpan} from '../timeline';
import {wf} from './shared';
import {Demo} from './lesson';
import {InversionCard} from './InversionCard';

const Opening: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '19강 · 도치', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🔦', x: 540, y: 470, size: 250, at: wf('i1', 'i1', '스포트라이트를'), motion: 'pulse'}]}
    rows={[
      {
        y: 740,
        size: 46,
        items: [
          {text: '주어', kind: 'subj', at: wf('i1', 'i1', '주어와')},
          {text: '↔', kind: 'sym', at: wf('i1', 'i1', '바뀌는지,')},
          {text: '동사', kind: 'verb', at: wf('i1', 'i1', '동사의')},
        ],
      },
    ]}
  />
);

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => (
  <>
    {scene.cues.map((cue) => {
      const pair = PAIRS.find((p) => p.id === cue.id);
      return (
        <Sequence key={cue.id} from={cue.start - scene.from} durationInFrames={cue.duration} name={`intro-${cue.id}`}>
          {pair ? <InversionCard pair={pair} cue={cue} /> : <Opening d={cue.duration} />}
        </Sequence>
      );
    })}
  </>
);
