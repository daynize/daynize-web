import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {Caption, ED, ING, rel, span, useFade, wf} from './shared';

const S = (text: string): Part => ({text, kind: 'subject'});
const CX = WIDTH / 2;

// "I am boring" -> "I am bored": the pill replaces the wrong `boring.`.
const BoredDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b1a', 'b1b', 'b1c']);
  const fade = useFade(sp.duration);
  const tB = rel('b1a', 'b1b');
  // Frames below are relative to the start of b1b (the inner Sequence).
  const xAt = wf('b1b', 'b1b', '엉뚱하고');
  const squeezeAt = wf('b1b', 'b1b', '자학적인');
  const popAt = wf('b1b', 'b1c', 'bored');
  const glowAt = Math.max(popAt + 22, wf('b1b', 'b1c', '완성된'));

  const cardLift = ramp(frame, tB - 4, tB + 16);
  const cardY = 300 - 190 * cardLift;
  const cardScale = 1 - 0.3 * cardLift;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          left: WIDTH / 2 - 440,
          width: 880,
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
          fontSize: 50,
          color: COLORS.sand,
          transform: `scale(${cardScale})`,
          opacity: ramp(frame, 4, 18),
          whiteSpace: 'nowrap',
        }}
      >
        <span>😴</span>
        <span>“나 너무 심심하고 지루해”</span>
      </div>

      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('I'), S('am')]}
          prep="bored."
          tone="orange"
          right={[S('boring.')]}
          replaces
          replaceCount={1}
          y={430}
          fontSize={130}
          maxLines={2}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: '나는 따분한 사람?'}}
          popAt={popAt}
          glowAt={glowAt}
        />
        <Caption
          y={585}
          text="남을 지루하게 만드는 사람이 돼 버림 ✕"
          color="#FF9CA0"
          size={38}
          opacity={ramp(frame - tB, xAt, xAt + 12) * (1 - ramp(frame - tB, popAt - 4, popAt + 8))}
        />
        <Caption
          y={585}
          text="✓ 내가 그 감정을 받아 느낌 = -ed"
          color={ED.main}
          size={38}
          opacity={ramp(frame - tB, glowAt, glowAt + 14)}
        />
      </Sequence>
    </div>
  );
};

const Chip: React.FC<{text: string; kind: 'plain' | 'ing' | 'ed'; s: number; on: boolean; glow?: number}> = ({text, kind, s, on, glow = 0}) => {
  const style =
    kind === 'ing'
      ? {bg: `linear-gradient(135deg, ${COLORS.tealBright}, ${COLORS.teal})`, color: COLORS.ink, border: ING.edge}
      : kind === 'ed'
        ? {bg: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, border: ED.edge}
        : {bg: 'rgba(255,246,229,0.12)', color: COLORS.cream, border: 'rgba(255,246,229,0.4)'};
  return (
    <div style={{padding: '8px 22px', borderRadius: 26, background: style.bg, color: style.color, border: `3px solid ${style.border}`, fontFamily: FONT, fontWeight: 900, fontSize: 48, whiteSpace: 'nowrap', boxShadow: glow ? `0 0 ${46 * glow}px ${style.border}` : 'none', opacity: on ? Math.min(1, s * 2) : 0, transform: `translateY(${(1 - s) * 40}px) scale(${(0.6 + 0.4 * s) * (1 + 0.05 * glow)})`}}>
      {text}
    </div>
  );
};

// -ing (cause) and -ed (person) side by side; the bridge points the arrow the right way.
const IngEdCompare: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['b2a', 'b2b', 'b2c']);
  const fade = useFade(sp.duration);
  const againAt = wf('b2a', 'b2a', '다시');
  const ingAt = wf('b2a', 'b2b', '원인에는');
  const edAt = wf('b2a', 'b2b', '사람에게는');
  const arrowAt = wf('b2a', 'b2c', '화살표가');
  const bridgeAt = wf('b2a', 'b2c', '다리를');
  const pop = (at: number, d = 11, k = 140) => spring({frame: frame - at, fps, config: {damping: d, stiffness: k}});
  const glow = ramp(frame, bridgeAt, bridgeAt + 18) * (0.75 + 0.25 * Math.sin(frame / 6));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Caption y={40} text="다시 한 번, -ing ⇄ -ed" color={COLORS.cream} size={42} opacity={ramp(frame, againAt, againAt + 14)} />

      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 130, textAlign: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 800, color: ING.main, opacity: ramp(frame, ingAt, ingAt + 12)}}>🎬 감정을 내뿜는 원인</div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 190, display: 'flex', justifyContent: 'center', gap: 14}}>
        <Chip text="The movie" kind="plain" s={pop(ingAt)} on={frame >= ingAt} />
        <Chip text="was" kind="plain" s={pop(ingAt + 6)} on={frame >= ingAt + 6} />
        <Chip text="boring" kind="ing" s={pop(ingAt + 12, 8, 150)} on={frame >= ingAt + 12} glow={ramp(frame, ingAt + 12, ingAt + 26) * (1 - ramp(frame, arrowAt, arrowAt + 10) * 0.4)} />
      </div>

      <div style={{position: 'absolute', left: CX - 50, top: 300, width: 100, textAlign: 'center', fontSize: 70, lineHeight: 1, opacity: ramp(frame, edAt - 8, edAt + 6)}}>🔄</div>

      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 400, textAlign: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 800, color: ED.main, opacity: ramp(frame, edAt, edAt + 12)}}>😪 감정을 받아 느끼는 사람</div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 460, display: 'flex', justifyContent: 'center', gap: 14}}>
        <Chip text="I" kind="plain" s={pop(edAt)} on={frame >= edAt} />
        <Chip text="am" kind="plain" s={pop(edAt + 6)} on={frame >= edAt + 6} />
        <Chip text="bored" kind="ed" s={pop(edAt + 12, 8, 150)} on={frame >= edAt + 12} glow={ramp(frame, edAt + 12, edAt + 26) * (1 - ramp(frame, arrowAt, arrowAt + 10) * 0.4)} />
      </div>
      <Caption y={590} text="🌉 감정의 화살표가 향하는 쪽에 다리를 놓기" color={COLORS.yellow} size={40} opacity={ramp(frame, arrowAt, arrowAt + 14) * (0.8 + 0.2 * glow)} />
    </div>
  );
};

// "The movie was bored" -> "The movie was boring" (the hero motion).
const MovieHero: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b3a', 'b3b']);
  const fade = useFade(sp.duration);
  const xAt = wf('b3a', 'b3a', '어색한');
  const squeezeAt = xAt + 14;
  const popAt = wf('b3a', 'b3b', 'boring');
  const glowAt = popAt + 34;
  const glossAt = wf('b3a', 'b3b', '주는');
  const emit = ramp(frame, popAt, popAt + 40);
  const ring = (delay: number) => {
    const t = ramp(frame, popAt + delay, popAt + delay + 36);
    return {t, size: 140 + 420 * t};
  };

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: CX - 120, top: 500, width: 240, textAlign: 'center', fontSize: 170, lineHeight: 1, filter: 'drop-shadow(0 10px 16px rgba(10,8,30,0.45))', transform: `scale(${1 + 0.05 * Math.sin(frame / 6) * emit})`}}>🎬</div>
      {[0, 12, 24].map((d) => {
        const r = ring(d);
        return <div key={d} style={{position: 'absolute', left: CX - r.size / 2, top: 590 - r.size / 2, width: r.size, height: r.size, boxSizing: 'border-box', borderRadius: '50%', border: `4px solid ${ING.main}`, opacity: r.t > 0 && r.t < 1 ? 1 - r.t : 0}} />;
      })}
      <div style={{position: 'absolute', left: CX - 60 + 300 * emit, top: 540, width: 120, textAlign: 'center', fontSize: 100, lineHeight: 1, opacity: emit > 0 && emit < 1 ? 1 : 0}}>🥱</div>
      <BridgeSentence
        left={[S('The'), S('movie'), S('was')]}
        prep="boring."
        tone="teal"
        right={[S('bored.')]}
        replaces
        replaceCount={1}
        y={280}
        fontSize={118}
        maxLines={2}
        appearAt={4}
        wrong={{xAt, squeezeAt, label: '영화가 지루함을 느꼈다고?'}}
        popAt={popAt}
        glowAt={glowAt}
        gloss="🎬 영화가 지루함을 주는 쪽 = -ing"
        glossAt={glossAt}
      />
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['b1a', 'b1b', 'b1c'], node: <BoredDemo scene={scene} />},
    {ids: ['b2a', 'b2b', 'b2c'], node: <IngEdCompare scene={scene} />},
    {ids: ['b3a', 'b3b'], node: <MovieHero scene={scene} />},
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
