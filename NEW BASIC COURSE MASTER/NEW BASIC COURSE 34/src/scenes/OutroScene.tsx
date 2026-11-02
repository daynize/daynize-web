import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {span, useFade, WORD, wf} from './shared';
import {Demo} from './lesson';

const Recap: React.FC<{d: number}> = ({d}) => {
  const smurf = wf('o1', 'o1', '스머프!');
  return (
    <Demo
      duration={d}
      title={{text: '15강 정리', at: 0, color: COLORS.yellow}}
      rows={[
        {
          y: 290,
          size: 50,
          items: [
            {text: 'many', kind: 'many', at: wf('o1', 'o1', '가산')},
            {text: 'much', kind: 'much', at: wf('o1', 'o1', '불가산')},
            {text: 'more', kind: 'most', at: wf('o1', 'o1', '구분,')},
          ],
        },
        {
          y: 450,
          size: 40,
          items: [
            {text: 'a lot', kind: 'smurf', at: wf('o1', 'o1', '어라?')},
            {text: 'even', kind: 'smurf', at: wf('o1', 'o1', '이봐,')},
            {text: 'still', kind: 'smurf', at: smurf},
            {text: 'much', kind: 'smurf', at: smurf + 7},
            {text: 'far', kind: 'smurf', at: smurf + 14},
          ],
        },
        {
          y: 610,
          size: 52,
          items: [
            {text: 'the oldest', kind: 'est', at: wf('o1', 'o1', '최상급')},
            {text: 'the most', kind: 'most', at: wf('o1', 'o1', '표현을')},
          ],
        },
      ]}
      footer={{text: '입으로 직접 연습!', at: wf('o1', 'o1', '입으로'), y: 760, size: 46}}
    />
  );
};

const Farewell: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nextAt = wf('o2', 'o2', '다음');
  const thanksAt = wf('o2', 'o2', '수고');
  const nextIn = spring({frame: frame - nextAt, fps, config: {damping: 10, stiffness: 130}});
  const nextOut = 1 - ramp(frame, thanksAt - 6, thanksAt + 8);
  const thanks = spring({frame: frame - thanksAt, fps, config: {damping: 8, stiffness: 120}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: useFade(d)}}>
      <Sequence from={thanksAt + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>
      {frame >= nextAt ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 300, textAlign: 'center', fontFamily: FONT, opacity: Math.min(1, nextIn * 2) * nextOut, transform: `scale(${0.6 + 0.4 * nextIn})`}}>
          <span style={{display: 'inline-block', padding: '14px 48px', borderRadius: 40, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, fontSize: 70, fontWeight: 900, boxShadow: `0 0 40px ${COLORS.orange}`}}>NEXT · 16강 ▶</span>
          <div style={{fontSize: 40, fontWeight: 700, color: WORD.the.main, marginTop: 28}}>접속사 편</div>
        </div>
      ) : null}
      {frame >= thanksAt ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 280, textAlign: 'center', fontFamily: FONT, color: COLORS.cream, opacity: Math.min(1, thanks * 2), transform: `scale(${0.6 + 0.4 * thanks})`, textShadow: `0 0 ${40 * thanks}px ${COLORS.orange}`}}>
          <div style={{fontSize: 130, fontWeight: 900}}>Thank you</div>
          <div style={{fontSize: 64, fontWeight: 700, color: COLORS.sand, marginTop: 6}}>수고 많으셨습니다 ❤️</div>
        </div>
      ) : null}
    </div>
  );
};

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['o1'], node: (d) => <Recap d={d} />},
    {ids: ['o2'], node: (d) => <Farewell d={d} />},
  ];
  return (
    <>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`outro-${p.ids[0]}`}>
            {p.node(s.duration)}
          </Sequence>
        );
      })}
    </>
  );
};
