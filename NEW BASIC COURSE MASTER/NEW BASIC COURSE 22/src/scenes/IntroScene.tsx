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

// Phase 1 - Korean: a verb + ~하는 / ~된 decorates the noun that follows.
const KoreanDecorates: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i1a', 'i1b']);
  const fade = useFade(sp.duration);
  const labelAt = wf('i1a', 'i1a', '동사에');
  const hAt = wf('i1a', 'i1a', '~하는');
  const dAt = wf('i1a', 'i1a', '~된');
  const sleepAt = wf('i1a', 'i1b', '잠자는');
  const babyAt = wf('i1a', 'i1b', '아기');
  const brokenAt = wf('i1a', 'i1b', '부서진');
  const windowAt = wf('i1a', 'i1b', '창문');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const show = (at: number) => (frame >= at ? 1 : 0);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={80} text="우리말 · 동사가 명사를 꾸며요" size={44} color={COLORS.cream} opacity={ramp(frame, labelAt, labelAt + 14)} />
      <Card x={CX} y={220} w={760} size={52} text="동사 + ‘~하는’" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} scale={pop(hAt)} opacity={show(hAt)} />
      <Card x={CX} y={340} w={760} size={52} text="동사 + ‘~된’" color={COLORS.yellow} bg={ORANGE_BG} border={ORANGE_BORDER} scale={pop(dAt)} opacity={show(dAt)} />
      <Card x={300} y={500} w={400} size={56} text="잠자는" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} scale={pop(sleepAt)} opacity={show(sleepAt)} />
      <Card x={760} y={500} w={340} size={56} text="👶 아기" scale={pop(babyAt)} opacity={show(babyAt)} />
      <Card x={300} y={630} w={400} size={56} text="부서진" color={COLORS.yellow} bg={ORANGE_BG} border={ORANGE_BORDER} scale={pop(brokenAt)} opacity={show(brokenAt)} />
      <Card x={760} y={630} w={340} size={56} text="🪟 창문" scale={pop(windowAt)} opacity={show(windowAt)} />
    </div>
  );
};

// Phase 2 - English can turn a verb into an adjective.
const VerbToAdjective: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i2']);
  const fade = useFade(sp.duration);
  const verbAt = wf('i2', 'i2', '동사를');
  const adjAt = wf('i2', 'i2', '형용사처럼');
  const turnAt = wf('i2', 'i2', '바꿔서');
  const nounAt = wf('i2', 'i2', '명사를');
  const deviceAt = wf('i2', 'i2', '장치가');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const show = (at: number) => (frame >= at ? 1 : 0);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={70} text="영어도 동사를 변신시켜요" size={44} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      <Card x={CX} y={190} w={760} size={56} text="동사 · sleep 💤" scale={pop(verbAt)} opacity={show(verbAt)} />
      <Label x={CX} y={285} text="⬇ 형용사처럼 변신!" size={44} color={COLORS.yellow} opacity={ramp(frame, turnAt, turnAt + 12)} />
      <Card x={CX} y={420} w={760} size={56} text="형용사 · sleeping" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} glow={0.5} scale={pop(adjAt)} opacity={show(adjAt)} />
      <Card x={CX} y={570} w={820} size={60} text="a sleeping 👶 baby" scale={pop(nounAt)} opacity={show(nounAt)} />
      <Label x={CX} y={650} text="✨ 명사를 꾸며주는 특별한 장치!" size={36} color={COLORS.yellow} opacity={ramp(frame, deviceAt, deviceAt + 14)} />
    </div>
  );
};

// Phase 3 - the two participles.
const TitleCards: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i3']);
  const fade = useFade(sp.duration);
  const midAt = wf('i3', 'i3', '영어의');
  const aAt = wf('i3', 'i3', '현재분사');
  const bAt = wf('i3', 'i3', '과거분사');
  const a = spring({frame: frame - aAt, fps, config: {damping: 12, stiffness: 110}});
  const b = spring({frame: frame - bAt, fps, config: {damping: 12, stiffness: 110}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={100} text="영어의 기초 · 분사의 두 종류" size={38} opacity={ramp(frame, midAt, midAt + 14)} />
      <div style={{position: 'absolute', left: 190, top: 200, width: 700, height: 300, transform: `translateX(${(1 - a) * -500}px) scale(${0.8 + 0.2 * a})`, opacity: Math.min(1, a * 2), borderRadius: 44, background: TEAL_BG, border: TEAL_BORDER, boxShadow: `0 0 ${40 * a}px ${COLORS.teal}88`, fontFamily: FONT, textAlign: 'center', color: COLORS.tealBright, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
        <div style={{fontSize: 100, fontWeight: 900}}>현재분사</div>
        <div style={{fontSize: 40, color: COLORS.cream}}>Present Participle · -ing</div>
      </div>
      <div style={{position: 'absolute', left: 190, top: 560, width: 700, height: 300, transform: `translateX(${(1 - b) * 500}px) scale(${0.8 + 0.2 * b})`, opacity: Math.min(1, b * 2), borderRadius: 44, background: ORANGE_BG, border: ORANGE_BORDER, boxShadow: `0 0 ${40 * b}px ${COLORS.orange}88`, fontFamily: FONT, textAlign: 'center', color: COLORS.yellow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
        <div style={{fontSize: 100, fontWeight: 900}}>과거분사</div>
        <div style={{fontSize: 40, color: COLORS.cream}}>Past Participle · -p.p.</div>
      </div>
    </div>
  );
};

// Phase 4 - a participle branches off the verb root.
const VerbRoot: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i4']);
  const fade = useFade(sp.duration);
  const rootAt = wf('i4', 'i4', '뿌리에서');
  const branchAt = wf('i4', 'i4', '갈라져');
  const nounAt = wf('i4', 'i4', '명사를');
  const nameAt = wf('i4', 'i4', '분사입니다');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const show = (at: number) => (frame >= at ? 1 : 0);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Card x={CX} y={130} w={760} size={56} text="🌱 동사 = 뿌리" scale={pop(rootAt)} opacity={show(rootAt)} />
      <Label x={CX} y={225} text="↙            ↘" size={80} color={COLORS.yellow} opacity={ramp(frame, branchAt, branchAt + 10)} />
      <Card x={290} y={410} w={400} size={64} text="-ing" color={COLORS.tealBright} bg={TEAL_BG} border={TEAL_BORDER} glow={0.4} scale={pop(branchAt + 4)} opacity={show(branchAt)} />
      <Card x={790} y={410} w={400} size={64} text="-ed" color={COLORS.yellow} bg={ORANGE_BG} border={ORANGE_BORDER} glow={0.4} scale={pop(branchAt + 10)} opacity={show(branchAt)} />
      <Label x={CX} y={520} text="→ 명사를 꾸며준다" size={44} color={COLORS.cream} opacity={ramp(frame, nounAt, nounAt + 12)} />
      <Label x={CX} y={595} text="분사  分詞" size={84} color={COLORS.yellow} opacity={ramp(frame, nameAt, nameAt + 12)} />
    </div>
  );
};

// Phase 5 - present participle: doing it yourself, in progress.
const PresentMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i5']);
  const fade = useFade(sp.duration);
  const titleAt = wf('i5', 'i5', '현재분사');
  const startAt = wf('i5', 'i5', '스스로');
  const activeAt = wf('i5', 'i5', '능동과');
  const progAt = wf('i5', 'i5', '진행의');
  const p = easeInOutCubic((frame - startAt) / (cueById('i5').audioFrames - startAt - 6));
  const x = 200 + 680 * p;
  const moving = p > 0 && p < 1;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={90} text="현재분사 -ing = 스스로 · 진행 중" size={44} color={COLORS.tealBright} opacity={ramp(frame, titleAt, titleAt + 14)} />
      <Actor who="she" x={x} walking={moving} opacity={ramp(frame, 0, 10)} />
      <Label x={CX} y={230} text="능동 · Active" size={52} color={COLORS.tealBright} opacity={ramp(frame, activeAt, activeAt + 12)} />
      <Label x={CX} y={320} text="진행 · ing →→" size={52} color={COLORS.cream} opacity={ramp(frame, progAt, progAt + 12)} />
    </div>
  );
};

// Phase 7 - past participle: received from someone else, already done.
const PastMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i7']);
  const fade = useFade(sp.duration);
  const titleAt = wf('i7', 'i7', '과거분사');
  const takenAt = wf('i7', 'i7', '당하거나');
  const doneAt = wf('i7', 'i7', '완료된');
  const labelAt = wf('i7', 'i7', '수동과');
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  const show = (at: number) => (frame >= at ? 1 : 0);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={90} text="과거분사 -ed = 당한다 · 끝났다" size={44} color={COLORS.yellow} opacity={ramp(frame, titleAt, titleAt + 14)} />
      <Card x={CX} y={260} w={860} size={56} text="🔨 남에 의해 당한다" color={COLORS.yellow} bg={ORANGE_BG} border={ORANGE_BORDER} scale={pop(takenAt)} opacity={show(takenAt)} />
      <Card x={CX} y={420} w={860} size={56} text="✅ 이미 완료됐다" color={COLORS.yellow} bg={ORANGE_BG} border={ORANGE_BORDER} scale={pop(doneAt)} opacity={show(doneAt)} />
      <Label x={CX} y={540} text="수동 · 완료  (Passive · Done)" size={46} color={COLORS.cream} opacity={ramp(frame, labelAt, labelAt + 12)} />
    </div>
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const grid = (ids: string[], node: (duration: number) => React.ReactNode) => ({ids, node: node(span(scene, ids).duration)});
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['i1a', 'i1b'], node: <KoreanDecorates scene={scene} />},
    {ids: ['i2'], node: <VerbToAdjective scene={scene} />},
    {ids: ['i3'], node: <TitleCards scene={scene} />},
    {ids: ['i4'], node: <VerbRoot scene={scene} />},
    {ids: ['i5'], node: <PresentMeaning scene={scene} />},
    grid(['i6'], (d) => (
      <WordGrid
        base="i6"
        tone="teal"
        title="현재분사 · -ing 형용사"
        duration={d}
        items={[
          {en: 'sleeping', kr: '자고 있는', emoji: '😴', cue: 'i6', needle: 'sleeping'},
          {en: 'flying', kr: '날아가고 있는', emoji: '🕊️', cue: 'i6', needle: 'flying'},
          {en: 'interesting', kr: '흥미를 주는', emoji: '🤩', cue: 'i6', needle: 'interesting'},
          {en: 'surprising', kr: '놀라게 하는', emoji: '🎁', cue: 'i6', needle: 'surprising'},
        ]}
      />
    )),
    {ids: ['i7'], node: <PastMeaning scene={scene} />},
    grid(['i8'], (d) => (
      <WordGrid
        base="i8"
        tone="orange"
        title="과거분사 · -ed 형용사"
        duration={d}
        items={[
          {en: 'broken', kr: '부서진', emoji: '🪟', cue: 'i8', needle: 'broken'},
          {en: 'touched', kr: '감동받은', emoji: '🥹', cue: 'i8', needle: 'touched'},
          {en: 'surprised', kr: '놀란', emoji: '😲', cue: 'i8', needle: 'surprised'},
          {en: 'tired', kr: '힘들어진', emoji: '😩', cue: 'i8', needle: 'tired'},
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
