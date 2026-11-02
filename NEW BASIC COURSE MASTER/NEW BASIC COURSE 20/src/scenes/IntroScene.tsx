import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Actor} from '../components/Actor';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrame} from '../timeline';

const span = (scene: SceneSpan, ids: string[]) => {
  const first = cueById(ids[0]);
  const last = cueById(ids[ids.length - 1]);
  return {from: first.start - scene.from, duration: last.start + last.duration - first.start};
};

// Frame of a spoken word, relative to the first cue of the phase that is playing.
const wf = (base: string, id: string, idx: number, edge: 's' | 'e' = 's') =>
  wordFrame(id, idx, edge) - cueById(base).start;

const useFade = (duration: number, inF = 10, outF = 10) => {
  const frame = useCurrentFrame();
  return ramp(frame, 0, inF) * (1 - ramp(frame, duration - outF, duration));
};

const Card: React.FC<{
  x: number;
  y: number;
  w: number;
  text: string;
  color?: string;
  bg?: string;
  size?: number;
  scale?: number;
  opacity?: number;
  glow?: number;
  border?: string;
}> = ({x, y, w, text, color = COLORS.cream, bg = 'rgba(255,246,229,0.12)', size = 74, scale = 1, opacity = 1, glow = 0, border}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - size * 0.8,
      width: w,
      height: size * 1.6,
      borderRadius: 28,
      background: bg,
      border: border ?? '2px solid rgba(255,246,229,0.35)',
      color,
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
      transform: `scale(${scale})`,
      boxShadow: glow ? `0 0 ${50 * glow}px ${color}` : '0 8px 24px rgba(10,8,30,0.3)',
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

const Label: React.FC<{x: number; y: number; text: string; color?: string; size?: number; opacity?: number; align?: 'left' | 'center'}> = ({
  x,
  y,
  text,
  color = COLORS.sand,
  size = 34,
  opacity = 1,
  align = 'center',
}) => (
  <div
    style={{
      position: 'absolute',
      left: align === 'center' ? x - 600 : x,
      width: align === 'center' ? 1200 : undefined,
      top: y,
      textAlign: align,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      color,
      opacity,
      letterSpacing: 1,
      textShadow: '0 2px 8px rgba(10,8,30,0.6)',
    }}
  >
    {text}
  </div>
);

const layout = (widths: number[], gap: number, cx: number) => {
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  let x = cx - total / 2;
  return widths.map((w) => {
    const c = x + w / 2;
    x += w + gap;
    return c;
  });
};

// Phase 1: word order. Korean puts the verb last; English places it right after the subject.
const WordOrder: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i1', 'i2', 'i3']);
  const fade = useFade(sp.duration);
  const t2 = cueById('i2').start - cueById('i1').start;
  const t3 = cueById('i3').start - cueById('i1').start;
  const flagAt = wf('i1', 'i1', 4); // 끝에
  const flyAt = wf('i1', 'i2', 4); // 동사가
  const subjAt = wf('i1', 'i2', 2); // 주어
  const objWordAt = wf('i1', 'i2', 6); // 옵니다
  const nounAt = wf('i1', 'i3', 4); // 명사는
  const objectAt = wf('i1', 'i3', 5); // 목적어로

  const kr = layout([230, 290, 270], 36, WIDTH / 2);
  const en = layout([150, 200, 360], 36, WIDTH / 2);
  const krY = 260;
  const enY = 560;

  const pop = (at: number, i = 0) => spring({frame: frame - at - i * 6, fps, config: {damping: 11, stiffness: 140}});
  const krDim = 1 - 0.55 * ramp(frame, t2, t2 + 14);

  // The verb card leaves the end of the Korean sentence and lands in slot 2 of the English one.
  const fly = spring({frame: frame - flyAt, fps, config: {damping: 13, stiffness: 70}});
  const verbX = kr[2] + (en[1] - kr[2]) * fly;
  const verbY = krY + (enY - krY) * fly - Math.sin(Math.PI * Math.min(1, fly)) * 110;

  const flagBounce = Math.abs(Math.sin(frame / 6)) * 12;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={70} y={krY - 120} text="한국어" align="left" size={32} opacity={krDim} />
      <Label x={70} y={enY - 120} text="English" align="left" size={32} opacity={ramp(frame, t2, t2 + 12)} />

      <Card x={kr[0]} y={krY} w={230} text="나는" scale={pop(6, 0)} opacity={krDim} />
      <Card x={kr[1]} y={krY} w={290} text="사과를" scale={pop(6, 1)} opacity={krDim} />
      {frame < flyAt ? (
        <>
          <Card
            x={kr[2]}
            y={krY}
            w={270}
            text="먹는다"
            color={COLORS.tealBright}
            bg="rgba(46,196,182,0.22)"
            border={`3px solid ${COLORS.teal}`}
            scale={pop(6, 2)}
            glow={0.5 + 0.2 * Math.sin(frame / 6)}
          />
          <div
            style={{
              position: 'absolute',
              left: kr[2] - 80,
              top: krY - 150 - flagBounce,
              width: 160,
              textAlign: 'center',
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 40,
              color: COLORS.yellow,
              opacity: ramp(frame, flagAt, flagAt + 10),
            }}
          >
            문장의 끝 ▼
          </div>
        </>
      ) : null}

      {frame >= t2 ? (
        <>
          <Card x={en[0]} y={enY} w={150} text="I" scale={pop(subjAt)} opacity={frame >= subjAt ? 1 : 0} />
          <Card x={en[2]} y={enY} w={360} text="an apple" scale={pop(objWordAt)} opacity={frame >= objWordAt ? 1 : 0} glow={ramp(frame, nounAt, nounAt + 10) * 0.4} />
        </>
      ) : null}
      {frame >= flyAt ? (
        <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
          <Card
            x={verbX}
            y={verbY}
            w={fly > 0.95 ? 200 : 270}
            text={fly > 0.55 ? 'eat' : '먹는다'}
            color={COLORS.tealBright}
            bg="rgba(46,196,182,0.22)"
            border={`3px solid ${COLORS.teal}`}
            glow={0.5}
            scale={1 + 0.1 * Math.sin(Math.PI * Math.min(1, fly))}
          />
        </div>
      ) : null}
      {frame >= flyAt + 24 ? (
        <Label x={WIDTH / 2} y={enY + 110} text="주어 바로 다음에 동사!" color={COLORS.yellow} size={42} opacity={ramp(frame, flyAt + 24, flyAt + 38) * (1 - ramp(frame, t3 - 6, t3 + 6))} />
      ) : null}

      {frame >= objectAt ? (
        <>
          {['에게', '을', '를'].map((txt, i) => {
            const at = wf('i1', 'i3', 8 + i);
            if (frame < at) return null;
            const s = pop(at);
            const dx = [-170, 0, 170][i];
            const dy = [-120, -160, -120][i];
            return (
              <div
                key={txt}
                style={{
                  position: 'absolute',
                  left: en[2] + dx,
                  top: enY + dy - 30 * (1 - s),
                  transform: `translate(-50%,-50%) scale(${s})`,
                  padding: '6px 26px',
                  borderRadius: 999,
                  background: COLORS.sand,
                  color: COLORS.ink,
                  fontFamily: FONT,
                  fontWeight: 900,
                  fontSize: 46,
                  boxShadow: '0 6px 18px rgba(10,8,30,0.35)',
                }}
              >
                {txt}
              </div>
            );
          })}
          <Label x={en[2]} y={enY + 82} text="목적어 (Object)" size={34} opacity={ramp(frame, objectAt, objectAt + 14)} />
        </>
      ) : null}
    </div>
  );
};

// Phase 2: the two verb families.
const TitleCards: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i4']);
  const fade = useFade(sp.duration);
  const midAt = wf('i4', 'i4', 2); // 영어의
  const aAt = wf('i4', 'i4', 6); // 타동사와
  const bAt = wf('i4', 'i4', 7); // 자동사입니다
  const a = spring({frame: frame - aAt, fps, config: {damping: 12, stiffness: 110}});
  const b = spring({frame: frame - bAt, fps, config: {damping: 12, stiffness: 110}});
  const mid = ramp(frame, midAt, midAt + 14);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={WIDTH / 2} y={100} text="영어의 기초 · 동사의 두 종류" size={38} opacity={mid} />
      <div style={{position: 'absolute', left: 190, top: 200, width: 700, height: 300, transform: `translateX(${(1 - a) * -500}px) scale(${0.8 + 0.2 * a})`, opacity: Math.min(1, a * 2), borderRadius: 44, background: 'rgba(255,246,229,0.14)', border: '3px solid rgba(235,217,180,0.7)', fontFamily: FONT, textAlign: 'center', color: COLORS.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
        <div style={{fontSize: 112, fontWeight: 900}}>타동사</div>
        <div style={{fontSize: 44, color: COLORS.sand}}>Transitive Verb</div>
      </div>
      <div style={{position: 'absolute', left: 190, top: 560, width: 700, height: 300, transform: `translateX(${(1 - b) * 500}px) scale(${0.8 + 0.2 * b})`, opacity: Math.min(1, b * 2), borderRadius: 44, background: 'rgba(46,196,182,0.2)', border: `3px solid ${COLORS.teal}`, boxShadow: `0 0 ${40 * b}px ${COLORS.teal}88`, fontFamily: FONT, textAlign: 'center', color: COLORS.tealBright, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
        <div style={{fontSize: 112, fontWeight: 900}}>자동사</div>
        <div style={{fontSize: 44, color: COLORS.cream}}>Intransitive Verb</div>
      </div>
    </div>
  );
};

// Phase 3: a transitive verb moves SOMETHING ELSE.
const Transitive: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i5']);
  const fade = useFade(sp.duration);
  const startAt = wf('i5', 'i5', 1); // 남을
  const p = easeInOutCubic((frame - startAt) / (cueById('i5').audioFrames - startAt - 6));
  const heX = 220 + 470 * p;
  const boxX = heX + 170;
  const moving = p > 0 && p < 1;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={WIDTH / 2} y={110} text="타동사 = 남(목적어)을 움직인다" color={COLORS.cream} size={44} opacity={ramp(frame, 8, 24)} />
      <Actor who="he" x={heX} walking={moving} opacity={ramp(frame, 0, 10)} />
      <div style={{position: 'absolute', left: boxX, top: 590, fontSize: 130, lineHeight: 1, transform: `translate(-50%,-50%) rotate(${Math.sin(frame / 4) * (moving ? 4 : 0)}deg)`, filter: 'drop-shadow(0 8px 14px rgba(10,8,30,0.4))'}}>📦</div>
      {moving
        ? [0, 1, 2].map((i) => (
            <div key={i} style={{position: 'absolute', left: boxX - 110 - i * 36, top: 560 + i * 26, width: 60 - i * 12, height: 6, borderRadius: 3, background: COLORS.sand, opacity: 0.6 - i * 0.15}} />
          ))
        : null}
      <Label x={boxX} y={440} text="push → the box" color={COLORS.sand} size={40} opacity={ramp(frame, startAt, startAt + 14)} />
    </div>
  );
};

// Phase 4: an intransitive verb moves YOURSELF.
const Intransitive: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i6']);
  const fade = useFade(sp.duration);
  const startAt = wf('i6', 'i6', 2); // 혼자서
  const selfAt = wf('i6', 'i6', 8); // 나
  const p = easeInOutCubic((frame - startAt) / (cueById('i6').audioFrames - startAt - 6));
  const x = 200 + 680 * p;
  const hop = Math.abs(Math.sin(frame / 7)) * 70 * (p > 0 && p < 1 ? 1 : 0);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={WIDTH / 2} y={110} text="자동사 = 나 스스로를 움직인다" color={COLORS.tealBright} size={44} opacity={ramp(frame, 8, 24)} />
      <Actor who="she" x={x} lift={hop} walking={false} opacity={ramp(frame, 0, 10)} />
      {Array.from({length: 6}, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + frame / 18;
        return (
          <div
            key={i}
            style={{position: 'absolute', left: x + Math.cos(a) * 150, top: 470 - hop + Math.sin(a) * 40, width: 14, height: 14, borderRadius: '50%', background: COLORS.tealBright, opacity: 0.8, boxShadow: `0 0 14px ${COLORS.teal}`}}
          />
        );
      })}
      <Label x={x} y={300} text="↺  나 스스로" color={COLORS.sand} size={40} opacity={ramp(frame, selfAt, selfAt + 14)} />
    </div>
  );
};

interface VerbDef {
  en: string;
  kr: string;
  emoji: string;
  motion: (f: number) => React.CSSProperties;
}

const VERBS: VerbDef[] = [
  {en: 'lie', kr: '눕다', emoji: '🛌', motion: (f) => ({transform: `translateY(${Math.sin(f / 16) * 6}px) rotate(${Math.sin(f / 22) * 4}deg)`})},
  {en: 'sleep', kr: '자다', emoji: '😴', motion: (f) => ({transform: `translateY(${Math.sin(f / 18) * 8}px) scale(${1 + 0.06 * Math.sin(f / 18)})`})},
  {en: 'dream', kr: '꿈꾸다', emoji: '💭', motion: (f) => ({transform: `translate(${Math.sin(f / 20) * 14}px,${Math.cos(f / 15) * 12}px) scale(${1 + 0.08 * Math.sin(f / 10)})`})},
  {en: 'wake', kr: '깨어나다', emoji: '⏰', motion: (f) => ({transform: `rotate(${Math.sin(f * 1.4) * 14 * Math.max(0.2, 1 - (f % 90) / 60)}deg)`})},
  {en: 'crawl', kr: '기어다니다', emoji: '🐛', motion: (f) => ({transform: `translateX(${Math.sin(f / 10) * 36}px) scaleX(${1 + 0.12 * Math.sin(f / 5)})`})},
  {en: 'squat', kr: '쭈그려 앉다', emoji: '🧎', motion: (f) => ({transformOrigin: '50% 100%', transform: `scaleY(${1 - 0.14 * Math.abs(Math.sin(f / 11))})`})},
  {en: 'stand', kr: '일어나다', emoji: '🧍', motion: (f) => ({transformOrigin: '50% 100%', transform: `scaleY(${0.88 + 0.12 * Math.min(1, (f % 80) / 24)})`})},
  {en: 'walk', kr: '걷다', emoji: '🚶', motion: (f) => ({transform: `translate(${Math.sin(f / 12) * 40}px,${-Math.abs(Math.sin(f / 6)) * 9}px)`})},
  {en: 'run', kr: '뛰다', emoji: '🏃', motion: (f) => ({transform: `translate(${((f * 6) % 110) - 55}px,${-Math.abs(Math.sin(f / 3)) * 8}px)`})},
  {en: 'hop', kr: '깡충깡충 뛰다', emoji: '🐇', motion: (f) => ({transform: `translateY(${-Math.abs(Math.sin(f / 5)) * 26}px)`})},
  {en: 'jump', kr: '점프하다', emoji: '🤸', motion: (f) => ({transform: `translateY(${-Math.abs(Math.sin(f / 9)) * 62}px) rotate(${Math.sin(f / 9) * 12}deg)`})},
  {en: 'fly', kr: '날다', emoji: '🕊️', motion: (f) => ({transform: `translate(${Math.sin(f / 20) * 44}px,${Math.cos(f / 20) * -22}px) rotate(${Math.sin(f / 20) * 10}deg)`})},
];

const VerbCloud: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i7a', 'i7b']);
  const fade = useFade(sp.duration);
  const base = cueById('i7a').start;
  // Word index of each verb in the spoken line (i7a / i7b), measured from the narration.
  const spoken: [string, number][] = [
    ['i7a', 1], ['i7a', 3], ['i7a', 4], ['i7a', 6], ['i7a', 7], ['i7a', 8], ['i7a', 10],
    ['i7b', 0], ['i7b', 1], ['i7b', 2], ['i7b', 4], ['i7b', 6],
  ];
  const reveal = (i: number) => wordFrame(spoken[i][0], spoken[i][1]) - base;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={WIDTH / 2} y={30} text="자동사 · Intransitive verbs" color={COLORS.tealBright} size={40} opacity={ramp(frame, 0, 14)} />
      {VERBS.map((v, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = WIDTH / 2 + (col - 0.5) * 410;
        const cy = 175 + row * 150;
        const r = reveal(i);
        const s = spring({frame: frame - r, fps, config: {damping: 10, stiffness: 150}});
        const active = frame >= r && frame < (i < VERBS.length - 1 ? reveal(i + 1) : r + 44);
        const f = Math.max(0, frame - r);
        return (
          <div
            key={v.en}
            style={{
              position: 'absolute',
              left: cx - 200,
              top: cy - 66,
              width: 400,
              height: 132,
              borderRadius: 34,
              background: active ? 'rgba(46,196,182,0.34)' : 'rgba(46,196,182,0.14)',
              border: `3px solid ${active ? COLORS.tealBright : 'rgba(46,196,182,0.5)'}`,
              boxShadow: active ? `0 0 44px ${COLORS.teal}aa` : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 20px',
              fontFamily: FONT,
              opacity: Math.min(1, s * 2),
              transform: `scale(${(0.5 + 0.5 * s) * (active ? 1.06 : 1)}) translateY(${(1 - s) * 60}px)`,
            }}
          >
            <div style={{width: 96, fontSize: 72, lineHeight: 1, textAlign: 'center', ...v.motion(f)}}>{v.emoji}</div>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <div style={{fontSize: 50, fontWeight: 900, color: COLORS.tealBright}}>{v.en}</div>
              <div style={{fontSize: 26, fontWeight: 600, color: COLORS.sand, whiteSpace: 'nowrap'}}>{v.kr}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['i1', 'i2', 'i3'], node: <WordOrder scene={scene} />},
    {ids: ['i4'], node: <TitleCards scene={scene} />},
    {ids: ['i5'], node: <Transitive scene={scene} />},
    {ids: ['i6'], node: <Intransitive scene={scene} />},
    {ids: ['i7a', 'i7b'], node: <VerbCloud scene={scene} />},
  ];
  return (
    <>
      <Sequence from={0} durationInFrames={20}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.35} />
      </Sequence>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`intro-${p.ids[0]}`}>
            {p.node}
          </Sequence>
        );
      })}
    </>
  );
};
