import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {Caption, ED, ING, rel, span, useFade, wf} from './shared';
import {AdjStack, Demo, TwinWord} from './lesson';

const S = (text: string): Part => ({text, kind: 'subject'});

// The usual rule: adjective + -ly = adverb.
const LyRule: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '보통의 규칙', at: 0}}
    rows={[
      {
        y: 340,
        size: 56,
        items: [
          {text: 'quick', kind: 'adj', at: wf('t1', 't1', '형용사')},
          {text: '+', kind: 'sym', at: wf('t1', 't1', '뒤에')},
          {text: '-ly', kind: 'ly', at: wf('t1', 't1', '-ly를')},
          {text: '=', kind: 'sym', at: wf('t1', 't1', '붙이면')},
          {text: 'quickly', kind: 'adv', at: wf('t1', 't1', '부사가'), glowAt: wf('t1', 't1', '됩니다.')},
        ],
      },
    ]}
    footer={{text: '형용사 + -ly = 부사 ✓', at: wf('t1', 't1', '됩니다.'), y: 700, color: ING.main}}
  />
);

// Two fatal exceptions.
const TwoTraps: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '치명적인 예외', at: wf('t2', 't2', '치명적인'), color: '#FF9CA0'}}
    emojis={[{emoji: '⚠️', x: 540, y: 250, size: 190, at: 0, motion: 'pulse'}]}
    rows={[
      {
        y: 520,
        size: 60,
        items: [
          {text: '함정 1', kind: 'warn', at: wf('t2', 't2', '예외')},
          {text: '함정 2', kind: 'warn', at: wf('t2', 't2', '2가지가')},
        ],
      },
    ]}
  />
);

// Trap 1 intro: no -ly, but the adjective and the adverb look identical.
const SameShapeIntro: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '함정 1 · 모양이 똑같은 단어', at: 0, color: '#FF9CA0'}}
    rows={[
      {
        y: 300,
        size: 60,
        items: [
          {text: '형용사', kind: 'adj', at: wf('a1', 'a1', '형용사와')},
          {text: '=', kind: 'sym', at: wf('a1', 'a1', '똑같은')},
          {text: '부사', kind: 'adv', at: wf('a1', 'a1', '부사'), glowAt: wf('a1', 'a1', '똑같은')},
        ],
      },
      {
        y: 520,
        size: 56,
        items: [
          {text: '-ly', kind: 'lyx', at: wf('a1', 'a2', '-ly를')},
          {text: '없이', kind: 'plain', at: wf('a1', 'a2', '않고')},
          {text: '모양 그대로', kind: 'plain', at: wf('a1', 'a2', '그대로')},
        ],
      },
    ]}
    footer={{text: '두 가지 역할을 모두 한다!', at: wf('a1', 'a2', '모두'), y: 690}}
  />
);

// Trap 2 intro: -ly is there, yet it is an adjective.
const LyAdjectiveIntro: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '함정 2 · -ly가 붙었는데?', at: 0, color: '#FF9CA0'}}
    rows={[
      {
        y: 270,
        size: 52,
        items: [
          {text: '-ly', kind: 'ly', at: wf('c1', 'c1', '-ly가')},
          {text: '→', kind: 'sym', at: wf('c1', 'c1', '붙었는데')},
          {text: '부사 ✕', kind: 'warn', at: wf('c1', 'c1', '부사가')},
          {text: '형용사', kind: 'adj', at: wf('c1', 'c1', '형용사인'), glowAt: wf('c1', 'c1', '단어들입니다.')},
        ],
      },
      {
        y: 500,
        size: 54,
        items: [
          {text: '명사', kind: 'plain', at: wf('c1', 'c2', '명사')},
          {text: '+', kind: 'sym', at: wf('c1', 'c2', '뒤에')},
          {text: '-ly', kind: 'ly', at: wf('c1', 'c2', '-ly가')},
          {text: '=', kind: 'sym', at: wf('c1', 'c2', '붙으면')},
          {text: '형용사', kind: 'adj', at: wf('c1', 'c2', '형용사가'), glowAt: wf('c1', 'c2', '됩니다!')},
        ],
      },
    ]}
    footer={{text: '명사를 꾸며주는 형용사!', at: wf('c1', 'c2', '꾸며주는'), y: 690, color: ED.main}}
  />
);

// "He works hardly" -> "He works hard": the pill replaces the wrong word.
const HardlyFix: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const sp = span(scene, ['w1', 'w2', 'w3']);
  const fade = useFade(sp.duration);
  const tB = rel('w1', 'w2');
  // Frames below are relative to the start of w2 (the inner Sequence).
  const xAt = wf('w2', 'w2', '하지');
  const squeezeAt = wf('w2', 'w2', '완전히');
  const popAt = wf('w2', 'w3', 'hard', 1);
  const glowAt = Math.max(popAt + 22, wf('w2', 'w3', '올바른'));
  const startAt = wf('w1', 'w1', '열심히');
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <FixCard text="“그는 일을 열심히 한다”" emoji="💪" at={startAt} />
      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('He'), S('works')]}
          prep="hard."
          tone="teal"
          right={[S('hardly.')]}
          replaces
          replaceCount={1}
          y={430}
          fontSize={130}
          maxLines={2}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: '거의 일을 안 한다고?'}}
          popAt={popAt}
          glowAt={glowAt}
        />
        <FixCaptions xAt={xAt} popAt={popAt} glowAt={glowAt} wrongText="✕ hardly = 거의 ~하지 않는" rightText="✓ 열심히 = hard (부사)" />
      </Sequence>
    </div>
  );
};

const FixCard: React.FC<{text: string; emoji: string; at: number}> = ({text, emoji, at}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        left: WIDTH / 2 - 440,
        width: 880,
        top: 110,
        height: 120,
        borderRadius: 36,
        background: 'rgba(235,217,180,0.15)',
        border: '2px solid rgba(235,217,180,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 48,
        color: COLORS.sand,
        opacity: ramp(frame, Math.max(0, at - 10), Math.max(0, at - 10) + 14),
        whiteSpace: 'nowrap',
      }}
    >
      <span>{emoji}</span>
      <span>{text}</span>
    </div>
  );
};

const FixCaptions: React.FC<{xAt: number; popAt: number; glowAt: number; wrongText: string; rightText: string}> = ({xAt, popAt, glowAt, wrongText, rightText}) => {
  const frame = useCurrentFrame();
  return (
    <>
      <Caption y={700} text={wrongText} color="#FF9CA0" size={38} opacity={ramp(frame, xAt, xAt + 12) * (1 - ramp(frame, popAt - 4, popAt + 8))} />
      <Caption y={700} text={rightText} color={ING.main} size={38} opacity={ramp(frame, glowAt, glowAt + 14)} />
    </>
  );
};

// "She runs fastly" -> "She runs fast".
const FastlyFix: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const sp = span(scene, ['w4', 'w5']);
  const fade = useFade(sp.duration);
  const tB = rel('w4', 'w5');
  const xAt = wf('w5', 'w5', 'fastly') + 14;
  const squeezeAt = xAt + 6;
  const popAt = wf('w5', 'w5', 'fast', 1);
  const glowAt = Math.max(popAt + 22, wf('w5', 'w5', '써야'));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <FixCard text="“그녀는 빠르게 달린다”" emoji="🏃‍♀️" at={wf('w4', 'w4', '빠르게')} />
      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('She'), S('runs')]}
          prep="fast."
          tone="teal"
          right={[S('fastly.')]}
          replaces
          replaceCount={1}
          y={430}
          fontSize={130}
          maxLines={2}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: '없는 단어예요!'}}
          popAt={popAt}
          glowAt={glowAt}
        />
        <FixCaptions xAt={xAt} popAt={popAt} glowAt={glowAt} wrongText="✕ fastly = 존재하지 않는 단어" rightText="✓ 빠르게 = fast (부사)" />
      </Sequence>
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['t1'], node: (d) => <LyRule d={d} />},
    {ids: ['t2'], node: (d) => <TwoTraps d={d} />},
    {ids: ['a1', 'a2'], node: (d) => <SameShapeIntro d={d} />},
    {
      ids: ['f1', 'f2'],
      node: (d) => (
        <TwinWord
          duration={d}
          word="fast"
          adj={{kr: '빠른', at: wf('f1', 'f1', '빠른')}}
          adv={{kr: '빠르게', at: wf('f1', 'f1', '빠르게')}}
          warn={{text: 'fastly ✕', sub: '존재하지 않는 단어!', at: wf('f1', 'f2', 'fastly'), tone: 'red'}}
        />
      ),
    },
    {
      ids: ['h1'],
      node: (d) => <TwinWord duration={d} word="hard" adj={{kr: '단단한 · 어려운', at: wf('h1', 'h1', '단단한')}} adv={{kr: '열심히 · 단단하게', at: wf('h1', 'h1', '열심히')}} />,
    },
    {
      ids: ['l1', 'l2'],
      node: (d) => (
        <TwinWord
          duration={d}
          word="late"
          adj={{kr: '늦은', at: wf('l1', 'l1', '늦은')}}
          adv={{kr: '늦게', at: wf('l1', 'l1', '늦게')}}
          warn={{text: 'lately = 최근에', sub: '전혀 다른 뜻!', at: wf('l1', 'l2', 'lately'), tone: 'gold'}}
        />
      ),
    },
    {ids: ['e1'], node: (d) => <TwinWord duration={d} word="early" adj={{kr: '이른', at: wf('e1', 'e1', '이른')}} adv={{kr: '일찍', at: wf('e1', 'e1', '일찍')}} />},
    {ids: ['c1', 'c2'], node: (d) => <LyAdjectiveIntro d={d} />},
    {
      ids: ['y1', 'y2', 'y3', 'y4'],
      node: (d) => (
        <AdjStack
          duration={d}
          wrongAt={wf('y1', 'y4', '착각하기')}
          rightAt={wf('y1', 'y4', '형용사들입니다!')}
          items={[
            {word: 'friendly', kr: '친구 같은 → 친근한', emoji: '🤝', at: 0, tagAt: wf('y1', 'y1', '형용사입니다.')},
            {word: 'lovely', kr: '사랑스러운', emoji: '💕', at: rel('y1', 'y2'), tagAt: wf('y1', 'y2', '형용사입니다.')},
            {word: 'lonely', kr: '외로운', emoji: '🌙', at: rel('y1', 'y3'), tagAt: wf('y1', 'y3', '형용사입니다.')},
          ]}
        />
      ),
    },
  ];
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
      <Sequence from={span(scene, ['w1']).from} durationInFrames={span(scene, ['w1', 'w2', 'w3']).duration} name="bridge-w1">
        <HardlyFix scene={scene} />
      </Sequence>
      <Sequence from={span(scene, ['w4']).from} durationInFrames={span(scene, ['w4', 'w5']).duration} name="bridge-w4">
        <FastlyFix scene={scene} />
      </Sequence>
    </>
  );
};
