import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrameOf} from '../timeline';
import {Card, Label, span, useFade, wf} from './shared';

const CX = WIDTH / 2;
const TEAL_BG = 'rgba(46,196,182,0.22)';
const TEAL_BORDER = `3px solid ${COLORS.teal}`;

// Phase 1 - Korean counting: just attach a number and you are done.
const KoreanCounting: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i1a', 'i1b']);
  const fade = useFade(sp.duration);
  const labelAt = wf('i1a', 'i1a', '개수만');
  const appleAt = wf('i1a', 'i1b', '사과');
  const waterAt = wf('i1a', 'i1b', '물');
  const doneAt = wf('i1a', 'i1b', '말이죠');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={90} text="우리말 · 개수만 붙이면 끝!" size={46} color={COLORS.cream} opacity={ramp(frame, labelAt, labelAt + 14)} />
      <Card x={CX} y={300} w={860} size={64} text="🍎  사과 한 개" scale={pop(appleAt)} opacity={frame >= appleAt ? 1 : 0} />
      <Card x={CX} y={470} w={860} size={64} text="🥤  물 한 컵" scale={pop(waterAt)} opacity={frame >= waterAt ? 1 : 0} />
      <Label x={CX} y={575} text="✓ 그냥 세면 끝!" size={52} color={COLORS.yellow} opacity={ramp(frame, doneAt, doneAt + 12)} />
    </div>
  );
};

// Phase 2 - English separates countable from uncountable.
const TwoKinds: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i2']);
  const fade = useFade(sp.duration);
  const engAt = wf('i2', 'i2', '영어는');
  const canAt = wf('i2', 'i2', '있는');
  const cantAt = wf('i2', 'i2', '없는');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={90} text="그런데 영어는?" size={46} color={COLORS.cream} opacity={ramp(frame, engAt, engAt + 14)} />
      <Card x={CX} y={270} w={860} size={56} text="🍎  셀 수 있는 명사" scale={pop(canAt)} opacity={frame >= canAt ? 1 : 0} />
      <Label x={CX} y={345} text="one apple · two apples · three apples" size={32} opacity={ramp(frame, canAt + 8, canAt + 22)} />
      <Card
        x={CX}
        y={500}
        w={860}
        size={56}
        text="💧  셀 수 없는 명사"
        color={COLORS.tealBright}
        bg={TEAL_BG}
        border={TEAL_BORDER}
        scale={pop(cantAt)}
        opacity={frame >= cantAt ? 1 : 0}
        glow={0.4}
      />
      <Label x={CX} y={575} text="one water ? · two waters ?" size={32} color="#FF9CA0" opacity={ramp(frame, cantAt + 8, cantAt + 22)} />
    </div>
  );
};

// Phase 3 - the two noun families.
const TitleCards: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i3']);
  const fade = useFade(sp.duration);
  const midAt = wf('i3', 'i3', '영어의');
  const aAt = wf('i3', 'i3', '가산명사와');
  const bAt = wf('i3', 'i3', '불가산명사입니다');
  const a = spring({frame: frame - aAt, fps, config: {damping: 12, stiffness: 110}});
  const b = spring({frame: frame - bAt, fps, config: {damping: 12, stiffness: 110}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={100} text="영어의 기초 · 명사의 두 종류" size={38} opacity={ramp(frame, midAt, midAt + 14)} />
      <div style={{position: 'absolute', left: 190, top: 200, width: 700, height: 300, transform: `translateX(${(1 - a) * -500}px) scale(${0.8 + 0.2 * a})`, opacity: Math.min(1, a * 2), borderRadius: 44, background: 'rgba(255,246,229,0.14)', border: '3px solid rgba(235,217,180,0.7)', fontFamily: FONT, textAlign: 'center', color: COLORS.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
        <div style={{fontSize: 108, fontWeight: 900}}>가산명사</div>
        <div style={{fontSize: 42, color: COLORS.sand}}>Countable Noun</div>
      </div>
      <div style={{position: 'absolute', left: 190, top: 560, width: 700, height: 300, transform: `translateX(${(1 - b) * 500}px) scale(${0.8 + 0.2 * b})`, opacity: Math.min(1, b * 2), borderRadius: 44, background: 'rgba(46,196,182,0.2)', border: TEAL_BORDER, boxShadow: `0 0 ${40 * b}px ${COLORS.teal}88`, fontFamily: FONT, textAlign: 'center', color: COLORS.tealBright, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
        <div style={{fontSize: 96, fontWeight: 900}}>불가산명사</div>
        <div style={{fontSize: 42, color: COLORS.cream}}>Uncountable Noun</div>
      </div>
    </div>
  );
};

// Phase 4 - countable: you can hold them one by one.
const Countable: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i4']);
  const fade = useFade(sp.duration);
  const labelAt = wf('i4', 'i4', '가산명사는');
  const times = [wf('i4', 'i4', '하나씩'), wf('i4', 'i4', '‘하나,'), wf('i4', 'i4', '둘’')];
  const checkAt = wf('i4', 'i4', '있는');
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={100} text="가산명사 = 하나씩 셀 수 있다" size={44} color={COLORS.cream} opacity={ramp(frame, labelAt, labelAt + 14)} />
      {times.map((t, i) => {
        const s = spring({frame: frame - t, fps, config: {damping: 9, stiffness: 150}});
        if (frame < t) return null;
        const x = 210 + i * 330;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x - 100, top: 260 - (1 - s) * 140, width: 200, textAlign: 'center', fontSize: 150, lineHeight: 1, transform: `scale(${0.4 + 0.6 * s})`, opacity: Math.min(1, s * 2), filter: 'drop-shadow(0 8px 14px rgba(10,8,30,0.4))'}}>🍎</div>
            <div style={{position: 'absolute', left: x - 50, top: 450, width: 100, height: 100, borderRadius: '50%', background: COLORS.sand, color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s})`}}>{i + 1}</div>
          </React.Fragment>
        );
      })}
      <Label x={CX} y={590} text="✓ 셀 수 있다 → a, two, -s 가능" size={40} color={COLORS.yellow} opacity={ramp(frame, checkAt, checkAt + 12)} />
    </div>
  );
};

// Phase 5 - uncountable: three reasons you cannot count it.
const Uncountable: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i5']);
  const fade = useFade(sp.duration);
  const labelAt = wf('i5', 'i5', '불가산명사는');
  const finalAt = wf('i5', 'i5', '개수를');
  const reasons: {at: number; text: string}[] = [
    {at: wf('i5', 'i5', '쪼개도'), text: '💧  쪼개도 형태가 그대로'},
    {at: wf('i5', 'i5', '눈에'), text: '🌬️  눈에 보이지 않는다'},
    {at: wf('i5', 'i5', '가변적이어서'), text: '☁️  형태가 계속 변한다'},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={90} text="불가산명사 = 셀 수 없다" size={44} color={COLORS.tealBright} opacity={ramp(frame, labelAt, labelAt + 14)} />
      {reasons.map((r, i) => {
        const s = spring({frame: frame - r.at, fps, config: {damping: 11, stiffness: 140}});
        return (
          <Card key={i} x={CX} y={230 + i * 125} w={900} size={44} text={r.text} color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} scale={s} opacity={frame >= r.at ? 1 : 0} />
        );
      })}
      <Label x={CX} y={600} text="1 · 2 · 3 ✕  개수를 직접 셀 수 없다" size={40} color="#FF9CA0" opacity={ramp(frame, finalAt, finalAt + 12)} />
    </div>
  );
};

const blobPath = (f: number, cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let k = 0; k <= 72; k += 1) {
    const th = (k / 72) * Math.PI * 2;
    const rr = r + 24 * Math.sin(3 * th + f / 8) + 14 * Math.sin(5 * th - f / 6) + 8 * Math.sin(2 * th + f / 11);
    pts.push(`${k === 0 ? 'M' : 'L'} ${(cx + Math.cos(th) * rr).toFixed(1)} ${(cy + Math.sin(th) * rr).toFixed(1)}`);
  }
  return pts.join(' ') + ' Z';
};

// Phase 6 - no form of its own: a shapeless blob.
const NoForm: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i6']);
  const fade = useFade(sp.duration);
  const labelAt = wf('i6', 'i6', '스스로');
  const nameAt = wf('i6', 'i6', '불가산명사입니다');
  const grow = ramp(frame, 4, 24);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={90} text="스스로 형태가 없다" size={46} color={COLORS.cream} opacity={ramp(frame, labelAt, labelAt + 14)} />
      <svg width={WIDTH} height={700} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <radialGradient id="blob" cx="45%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#B9FFF6" />
            <stop offset="60%" stopColor={COLORS.teal} />
            <stop offset="100%" stopColor={COLORS.tealDeep} />
          </radialGradient>
        </defs>
        <path d={blobPath(frame, CX, 350, 150 * grow)} fill="url(#blob)" opacity={0.92} />
      </svg>
      <Label x={CX} y={560} text="불가산명사" size={72} color={COLORS.tealBright} opacity={ramp(frame, nameAt, nameAt + 12)} />
    </div>
  );
};

interface NounDef {
  en: string;
  kr: string;
  emoji: string;
  cue: 'i7a' | 'i7b';
}

const NOUNS: NounDef[] = [
  {en: 'water', kr: '물', emoji: '💧', cue: 'i7a'},
  {en: 'air', kr: '공기', emoji: '🌬️', cue: 'i7a'},
  {en: 'money', kr: '돈', emoji: '💰', cue: 'i7a'},
  {en: 'love', kr: '사랑', emoji: '💗', cue: 'i7a'},
  {en: 'information', kr: '정보', emoji: '📰', cue: 'i7a'},
  {en: 'advice', kr: '조언', emoji: '💬', cue: 'i7b'},
  {en: 'time', kr: '시간', emoji: '⏰', cue: 'i7b'},
  {en: 'salt', kr: '소금', emoji: '🧂', cue: 'i7b'},
  {en: 'happiness', kr: '행복', emoji: '😊', cue: 'i7b'},
  {en: 'hair', kr: '머리카락', emoji: '💇', cue: 'i7b'},
];

// Phase 7 - the ten examples, each revealed as it is spoken.
const NounCloud: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i7a', 'i7b']);
  const fade = useFade(sp.duration);
  const base = cueById('i7a').start;
  const reveal = (i: number) => wordFrameOf(NOUNS[i].cue, NOUNS[i].en) - base;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={24} text="불가산명사 · Uncountable nouns" color={COLORS.tealBright} size={36} opacity={ramp(frame, 0, 14)} />
      {NOUNS.map((n, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = CX + (col - 0.5) * 505;
        const cy = 120 + row * 112;
        const r = reveal(i);
        const s = spring({frame: frame - r, fps, config: {damping: 10, stiffness: 150}});
        const active = frame >= r && frame < (i < NOUNS.length - 1 ? reveal(i + 1) : r + 44);
        const f = Math.max(0, frame - r);
        return (
          <div
            key={n.en}
            style={{
              position: 'absolute',
              left: cx - 242,
              top: cy - 48,
              width: 484,
              height: 96,
              boxSizing: 'border-box',
              borderRadius: 30,
              background: active ? 'rgba(46,196,182,0.34)' : 'rgba(46,196,182,0.14)',
              border: `3px solid ${active ? COLORS.tealBright : 'rgba(46,196,182,0.5)'}`,
              boxShadow: active ? `0 0 40px ${COLORS.teal}aa` : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '0 20px',
              fontFamily: FONT,
              opacity: Math.min(1, s * 2),
              transform: `scale(${(0.5 + 0.5 * s) * (active ? 1.05 : 1)}) translateY(${(1 - s) * 50}px)`,
            }}
          >
            <div style={{width: 64, fontSize: 56, lineHeight: 1, textAlign: 'center', transform: `translateY(${Math.sin(f / 9) * 5}px) scale(${1 + 0.06 * Math.sin(f / 7)})`}}>{n.emoji}</div>
            <div style={{display: 'flex', flexDirection: 'column', minWidth: 0}}>
              <div style={{fontSize: n.en.length > 9 ? 36 : 44, fontWeight: 900, color: COLORS.tealBright, lineHeight: 1.1}}>{n.en}</div>
              <div style={{fontSize: 24, fontWeight: 600, color: COLORS.sand, whiteSpace: 'nowrap'}}>{n.kr}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['i1a', 'i1b'], node: <KoreanCounting scene={scene} />},
    {ids: ['i2'], node: <TwoKinds scene={scene} />},
    {ids: ['i3'], node: <TitleCards scene={scene} />},
    {ids: ['i4'], node: <Countable scene={scene} />},
    {ids: ['i5'], node: <Uncountable scene={scene} />},
    {ids: ['i6'], node: <NoForm scene={scene} />},
    {ids: ['i7a', 'i7b'], node: <NounCloud scene={scene} />},
  ];
  return (
    <>
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
