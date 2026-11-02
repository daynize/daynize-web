import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Actor} from '../components/Actor';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan} from '../timeline';
import {Card, Label, span, useFade, WordGrid, wf} from './shared';

const CX = WIDTH / 2;
const TEAL_BG = 'rgba(46,196,182,0.22)';
const TEAL_BORDER = `3px solid ${COLORS.teal}`;
const ORANGE_BG = 'rgba(255,154,31,0.2)';
const ORANGE_BORDER = `3px solid ${COLORS.orange}`;

// Phase 1 - Korean: verb + ~하기 / ~하는 것 turns it into a noun.
const KoreanNominalize: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i1a', 'i1b']);
  const fade = useFade(sp.duration);
  const labelAt = wf('i1a', 'i1a', '동사에');
  const gAt = wf('i1a', 'i1a', '~하는');
  const kAt = wf('i1a', 'i1a', '~하기');
  const studyAt = wf('i1a', 'i1b', '공부하기');
  const tripAt = wf('i1a', 'i1b', '여행하는');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const show = (at: number) => (frame >= at ? 1 : 0);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={80} text="우리말 · 동사를 명사처럼!" size={44} color={COLORS.cream} opacity={ramp(frame, labelAt, labelAt + 14)} />
      <Card x={CX} y={220} w={760} size={52} text="동사 + ‘~하는 것’" color={COLORS.yellow} bg={ORANGE_BG} border={ORANGE_BORDER} scale={pop(gAt)} opacity={show(gAt)} />
      <Card x={CX} y={340} w={760} size={52} text="동사 + ‘~하기’" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} scale={pop(kAt)} opacity={show(kAt)} />
      <Card x={CX} y={500} w={760} size={60} text="📚 공부하기" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} scale={pop(studyAt)} opacity={show(studyAt)} />
      <Card x={CX} y={640} w={760} size={60} text="✈️ 여행하는 것" color={COLORS.yellow} bg={ORANGE_BG} border={ORANGE_BORDER} scale={pop(tripAt)} opacity={show(tripAt)} />
    </div>
  );
};

// Phase 2 - English: two transformation devices turn a verb into a noun.
const VerbToNoun: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i2']);
  const fade = useFade(sp.duration);
  const verbAt = wf('i2', 'i2', '동사를');
  const nounAt = wf('i2', 'i2', '명사처럼');
  const turnAt = wf('i2', 'i2', '바꿔쓰는');
  const twoAt = wf('i2', 'i2', '두');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const show = (at: number) => (frame >= at ? 1 : 0);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={70} text="영어도 동사를 명사로 변신시켜요" size={42} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      <Card x={CX} y={190} w={760} size={56} text="동사 · study 📖" scale={pop(verbAt)} opacity={show(verbAt)} />
      <Label x={CX} y={290} text="⬇ 명사처럼 변신!" size={44} color={COLORS.yellow} opacity={ramp(frame, turnAt, turnAt + 12)} />
      <Card x={CX} y={430} w={760} size={56} text="명사 · a thing 📦" glow={0.4} scale={pop(nounAt)} opacity={show(nounAt)} />
      <Card x={290} y={590} w={440} size={56} text="studying" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} scale={pop(twoAt)} opacity={show(twoAt)} />
      <Card x={790} y={590} w={440} size={56} text="to study" color={COLORS.yellow} bg={ORANGE_BG} border={ORANGE_BORDER} scale={pop(twoAt + 10)} opacity={show(twoAt)} />
    </div>
  );
};

// Phase 3 - the two devices.
const TitleCards: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i3']);
  const fade = useFade(sp.duration);
  const midAt = wf('i3', 'i3', '영어의');
  const aAt = wf('i3', 'i3', '동명사');
  const bAt = wf('i3', 'i3', 'to부정사');
  const a = spring({frame: frame - aAt, fps, config: {damping: 12, stiffness: 110}});
  const b = spring({frame: frame - bAt, fps, config: {damping: 12, stiffness: 110}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={100} text="영어의 기초 · 명사 변신 장치 2가지" size={38} opacity={ramp(frame, midAt, midAt + 14)} />
      <div style={{position: 'absolute', left: 190, top: 200, width: 700, height: 300, transform: `translateX(${(1 - a) * -500}px) scale(${0.8 + 0.2 * a})`, opacity: Math.min(1, a * 2), borderRadius: 44, background: TEAL_BG, border: TEAL_BORDER, boxShadow: `0 0 ${40 * a}px ${COLORS.teal}88`, fontFamily: FONT, textAlign: 'center', color: COLORS.tealBright, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
        <div style={{fontSize: 108, fontWeight: 900}}>동명사</div>
        <div style={{fontSize: 40, color: COLORS.cream}}>Gerund · -ing</div>
      </div>
      <div style={{position: 'absolute', left: 190, top: 560, width: 700, height: 300, transform: `translateX(${(1 - b) * 500}px) scale(${0.8 + 0.2 * b})`, opacity: Math.min(1, b * 2), borderRadius: 44, background: ORANGE_BG, border: ORANGE_BORDER, boxShadow: `0 0 ${40 * b}px ${COLORS.orange}88`, fontFamily: FONT, textAlign: 'center', color: COLORS.yellow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
        <div style={{fontSize: 96, fontWeight: 900}}>to부정사</div>
        <div style={{fontSize: 40, color: COLORS.cream}}>Infinitive · to-V</div>
      </div>
    </div>
  );
};

// Phase 4 - the verb takes off its coat and sits in the noun's seat.
const NounSeat: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i4']);
  const fade = useFade(sp.duration);
  const coatAt = wf('i4', 'i4', '옷을');
  const seatAt = wf('i4', 'i4', '자리로');
  const nameAt = wf('i4', 'i4', '부정사입니다');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const show = (at: number) => (frame >= at ? 1 : 0);
  const slide = easeInOutCubic((frame - seatAt) / 40);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Card x={290} y={200} w={440} size={52} text="🧥 동사의 옷" scale={pop(coatAt)} opacity={show(coatAt) * (1 - 0.7 * ramp(frame, coatAt + 6, coatAt + 22))} />
      <Label x={290} y={300} text="⬇ 벗는다" size={40} color={COLORS.yellow} opacity={ramp(frame, coatAt + 8, coatAt + 22)} />
      <Card x={790} y={200} w={440} size={52} text="🪑 명사의 자리" color={COLORS.cream} scale={pop(seatAt)} opacity={show(seatAt)} />
      <div style={{position: 'absolute', left: 290 + 500 * slide - 150, top: 440, width: 300, height: 130, boxSizing: 'border-box', borderRadius: 30, background: TEAL_BG, border: TEAL_BORDER, color: COLORS.tealBright, fontFamily: FONT, fontWeight: 900, fontSize: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: show(seatAt), transform: `scale(${0.8 + 0.2 * pop(seatAt)})`}}>
        🏃 study
      </div>
      <Label x={CX} y={620} text="동명사 · 부정사" size={64} color={COLORS.yellow} opacity={ramp(frame, nameAt, nameAt + 12)} />
    </div>
  );
};

// Phase 5 - gerund: something already lived, a vivid memory.
const GerundMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i5']);
  const fade = useFade(sp.duration);
  const titleAt = wf('i5', 'i5', '동명사');
  const doneAt = wf('i5', 'i5', '이미');
  const vividAt = wf('i5', 'i5', '생생하게');
  const pastAt = wf('i5', 'i5', '과거와');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const show = (at: number) => (frame >= at ? 1 : 0);
  const rewind = Math.sin(frame / 6) * 14;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={90} text="동명사 -ing = 지나온 경험" size={44} color={COLORS.tealBright} opacity={ramp(frame, titleAt, titleAt + 14)} />
      <Card x={CX} y={250} w={860} size={54} text="⏪ 이미 일어난 일" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} scale={pop(doneAt)} opacity={show(doneAt)} />
      <Card x={CX} y={410} w={860} size={54} text="📸 생생하게 경험해 본 일" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} scale={pop(vividAt)} opacity={show(vividAt)} />
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 520, textAlign: 'center', fontFamily: FONT, fontSize: 56, fontWeight: 900, color: COLORS.cream, opacity: ramp(frame, pastAt, pastAt + 12), transform: `translateX(${-rewind}px)`}}>
        ◀◀  과거 · 현재의 느낌
      </div>
    </div>
  );
};

// Phase 7 - to-infinitive: an arrow pointing forward, a plan and a will.
const InfinitiveMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i7']);
  const fade = useFade(sp.duration);
  const titleAt = wf('i7', 'i7', 'to부정사');
  const arrowAt = wf('i7', 'i7', '화살표');
  const goAt = wf('i7', 'i7', '앞으로');
  const planAt = wf('i7', 'i7', '계획과');
  const p = easeInOutCubic((frame - goAt) / (cueById('i7').audioFrames - goAt - 6));
  const x = 200 + 680 * p;
  const moving = p > 0 && p < 1;
  const nudge = Math.sin(frame / 5) * 14;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={90} text="to부정사 to-V = 앞으로 나아갈 계획·의지" size={42} color={COLORS.yellow} opacity={ramp(frame, titleAt, titleAt + 14)} />
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 210, textAlign: 'center', fontFamily: FONT, fontSize: 150, fontWeight: 900, color: COLORS.orange, opacity: ramp(frame, arrowAt, arrowAt + 12), transform: `translateX(${nudge}px)`, textShadow: `0 0 40px ${COLORS.orange}`}}>
        to ➜
      </div>
      <Actor who="he" x={x} walking={moving} opacity={ramp(frame, goAt - 6, goAt + 6)} />
      <Label x={CX} y={440} text="미래 · 계획 · 의지" size={52} color={COLORS.cream} opacity={ramp(frame, planAt, planAt + 12)} />
    </div>
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const grid = (ids: string[], node: (duration: number) => React.ReactNode) => ({ids, node: node(span(scene, ids).duration)});
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['i1a', 'i1b'], node: <KoreanNominalize scene={scene} />},
    {ids: ['i2'], node: <VerbToNoun scene={scene} />},
    {ids: ['i3'], node: <TitleCards scene={scene} />},
    {ids: ['i4'], node: <NounSeat scene={scene} />},
    {ids: ['i5'], node: <GerundMeaning scene={scene} />},
    grid(['i6'], (d) => (
      <WordGrid
        base="i6"
        tone="teal"
        title="동명사 · -ing 명사"
        duration={d}
        items={[
          {en: 'enjoying', kr: '즐겼던 것', emoji: '🎧', cue: 'i6', needle: 'enjoying'},
          {en: 'finishing', kr: '끝낸 것', emoji: '🏁', cue: 'i6', needle: 'finishing'},
          {en: 'giving up', kr: '포기했던 것', emoji: '🏳️', cue: 'i6', needle: 'giving'},
          {en: 'avoiding', kr: '피했던 것', emoji: '🚧', cue: 'i6', needle: 'avoiding'},
        ]}
      />
    )),
    {ids: ['i7'], node: <InfinitiveMeaning scene={scene} />},
    grid(['i8'], (d) => (
      <WordGrid
        base="i8"
        tone="orange"
        title="to부정사 · to-V 명사"
        duration={d}
        items={[
          {en: 'to want', kr: '원하는 것', emoji: '🌟', cue: 'i8', needle: 'want'},
          {en: 'to hope', kr: '희망하는 것', emoji: '🌈', cue: 'i8', needle: 'hope'},
          {en: 'to promise', kr: '약속하는 것', emoji: '🤝', cue: 'i8', needle: 'promise'},
          {en: 'to decide', kr: '결정하는 것', emoji: '🧭', cue: 'i8', needle: 'decide'},
        ]}
      />
    )),
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
