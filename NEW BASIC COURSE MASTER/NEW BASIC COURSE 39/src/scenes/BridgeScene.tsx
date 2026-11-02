import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf} from './shared';
import {Demo} from './lesson';

const StoryNote: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '대단원 이야기', at: 0, color: COLORS.yellow}}
    emojis={[
      {emoji: '🚪', x: 200, y: 560, size: 140, at: wf('d1', 'd1', '문을'), motion: 'pulse'},
      {emoji: '🎹', x: 400, y: 540, size: 150, at: wf('d1', 'd1', '피아니스트의'), motion: 'float'},
      {emoji: '🌃', x: 640, y: 560, size: 150, at: wf('d1', 'd1', '도심의'), motion: 'none'},
      {emoji: '🌅', x: 870, y: 540, size: 150, at: wf('d1', 'd1', '내일을'), motion: 'float'},
    ]}
    rows={[{y: 300, size: 44, items: [{text: '하나가 되어, 마법으로 물들이고, 새로운 내일로', kind: 'finale', at: wf('d1', 'd1', '하나가'), glowAt: wf('d1', 'd1', '대단원')}]}]}
    footer={{text: '마침내 비밀 서재의 문을 열고!', at: wf('d1', 'd1', '마침내'), y: 760, size: 42, color: WORD.finale.main}}
  />
);

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [{ids: ['d1'], node: (d) => <StoryNote d={d} />}];
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
