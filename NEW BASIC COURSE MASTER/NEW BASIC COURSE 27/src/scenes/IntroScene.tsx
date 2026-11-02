import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {Card, Label, REL, RelName, span, useFade, wf} from './shared';

const CX = WIDTH / 2;

const useSpring = (at: number, config = {damping: 11, stiffness: 140}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config});
};

const Pill: React.FC<{text: string; color: string; edge: string; rgb: string; s: number; on: boolean; size?: number; glow?: number}> = ({text, color, edge, rgb, s, on, size = 54, glow = 0}) => (
  <div style={{padding: '6px 22px', borderRadius: 22, background: `rgba(${rgb},0.2)`, border: `3px solid ${edge}`, color, fontFamily: FONT, fontWeight: 900, fontSize: size, whiteSpace: 'nowrap', boxShadow: glow ? `0 0 ${44 * glow}px ${edge}` : 'none', opacity: on ? Math.min(1, s * 2) : 0, transform: `scale(${(0.6 + 0.4 * s) * (1 + 0.05 * glow)})`}}>
    {text}
  </div>
);

interface Chunk {
  t: string;
  rel?: RelName;
}

// Korean sentence -> English sentence, row by row (phases 1 and 2).
const KoEnRows: React.FC<{scene: SceneSpan; cue: string; title: string; rows: {koNeedle: string; enNeedle: string; ko: string; en: Chunk[]; size?: number}[]}> = ({scene, cue, title, rows}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, [cue]);
  const fade = useFade(sp.duration);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text={title} size={42} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      {rows.map((r, i) => {
        const koAt = wf(cue, cue, r.koNeedle);
        const enAt = wf(cue, cue, r.enNeedle);
        const top = 170 + i * 250;
        const ko = Math.min(1, ramp(frame, koAt, koAt + 12));
        const en = spring({frame: frame - enAt, fps: 30, config: {damping: 11, stiffness: 140}});
        return (
          <React.Fragment key={i}>
            <Card x={CX} y={top + 40} w={900} size={42} text={`🇰🇷 ${r.ko}`} opacity={ko} scale={0.9 + 0.1 * ko} />
            <div style={{position: 'absolute', left: 0, width: WIDTH, top: top + 100, display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '0 20px', boxSizing: 'border-box', opacity: frame >= enAt ? Math.min(1, en * 2) : 0, transform: `translateY(${(1 - en) * 30}px)`}}>
              {r.en.map((c, k) => {
                const st = c.rel ? REL[c.rel] : null;
                return (
                  <span key={k} style={{fontFamily: FONT, fontWeight: 900, fontSize: r.size ?? 54, color: st ? st.main : COLORS.cream, textShadow: st ? `0 0 24px ${st.edge}` : '0 2px 8px rgba(10,8,30,0.6)'}}>
                    {c.t}
                  </span>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Phase 3 - Korean: the describing words go in FRONT of the noun.
const KoreanFront: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i3']);
  const fade = useFade(sp.duration);
  const row = (top: number, modNeedle: string, nounNeedle: string, mod: string, noun: string) => {
    const m = useSpring(wf('i3', 'i3', modNeedle));
    const n = useSpring(wf('i3', 'i3', nounNeedle));
    const mAt = wf('i3', 'i3', modNeedle);
    const nAt = wf('i3', 'i3', nounNeedle);
    return (
      <div style={{position: 'absolute', left: 0, width: WIDTH, top, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20}}>
        <Pill text={`✏️ ${mod}`} color={COLORS.tealBright} edge={COLORS.teal} rgb="46,196,182" s={m} on={frame >= mAt} size={46} />
        <Pill text={noun} color={COLORS.cream} edge="rgba(255,246,229,0.6)" rgb="255,246,229" s={n} on={frame >= nAt} size={54} />
      </div>
    );
  };
  const lenAt = wf('i3', 'i3', '길게');
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="우리말 · 꾸며 주는 말이 명사 앞에" size={42} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      {row(190, '“내가', '사람”', '내가 어제 만난', '사람')}
      {row(360, '“카페에서', '책”', '카페에서 읽은', '책')}
      <Label x={CX} y={560} text="⬅️ 꾸미는 말이 길게 앞에 붙는다" size={44} color={COLORS.yellow} opacity={ramp(frame, lenAt, lenAt + 14)} />
    </div>
  );
};

// Phase 4 - English: throw the noun first, then add "그런데 ...".
const EnglishAfter: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i4']);
  const fade = useFade(sp.duration);
  const nounAt = wf('i4', 'i4', '명사를');
  const whoAt = wf('i4', 'i4', '“그런데');
  const whichAt = wf('i4', 'i4', '이것은');
  const noun = useSpring(nounAt);
  const a = useSpring(whoAt);
  const b = useSpring(whichAt);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="영어 · 명사 먼저, 설명은 뒤에" size={42} color={COLORS.cream} opacity={ramp(frame, 0, 14)} />
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 190, display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'center'}}>
        <Pill text="a man" color={COLORS.cream} edge="rgba(255,246,229,0.6)" rgb="255,246,229" s={noun} on={frame >= nounAt} />
        <Pill text="그런데 이 사람은..." color={REL.who.main} edge={REL.who.edge} rgb={REL.who.rgb} s={a} on={frame >= whoAt} size={42} />
      </div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 380, display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'center'}}>
        <Pill text="a book" color={COLORS.cream} edge="rgba(255,246,229,0.6)" rgb="255,246,229" s={noun} on={frame >= nounAt + 6} />
        <Pill text="그런데 이것은..." color={REL.which.main} edge={REL.which.edge} rgb={REL.which.rgb} s={b} on={frame >= whichAt} size={42} />
      </div>
      <Label x={CX} y={560} text="➡️ 뒤에서 덧붙여 나간다" size={44} color={COLORS.yellow} opacity={ramp(frame, whichAt + 10, whichAt + 24)} />
    </div>
  );
};

// Phase 5 - the four relative pronouns.
const Four: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i5']);
  const fade = useFade(sp.duration);
  const midAt = wf('i5', 'i5', '영어의');
  const items: {rel: RelName; kr: string; emoji: string}[] = [
    {rel: 'who', kr: '사람', emoji: '🧑'},
    {rel: 'which', kr: '사물·동물', emoji: '📦'},
    {rel: 'that', kr: '만능 접착제', emoji: '🧴'},
    {rel: 'what', kr: '~하는 것', emoji: '🎁'},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Label x={CX} y={50} text="영어의 기초 · 관계대명사" size={42} opacity={ramp(frame, midAt, midAt + 14)} />
      {items.map((it, i) => {
        const at = wf('i5', 'i5', it.rel);
        const s = spring({frame: frame - at, fps: 30, config: {damping: 10, stiffness: 150}});
        const st = REL[it.rel];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const active = frame >= at && frame < at + 40;
        return (
          <div key={it.rel} style={{position: 'absolute', left: CX + (col - 0.5) * 505 - 242, top: 170 + row * 220, width: 484, height: 180, boxSizing: 'border-box', borderRadius: 36, background: `rgba(${st.rgb},${active ? 0.34 : 0.16})`, border: `3px solid ${active ? st.main : st.edge}`, boxShadow: active ? `0 0 44px ${st.edge}aa` : 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', fontFamily: FONT, opacity: frame >= at ? Math.min(1, s * 2) : 0, transform: `scale(${(0.5 + 0.5 * s) * (active ? 1.05 : 1)})`}}>
            <div style={{fontSize: 76, lineHeight: 1}}>{it.emoji}</div>
            <div>
              <div style={{fontSize: 56, fontWeight: 900, color: st.main, lineHeight: 1.05}}>{it.rel}</div>
              <div style={{fontSize: 30, fontWeight: 600, color: COLORS.sand}}>{it.kr}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Phase 6 - what does "관계대명사" mean?
const Question: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i6']);
  const fade = useFade(sp.duration);
  const nameAt = wf('i6', 'i6', '관계대명사라는');
  const qAt = wf('i6', 'i6', '무슨');
  const name = useSpring(nameAt);
  const q = useSpring(qAt, {damping: 8, stiffness: 130});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 190, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 104, color: COLORS.cream, opacity: frame >= nameAt ? Math.min(1, name * 2) : 0, transform: `scale(${0.6 + 0.4 * name})`, textShadow: `0 0 ${40 * name}px ${COLORS.orange}`}}>관계대명사</div>
      <div style={{position: 'absolute', left: CX - 90, top: 360, width: 180, textAlign: 'center', fontSize: 150, lineHeight: 1, opacity: frame >= qAt ? Math.min(1, q * 2) : 0, transform: `scale(${0.4 + 0.6 * q}) rotate(${Math.sin(frame / 7) * 8}deg)`}}>❓</div>
    </div>
  );
};

// Phase 7 - conjunction + pronoun = relative pronoun.
const Equation: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i7']);
  const fade = useFade(sp.duration);
  const conjAt = wf('i7', 'i7', '접속사');
  const proAt = wf('i7', 'i7', '대명사의');
  const resAt = wf('i7', 'i7', '한다는');
  const a = useSpring(conjAt);
  const b = useSpring(proAt);
  const c = useSpring(resAt, {damping: 9, stiffness: 120});
  const box = (x: number, label: string, sub: string, color: string, edge: string, rgb: string, s: number, on: boolean) => (
    <div style={{position: 'absolute', left: x - 230, top: 200, width: 460, height: 210, boxSizing: 'border-box', borderRadius: 38, background: `rgba(${rgb},0.2)`, border: `4px solid ${edge}`, boxShadow: `0 0 ${36 * s}px ${edge}88`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color, opacity: on ? Math.min(1, s * 2) : 0, transform: `scale(${0.6 + 0.4 * s})`}}>
      <div style={{fontSize: 56, fontWeight: 900}}>{label}</div>
      <div style={{fontSize: 34, fontWeight: 700, color: COLORS.cream, marginTop: 6}}>{sub}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      {box(CX - 250, '🔗 접속사', 'and · or · but', COLORS.yellow, COLORS.orange, '255,154,31', a, frame >= conjAt)}
      <div style={{position: 'absolute', left: CX - 40, top: 270, width: 80, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 90, color: COLORS.cream, opacity: ramp(frame, proAt - 6, proAt + 6)}}>+</div>
      {box(CX + 250, '🧑 대명사', 'he · it · they', COLORS.tealBright, COLORS.teal, '46,196,182', b, frame >= proAt)}
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 470, textAlign: 'center', opacity: frame >= resAt ? Math.min(1, c * 2) : 0, transform: `scale(${0.6 + 0.4 * c})`}}>
        <span style={{display: 'inline-block', padding: '12px 46px', borderRadius: 34, background: 'linear-gradient(135deg, #FFE680, #FF9A1F)', color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 60, boxShadow: `0 0 ${40 * c}px ${COLORS.orange}`}}>= 관계대명사 ✨</span>
      </div>
    </div>
  );
};

// Phase 8 - the magic wand merges them.
const Wand: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i8']);
  const fade = useFade(sp.duration);
  const conjAt = wf('i8', 'i8', '접속사와');
  const proAt = wf('i8', 'i8', '대명사가');
  const mergeAt = wf('i8', 'i8', '합체된');
  const wandAt = wf('i8', 'i8', '요술봉');
  const merge = easeInOutCubic((frame - mergeAt) / 20);
  const a = useSpring(conjAt);
  const b = useSpring(proAt);
  const w = useSpring(wandAt, {damping: 8, stiffness: 120});
  const left = CX - 260 + 260 * merge;
  const right = CX + 260 - 260 * merge;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: left - 130, top: 250, opacity: frame >= conjAt ? Math.min(1, a * 2) * (1 - merge * 0.6) : 0, transform: `scale(${0.6 + 0.4 * a})`}}>
        <Pill text="🔗 접속사" color={COLORS.yellow} edge={COLORS.orange} rgb="255,154,31" s={1} on size={48} />
      </div>
      <div style={{position: 'absolute', left: right - 110, top: 250, opacity: frame >= proAt ? Math.min(1, b * 2) * (1 - merge * 0.6) : 0, transform: `scale(${0.6 + 0.4 * b})`}}>
        <Pill text="🧑 대명사" color={COLORS.tealBright} edge={COLORS.teal} rgb="46,196,182" s={1} on size={48} />
      </div>
      <div style={{position: 'absolute', left: CX - 80, top: 330, width: 160, textAlign: 'center', fontSize: 130, lineHeight: 1, opacity: frame >= wandAt ? Math.min(1, w * 2) : 0, transform: `scale(${0.4 + 0.6 * w}) rotate(${-30 + 30 * w + Math.sin(frame / 5) * 6}deg)`}}>🪄</div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 520, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 64, color: COLORS.yellow, opacity: ramp(frame, wandAt + 6, wandAt + 20), textShadow: `0 0 30px ${COLORS.orange}`}}>관계대명사 ✨</div>
    </div>
  );
};

// Phase 9 - who for people, which for things.
const WhoWhich: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i9']);
  const fade = useFade(sp.duration);
  const whoAt = wf('i9', 'i9', '사람');
  const whichAt = wf('i9', 'i9', '사물이나');
  const a = useSpring(whoAt);
  const b = useSpring(whichAt);
  const panel = (x: number, rel: RelName, emoji: string, noun: string, line: string, s: number, on: boolean) => {
    const st = REL[rel];
    return (
      <div style={{position: 'absolute', left: x - 245, top: 130, width: 490, height: 460, boxSizing: 'border-box', borderRadius: 40, background: `rgba(${st.rgb},0.16)`, border: `3px solid ${st.edge}`, boxShadow: on ? `0 0 44px ${st.edge}88` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: FONT, color: st.main, opacity: on ? Math.min(1, s * 2) : 0, transform: `scale(${0.6 + 0.4 * s})`}}>
        <div style={{fontSize: 110, lineHeight: 1}}>{emoji}</div>
        <div style={{fontSize: 36, fontWeight: 700, color: COLORS.cream}}>{noun}</div>
        <div style={{fontSize: 36, fontWeight: 800}}>{line}</div>
        <div style={{fontSize: 84, fontWeight: 900, lineHeight: 1.1}}>{rel}</div>
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      {panel(CX - 255, 'who', '🧑', '사람 뒤', '“그런데 이 사람은...”', a, frame >= whoAt)}
      {panel(CX + 255, 'which', '📦', '사물·동물 뒤', '“그런데 이것은...”', b, frame >= whichAt)}
    </div>
  );
};

// Phase 10 - that: the all-round glue.
const Glue: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i10']);
  const fade = useFade(sp.duration);
  const bothAt = wf('i10', 'i10', '둘을');
  const glueAt = wf('i10', 'i10', '접착제');
  const thatAt = wf('i10', 'i10', 'that');
  const both = useSpring(bothAt);
  const glue = useSpring(glueAt, {damping: 8, stiffness: 130});
  const that = useSpring(thatAt, {damping: 8, stiffness: 140});
  const glow = ramp(frame, thatAt, thatAt + 16) * (0.7 + 0.3 * Math.sin(frame / 6));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: CX - 360 - 120, top: 200, opacity: frame >= bothAt ? Math.min(1, both * 2) : 0, transform: `scale(${0.6 + 0.4 * both})`}}>
        <Pill text="who 🧑" color={REL.who.main} edge={REL.who.edge} rgb={REL.who.rgb} s={1} on size={56} />
      </div>
      <div style={{position: 'absolute', left: CX + 360 - 190, top: 200, opacity: frame >= bothAt ? Math.min(1, both * 2) : 0, transform: `scale(${0.6 + 0.4 * both})`}}>
        <Pill text="📦 which" color={REL.which.main} edge={REL.which.edge} rgb={REL.which.rgb} s={1} on size={56} />
      </div>
      <div style={{position: 'absolute', left: CX - 90, top: 300, width: 180, textAlign: 'center', fontSize: 150, lineHeight: 1, opacity: frame >= glueAt ? Math.min(1, glue * 2) : 0, transform: `scale(${0.4 + 0.6 * glue}) rotate(${(1 - glue) * 30}deg)`}}>🧴</div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 500, textAlign: 'center', opacity: frame >= thatAt ? Math.min(1, that * 2) : 0, transform: `scale(${0.6 + 0.4 * that})`}}>
        <span style={{display: 'inline-block', padding: '10px 60px', borderRadius: 34, background: 'linear-gradient(135deg, #FFE680, #FFB300)', color: COLORS.ink, fontFamily: FONT, fontWeight: 900, fontSize: 80, boxShadow: `0 0 ${30 + 40 * glow}px ${REL.that.edge}`}}>that</span>
      </div>
    </div>
  );
};

// Phase 11 - what: makes a "~하는 것" chunk without a noun.
const WhatChunk: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['i11']);
  const fade = useFade(sp.duration);
  const noNounAt = wf('i11', 'i11', '명사가');
  const chunkAt = wf('i11', 'i11', '덩어리를');
  const whatAt = wf('i11', 'i11', 'what이');
  const none = useSpring(noNounAt);
  const chunk = useSpring(chunkAt, {damping: 9, stiffness: 130});
  const glow = ramp(frame, whatAt, whatAt + 16) * (0.7 + 0.3 * Math.sin(frame / 6));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: CX - 200, top: 160, width: 400, height: 140, boxSizing: 'border-box', borderRadius: 30, border: `4px dashed ${COLORS.sand}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 44, color: COLORS.sand, opacity: frame >= noNounAt ? Math.min(1, none * 2) * (1 - ramp(frame, chunkAt, chunkAt + 10) * 0.5) : 0, transform: `scale(${0.6 + 0.4 * none})`}}>꾸며 줄 명사 ✕</div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 340, textAlign: 'center', opacity: frame >= chunkAt ? Math.min(1, chunk * 2) : 0, transform: `scale(${0.5 + 0.5 * chunk})`}}>
        <div style={{display: 'inline-block', padding: '16px 50px', borderRadius: 40, background: `rgba(${REL.what.rgb},0.22)`, border: `4px solid ${REL.what.edge}`, boxShadow: `0 0 ${30 + 40 * glow}px ${REL.what.edge}`, fontFamily: FONT, color: REL.what.main}}>
          <div style={{fontSize: 40, fontWeight: 700, color: COLORS.cream}}>🎁 “~하는 것” 덩어리</div>
          <div style={{fontSize: 92, fontWeight: 900, lineHeight: 1.1}}>what</div>
        </div>
      </div>
    </div>
  );
};

export const IntroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {
      ids: ['i1'],
      node: (
        <KoEnRows
          scene={scene}
          cue="i1"
          title="우리말 → 영어"
          rows={[
            {koNeedle: '“나는', enNeedle: 'met', ko: '나는 어제 그 사람을 만났다', en: [{t: 'I met him yesterday.'}]},
            {koNeedle: '“내가', enNeedle: 'who', ko: '내가 어제 만난 그 사람', en: [{t: 'He'}, {t: 'who', rel: 'who'}, {t: 'I met yesterday.'}]},
          ]}
        />
      ),
    },
    {
      ids: ['i2'],
      node: (
        <KoEnRows
          scene={scene}
          cue="i2"
          title="우리말 → 영어"
          rows={[
            {koNeedle: '“나는', enNeedle: 'read', ko: '나는 카페에서 그 책을 읽었다', en: [{t: 'I read the book at the cafe yesterday.'}], size: 42},
            {koNeedle: '“카페에서', enNeedle: 'which', ko: '카페에서 내가 읽은 책', en: [{t: 'The book'}, {t: 'which', rel: 'which'}, {t: 'I read.'}]},
          ]}
        />
      ),
    },
    {ids: ['i3'], node: <KoreanFront scene={scene} />},
    {ids: ['i4'], node: <EnglishAfter scene={scene} />},
    {ids: ['i5'], node: <Four scene={scene} />},
    {ids: ['i6'], node: <Question scene={scene} />},
    {ids: ['i7'], node: <Equation scene={scene} />},
    {ids: ['i8'], node: <Wand scene={scene} />},
    {ids: ['i9'], node: <WhoWhich scene={scene} />},
    {ids: ['i10'], node: <Glue scene={scene} />},
    {ids: ['i11'], node: <WhatChunk scene={scene} />},
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
