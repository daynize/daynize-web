import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {Caption, rel, span, useFade, wf} from './shared';

const S = (text: string): Part => ({text, kind: 'subject'});

// "I stopped to smoke" -> "I stopped smoking": the gerund replaces the wrong to-V.
const StopDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b1a', 'b1b', 'b1c']);
  const fade = useFade(sp.duration);
  const tB = rel('b1a', 'b1b');
  // Frames below are relative to the start of b1b (the inner Sequence).
  const xAt = wf('b1b', 'b1b', '반대의');
  const squeezeAt = wf('b1b', 'b1b', '어색하고');
  const popAt = wf('b1b', 'b1c', 'smoking');
  const glowAt = Math.max(popAt + 22, wf('b1b', 'b1c', '동명사를'));

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
        <span>🚭</span>
        <span>“나 담배 끊었어”</span>
      </div>

      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('I'), S('stopped')]}
          prep="smoking"
          tone="teal"
          right={[S('to'), S('smoke.')]}
          replaces
          y={430}
          fontSize={118}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: '뜻이 정반대예요!'}}
          popAt={popAt}
          glowAt={glowAt}
        />
        <Caption
          y={585}
          text="“담배 피우려고 멈춰 섰다” ✕ 위험!"
          color="#FF9CA0"
          size={38}
          opacity={ramp(frame - tB, squeezeAt, squeezeAt + 12) * (1 - ramp(frame - tB, popAt - 4, popAt + 8))}
        />
        <Caption
          y={585}
          text="✓ 계속하던 행동을 그만둠"
          color={COLORS.tealBright}
          size={38}
          opacity={ramp(frame - tB, glowAt, glowAt + 14)}
        />
      </Sequence>
    </div>
  );
};

// -ing looks back at the past, to-V points to the future; the verb's time direction picks the bridge.
const TimeDirection: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['b2a', 'b2b', 'b2c']);
  const fade = useFade(sp.duration);
  const againAt = wf('b2a', 'b2a', '다시');
  const ingAt = wf('b2a', 'b2b', '지나온');
  const toAt = wf('b2a', 'b2b', '앞으로');
  const dirAt = wf('b2a', 'b2c', '방향에');
  const bridgeAt = wf('b2a', 'b2c', '다리를');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const bridge = spring({frame: frame - bridgeAt, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
  const sway = Math.sin(frame / 5) * 12;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Caption y={50} text="다시 한 번, 시간의 방향" color={COLORS.cream} size={42} opacity={ramp(frame, againAt, againAt + 14)} />

      <div style={{position: 'absolute', left: 90, top: 140, width: 900, height: 210, boxSizing: 'border-box', borderRadius: 40, background: 'rgba(46,196,182,0.22)', border: `3px solid ${COLORS.teal}`, boxShadow: `0 0 ${40 * pop(ingAt)}px ${COLORS.teal}88`, fontFamily: FONT, color: COLORS.tealBright, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: Math.min(1, pop(ingAt) * 2), transform: `scale(${0.7 + 0.3 * pop(ingAt)})`}}>
        <div style={{fontSize: 66, fontWeight: 900}}>동명사 -ing</div>
        <div style={{fontSize: 36, fontWeight: 700, color: COLORS.cream}}>
          <span style={{display: 'inline-block', transform: `translateX(${-sway}px)`}}>⏪</span> 지나온 과거의 생생한 경험
        </div>
      </div>

      <div style={{position: 'absolute', left: 90, top: 420, width: 900, height: 210, boxSizing: 'border-box', borderRadius: 40, background: 'rgba(255,154,31,0.2)', border: `3px solid ${COLORS.orange}`, boxShadow: `0 0 ${40 * pop(toAt)}px ${COLORS.orange}88`, fontFamily: FONT, color: COLORS.yellow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: Math.min(1, pop(toAt) * 2), transform: `scale(${0.7 + 0.3 * pop(toAt)})`}}>
        <div style={{fontSize: 66, fontWeight: 900}}>to부정사 to-V</div>
        <div style={{fontSize: 36, fontWeight: 700, color: COLORS.cream}}>
          <span style={{display: 'inline-block', transform: `translateX(${sway}px)`}}>⏩</span> 앞으로 나아갈 미래의 목적
        </div>
      </div>

      <Caption y={650} text="동사가 바라보는 시간의 방향" color={COLORS.cream} size={38} opacity={ramp(frame, dirAt, dirAt + 12) * (1 - ramp(frame, bridgeAt - 4, bridgeAt + 6))} />
      {frame >= bridgeAt ? (
        <div style={{position: 'absolute', left: WIDTH / 2 - 300, top: 355, width: 600, height: 56, boxSizing: 'border-box', borderRadius: 28, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 32, boxShadow: `0 0 40px ${COLORS.orange}`, transform: `scale(${0.4 + 0.6 * bridge})`, opacity: Math.min(1, bridge * 2), whiteSpace: 'nowrap'}}>
          🌉 -ing ⇄ to-V 다리
        </div>
      ) : null}
    </div>
  );
};

// "I plan visiting Seoul" -> "I plan to visit Seoul": only the wrong word is swapped, Seoul stays.
const PlanDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const sp = span(scene, ['b3a', 'b3b']);
  const fade = useFade(sp.duration);
  const xAt = wf('b3a', 'b3a', '어색한');
  const squeezeAt = xAt + 14;
  const popAt = wf('b3a', 'b3b', 'to');
  const glowAt = popAt + 30;
  const glossAt = wf('b3a', 'b3b', '앞으로');

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <BridgeSentence
        left={[S('I'), S('plan')]}
        prep="to visit"
        tone="orange"
        right={[S('visiting'), S('Seoul.')]}
        replaces
        replaceCount={1}
        y={300}
        fontSize={118}
        appearAt={4}
        wrong={{xAt, squeezeAt, label: '과거 느낌이라 안 돼요!'}}
        popAt={popAt}
        glowAt={glowAt}
        gloss="🛫 앞으로 서울을 방문할 계획"
        glossAt={glossAt}
      />
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['b1a', 'b1b', 'b1c'], node: <StopDemo scene={scene} />},
    {ids: ['b2a', 'b2b', 'b2c'], node: <TimeDirection scene={scene} />},
    {ids: ['b3a', 'b3b'], node: <PlanDemo scene={scene} />},
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
