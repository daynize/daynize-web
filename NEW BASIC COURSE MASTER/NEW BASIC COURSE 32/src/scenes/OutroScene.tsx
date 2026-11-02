import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {Caption, span, useFade, WORD, wf, wfe} from './shared';
import {Demo} from './lesson';

const S = (text: string): Part => ({text, kind: 'subject'});
const CX = WIDTH / 2;

const TwoPoints: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '오늘의 조동사 핵심', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '✌️', x: 540, y: 470, size: 260, at: wf('o1', 'o1', '두'), motion: 'pulse'}]}
    footer={{text: '딱 두 가지만 기억!', at: wf('o1', 'o1', '가지만'), y: 640, size: 54}}
  />
);

const Attitude: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '첫째 · 조동사의 본질', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🎨', x: 540, y: 700, size: 170, at: wf('o2', 'o2', '입히는'), motion: 'float'}]}
    rows={[
      {
        y: 330,
        size: 56,
        items: [
          {text: '행동 ✕', kind: 'warn', at: wf('o2', 'o2', '행동이')},
          {text: '마음의 태도 ✓', kind: 'will', at: wf('o2', 'o2', '마음의'), glowAt: wf('o2', 'o2', '입히는')},
        ],
      },
    ]}
  />
);

const ShallMust: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '첫째 · 조동사의 본질', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 320,
        size: 58,
        items: [
          {text: 'Shall we ...?', kind: 'shall', at: wfe('o3', 'o3', 'Shall'), glowAt: wfe('o3', 'o3', 'Shall') + 6},
          {text: '다정한 제안', kind: 'plain', at: wf('o3', 'o3', '제안할')},
        ],
      },
      {
        y: 500,
        size: 58,
        items: [
          {text: 'Must', kind: 'must', at: wfe('o3', 'o3', 'Must'), glowAt: wfe('o3', 'o3', 'Must') + 6},
          {text: '강한 확신', kind: 'plain', at: wf('o3', 'o3', '확신을')},
        ],
      },
    ]}
  />
);

const SafetyPast: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '둘째 · 과거형 = 확신의 농도 ↓', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 300,
        size: 58,
        items: [
          {text: 'could', kind: 'can', at: wfe('o4', 'o4', 'could')},
          {text: 'might', kind: 'may', at: wfe('o4', 'o4', 'might')},
          {text: 'would', kind: 'will', at: wfe('o4', 'o4', 'would')},
          {text: 'should', kind: 'should', at: wfe('o4', 'o4', 'should')},
        ],
      },
      {y: 480, size: 48, items: [{text: '지나간 과거 ✕', kind: 'warn', at: wf('o4', 'o4', '지나간')}]},
      {y: 640, size: 52, items: [{text: '부드러운 안전장치 🛡️', kind: 'will', at: wf('o4', 'o4', '부드러운'), glowAt: wf('o4', 'o4', '안전장치라는')}]},
    ]}
  />
);

const SoftThought: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '둘째 · 과거형 = 확신의 농도 ↓', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '💭', x: 540, y: 720, size: 150, at: wf('o5', 'o5', '던지고'), motion: 'float'}]}
    rows={[
      {y: 320, size: 54, items: [{text: '100% 확신 ✕', kind: 'warn', at: wf('o5', 'o5', '100%')}]},
      {y: 480, size: 46, items: [{text: '조심스럽게 던지는 내 생각', kind: 'plain', at: wf('o5', 'o5', '조심스럽게')}]},
      {y: 620, size: 54, items: [{text: '과거형 조동사', kind: 'will', at: wf('o5', 'o5', '과거형'), glowAt: wf('o5', 'o5', '떠올려')}]},
    ]}
  />
);

const CafeFloor: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '도심 동화 · 닫힌 카페 2층', at: 0}}
    emojis={[
      {emoji: '☕', x: 300, y: 520, size: 160, at: wf('o6', 'o6', '카페'), motion: 'float'},
      {emoji: '🎹', x: 540, y: 500, size: 200, at: wf('o6', 'o6', '피아노'), motion: 'pulse'},
      {emoji: '🌙', x: 790, y: 520, size: 160, at: wf('o6', 'o6', '영어'), motion: 'float'},
    ]}
    footer={{text: '조동사 하나로 달라지는 뉘앙스 ✨', at: wf('o6', 'o6', '조동사'), y: 700, size: 44}}
  />
);

// Pay-off of the opening question: "I did so" -> "I would do so".
const WouldDoSo: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const fade = useFade(d);
  const appearAt = wfe('o7', 'o7', 'I');
  const squeezeAt = wfe('o7', 'o7', 'so');
  const xAt = wf('o7', 'o7', '아니라');
  const popAt = wfe('o7', 'o7', 'would');
  const glowAt = Math.max(popAt + 22, wf('o7', 'o7', '표현한다는'));
  const wrong = ramp(frame, xAt, xAt + 10) * (1 - ramp(frame, popAt - 4, popAt + 8));
  const right = ramp(frame, glowAt, glowAt + 14);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          left: CX - 400,
          width: 800,
          top: 100,
          height: 100,
          borderRadius: 34,
          background: 'rgba(235,217,180,0.15)',
          border: '2px solid rgba(235,217,180,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 38,
          color: COLORS.sand,
          whiteSpace: 'nowrap',
          opacity: ramp(frame, 0, 14),
        }}
      >
        💭 “같은 조건이었으면, 나도 그랬겠지”
      </div>
      <BridgeSentence
        left={[S('I')]}
        prep="would do"
        tone="orange"
        right={[S('did'), S('so')]}
        replaces
        replaceCount={1}
        y={430}
        fontSize={130}
        maxLines={2}
        appearAt={appearAt}
        wrong={{xAt, squeezeAt, label: '그랬겠지가 안 돼!'}}
        popAt={popAt}
        glowAt={glowAt}
      />
      <Caption y={640} text="✕ I did so = 그냥 “했다” (사실)" color="#FF9CA0" size={38} opacity={wrong} />
      <Caption y={640} text="✓ I would do so = 그랬겠지 (조건이 같았다면)" color={WORD.will.main} size={38} opacity={right} />
    </div>
  );
};

const Practice: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '12개 도심 동화 예문', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🗣️', x: 540, y: 400, size: 240, at: wf('o8', 'o8', '입으로'), motion: 'pulse'}]}
    footer={{text: '중얼거리며 내 것으로!', at: wf('o8', 'o8', '중얼거리며'), y: 560, size: 52}}
  />
);

const Farewell: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nextAt = wf('o9', 'o9', '다음');
  const thanksAt = wf('o9', 'o9', '수고');
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
          <span style={{display: 'inline-block', padding: '14px 48px', borderRadius: 40, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, fontSize: 70, fontWeight: 900, boxShadow: `0 0 40px ${COLORS.orange}`}}>NEXT · 14강 ▶</span>
          <div style={{fontSize: 40, fontWeight: 700, color: COLORS.sand, marginTop: 28}}>한 층 더 가볍고 깊어지는 영어</div>
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
    {ids: ['o2'], node: (d) => <Attitude d={d} />},
    {ids: ['o3'], node: (d) => <ShallMust d={d} />},
    {ids: ['o4'], node: (d) => <SafetyPast d={d} />},
    {ids: ['o5'], node: (d) => <SoftThought d={d} />},
    {ids: ['o6'], node: (d) => <CafeFloor d={d} />},
    {ids: ['o7'], node: (d) => <WouldDoSo d={d} />},
    {ids: ['o8'], node: (d) => <Practice d={d} />},
    {ids: ['o9'], node: (d) => <Farewell d={d} />},
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
