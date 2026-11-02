import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {Caption, span, useFade, WORD, wf, wfe} from './shared';
import {AppleBoard, AppleSpec, basketSlots, BoardLabel} from './lesson';

const S = (text: string): Part => ({text, kind: 'subject'});
const CX = WIDTH / 2;
const HAND_Y = 210;

// 10 apples: one -> another -> other apples -> the other apples (the last two).
const AppleStory: React.FC<{d: number}> = ({d}) => {
  const slots = basketSlots();
  const start = wf('a0', 'a0', '10개가');
  const take1 = wf('a0', 'a1', '꺼내는');
  const take2 = wf('a0', 'a2', '꺼내는');
  const take3 = wf('a0', 'a3', '집어');
  const drain = wf('a0', 'a4', '계속');
  const glowAt = wf('a0', 'a4', '전체가');
  const apples: AppleSpec[] = slots.map((p, i) => {
    const spec: AppleSpec = {x: p.x, y: p.y, appearAt: start + i * 5};
    if (i === 0) spec.move = {at: take1, x: 170, y: HAND_Y};
    if (i === 1) spec.move = {at: take2, x: 410, y: HAND_Y};
    if (i === 2) spec.move = {at: take3, x: 660, y: HAND_Y};
    if (i === 3) spec.move = {at: take3 + 6, x: 760, y: HAND_Y};
    if (i >= 4 && i <= 7) spec.fadeAt = drain + (i - 4) * 8;
    if (i >= 8) spec.glow = {at: glowAt, word: 'theother'};
    return spec;
  });
  const labels: BoardLabel[] = [
    {text: 'ONE', word: 'one', at: wfe('a0', 'a1', 'one'), x: 170, y: 300},
    {text: 'ANOTHER', word: 'another', at: wfe('a0', 'a2', 'another'), x: 410, y: 300, size: 40},
    {text: 'OTHER APPLES', word: 'other', at: wfe('a0', 'a3', 'other'), x: 735, y: 300, size: 38},
    {text: 'THE OTHER APPLES', word: 'theother', at: wfe('a0', 'a5', 'the'), x: CX, y: 740, size: 46},
  ];
  return <AppleBoard duration={d} apples={apples} labels={labels} title="사과 10개 바구니" pointerAt={wf('a0', 'a5', '족집게')} />;
};

// 1 apple vs. the other 9.
const NineLeft: React.FC<{d: number}> = ({d}) => {
  const slots = basketSlots();
  const start = wf('c1', 'c1', '10개를');
  const take = wf('c1', 'c1', '집어');
  const glowAt = wf('c1', 'c2', '나머지');
  const apples: AppleSpec[] = slots.map((p, i) => {
    const spec: AppleSpec = {x: p.x, y: p.y, appearAt: start + i * 4};
    if (i === 0) spec.move = {at: take, x: 170, y: HAND_Y};
    else spec.glow = {at: glowAt, word: 'theother'};
    return spec;
  });
  const labels: BoardLabel[] = [
    {text: 'ONE', word: 'one', at: wfe('c1', 'c1', 'one'), x: 170, y: 300},
    {text: '나머지 9개 전부', word: 'theother', at: glowAt, x: CX, y: 735, size: 40},
    {text: 'THE OTHER APPLES', word: 'theother', at: wfe('c1', 'c3', 'the'), x: CX, y: 805, size: 42},
    {text: 'THE OTHERS', word: 'theother', at: wfe('c1', 'c3', 'the', 1), x: CX, y: 875, size: 42},
  ];
  return <AppleBoard duration={d} apples={apples} labels={labels} title="10개 중 1개 vs 나머지 9개" />;
};

// "Give me another apple" -> "Give me the other apple".
const GiveHero: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const fade = useFade(d);
  const appearAt = wfe('d1', 'd2', 'give');
  const xAt = wf('d1', 'd2', '어색하고');
  const squeezeAt = wf('d1', 'd2', '아주');
  const popAt = wfe('d1', 'd3', 'the');
  const glowAt = Math.max(popAt + 22, wf('d1', 'd3', '완벽한'));
  const wrong = ramp(frame, xAt, xAt + 10) * (1 - ramp(frame, popAt - 4, popAt + 8));
  const right = ramp(frame, glowAt, glowAt + 14);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          left: CX - 440,
          width: 880,
          top: 100,
          height: 110,
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
        🍎 사과 2개 중 하나를 먹고, 남은 딱 1개!
      </div>
      <BridgeSentence
        left={[S('Give'), S('me')]}
        prep="the other"
        tone="orange"
        right={[S('another'), S('apple.')]}
        replaces
        replaceCount={1}
        y={430}
        fontSize={120}
        maxLines={2}
        appearAt={appearAt}
        wrong={{xAt, squeezeAt, label: '남은 게 정해져 있는데?'}}
        popAt={popAt}
        glowAt={glowAt}
      />
      <Caption y={640} text="✕ another = 아직 남은 게 있는 막연한 하나 더" color="#FF9CA0" size={36} opacity={wrong} />
      <Caption y={640} text="✓ the other = 눈에 딱 정해진 마지막 하나" color={WORD.theother.main} size={38} opacity={right} />
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['a0', 'a1', 'a2', 'a3', 'a4', 'a5'], node: (d) => <AppleStory d={d} />},
    {ids: ['c1', 'c2', 'c3'], node: (d) => <NineLeft d={d} />},
    {ids: ['d1', 'd2', 'd3'], node: (d) => <GiveHero d={d} />},
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
    </>
  );
};
