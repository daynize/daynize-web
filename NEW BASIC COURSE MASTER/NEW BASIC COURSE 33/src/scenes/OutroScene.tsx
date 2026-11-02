import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {span, useFade, WORD, wf, wfe} from './shared';
import {Demo} from './lesson';

const TwoPoints: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '오늘의 비교급 핵심', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '✌️', x: 540, y: 470, size: 260, at: wf('o1', 'o1', '두'), motion: 'pulse'}]}
    footer={{text: '딱 두 가지만 정리!', at: wf('o1', 'o1', '정리해'), y: 640, size: 54}}
  />
);

const FirstPoint: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '첫째 · 음절이 형태를 결정', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 310,
        size: 58,
        items: [
          {text: '-er', kind: 'er', at: wfe('o2', 'o2', 'er')},
          {text: 'or', kind: 'sym', at: wfe('o2', 'o2', 'more')},
          {text: 'more', kind: 'more', at: wfe('o2', 'o2', 'more')},
        ],
      },
      {y: 480, size: 50, items: [{text: '글자 수 ✕', kind: 'warn', at: wf('o2', 'o2', '글자')}]},
      {y: 630, size: 54, items: [{text: '모음 소리의 개수 ✓', kind: 'syl', at: wf('o2', 'o2', '모음'), glowAt: wf('o2', 'o2', '음절입니다')}]},
    ]}
  />
);

const EuNotSound: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '한국어의 “으”는 영어에서 소리가 아니다', at: 0, color: COLORS.sand, size: 38}}
    rows={[
      {
        y: 330,
        size: 60,
        items: [
          {text: 'old', kind: 'syl', at: wfe('o3', 'o3', 'old'), glowAt: wfe('o3', 'o3', 'old') + 6},
          {text: '● 1음절', kind: 'plain', at: wf('o3', 'o3', '1음절')},
        ],
      },
      {
        y: 520,
        size: 60,
        items: [
          {text: 'pretty', kind: 'syl', at: wfe('o3', 'o3', 'pretty'), glowAt: wfe('o3', 'o3', 'pretty') + 6},
          {text: '● ● 2음절', kind: 'plain', at: wf('o3', 'o3', '2음절입니다')},
        ],
      },
    ]}
  />
);

const SecondPoint: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '둘째 · 격차와 입체감', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '📏', x: 540, y: 690, size: 150, at: wf('o4', 'o4', '도구입니다'), motion: 'float'}]}
    rows={[
      {y: 320, size: 52, items: [{text: '단순한 겨루기 ✕', kind: 'warn', at: wf('o4', 'o4', '겨루는')}]},
      {y: 480, size: 56, items: [{text: '격차 + 입체감 ✓', kind: 'strong', at: wf('o4', 'o4', '격차와'), glowAt: wf('o4', 'o4', '도구입니다')}]},
    ]}
  />
);

const Boosters: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '소리의 깊이를 더하는 단어', at: 0}}
    rows={[
      {
        y: 320,
        size: 60,
        items: [
          {text: 'much', kind: 'strong', at: wfe('o5', 'o5', 'much'), glowAt: wfe('o5', 'o5', 'much') + 6},
          {text: 'even', kind: 'strong', at: wfe('o5', 'o5', 'even'), glowAt: wfe('o5', 'o5', 'even') + 6},
        ],
      },
      {y: 500, size: 50, items: [{text: '+ 비교급 → 훨씬 더!', kind: 'plain', at: wf('o5', 'o5', '덧붙여')}]},
    ]}
  />
);

const LibraryLight: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '비밀 서재의 불빛', at: 0}}
    emojis={[
      {emoji: '📚', x: 300, y: 520, size: 170, at: wf('o6', 'o6', '서재'), motion: 'float'},
      {emoji: '💡', x: 540, y: 500, size: 200, at: wf('o6', 'o6', '불빛이'), motion: 'pulse'},
      {emoji: '🌙', x: 790, y: 520, size: 160, at: wf('o6', 'o6', '밖보다'), motion: 'float'},
    ]}
    footer={{text: '영어 문장이 훨씬 더 풍성해져요 ✨', at: wf('o6', 'o6', '풍성해질'), y: 700, size: 42}}
  />
);

const Practice: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '12개 도심 동화 예문', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🗣️', x: 540, y: 400, size: 240, at: wf('o7', 'o7', '소리'), motion: 'pulse'}]}
    footer={{text: '한글 의미부터 천천히 느끼며!', at: wf('o7', 'o7', '천천히'), y: 560, size: 50}}
  />
);

const Farewell: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nextAt = wf('o8', 'o8', '다음');
  const thanksAt = wf('o8', 'o8', '수고');
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
          <span style={{display: 'inline-block', padding: '14px 48px', borderRadius: 40, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, fontSize: 70, fontWeight: 900, boxShadow: `0 0 40px ${COLORS.orange}`}}>NEXT · 15강 ▶</span>
          <div style={{fontSize: 40, fontWeight: 700, color: COLORS.sand, marginTop: 28}}>최상급 표현과 함께</div>
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
    {ids: ['o1'], node: (d) => <TwoPoints d={d} />},
    {ids: ['o2'], node: (d) => <FirstPoint d={d} />},
    {ids: ['o3'], node: (d) => <EuNotSound d={d} />},
    {ids: ['o4'], node: (d) => <SecondPoint d={d} />},
    {ids: ['o5'], node: (d) => <Boosters d={d} />},
    {ids: ['o6'], node: (d) => <LibraryLight d={d} />},
    {ids: ['o7'], node: (d) => <Practice d={d} />},
    {ids: ['o8'], node: (d) => <Farewell d={d} />},
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
