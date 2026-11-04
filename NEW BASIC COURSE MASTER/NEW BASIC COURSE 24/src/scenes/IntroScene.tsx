import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Actor} from '../components/Actor';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {Card, Label, PREP_STYLE, span, useFade, WordGrid, wf} from './shared';

const CX = WIDTH / 2;
const R = 190;
const CY = 360;

/** A 24-hour dial. `sweep` = how much of the 24 h is filled (0..1), `extra` = a second ring beyond 24 h. */
const Clock: React.FC<{
  sweep: number;
  color: string;
  label: string;
  sub?: string;
  extra?: number;
  dotOnly?: boolean;
  frame: number;
}> = ({sweep, color, label, sub, extra = 0, dotOnly = false, frame}) => {
  const C = 2 * Math.PI * R;
  const ticks = Array.from({length: 24}, (_, i) => i);
  const wedge = 0.045; // the "short" arc used for `at`
  const pulse = 0.5 + 0.5 * Math.sin(frame / 5);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width={WIDTH} height={720} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <circle cx={CX} cy={CY} r={R} fill="rgba(20,16,44,0.55)" stroke="rgba(235,217,180,0.35)" strokeWidth={6} />
        {ticks.map((i) => {
          const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
          const big = i % 6 === 0;
          return (
            <line
              key={i}
              x1={CX + Math.cos(a) * (R - (big ? 26 : 14))}
              y1={CY + Math.sin(a) * (R - (big ? 26 : 14))}
              x2={CX + Math.cos(a) * (R - 4)}
              y2={CY + Math.sin(a) * (R - 4)}
              stroke="rgba(235,217,180,0.6)"
              strokeWidth={big ? 5 : 2.5}
            />
          );
        })}
        {extra > 0 ? (
          <circle cx={CX} cy={CY} r={R + 52 * extra} fill="none" stroke={color} strokeWidth={14} opacity={0.35 + 0.35 * pulse} strokeDasharray="30 18" />
        ) : null}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={dotOnly ? 30 : 22}
          strokeLinecap="round"
          strokeDasharray={`${C * (dotOnly ? wedge * sweep : sweep)} ${C}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{filter: `drop-shadow(0 0 ${14 + 14 * pulse}px ${color})`}}
        />
      </svg>
      <div style={{position: 'absolute', left: CX - 140, top: CY - 70, width: 280, textAlign: 'center', fontFamily: FONT, color}}>
        <div style={{fontSize: 96, fontWeight: 900, lineHeight: 1, textShadow: `0 0 30px ${color}`}}>{label}</div>
        {sub ? <div style={{fontSize: 34, fontWeight: 700, color: COLORS.cream, marginTop: 10}}>{sub}</div> : null}
      </div>
    </div>
  );
};

// Phase 1 - Korean uses the very same ~에 for every time and place.
const KoreanSame: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i1a']);
  const fade = useFade(sp.duration);
  const times = [wf('i1a', 'i1a', '7시에'), wf('i1a', 'i1a', '월요일에'), wf('i1a', 'i1a', '여름에')];
  const sameAt = wf('i1a', 'i1a', '똑같이');
  const rows = [
    {emoji: '🕖', text: '7시 + 에'},
    {emoji: '📅', text: '월요일 + 에'},
    {emoji: '🌴', text: '여름 + 에'},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={80} text="우리말 · 전부 똑같이 ‘~에’" size={44} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      {rows.map((r, i) => {
        const s = spring({frame: frame - times[i], fps, config: {damping: 11, stiffness: 140}});
        return (
          <Card key={r.text} x={CX} y={230 + i * 140} w={760} size={56} text={`${r.emoji}  ${r.text}`} scale={s} opacity={frame >= times[i] ? 1 : 0} />
        );
      })}
      <Label x={CX} y={650} text="시간이든 장소든 ‘~에’ 하나!" size={46} color={COLORS.yellow} opacity={ramp(frame, sameAt, sameAt + 12)} />
    </div>
  );
};

// Phase 2 - English has a firm reference: the 24-hour dial.
const Reference24: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i2']);
  const fade = useFade(sp.duration);
  const clockAt = wf('i2', 'i2', '24시간이라는');
  const baseAt = wf('i2', 'i2', '기준점을');
  const finerAt = wf('i2', 'i2', '세밀하게');
  const sweep = easeInOutCubic((frame - clockAt) / 40);
  const pop = (at: number, k: number) => spring({frame: frame - at - k * 6, fps, config: {damping: 11, stiffness: 140}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="영어의 기준점 · 24시간" size={44} color={COLORS.cream} opacity={ramp(frame, clockAt, clockAt + 14)} />
      <Clock sweep={sweep} color={COLORS.yellow} label="24h" sub="기준점" frame={frame} />
      {frame >= baseAt ? <Label x={CX} y={590} text="전치사를 세밀하게 구분!" size={40} color={COLORS.cream} opacity={ramp(frame, finerAt, finerAt + 12)} /> : null}
      {(['at', 'on', 'in'] as const).map((k, i) => {
        const st = PREP_STYLE[k];
        const s = pop(finerAt, i);
        return (
          <div key={k} style={{position: 'absolute', left: CX - 330 + i * 230, top: 640, width: 200, height: 76, boxSizing: 'border-box', borderRadius: 24, background: `rgba(${st.rgb},0.22)`, border: `3px solid ${st.edge}`, color: st.main, fontFamily: FONT, fontWeight: 900, fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: frame >= finerAt ? Math.min(1, s * 2) : 0, transform: `scale(${0.5 + 0.5 * s})`}}>
            {k}
          </div>
        );
      })}
    </div>
  );
};

// Phase 3 - at / on / in.
const TitleCards: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i3']);
  const fade = useFade(sp.duration);
  const midAt = wf('i3', 'i3', '영어의');
  const times = [wf('i3', 'i3', 'at,'), wf('i3', 'i3', 'on,'), wf('i3', 'i3', 'in입니다')];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={80} text="영어의 기초 · 전치사 3총사" size={42} opacity={ramp(frame, midAt, midAt + 14)} />
      {(['at', 'on', 'in'] as const).map((k, i) => {
        const st = PREP_STYLE[k];
        const s = spring({frame: frame - times[i], fps, config: {damping: 11, stiffness: 120}});
        return (
          <div key={k} style={{position: 'absolute', left: 190, top: 180 + i * 175, width: 700, height: 150, boxSizing: 'border-box', borderRadius: 40, background: `rgba(${st.rgb},0.2)`, border: `3px solid ${st.edge}`, boxShadow: `0 0 ${40 * s}px ${st.edge}88`, color: st.main, fontFamily: FONT, fontWeight: 900, fontSize: 104, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: frame >= times[i] ? Math.min(1, s * 2) : 0, transform: `translateX(${(1 - s) * (i % 2 ? 400 : -400)}px) scale(${0.8 + 0.2 * s})`}}>
            {k}
          </div>
        );
      })}
    </div>
  );
};

// Phase 4 - the compass of time and place.
const Compass: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i4']);
  const fade = useFade(sp.duration);
  const baseAt = wf('i4', 'i4', '기준으로');
  const compassAt = wf('i4', 'i4', '나침반');
  const s = spring({frame: frame - compassAt, fps, config: {damping: 9, stiffness: 120}});
  const spin = (1 - s) * 360 + Math.sin(frame / 20) * 8;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={80} text="24시간 기준으로 나뉜다" size={44} color={COLORS.cream} opacity={ramp(frame, baseAt, baseAt + 14)} />
      <div style={{position: 'absolute', left: CX - 150, top: 220, width: 300, textAlign: 'center', fontSize: 240, lineHeight: 1, opacity: Math.min(1, s * 2), transform: `rotate(${spin}deg) scale(${0.5 + 0.5 * s})`, filter: 'drop-shadow(0 10px 20px rgba(10,8,30,0.5))'}}>🧭</div>
      <Label x={CX} y={560} text="시공간의 나침반 · 전치사" size={50} color={COLORS.yellow} opacity={ramp(frame, compassAt, compassAt + 14)} />
    </div>
  );
};

// Phase 5 - on: a full day, exactly 24 hours.
const OnMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i5']);
  const fade = useFade(sp.duration);
  const dayAt = wf('i5', 'i5', '하루');
  const fullAt = wf('i5', 'i5', '24시간은');
  const onAt = wf('i5', 'i5', 'on을');
  const sweep = easeInOutCubic((frame - fullAt) / 28);
  const st = PREP_STYLE.on;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="on = 딱 하루, 정확히 24시간" size={44} color={st.main} opacity={ramp(frame, dayAt, dayAt + 14)} />
      <Clock sweep={sweep} color={st.edge} label={frame >= onAt ? 'ON' : '24h'} sub={frame >= onAt ? '딱 24시간' : undefined} frame={frame} />
    </div>
  );
};

// Phase 7 - at: a tiny arc, shorter than 24 hours.
const AtMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i7']);
  const fade = useFade(sp.duration);
  const shortAt = wf('i7', 'i7', '1초라도');
  const atAt = wf('i7', 'i7', 'at을');
  const pointAt = wf('i7', 'i7', '집어내는');
  const st = PREP_STYLE.at;
  const grow = ramp(frame, shortAt, shortAt + 14);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="at = 24시간보다 단 1초라도 짧다" size={42} color={st.main} opacity={ramp(frame, shortAt, shortAt + 14)} />
      <Clock sweep={grow} dotOnly color={st.edge} label={frame >= atAt ? 'AT' : '< 24h'} sub={frame >= pointAt ? '콕! 점' : undefined} frame={frame} />
    </div>
  );
};

// Phase 9 - in: a long, wide span beyond 24 hours.
const InMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i9']);
  const fade = useFade(sp.duration);
  const moreAt = wf('i9', 'i9', '1초라도');
  const wideAt = wf('i9', 'i9', '넓은');
  const inAt = wf('i9', 'i9', 'in을');
  const st = PREP_STYLE.in;
  const extra = ramp(frame, wideAt, wideAt + 24);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="in = 24시간보다 길고 넓다" size={44} color={st.main} opacity={ramp(frame, moreAt, moreAt + 14)} />
      <Clock sweep={ramp(frame, moreAt, moreAt + 16)} extra={extra} color={st.edge} label={frame >= inAt ? 'IN' : '> 24h'} sub={frame >= inAt ? '넓은 기간' : undefined} frame={frame} />
    </div>
  );
};

// Phase 11 - tip: anything inside a partitioned space is "in".
const RoomTip: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['i11']);
  const fade = useFade(sp.duration);
  const tipAt = wf('i11', 'i11', '꿀팁');
  const roomAt = wf('i11', 'i11', '칸막이');
  const enterAt = wf('i11', 'i11', '내부로');
  const inAt = wf('i11', 'i11', 'in으로');
  const st = PREP_STYLE.in;
  const room = spring({frame: frame - roomAt, fps, config: {damping: 12, stiffness: 120}});
  const walk = easeInOutCubic((frame - enterAt) / 50);
  const x = 150 + 560 * walk;
  const pill = spring({frame: frame - inAt, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="💡 꿀팁 · 칸막이 공간 안은 무조건 in" size={40} color={COLORS.yellow} opacity={ramp(frame, tipAt, tipAt + 14)} />
      <div style={{position: 'absolute', left: 460, top: 200, width: 500, height: 400, boxSizing: 'border-box', borderRadius: 36, border: `5px dashed ${st.edge}`, background: `rgba(${st.rgb},0.12)`, opacity: Math.min(1, room * 2), transform: `scale(${0.7 + 0.3 * room})`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 16, fontFamily: FONT, fontSize: 34, fontWeight: 800, color: st.main}}>
        칸막이 공간
      </div>
      <Actor who="he" x={x} walking={walk > 0 && walk < 1} opacity={ramp(frame, 0, 10)} />
      {frame >= inAt ? (
        <div style={{position: 'absolute', left: 710 - 80, top: 250 - (1 - pill) * 90, width: 160, height: 90, boxSizing: 'border-box', borderRadius: 30, background: 'linear-gradient(135deg, #FFA862, #FF6648)', color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 50px ${st.edge}`, transform: `scale(${0.4 + 0.6 * pill})`}}>
          in
        </div>
      ) : null}
    </div>
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const grid = (ids: string[], node: (duration: number) => React.ReactNode) => ({ids, node: node(span(scene, ids).duration)});
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['i1a'], node: <KoreanSame scene={scene} />},
    {ids: ['i2'], node: <Reference24 scene={scene} />},
    {ids: ['i3'], node: <TitleCards scene={scene} />},
    {ids: ['i4'], node: <Compass scene={scene} />},
    {ids: ['i5'], node: <OnMeaning scene={scene} />},
    grid(['i6'], (d) => (
      <WordGrid
        base="i6"
        tone="on"
        title="on · 정확히 24시간 분량의 날짜"
        duration={d}
        items={[
          {en: 'on Monday', kr: '월요일에', emoji: '📅', cue: 'i6', needle: 'Monday'},
          {en: 'on my birthday', kr: '생일에', emoji: '🎂', cue: 'i6', needle: 'birthday'},
          {en: 'on Christmas Day', kr: '크리스마스 날에', emoji: '🎄', cue: 'i6', needle: 'Christmas'},
        ]}
      />
    )),
    {ids: ['i7'], node: <AtMeaning scene={scene} />},
    grid(['i8'], (d) => (
      <WordGrid
        base="i8"
        tone="at"
        title="at · 24시간보다 짧은 특정 시점"
        duration={d}
        items={[
          {en: 'at 7 o’clock', kr: '7시에', emoji: '🕖', cue: 'i8', needle: '7시에'},
          {en: 'at noon', kr: '정오에', emoji: '🌞', cue: 'i8', needle: 'noon'},
          {en: 'at night', kr: '밤에', emoji: '🌙', cue: 'i8', needle: 'night'},
        ]}
      />
    )),
    {ids: ['i9'], node: <InMeaning scene={scene} />},
    grid(['i10'], (d) => (
      <WordGrid
        base="i10"
        tone="in"
        title="in · 24시간을 훌쩍 넘는 기간"
        duration={d}
        items={[
          {en: 'in the morning', kr: '아침에', emoji: '🌅', cue: 'i10', needle: 'morning'},
          {en: 'in this month', kr: '이번 달에', emoji: '🗓️', cue: 'i10', needle: 'month'},
          {en: 'in summer', kr: '여름에', emoji: '🌴', cue: 'i10', needle: 'summer'},
          {en: 'in 2026', kr: '2026년에', emoji: '🎆', cue: 'i10', needle: '2026'},
        ]}
      />
    )),
    {ids: ['i11'], node: <RoomTip scene={scene} />},
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
