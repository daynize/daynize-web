import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {ACTIVE, Card, Label, PASSIVE, span, useFade, WordGrid, wf} from './shared';

const CX = WIDTH / 2;

const useSpring = (at: number, config = {damping: 11, stiffness: 140}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config});
};

// Phase 1 - Korean can flip the viewpoint: "내가 문을 열었다" <-> "문이 열렸다".
const KoreanSwap: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i1']);
  const fade = useFade(sp.duration);
  const aAt = wf('i1', 'i1', '내가');
  const swapAt = wf('i1', 'i1', '바꿔');
  const bAt = wf('i1', 'i1', '“문이');
  const a = useSpring(aAt);
  const b = useSpring(bAt);
  const swap = useSpring(swapAt, {damping: 8, stiffness: 120});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={80} text="우리말 · 시점을 바꾸면" size={44} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      <Card x={CX} y={260} w={800} size={58} text="🙋 내가 문을 열었다" color={ACTIVE.main} bg={`rgba(${ACTIVE.rgb},0.18)`} border={`3px solid ${ACTIVE.edge}`} scale={a} opacity={frame >= aAt ? 1 : 0} glow={frame >= aAt && frame < swapAt ? 0.5 : 0} />
      <div style={{position: 'absolute', left: CX - 60, top: 360, width: 120, textAlign: 'center', fontSize: 84, lineHeight: 1, opacity: Math.min(1, swap * 2), transform: `rotate(${(1 - swap) * -180}deg) scale(${0.5 + 0.5 * swap})`}}>🔄</div>
      <Card x={CX} y={540} w={800} size={58} text="🚪 문이 열렸다" color={PASSIVE.main} bg={`rgba(${PASSIVE.rgb},0.2)`} border={`3px solid ${PASSIVE.edge}`} scale={b} opacity={frame >= bAt ? 1 : 0} glow={frame >= bAt ? 0.6 : 0} />
    </div>
  );
};

// Phase 2 - English too: does the subject act, or is it acted upon?
const ActOrReceive: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i2']);
  const fade = useFade(sp.duration);
  const subjAt = wf('i2', 'i2', '주인(주어)이');
  const actAt = wf('i2', 'i2', '직접');
  const recvAt = wf('i2', 'i2', '당하는가');
  const subj = useSpring(subjAt);
  const act = useSpring(actAt);
  const recv = useSpring(recvAt);
  const Panel: React.FC<{x: number; color: typeof ACTIVE | typeof PASSIVE; label: string; arrow: string; s: number; on: boolean}> = ({x, color, label, arrow, s, on}) => (
    <div style={{position: 'absolute', left: x - 235, top: 330, width: 470, height: 280, boxSizing: 'border-box', borderRadius: 40, background: `rgba(${color.rgb},0.16)`, border: `3px solid ${color.edge}`, boxShadow: on ? `0 0 44px ${color.edge}88` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: FONT, color: color.main, opacity: on ? Math.min(1, s * 2) : 0, transform: `scale(${0.6 + 0.4 * s})`}}>
      <div style={{fontSize: 110, lineHeight: 1}}>{arrow}</div>
      <div style={{fontSize: 40, fontWeight: 900}}>{label}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={60} text="문장의 주인 · 주어" size={44} color={COLORS.cream} opacity={ramp(frame, subjAt, subjAt + 14)} />
      <div style={{position: 'absolute', left: CX - 90, top: 120, width: 180, height: 180, boxSizing: 'border-box', borderRadius: '50%', background: 'rgba(255,246,229,0.14)', border: '4px solid rgba(255,246,229,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 90, fontWeight: 900, color: COLORS.cream, opacity: Math.min(1, subj * 2), transform: `scale(${0.5 + 0.5 * subj})`}}>S</div>
      <Panel x={CX - 250} color={ACTIVE} label="직접 행동한다" arrow="👉" s={act} on={frame >= actAt} />
      <Panel x={CX + 250} color={PASSIVE} label="행동을 당한다" arrow="💥" s={recv} on={frame >= recvAt} />
    </div>
  );
};

// Phase 3 - 능동태 and 수동태 (Be + p.p.).
const TitleCards: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i3']);
  const fade = useFade(sp.duration);
  const midAt = wf('i3', 'i3', '영어의');
  const aAt = wf('i3', 'i3', '능동태');
  const pAt = wf('i3', 'i3', '수동태');
  const a = useSpring(aAt, {damping: 11, stiffness: 120});
  const p = useSpring(pAt, {damping: 9, stiffness: 120});
  const box = (top: number, c: typeof ACTIVE | typeof PASSIVE, s: number, at: number, big: string, small: string, dir: number) => (
    <div style={{position: 'absolute', left: 140, top, width: 800, height: 230, boxSizing: 'border-box', borderRadius: 44, background: `rgba(${c.rgb},0.2)`, border: `3px solid ${c.edge}`, boxShadow: `0 0 ${40 * s}px ${c.edge}88`, color: c.main, fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: frame >= at ? Math.min(1, s * 2) : 0, transform: `translateX(${(1 - s) * dir * 400}px) scale(${0.8 + 0.2 * s})`}}>
      <div style={{fontSize: 100, fontWeight: 900, lineHeight: 1.05}}>{big}</div>
      <div style={{fontSize: 40, fontWeight: 700, color: COLORS.cream}}>{small}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={70} text="영어의 기초 · 두 가지 태" size={42} opacity={ramp(frame, midAt, midAt + 14)} />
      {box(160, ACTIVE, a, aAt, '능동태', '주어가 행동한다', -1)}
      {box(440, PASSIVE, p, pAt, '수동태', 'Be + p.p.', 1)}
    </div>
  );
};

// Phase 4 - the movie camera that swaps the point of view.
const CameraSwap: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i4']);
  const fade = useFade(sp.duration);
  const heroAt = wf('i4', 'i4', '주인공의');
  const flipAt = wf('i4', 'i4', '뒤바뀌는');
  const camAt = wf('i4', 'i4', '카메라');
  const hero = useSpring(heroAt);
  const flip = easeInOutCubic((frame - flipAt) / 24);
  const cam = useSpring(camAt, {damping: 9, stiffness: 120});
  const left = CX - 250;
  const right = CX + 250;
  const frameX = left + (right - left) * flip;
  const lit = (a: boolean) => (a ? 1 : 0.45);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={60} text="시점에 따라 뒤바뀌는 카메라" size={42} color={COLORS.cream} opacity={ramp(frame, heroAt, heroAt + 14)} />
      <Card x={left} y={330} w={400} size={46} text="🙋 내가 연다" color={ACTIVE.main} bg={`rgba(${ACTIVE.rgb},0.18)`} border={`3px solid ${ACTIVE.edge}`} scale={hero} opacity={frame >= heroAt ? lit(flip < 0.5) : 0} />
      <Card x={right} y={330} w={400} size={46} text="🚪 문이 열린다" color={PASSIVE.main} bg={`rgba(${PASSIVE.rgb},0.2)`} border={`3px solid ${PASSIVE.edge}`} scale={hero} opacity={frame >= heroAt ? lit(flip >= 0.5) : 0} />
      <div style={{position: 'absolute', left: frameX - 215, top: 215, width: 430, height: 230, boxSizing: 'border-box', borderRadius: 30, border: `6px solid ${COLORS.yellow}`, boxShadow: `0 0 36px ${COLORS.yellow}aa`, opacity: ramp(frame, heroAt + 6, heroAt + 20)}} />
      <div style={{position: 'absolute', left: frameX - 70, top: 470, width: 140, textAlign: 'center', fontSize: 130, lineHeight: 1, opacity: Math.min(1, cam * 2), transform: `rotate(${Math.sin(frame / 6) * 4 + (1 - cam) * 40}deg) scale(${0.5 + 0.5 * cam})`, filter: 'drop-shadow(0 10px 18px rgba(10,8,30,0.5))'}}>🎥</div>
      <Label x={CX} y={640} text="수동태 = 시선이 뒤바뀐다" size={42} color={COLORS.yellow} opacity={ramp(frame, camAt + 18, camAt + 32)} />
    </div>
  );
};

// Phase 5 - active: the subject throws the action out.
const ActiveMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i5']);
  const fade = useFade(sp.duration);
  const subjAt = wf('i5', 'i5', '주어가');
  const throwAt = wf('i5', 'i5', '내뿜는');
  const s = useSpring(subjAt);
  const beam = easeInOutCubic((frame - throwAt) / 22);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={60} text="능동태 · 행동을 내뿜는다" size={44} color={ACTIVE.main} opacity={ramp(frame, 0, 14)} />
      <div style={{position: 'absolute', left: 130, top: 270, width: 260, height: 260, boxSizing: 'border-box', borderRadius: '50%', background: `rgba(${ACTIVE.rgb},0.22)`, border: `5px solid ${ACTIVE.edge}`, boxShadow: `0 0 ${50 * s}px ${ACTIVE.edge}99`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: ACTIVE.main, opacity: frame >= subjAt ? Math.min(1, s * 2) : 0, transform: `scale(${0.6 + 0.4 * s})`}}>
        <div style={{fontSize: 100, lineHeight: 1}}>🙋</div>
        <div style={{fontSize: 40, fontWeight: 900}}>주어</div>
      </div>
      <div style={{position: 'absolute', left: 410, top: 380, width: 360 * beam, height: 36, borderRadius: 18, background: `linear-gradient(90deg, ${ACTIVE.edge}, ${ACTIVE.main})`, boxShadow: `0 0 30px ${ACTIVE.edge}`, opacity: beam > 0 ? 1 : 0}} />
      <div style={{position: 'absolute', left: 740, top: 335, fontSize: 120, lineHeight: 1, opacity: beam, transform: `scale(${0.4 + 0.6 * beam})`}}>➡️</div>
      <Label x={CX} y={610} text="S → 행동을 직접 한다" size={42} color={COLORS.cream} opacity={ramp(frame, throwAt + 10, throwAt + 24)} />
    </div>
  );
};

// Phase 7 - passive: the action lands on the subject.
const PassiveMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i7']);
  const fade = useFade(sp.duration);
  const formAt = wf('i7', 'i7', 'Be');
  const subjAt = wf('i7', 'i7', '주어가');
  const notAt = wf('i7', 'i7', '못하고');
  const recvAt = wf('i7', 'i7', '당하거나');
  const s = useSpring(subjAt);
  const form = useSpring(formAt, {damping: 8, stiffness: 150});
  const hit = easeInOutCubic((frame - recvAt) / 22);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: CX - 230, top: 36, width: 460, height: 100, boxSizing: 'border-box', borderRadius: 32, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${COLORS.orange}`, opacity: frame >= formAt ? Math.min(1, form * 2) : 0, transform: `scale(${0.5 + 0.5 * form})`}}>
        Be + p.p.
      </div>
      <div style={{position: 'absolute', left: 690, top: 270, width: 260, height: 260, boxSizing: 'border-box', borderRadius: '50%', background: `rgba(${PASSIVE.rgb},0.22)`, border: `5px solid ${PASSIVE.edge}`, boxShadow: `0 0 ${50 * s}px ${PASSIVE.edge}99`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: PASSIVE.main, opacity: frame >= subjAt ? Math.min(1, s * 2) : 0, transform: `scale(${0.6 + 0.4 * s}) translateX(${Math.sin(Math.max(0, frame - recvAt) * 1.6) * 8 * (1 - hit)}px)`}}>
        <div style={{fontSize: 100, lineHeight: 1}}>🚪</div>
        <div style={{fontSize: 40, fontWeight: 900}}>주어</div>
      </div>
      <div style={{position: 'absolute', left: 80, top: 345, fontSize: 130, lineHeight: 1, opacity: frame >= notAt ? 1 : 0, transform: `scale(${1 + 0.05 * Math.sin(frame / 5)})`}}>🙅</div>
      <div style={{position: 'absolute', left: 250 + 200 * (1 - hit), top: 372, width: 420 * hit, height: 36, borderRadius: 18, background: `linear-gradient(270deg, ${PASSIVE.edge}, ${PASSIVE.main})`, boxShadow: `0 0 30px ${PASSIVE.edge}`, opacity: hit > 0 ? 1 : 0}} />
      <Label x={CX} y={610} text="← 행동을 당한다 · 받는다" size={42} color={COLORS.cream} opacity={ramp(frame, recvAt + 10, recvAt + 24)} />
    </div>
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const grid = (ids: string[], node: (duration: number) => React.ReactNode) => ({ids, node: node(span(scene, ids).duration)});
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['i1'], node: <KoreanSwap scene={scene} />},
    {ids: ['i2'], node: <ActOrReceive scene={scene} />},
    {ids: ['i3'], node: <TitleCards scene={scene} />},
    {ids: ['i4'], node: <CameraSwap scene={scene} />},
    {ids: ['i5'], node: <ActiveMeaning scene={scene} />},
    grid(['i6'], (d) => (
      <WordGrid
        base="i6"
        tone="teal"
        title="능동태 · 내가 하는 행동"
        duration={d}
        items={[
          {en: 'LOVE', kr: '사랑하다', emoji: '💖', cue: 'i6', needle: 'LOVE'},
          {en: 'MAKE', kr: '만들다', emoji: '🛠️', cue: 'i6', needle: 'MAKE'},
          {en: 'WRITE', kr: '쓰다', emoji: '✍️', cue: 'i6', needle: 'WRITE'},
          {en: 'BUILD', kr: '짓다', emoji: '🏗️', cue: 'i6', needle: 'BUILD'},
        ]}
      />
    )),
    {ids: ['i7'], node: <PassiveMeaning scene={scene} />},
    grid(['i8'], (d) => (
      <WordGrid
        base="i8"
        tone="orange"
        title="수동태 · be + p.p. 당하는 행동"
        duration={d}
        items={[
          {en: 'BE LOVED', kr: '사랑받다', emoji: '🥰', cue: 'i8', needle: 'LOVED'},
          {en: 'BE MADE', kr: '만들어지다', emoji: '🧱', cue: 'i8', needle: 'MADE'},
          {en: 'BE WRITTEN', kr: '쓰여지다', emoji: '📜', cue: 'i8', needle: 'WRITTEN'},
          {en: 'BE BUILT', kr: '지어지다', emoji: '🏛️', cue: 'i8', needle: 'BUILT'},
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
