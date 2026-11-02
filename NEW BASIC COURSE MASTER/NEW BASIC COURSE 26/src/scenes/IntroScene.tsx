import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {Card, ED, ING, Label, span, useFade, WordGrid, wf} from './shared';

const CX = WIDTH / 2;

const useSpring = (at: number, config = {damping: 11, stiffness: 140}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config});
};

// Phase 1 - Korean uses the very same word for both: "나 참 지루해" / "그 영화 진짜 지루해".
const SameKorean: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i1']);
  const fade = useFade(sp.duration);
  const aAt = wf('i1', 'i1', '“나');
  const bAt = wf('i1', 'i1', '“그');
  const sameAt = wf('i1', 'i1', '똑같이');
  const a = useSpring(aAt);
  const b = useSpring(bAt);
  const same = useSpring(sameAt, {damping: 8, stiffness: 130});
  const glow = ramp(frame, sameAt, sameAt + 14) * (0.7 + 0.3 * Math.sin(frame / 6));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={60} text="우리말 · 똑같은 한 단어" size={44} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      <Card x={CX} y={230} w={840} size={54} text="😴 나 참 지루해" scale={a} opacity={frame >= aAt ? 1 : 0} glow={glow * 0.4} />
      <Card x={CX} y={430} w={840} size={54} text="🎬 그 영화 진짜 지루해" scale={b} opacity={frame >= bAt ? 1 : 0} glow={glow * 0.4} />
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 560, textAlign: 'center', opacity: frame >= sameAt ? Math.min(1, same * 2) : 0, transform: `scale(${0.6 + 0.4 * same})`}}>
        <span style={{display: 'inline-block', padding: '12px 44px', borderRadius: 34, background: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 58, boxShadow: `0 0 ${30 + 40 * glow}px ${COLORS.orange}`}}>
          = 지루하다 (똑같은 말)
        </span>
      </div>
    </div>
  );
};

// Phase 2 - English: does the subject feel the emotion, or give it out to others?
const FeelOrEmit: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i2']);
  const fade = useFade(sp.duration);
  const subjAt = wf('i2', 'i2', '주체가');
  const feelAt = wf('i2', 'i2', '직접');
  const emitAt = wf('i2', 'i2', '밖으로');
  const shapeAt = wf('i2', 'i2', '모양을');
  const subj = useSpring(subjAt);
  const feel = useSpring(feelAt);
  const emit = useSpring(emitAt);
  const Panel: React.FC<{x: number; color: typeof ING | typeof ED; label: string; arrow: string; s: number; on: boolean}> = ({x, color, label, arrow, s, on}) => (
    <div style={{position: 'absolute', left: x - 235, top: 330, width: 470, height: 280, boxSizing: 'border-box', borderRadius: 40, background: `rgba(${color.rgb},0.16)`, border: `3px solid ${color.edge}`, boxShadow: on ? `0 0 44px ${color.edge}88` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: FONT, color: color.main, opacity: on ? Math.min(1, s * 2) : 0, transform: `scale(${0.6 + 0.4 * s})`}}>
      <div style={{fontSize: 110, lineHeight: 1}}>{arrow}</div>
      <div style={{fontSize: 40, fontWeight: 900}}>{label}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={60} text="감정의 주체 · 주어" size={44} color={COLORS.cream} opacity={ramp(frame, subjAt, subjAt + 14)} />
      <div style={{position: 'absolute', left: CX - 90, top: 120, width: 180, height: 180, boxSizing: 'border-box', borderRadius: '50%', background: 'rgba(255,246,229,0.14)', border: '4px solid rgba(255,246,229,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100, opacity: Math.min(1, subj * 2), transform: `scale(${0.5 + 0.5 * subj})`}}>💗</div>
      <Panel x={CX - 250} color={ED} label="직접 느낀다" arrow="📥" s={feel} on={frame >= feelAt} />
      <Panel x={CX + 250} color={ING} label="밖으로 내뿜는다" arrow="📡" s={emit} on={frame >= emitAt} />
      <Label x={CX} y={650} text="→ 단어의 모양이 달라진다" size={42} color={COLORS.yellow} opacity={ramp(frame, shapeAt, shapeAt + 14)} />
    </div>
  );
};

// Phase 3 - emotion adjectives: -ing and -ed.
const TitleCards: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i3']);
  const fade = useFade(sp.duration);
  const midAt = wf('i3', 'i3', '영어의');
  const ingAt = wf('i3', 'i3', '-ing');
  const edAt = wf('i3', 'i3', '-ed');
  const a = useSpring(ingAt, {damping: 11, stiffness: 120});
  const p = useSpring(edAt, {damping: 9, stiffness: 120});
  const box = (top: number, c: typeof ING | typeof ED, s: number, at: number, big: string, small: string, dir: number) => (
    <div style={{position: 'absolute', left: 140, top, width: 800, height: 230, boxSizing: 'border-box', borderRadius: 44, background: `rgba(${c.rgb},0.2)`, border: `3px solid ${c.edge}`, boxShadow: `0 0 ${40 * s}px ${c.edge}88`, color: c.main, fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: frame >= at ? Math.min(1, s * 2) : 0, transform: `translateX(${(1 - s) * dir * 400}px) scale(${0.8 + 0.2 * s})`}}>
      <div style={{fontSize: 110, fontWeight: 900, lineHeight: 1.05}}>{big}</div>
      <div style={{fontSize: 40, fontWeight: 700, color: COLORS.cream}}>{small}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={70} text="영어의 기초 · 감정형용사" size={42} opacity={ramp(frame, midAt, midAt + 14)} />
      {box(160, ING, a, ingAt, '-ing', '감정을 내뿜는 쪽', -1)}
      {box(440, ED, p, edAt, '-ed', '감정을 느끼는 쪽', 1)}
    </div>
  );
};

// Phase 4 - the arrow of emotion: out (-ing) or in (-ed).
const EmotionArrow: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i4']);
  const fade = useFade(sp.duration);
  const heartAt = wf('i4', 'i4', '마음을');
  const arrowAt = wf('i4', 'i4', '화살표');
  const nameAt = wf('i4', 'i4', '감정형용사입니다');
  const heart = useSpring(heartAt, {damping: 9, stiffness: 120});
  const arrow = easeInOutCubic((frame - arrowAt) / 22);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={60} text="사람의 마음을 흔드는 감정" size={42} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      <div style={{position: 'absolute', left: CX - 120, top: 220, width: 240, height: 240, boxSizing: 'border-box', borderRadius: '50%', background: 'rgba(255,107,107,0.2)', border: `5px solid ${COLORS.coral}`, boxShadow: `0 0 ${50 * heart}px ${COLORS.coral}99`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 130, opacity: frame >= heartAt ? Math.min(1, heart * 2) : 0, transform: `scale(${(0.5 + 0.5 * heart) * (1 + 0.05 * Math.sin(frame / 5))})`}}>💗</div>
      <div style={{position: 'absolute', left: CX + 140, top: 322, width: 300 * arrow, height: 36, borderRadius: 18, background: `linear-gradient(90deg, ${ING.edge}, ${ING.main})`, boxShadow: `0 0 30px ${ING.edge}`, opacity: arrow > 0 ? 1 : 0}} />
      <div style={{position: 'absolute', left: CX + 410 - 40, top: 280, fontSize: 110, lineHeight: 1, opacity: arrow, transform: `scale(${0.4 + 0.6 * arrow})`}}>➡️</div>
      <div style={{position: 'absolute', left: CX - 140 - 300 * arrow, top: 322, width: 300 * arrow, height: 36, borderRadius: 18, background: `linear-gradient(270deg, ${ED.edge}, ${ED.main})`, boxShadow: `0 0 30px ${ED.edge}`, opacity: arrow > 0 ? 1 : 0}} />
      <div style={{position: 'absolute', left: CX - 410 - 40 + 40, top: 280, fontSize: 110, lineHeight: 1, opacity: arrow, transform: `scale(${0.4 + 0.6 * arrow})`}}>⬅️</div>
      <Label x={CX - 250} y={500} text="-ed · 받는다" size={42} color={ED.main} opacity={ramp(frame, arrowAt + 12, arrowAt + 26)} />
      <Label x={CX + 250} y={500} text="-ing · 내뿜는다" size={42} color={ING.main} opacity={ramp(frame, arrowAt + 12, arrowAt + 26)} />
      <Label x={CX} y={620} text="감정의 화살표 = 감정형용사" size={46} color={COLORS.yellow} opacity={ramp(frame, nameAt, nameAt + 14)} />
    </div>
  );
};

// Phase 5 - -ing: the cause throws the feeling out to someone else.
const IngMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i5']);
  const fade = useFade(sp.duration);
  const srcAt = wf('i5', 'i5', '현재분사');
  const throwAt = wf('i5', 'i5', '내뿜어');
  const recvAt = wf('i5', 'i5', '남에게');
  const s = useSpring(srcAt);
  const r = useSpring(recvAt);
  const beam = easeInOutCubic((frame - throwAt) / 22);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={60} text="-ing · 감정을 밖으로 내뿜는다" size={44} color={ING.main} opacity={ramp(frame, 0, 14)} />
      <div style={{position: 'absolute', left: 110, top: 270, width: 260, height: 260, boxSizing: 'border-box', borderRadius: '50%', background: `rgba(${ING.rgb},0.22)`, border: `5px solid ${ING.edge}`, boxShadow: `0 0 ${50 * s}px ${ING.edge}99`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: ING.main, opacity: frame >= srcAt ? Math.min(1, s * 2) : 0, transform: `scale(${0.6 + 0.4 * s})`}}>
        <div style={{fontSize: 100, lineHeight: 1}}>🎬</div>
        <div style={{fontSize: 40, fontWeight: 900}}>원인</div>
      </div>
      <div style={{position: 'absolute', left: 390, top: 380, width: 300 * beam, height: 36, borderRadius: 18, background: `linear-gradient(90deg, ${ING.edge}, ${ING.main})`, boxShadow: `0 0 30px ${ING.edge}`, opacity: beam > 0 ? 1 : 0}} />
      <div style={{position: 'absolute', left: 700, top: 270, width: 260, height: 260, boxSizing: 'border-box', borderRadius: '50%', background: 'rgba(255,246,229,0.14)', border: '4px solid rgba(255,246,229,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: COLORS.cream, opacity: frame >= recvAt ? Math.min(1, r * 2) : 0, transform: `scale(${0.6 + 0.4 * r})`}}>
        <div style={{fontSize: 100, lineHeight: 1}}>🙂</div>
        <div style={{fontSize: 40, fontWeight: 900}}>남</div>
      </div>
      <Label x={CX} y={610} text="에너지를 가진 형용사 · 감정을 주는 쪽" size={40} color={COLORS.cream} opacity={ramp(frame, throwAt + 10, throwAt + 24)} />
    </div>
  );
};

// Phase 7 - -ed: the feeling lands on the person.
const EdMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i7']);
  const fade = useFade(sp.duration);
  const personAt = wf('i7', 'i7', '과거분사');
  const srcAt = wf('i7', 'i7', '외부의');
  const hitAt = wf('i7', 'i7', '받아서');
  const person = useSpring(personAt);
  const src = useSpring(srcAt);
  const hit = easeInOutCubic((frame - hitAt) / 22);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={60} text="-ed · 감정을 받아서 느낀다" size={44} color={ED.main} opacity={ramp(frame, 0, 14)} />
      <div style={{position: 'absolute', left: 110, top: 270, width: 260, height: 260, boxSizing: 'border-box', borderRadius: '50%', background: 'rgba(255,246,229,0.14)', border: '4px solid rgba(255,246,229,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: COLORS.cream, opacity: frame >= srcAt ? Math.min(1, src * 2) : 0, transform: `scale(${0.6 + 0.4 * src})`}}>
        <div style={{fontSize: 100, lineHeight: 1}}>⚡</div>
        <div style={{fontSize: 40, fontWeight: 900}}>외부 영향</div>
      </div>
      <div style={{position: 'absolute', left: 390, top: 380, width: 300 * hit, height: 36, borderRadius: 18, background: `linear-gradient(90deg, ${ED.main}, ${ED.edge})`, boxShadow: `0 0 30px ${ED.edge}`, opacity: hit > 0 ? 1 : 0}} />
      <div style={{position: 'absolute', left: 700, top: 270, width: 260, height: 260, boxSizing: 'border-box', borderRadius: '50%', background: `rgba(${ED.rgb},0.22)`, border: `5px solid ${ED.edge}`, boxShadow: `0 0 ${50 * person}px ${ED.edge}99`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: ED.main, opacity: frame >= personAt ? Math.min(1, person * 2) : 0, transform: `scale(${0.6 + 0.4 * person}) translateX(${Math.sin(Math.max(0, frame - hitAt) * 1.6) * 8 * (1 - hit)}px)`}}>
        <div style={{fontSize: 100, lineHeight: 1}}>😪</div>
        <div style={{fontSize: 40, fontWeight: 900}}>느끼는 사람</div>
      </div>
      <Label x={CX} y={610} text="← 그 감정을 직접 받는 쪽" size={42} color={COLORS.cream} opacity={ramp(frame, hitAt + 10, hitAt + 24)} />
    </div>
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const grid = (ids: string[], node: (duration: number) => React.ReactNode) => ({ids, node: node(span(scene, ids).duration)});
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['i1'], node: <SameKorean scene={scene} />},
    {ids: ['i2'], node: <FeelOrEmit scene={scene} />},
    {ids: ['i3'], node: <TitleCards scene={scene} />},
    {ids: ['i4'], node: <EmotionArrow scene={scene} />},
    {ids: ['i5'], node: <IngMeaning scene={scene} />},
    grid(['i6'], (d) => (
      <WordGrid
        base="i6"
        tone="teal"
        title="-ing · 감정을 주는 단어"
        duration={d}
        items={[
          {en: 'BORING', kr: '지루함을 주는', emoji: '🥱', cue: 'i6', needle: 'BORING'},
          {en: 'INTERESTING', kr: '흥미를 유발하는', emoji: '🧐', cue: 'i6', needle: 'INTERESTING'},
          {en: 'SURPRISING', kr: '놀라움을 선사하는', emoji: '🎁', cue: 'i6', needle: 'SURPRISING'},
          {en: 'EXCITING', kr: '신나게 만드는', emoji: '🎢', cue: 'i6', needle: 'EXCITING'},
        ]}
      />
    )),
    {ids: ['i7'], node: <EdMeaning scene={scene} />},
    grid(['i8'], (d) => (
      <WordGrid
        base="i8"
        tone="orange"
        title="-ed · 감정을 느끼는 단어"
        duration={d}
        items={[
          {en: 'BORED', kr: '지루함을 느낀', emoji: '😪', cue: 'i8', needle: 'BORED'},
          {en: 'INTERESTED', kr: '흥미를 느끼게 된', emoji: '🤔', cue: 'i8', needle: 'INTERESTED'},
          {en: 'SURPRISED', kr: '깜짝 놀란', emoji: '😲', cue: 'i8', needle: 'SURPRISED'},
          {en: 'EXCITED', kr: '신이 난', emoji: '🤩', cue: 'i8', needle: 'EXCITED'},
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
