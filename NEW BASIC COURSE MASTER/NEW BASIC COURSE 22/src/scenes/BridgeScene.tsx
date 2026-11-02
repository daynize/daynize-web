import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {Caption, rel, span, useFade, wf} from './shared';

const S = (text: string): Part => ({text, kind: 'subject'});

// "I am boring" -> "I am bored": the past participle replaces the wrong -ing word.
const BoredDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b1a', 'b1b', 'b1c']);
  const fade = useFade(sp.duration);
  const tB = rel('b1a', 'b1b');
  // Frames below are relative to the start of b1b (the inner Sequence).
  const xAt = wf('b1b', 'b1b', '지루하게');
  const squeezeAt = wf('b1b', 'b1b', '어색하고');
  const captionAt = wf('b1b', 'b1b', '재미없는');
  const popAt = wf('b1b', 'b1c', 'bored처럼');
  const glowAt = Math.max(popAt + 22, wf('b1b', 'b1c', '과거분사를'));

  const cardLift = ramp(frame, tB - 4, tB + 16);
  const cardY = 300 - 190 * cardLift;
  const cardScale = 1 - 0.3 * cardLift;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          left: WIDTH / 2 - 400,
          width: 800,
          top: cardY - 60,
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
          fontSize: 54,
          color: COLORS.sand,
          transform: `scale(${cardScale})`,
          opacity: ramp(frame, 4, 18),
          whiteSpace: 'nowrap',
        }}
      >
        <span>😩</span>
        <span>“나 정말 지루해”</span>
      </div>

      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('I'), S('am')]}
          prep="bored"
          tone="orange"
          right={[S('boring.')]}
          replaces
          y={430}
          fontSize={118}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: '뜻이 달라져요!'}}
          popAt={popAt}
          glowAt={glowAt}
        />
        <Caption
          y={585}
          text="“남을 지루하게 만드는 사람” ✕ 황당!"
          color="#FF9CA0"
          size={38}
          opacity={ramp(frame - tB, captionAt, captionAt + 12) * (1 - ramp(frame - tB, popAt - 4, popAt + 8))}
        />
        <Caption
          y={585}
          text="✓ 내가 지루함을 느끼는 중 (감정을 받음)"
          color={COLORS.yellow}
          size={36}
          opacity={ramp(frame - tB, glowAt, glowAt + 14)}
        />
      </Sequence>
    </div>
  );
};

// -ing = you give it out (active), -ed = you receive it (passive); the noun's relationship picks the bridge.
const ActivePassive: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['b2a', 'b2b', 'b2c']);
  const fade = useFade(sp.duration);
  const againAt = wf('b2a', 'b2a', '한');
  const ingAt = wf('b2a', 'b2b', '내뿜는');
  const edAt = wf('b2a', 'b2b', '전달받아');
  const relAt = wf('b2a', 'b2c', '관계에');
  const bridgeAt = wf('b2a', 'b2c', '다리를');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const bridge = spring({frame: frame - bridgeAt, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
  const out = Math.sin(frame / 5) * 12;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Caption y={50} text="다시 한 번, 능동 vs 수동" color={COLORS.cream} size={42} opacity={ramp(frame, againAt, againAt + 14)} />

      <div style={{position: 'absolute', left: 90, top: 140, width: 900, height: 210, boxSizing: 'border-box', borderRadius: 40, background: 'rgba(46,196,182,0.22)', border: `3px solid ${COLORS.teal}`, boxShadow: `0 0 ${40 * pop(ingAt)}px ${COLORS.teal}88`, fontFamily: FONT, color: COLORS.tealBright, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: Math.min(1, pop(ingAt) * 2), transform: `scale(${0.7 + 0.3 * pop(ingAt)})`}}>
        <div style={{fontSize: 66, fontWeight: 900}}>현재분사 -ing</div>
        <div style={{fontSize: 36, fontWeight: 700, color: COLORS.cream}}>
          <span style={{display: 'inline-block', transform: `translateX(${out}px)`}}>📣</span> 주체가 직접 내뿜는다 (능동)
        </div>
      </div>

      <div style={{position: 'absolute', left: 90, top: 420, width: 900, height: 210, boxSizing: 'border-box', borderRadius: 40, background: 'rgba(255,154,31,0.2)', border: `3px solid ${COLORS.orange}`, boxShadow: `0 0 ${40 * pop(edAt)}px ${COLORS.orange}88`, fontFamily: FONT, color: COLORS.yellow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: Math.min(1, pop(edAt) * 2), transform: `scale(${0.7 + 0.3 * pop(edAt)})`}}>
        <div style={{fontSize: 66, fontWeight: 900}}>과거분사 -ed</div>
        <div style={{fontSize: 36, fontWeight: 700, color: COLORS.cream}}>
          <span style={{display: 'inline-block', transform: `translateX(${-out}px)`}}>📥</span> 전달받아 당한다 (수동)
        </div>
      </div>

      <Caption y={650} text="명사와의 관계로 고른다" color={COLORS.cream} size={38} opacity={ramp(frame, relAt, relAt + 12) * (1 - ramp(frame, bridgeAt - 4, bridgeAt + 6))} />
      {frame >= bridgeAt ? (
        <div style={{position: 'absolute', left: WIDTH / 2 - 300, top: 355, width: 600, height: 56, boxSizing: 'border-box', borderRadius: 28, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 32, boxShadow: `0 0 40px ${COLORS.orange}`, transform: `scale(${0.4 + 0.6 * bridge})`, opacity: Math.min(1, bridge * 2), whiteSpace: 'nowrap'}}>
          🌉 능동 ⇄ 수동 다리
        </div>
      ) : null}
    </div>
  );
};

// "a baby" -> "a sleeping baby" and "a window" -> "a broken window": the participle pops in front of the noun.
const ModifierPop: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b3a', 'b3b']);
  const fade = useFade(sp.duration);
  const tB = rel('b3a', 'b3b');
  const sleepPop = wf('b3a', 'b3a', 'sleeping');
  const sleepGlow = sleepPop + 30;
  const sleepGloss = wf('b3a', 'b3a', '스스로');
  // b3b offsets are relative to the start of b3b (inner Sequence)
  const brokenPop = wf('b3b', 'b3b', 'broken');
  const brokenGlow = brokenPop + 30;
  const brokenGloss = wf('b3b', 'b3b', '깨짐을');

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', inset: 0, opacity: 1 - ramp(frame, tB - 14, tB - 2)}}>
        <BridgeSentence
          left={[S('a')]}
          prep="sleeping"
          tone="teal"
          right={[S('baby')]}
          y={300}
          fontSize={118}
          appearAt={0}
          popAt={sleepPop}
          glowAt={sleepGlow}
          gloss="👶 스스로 자고 있는 아기 · 능동·진행"
          glossAt={sleepGloss}
        />
      </div>
      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('a')]}
          prep="broken"
          tone="orange"
          right={[S('window')]}
          y={300}
          fontSize={118}
          appearAt={0}
          popAt={brokenPop}
          glowAt={brokenGlow}
          gloss="🪟 깨짐을 당해버린 창문 · 수동·완료"
          glossAt={brokenGloss}
        />
      </Sequence>
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['b1a', 'b1b', 'b1c'], node: <BoredDemo scene={scene} />},
    {ids: ['b2a', 'b2b', 'b2c'], node: <ActivePassive scene={scene} />},
    {ids: ['b3a', 'b3b'], node: <ModifierPop scene={scene} />},
  ];
  return (
    <>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`bridge-${p.ids[0]}`}>
            {p.node}
          </Sequence>
        );
      })}
    </>
  );
};
