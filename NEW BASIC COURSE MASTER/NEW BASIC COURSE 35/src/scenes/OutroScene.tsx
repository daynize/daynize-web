import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {span, useFade, WORD, wf, wfe} from './shared';
import {Demo} from './lesson';

const Coordinating: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '16강 정리 · 등위접속사', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 320,
        size: 74,
        items: [
          {text: 'And', kind: 'and', at: wfe('o1', 'o1', 'And'), glowAt: wfe('o1', 'o1', 'And') + 6},
          {text: 'But', kind: 'but', at: wfe('o1', 'o1', 'But'), glowAt: wfe('o1', 'o1', 'But') + 6},
          {text: 'Or', kind: 'or', at: wfe('o1', 'o1', 'Or'), glowAt: wfe('o1', 'o1', 'Or') + 6},
        ],
      },
      {y: 500, size: 44, items: [{text: '단어와 단어 · 문장과 문장', kind: 'plain', at: wf('o1', 'o1', '단어와')}]},
    ]}
    footer={{text: '대등하게 연결! ⚖️', at: wf('o1', 'o1', '대등하게'), y: 640, size: 50}}
  />
);

const Depth: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '16강 정리 · 종속접속사 & 관계부사', at: 0, color: COLORS.yellow}}
    rows={[
      {y: 300, size: 62, items: [{text: 'Because', kind: 'because', at: wfe('o2', 'o2', 'Because'), glowAt: wfe('o2', 'o2', 'Because') + 6}]},
      {
        y: 460,
        size: 52,
        items: [
          {text: 'Where', kind: 'where', at: wfe('o2', 'o2', 'Where')},
          {text: 'When', kind: 'when', at: wfe('o2', 'o2', 'When')},
        ],
      },
      {
        y: 600,
        size: 52,
        items: [
          {text: 'Why', kind: 'why', at: wfe('o2', 'o2', 'Why')},
          {text: 'How', kind: 'how', at: wfe('o2', 'o2', 'How')},
        ],
      },
    ]}
    footer={{text: '이유 · 시간 · 장소의 깊이 + ✨', at: wf('o2', 'o2', '이유,'), y: 740, size: 42}}
  />
);

const OnlyOne: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '꼭 기억! 둘 중 하나만', at: 0, color: WORD.how.main}}
    rows={[
      {
        y: 300,
        size: 56,
        items: [
          {text: 'the way', kind: 'plain', at: wfe('o3', 'o3', 'the')},
          {text: 'how', kind: 'how', at: wfe('o3', 'o3', 'how')},
          {text: '✕ 중복', kind: 'warn', at: wf('o3', 'o3', '중복해서')},
        ],
      },
      {
        y: 500,
        size: 56,
        items: [
          {text: 'the way', kind: 'plain', at: wf('o3', 'o3', '하나만')},
          {text: '/', kind: 'sym', at: wf('o3', 'o3', '하나만')},
          {text: 'how', kind: 'how', at: wf('o3', 'o3', '하나만'), glowAt: wf('o3', 'o3', '깔끔하게')},
          {text: '✓', kind: 'sym', at: wf('o3', 'o3', '깔끔하게')},
        ],
      },
    ]}
    footer={{text: '둘 중 하나만 깔끔하게!', at: wf('o3', 'o3', '깔끔하게'), y: 650, size: 46}}
  />
);

const Farewell: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(d);
  const practiceAt = wf('o4', 'o4', '입으로');
  const nextAt = wf('o4', 'o4', '다음');
  const thanksAt = wf('o4', 'o4', '수고하셨습니다');
  const practice = spring({frame: frame - practiceAt, fps, config: {damping: 9, stiffness: 130}});
  const practiceOut = 1 - ramp(frame, nextAt - 6, nextAt + 6);
  const nextIn = spring({frame: frame - nextAt, fps, config: {damping: 10, stiffness: 130}});
  const nextOut = 1 - ramp(frame, thanksAt - 6, thanksAt + 8);
  const thanks = spring({frame: frame - thanksAt, fps, config: {damping: 8, stiffness: 120}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT}}>
      <Sequence from={thanksAt + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>
      {frame >= practiceAt ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 220, textAlign: 'center', opacity: Math.min(1, practice * 2) * practiceOut, transform: `scale(${0.6 + 0.4 * practice})`}}>
          <div style={{fontSize: 200, lineHeight: 1}}>🗣️</div>
          <div style={{fontSize: 50, fontWeight: 800, color: COLORS.yellow, marginTop: 24}}>예문을 소리 내어 연습!</div>
        </div>
      ) : null}
      {frame >= nextAt ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 300, textAlign: 'center', opacity: Math.min(1, nextIn * 2) * nextOut, transform: `scale(${0.6 + 0.4 * nextIn})`}}>
          <span style={{display: 'inline-block', padding: '14px 48px', borderRadius: 40, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, fontSize: 70, fontWeight: 900, boxShadow: `0 0 40px ${COLORS.orange}`}}>NEXT · 17강 ▶</span>
          <div style={{fontSize: 40, fontWeight: 700, color: WORD.when.main, marginTop: 28}}>가정법</div>
        </div>
      ) : null}
      {frame >= thanksAt ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 280, textAlign: 'center', color: COLORS.cream, opacity: Math.min(1, thanks * 2), transform: `scale(${0.6 + 0.4 * thanks})`, textShadow: `0 0 ${40 * thanks}px ${COLORS.orange}`}}>
          <div style={{fontSize: 130, fontWeight: 900}}>Thank you</div>
          <div style={{fontSize: 64, fontWeight: 700, color: COLORS.sand, marginTop: 6}}>수고하셨습니다 ❤️</div>
        </div>
      ) : null}
    </div>
  );
};

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['o1'], node: (d) => <Coordinating d={d} />},
    {ids: ['o2'], node: (d) => <Depth d={d} />},
    {ids: ['o3'], node: (d) => <OnlyOne d={d} />},
    {ids: ['o4'], node: (d) => <Farewell d={d} />},
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
