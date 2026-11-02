import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {ACTIVE, Caption, PASSIVE, rel, span, useFade, wf} from './shared';

const S = (text: string): Part => ({text, kind: 'subject'});
const U = (text: string): Part => ({text, kind: 'unit'});
const CX = WIDTH / 2;

// "This book wrote by him" -> "This book was written by him": the pill replaces the wrong `wrote`.
const BookDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b1a', 'b1b', 'b1c']);
  const fade = useFade(sp.duration);
  const tB = rel('b1a', 'b1b');
  // Frames below are relative to the start of b1b (the inner Sequence).
  const xAt = wf('b1b', 'b1b', '말도');
  const squeezeAt = wf('b1b', 'b1b', '괴기한');
  const popAt = wf('b1b', 'b1c', 'was');
  const glowAt = Math.max(popAt + 22, wf('b1b', 'b1c', '다리를'));

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
        <span>📖</span>
        <span>“이 책은 그에 의해 쓰여졌다”</span>
      </div>

      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('This'), S('book')]}
          prep="was written"
          tone="orange"
          right={[S('wrote'), S('by'), S('him.')]}
          replaces
          replaceCount={1}
          y={430}
          fontSize={118}
          maxLines={2}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: '책이 스스로 썼다고요?'}}
          popAt={popAt}
          glowAt={glowAt}
        />
        <Caption
          y={585}
          text="책이 스스로 펜을 든 꼴 ✕"
          color="#FF9CA0"
          size={38}
          opacity={ramp(frame - tB, xAt, xAt + 12) * (1 - ramp(frame - tB, popAt - 4, popAt + 8))}
        />
        <Caption
          y={585}
          text="✓ 책은 쓰임을 ‘당한’ 대상 = be + p.p."
          color={PASSIVE.main}
          size={38}
          opacity={ramp(frame - tB, glowAt, glowAt + 14)}
        />
      </Sequence>
    </div>
  );
};

const Chip: React.FC<{text: string; kind: 'plain' | 'active' | 'passive' | 'by'; s: number; on: boolean; glow?: number}> = ({text, kind, s, on, glow = 0}) => {
  const style =
    kind === 'active'
      ? {bg: `rgba(${ACTIVE.rgb},0.22)`, color: ACTIVE.main, border: ACTIVE.edge}
      : kind === 'passive'
        ? {bg: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, border: PASSIVE.edge}
        : kind === 'by'
          ? {bg: 'linear-gradient(135deg, #FFA862, #FF6648)', color: COLORS.ink, border: '#FF6648'}
          : {bg: 'rgba(255,246,229,0.12)', color: COLORS.cream, border: 'rgba(255,246,229,0.4)'};
  return (
    <div style={{padding: '8px 22px', borderRadius: 26, background: style.bg, color: style.color, border: `3px solid ${style.border}`, fontFamily: FONT, fontWeight: 900, fontSize: 48, whiteSpace: 'nowrap', boxShadow: glow ? `0 0 ${46 * glow}px ${style.border}` : 'none', opacity: on ? Math.min(1, s * 2) : 0, transform: `translateY(${(1 - s) * 40}px) scale(${(0.6 + 0.4 * s) * (1 + 0.05 * glow)})`}}>
      {text}
    </div>
  );
};

// Active vs passive side by side; `by` bridges to the doer.
const ActivePassive: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['b2a', 'b2b', 'b2c']);
  const fade = useFade(sp.duration);
  const againAt = wf('b2a', 'b2a', '다시');
  const activeAt = wf('b2a', 'b2b', '능동태');
  const passiveAt = wf('b2a', 'b2b', '당하거나');
  const formAt = wf('b2a', 'b2b', 'be');
  const byAt = wf('b2a', 'b2c', 'by');
  const pop = (at: number, d = 11, k = 140) => spring({frame: frame - at, fps, config: {damping: d, stiffness: k}});
  const byGlow = ramp(frame, byAt, byAt + 18) * (0.75 + 0.25 * Math.sin(frame / 6));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Caption y={40} text="다시 한 번, 능동태 ⇄ 수동태" color={COLORS.cream} size={42} opacity={ramp(frame, againAt, againAt + 14)} />

      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 130, textAlign: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 800, color: ACTIVE.main, opacity: ramp(frame, activeAt, activeAt + 12)}}>능동태 · 주어가 직접 행동</div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 190, display: 'flex', justifyContent: 'center', gap: 16}}>
        <Chip text="He" kind="active" s={pop(activeAt)} on={frame >= activeAt} />
        <Chip text="wrote" kind="active" s={pop(activeAt + 6)} on={frame >= activeAt + 6} />
        <Chip text="this book." kind="plain" s={pop(activeAt + 12)} on={frame >= activeAt + 12} />
      </div>

      <div style={{position: 'absolute', left: CX - 50, top: 300, width: 100, textAlign: 'center', fontSize: 70, lineHeight: 1, opacity: ramp(frame, passiveAt - 8, passiveAt + 6)}}>🔄</div>

      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 400, textAlign: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 800, color: PASSIVE.main, opacity: ramp(frame, passiveAt, passiveAt + 12)}}>수동태 · 주어가 행동을 당함</div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 460, display: 'flex', justifyContent: 'center', gap: 14}}>
        <Chip text="This book" kind="plain" s={pop(passiveAt)} on={frame >= passiveAt} />
        <Chip text="was written" kind="passive" s={pop(formAt, 8, 150)} on={frame >= formAt} glow={ramp(frame, formAt, formAt + 14) * (1 - ramp(frame, byAt, byAt + 10) * 0.5)} />
        <Chip text="by" kind="by" s={pop(byAt, 7, 150)} on={frame >= byAt} glow={byGlow} />
        <Chip text="him." kind="plain" s={pop(byAt + 8)} on={frame >= byAt + 8} />
      </div>
      <Caption y={590} text="🌉 행동을 한 주체 앞의 다리 = by" color={COLORS.yellow} size={40} opacity={ramp(frame, byAt + 10, byAt + 24)} />
    </div>
  );
};

// "The window broke" -> "The window was broken by the wind" (the hero motion).
const WindowHero: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b3a', 'b3b']);
  const fade = useFade(sp.duration);
  const xAt = wf('b3a', 'b3a', '어색한');
  const squeezeAt = xAt + 14;
  const popAt = wf('b3a', 'b3b', 'was');
  const glowAt = popAt + 34;
  const glossAt = wf('b3a', 'b3b', '깨짐을');
  const windAt = wf('b3a', 'b3b', 'wind');
  const shake = Math.sin(frame * 1.7) * 6 * ramp(frame, windAt, windAt + 6) * (1 - ramp(frame, windAt + 20, windAt + 40));
  const gust = ramp(frame, windAt, windAt + 30);

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: CX - 120, top: 470, width: 240, textAlign: 'center', fontSize: 190, lineHeight: 1, filter: 'drop-shadow(0 10px 16px rgba(10,8,30,0.45))', transform: `translateX(${shake}px) rotate(${shake * 0.4}deg)`}}>🪟</div>
      <div style={{position: 'absolute', left: CX - 420 + 340 * gust, top: 520, width: 140, fontSize: 110, lineHeight: 1, opacity: gust > 0 && gust < 1 ? 1 : 0}}>💨</div>
      <BridgeSentence
        left={[S('The'), S('window')]}
        prep="was broken"
        tone="orange"
        right={[S('broke.')]}
        appendAfter={[U('by'), S('the'), S('wind.')]}
        replaces
        replaceCount={1}
        y={280}
        fontSize={118}
        maxLines={2}
        appearAt={4}
        wrong={{xAt, squeezeAt, label: '창문이 스스로?'}}
        popAt={popAt}
        glowAt={glowAt}
        gloss="🌬️ 창문은 바람에 의해 깨짐을 당했다"
        glossAt={glossAt}
      />
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['b1a', 'b1b', 'b1c'], node: <BookDemo scene={scene} />},
    {ids: ['b2a', 'b2b', 'b2c'], node: <ActivePassive scene={scene} />},
    {ids: ['b3a', 'b3b'], node: <WindowHero scene={scene} />},
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
