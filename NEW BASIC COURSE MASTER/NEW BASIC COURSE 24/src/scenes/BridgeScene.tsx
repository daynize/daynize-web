import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {Caption, PREP_STYLE, rel, span, useFade, wf} from './shared';

const S = (text: string): Part => ({text, kind: 'subject'});
const CX = WIDTH / 2;

// "I meet him in Monday" -> "I meet him on Monday": `on` replaces the wrong `in`.
const MondayDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b1a', 'b1b', 'b1c']);
  const fade = useFade(sp.duration);
  const tB = rel('b1a', 'b1b');
  // Frames below are relative to the start of b1b (the inner Sequence).
  const xAt = wf('b1b', 'b1b', '착각해');
  const squeezeAt = wf('b1b', 'b1b', '어색하고');
  const popAt = wf('b1b', 'b1c', 'on');
  const glowAt = Math.max(popAt + 22, wf('b1b', 'b1c', '써야'));

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
        <span>📅</span>
        <span>“나 월요일에 만나”</span>
      </div>

      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('I'), S('meet'), S('him')]}
          prep="on"
          tone="orange"
          right={[S('in'), S('Monday.')]}
          replaces
          replaceCount={1}
          y={430}
          fontSize={118}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: '하루는 기간이 아니에요!'}}
          popAt={popAt}
          glowAt={glowAt}
        />
        <Caption
          y={585}
          text="딱 24시간짜리 하루를 ‘긴 기간’으로 착각 ✕"
          color="#FF9CA0"
          size={36}
          opacity={ramp(frame - tB, xAt, xAt + 12) * (1 - ramp(frame - tB, popAt - 4, popAt + 8))}
        />
        <Caption
          y={585}
          text="✓ 월요일 = 딱 24시간 = on"
          color={PREP_STYLE.on.main}
          size={40}
          opacity={ramp(frame - tB, glowAt, glowAt + 14)}
        />
      </Sequence>
    </div>
  );
};

// A point (7 o'clock) is shorter than 24 h, a month or a year is longer.
const PointOrSpan: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['b2a']);
  const fade = useFade(sp.duration);
  const sevenAt = wf('b2a', 'b2a', '7시는');
  const shortAt = wf('b2a', 'b2a', '짧은');
  const atAt = wf('b2a', 'b2a', 'at');
  const monthAt = wf('b2a', 'b2a', '달이나');
  const longAt = wf('b2a', 'b2a', '긴');
  const inAt = wf('b2a', 'b2a', 'in');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const a = PREP_STYLE.at;
  const n = PREP_STYLE.in;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Caption y={60} text="점 vs 기간" color={COLORS.cream} size={44} opacity={ramp(frame, 0, 14)} />

      <div style={{position: 'absolute', left: 90, top: 150, width: 900, height: 230, boxSizing: 'border-box', borderRadius: 40, background: `rgba(${a.rgb},0.18)`, border: `3px solid ${a.edge}`, boxShadow: `0 0 ${36 * pop(sevenAt)}px ${a.edge}77`, fontFamily: FONT, color: a.main, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: frame >= sevenAt ? Math.min(1, pop(sevenAt) * 2) : 0, transform: `scale(${0.7 + 0.3 * pop(sevenAt)})`}}>
        <div style={{fontSize: 40, fontWeight: 700, color: COLORS.cream}}>🕖 7시 · 24시간보다 훨씬 짧은 점</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, height: 30, width: 600, opacity: frame >= shortAt ? 1 : 0}}>
          <div style={{width: 24, height: 24, borderRadius: '50%', background: a.edge, boxShadow: `0 0 20px ${a.edge}`}} />
          <div style={{flex: 1, height: 6, borderRadius: 3, background: 'rgba(235,217,180,0.25)'}} />
        </div>
        <div style={{fontSize: 64, fontWeight: 900, opacity: frame >= atAt ? 1 : 0}}>at 7 o’clock</div>
      </div>

      <div style={{position: 'absolute', left: 90, top: 430, width: 900, height: 230, boxSizing: 'border-box', borderRadius: 40, background: `rgba(${n.rgb},0.18)`, border: `3px solid ${n.edge}`, boxShadow: `0 0 ${36 * pop(monthAt)}px ${n.edge}77`, fontFamily: FONT, color: n.main, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: frame >= monthAt ? Math.min(1, pop(monthAt) * 2) : 0, transform: `scale(${0.7 + 0.3 * pop(monthAt)})`}}>
        <div style={{fontSize: 40, fontWeight: 700, color: COLORS.cream}}>🗓️ 한 달 · 일 년 · 24시간보다 긴 기간</div>
        <div style={{width: 700, height: 24, borderRadius: 12, background: `linear-gradient(90deg, ${n.edge}, #FFA862)`, opacity: frame >= longAt ? 1 : 0, boxShadow: `0 0 20px ${n.edge}`}} />
        <div style={{fontSize: 64, fontWeight: 900, opacity: frame >= inAt ? 1 : 0}}>in May</div>
      </div>
    </div>
  );
};

// at < 24 h, on = 24 h, in > 24 h: three bars measured against the 24-hour line.
const RuleBars: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['b2b', 'b2c', 'b2d']);
  const fade = useFade(sp.duration);
  const againAt = wf('b2b', 'b2b', '다시');
  const atAt = wf('b2b', 'b2c', '적으면');
  const onAt = wf('b2b', 'b2c', 'on,');
  const inAt = wf('b2b', 'b2c', '많으면');
  const bridgeAt = wf('b2b', 'b2d', '다리를');
  const grow = (at: number) => spring({frame: frame - at, fps, config: {damping: 14, stiffness: 90}});
  const bridge = spring({frame: frame - bridgeAt, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
  const LINE = 520;
  const bars: {key: 'at' | 'on' | 'in'; at: number; w: number; text: string; top: number}[] = [
    {key: 'at', at: atAt, w: 220, text: 'at · 24시간보다 적다', top: 190},
    {key: 'on', at: onAt, w: LINE - 90, text: 'on · 딱 24시간', top: 350},
    {key: 'in', at: inAt, w: 860, text: 'in · 24시간보다 많다', top: 510},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Caption y={50} text="다시 한 번, 24시간 기준" color={COLORS.cream} size={42} opacity={ramp(frame, againAt, againAt + 14)} />
      <div style={{position: 'absolute', left: LINE - 3, top: 150, width: 6, height: 500, background: COLORS.cream, opacity: 0.8, borderRadius: 3}} />
      <div style={{position: 'absolute', left: LINE - 70, top: 118, width: 140, textAlign: 'center', fontFamily: FONT, fontSize: 32, fontWeight: 800, color: COLORS.cream}}>24h</div>
      {bars.map((b) => {
        const st = PREP_STYLE[b.key];
        const g = grow(b.at);
        return (
          <div key={b.key} style={{position: 'absolute', left: 90, top: b.top, width: b.w * Math.max(0.02, g), height: 110, boxSizing: 'border-box', borderRadius: 30, background: `rgba(${st.rgb},0.28)`, border: `3px solid ${st.edge}`, boxShadow: `0 0 30px ${st.edge}66`, overflow: 'hidden', opacity: frame >= b.at ? 1 : 0, display: 'flex', alignItems: 'center', paddingLeft: 24, fontFamily: FONT, fontWeight: 900, fontSize: 38, color: st.main, whiteSpace: 'nowrap'}}>
            {b.text}
          </div>
        );
      })}
      {frame >= bridgeAt ? (
        <div style={{position: 'absolute', left: CX - 300, top: 660, width: 600, height: 56, boxSizing: 'border-box', borderRadius: 28, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 32, boxShadow: `0 0 40px ${COLORS.orange}`, transform: `scale(${0.4 + 0.6 * bridge})`, opacity: Math.min(1, bridge * 2), whiteSpace: 'nowrap'}}>
          🌉 시간의 길이에 맞는 전치사 다리
        </div>
      ) : null}
    </div>
  );
};

// "I arrive in 7 o'clock" -> "I arrive at 7 o'clock" (the hero motion).
const ArriveHero: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const sp = span(scene, ['b3a', 'b3b']);
  const fade = useFade(sp.duration);
  const xAt = wf('b3a', 'b3a', '어색한');
  const squeezeAt = xAt + 14;
  const popAt = wf('b3a', 'b3b', 'at');
  const glowAt = popAt + 30;
  const glossAt = wf('b3a', 'b3b', '정확한');
  const clockPulse = (f: number) => 1 + 0.1 * Math.sin(f / 7);

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: CX - 120, top: 480, width: 240, textAlign: 'center', fontSize: 190, lineHeight: 1, filter: 'drop-shadow(0 10px 16px rgba(10,8,30,0.45))', transform: `scale(${clockPulse(popAt)})`}}>🕖</div>
      <BridgeSentence
        left={[S('I'), S('arrive')]}
        prep="at"
        tone="gold"
        right={[S('in'), S('7'), S('o’clock.')]}
        replaces
        replaceCount={1}
        y={280}
        fontSize={118}
        appearAt={4}
        wrong={{xAt, squeezeAt, label: '7시는 점이에요!'}}
        popAt={popAt}
        glowAt={glowAt}
        gloss="🕖 7시라는 정확한 점에 도착한다"
        glossAt={glossAt}
      />
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['b1a', 'b1b', 'b1c'], node: <MondayDemo scene={scene} />},
    {ids: ['b2a'], node: <PointOrSpan scene={scene} />},
    {ids: ['b2b', 'b2c', 'b2d'], node: <RuleBars scene={scene} />},
    {ids: ['b3a', 'b3b'], node: <ArriveHero scene={scene} />},
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
