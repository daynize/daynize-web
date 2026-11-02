import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, FPS, ramp, WIDTH} from '../theme';
import {cueById, EXAMPLE_LINES, ExampleLine, Part, SceneSpan, stripMarkup} from '../timeline';
import {Caption, REL, rel, span, useFade, wf} from './shared';

const S = (text: string): Part => ({text, kind: 'subject'});
const parts = (text: string): Part[] => text.split(' ').map(S);
const CX = WIDTH / 2;
const CONJ = {main: COLORS.yellow, edge: COLORS.orange, rgb: '255,154,31'};

const useSpring = (at: number, config = {damping: 11, stiffness: 140}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config});
};

const Tag: React.FC<{text: string; color: string; edge: string; rgb: string; s: number; on: boolean; size?: number; glow?: number}> = ({text, color, edge, rgb, s, on, size = 56, glow = 0}) => (
  <div style={{padding: '6px 24px', borderRadius: 24, background: `rgba(${rgb},0.2)`, border: `3px solid ${edge}`, color, fontFamily: FONT, fontWeight: 900, fontSize: size, whiteSpace: 'nowrap', boxShadow: glow ? `0 0 ${44 * glow}px ${edge}` : 'none', opacity: on ? Math.min(1, s * 2) : 0, transform: `scale(${(0.6 + 0.4 * s) * (1 + 0.05 * glow)})`}}>
    {text}
  </div>
);

// p1 + p2: with and / or / but there is no relative pronoun, because it already contains the conjunction.
const NoDuplicate: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['p1', 'p2']);
  const fade = useFade(sp.duration);
  const andAt = wf('p1', 'p1', 'and');
  const orAt = wf('p1', 'p1', 'or');
  const butAt = wf('p1', 'p1', 'but');
  const relAt = wf('p1', 'p1', '관계대명사를');
  const noAt = wf('p1', 'p1', '쓰지');
  const p2 = rel('p1', 'p2');
  const inAt = p2 + wf('p2', 'p2', '접속사의');
  const hasAt = p2 + wf('p2', 'p2', '포함되어');
  const sA = useSpring(andAt);
  const sO = useSpring(orAt);
  const sB = useSpring(butAt);
  const sR = useSpring(relAt);
  const no = useSpring(noAt, {damping: 7, stiffness: 160});
  const inn = useSpring(inAt);
  const has = useSpring(hasAt, {damping: 9, stiffness: 140});
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 90, display: 'flex', justifyContent: 'center', gap: 20}}>
        <Tag text="and" {...CONJ} color={CONJ.main} s={sA} on={frame >= andAt} />
        <Tag text="or" {...CONJ} color={CONJ.main} s={sO} on={frame >= orAt} />
        <Tag text="but" {...CONJ} color={CONJ.main} s={sB} on={frame >= butAt} />
      </div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 260, display: 'flex', justifyContent: 'center'}}>
        <Tag text="관계대명사" color={COLORS.cream} edge="rgba(255,246,229,0.7)" rgb="255,246,229" s={sR} on={frame >= relAt} size={64} glow={ramp(frame, inAt, inAt + 14)} />
      </div>
      <div style={{position: 'absolute', left: CX - 260, top: 230, width: 520, textAlign: 'center', fontSize: 190, lineHeight: 1, color: COLORS.coral, fontFamily: FONT, fontWeight: 900, opacity: frame >= noAt && frame < inAt ? Math.min(1, no * 2) : 0, transform: `scale(${0.4 + 0.6 * no})`, textShadow: '0 0 30px rgba(255,107,107,0.8)'}}>✕</div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 430, textAlign: 'center', opacity: frame >= inAt ? Math.min(1, inn * 2) : 0, transform: `scale(${0.7 + 0.3 * inn})`}}>
        <span style={{display: 'inline-block', padding: '10px 40px', borderRadius: 30, background: 'rgba(255,246,229,0.12)', border: `3px solid ${COLORS.sand}`, fontFamily: FONT, fontWeight: 800, fontSize: 44, color: COLORS.cream}}>🔗 접속사 + 🧑 대명사 = 관계대명사</span>
      </div>
      <Caption y={560} text="이미 접속사가 들어 있다!" size={46} color={COLORS.yellow} opacity={ramp(frame, hasAt, hasAt + 14) * (0.85 + 0.15 * has)} />
    </div>
  );
};

// p3 + p4 + p5: and which / or which / but which = doubled meaning.
const DoubledMeaning: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['p3', 'p4', 'p5']);
  const fade = useFade(sp.duration);
  const rows: {cue: string; conj: string; mean: string}[] = [
    {cue: 'p3', conj: 'and', mean: '“그리고 그래서”'},
    {cue: 'p4', conj: 'or', mean: '“또한 그런데”'},
    {cue: 'p5', conj: 'but', mean: '“그러나, 하지만”'},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      {rows.map((r, i) => {
        const at = rel('p3', r.cue);
        const dupAt = at + wf(r.cue, r.cue, '중복된');
        const s = spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
        const d = spring({frame: frame - dupAt, fps, config: {damping: 8, stiffness: 150}});
        const top = 90 + i * 190;
        return (
          <div key={r.cue} style={{position: 'absolute', left: 0, width: WIDTH, top, opacity: frame >= at ? Math.min(1, s * 2) : 0, transform: `translateY(${(1 - s) * 30}px)`}}>
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16}}>
              <Tag text={r.conj} {...CONJ} color={CONJ.main} s={1} on size={52} />
              <Tag text="which" color={REL.which.main} edge={REL.which.edge} rgb={REL.which.rgb} s={1} on size={52} />
              <span style={{fontFamily: FONT, fontWeight: 800, fontSize: 40, color: COLORS.cream}}>= {r.mean}</span>
            </div>
            <div style={{textAlign: 'center', marginTop: 10, fontFamily: FONT, fontWeight: 900, fontSize: 40, color: COLORS.coral, opacity: frame >= dupAt ? Math.min(1, d * 2) : 0, transform: `scale(${0.6 + 0.4 * d})`}}>✕ 뜻이 중복!</div>
          </div>
        );
      })}
    </div>
  );
};

// p6: the sentence collapses.
const Collapse: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['p6']);
  const fade = useFade(sp.duration);
  const conjAt = wf('p6', 'p6', '접속사가');
  const relAt = wf('p6', 'p6', '관계대명사를');
  const fallAt = wf('p6', 'p6', '무너져');
  const a = useSpring(conjAt);
  const b = useSpring(relAt);
  const fall = Math.max(0, frame - fallAt);
  const drop = (n: number) => ({transform: `translateY(${fall * fall * 0.9 * (1 + n * 0.3)}px) rotate(${fall * (n % 2 ? 2 : -2.5)}deg)`, opacity: 1 - ramp(frame, fallAt + 18, fallAt + 40)});
  const block = (x: number, text: string, color: string, edge: string, rgb: string, n: number) => (
    <div style={{position: 'absolute', left: x - 150, top: 260, width: 300, ...drop(n)}}>
      <Tag text={text} color={color} edge={edge} rgb={rgb} s={1} on size={44} />
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{opacity: Math.min(1, a * 2) * (frame >= conjAt ? 1 : 0)}}>{block(CX - 330, '문장 A', COLORS.cream, 'rgba(255,246,229,0.7)', '255,246,229', 0)}</div>
      <div style={{opacity: frame >= conjAt ? Math.min(1, a * 2) : 0}}>{block(CX, 'and 🔗', CONJ.main, CONJ.edge, CONJ.rgb, 1)}</div>
      <div style={{opacity: frame >= relAt ? Math.min(1, b * 2) : 0}}>{block(CX + 330, 'which 🔗', REL.which.main, REL.which.edge, REL.which.rgb, 2)}</div>
      <div style={{position: 'absolute', left: CX - 100, top: 150, width: 200, textAlign: 'center', fontSize: 150, lineHeight: 1, opacity: ramp(frame, fallAt, fallAt + 6) * (1 - ramp(frame, fallAt + 30, fallAt + 44)), transform: `scale(${0.5 + ramp(frame, fallAt, fallAt + 10)})`}}>💥</div>
      <Caption y={520} text="접속사 ×2 = 문장이 무너진다" size={44} color={COLORS.coral} opacity={ramp(frame, fallAt + 6, fallAt + 20)} />
    </div>
  );
};

// b1a + b1b + b1c: "I bought a book, and which is interesting." -> and it / which.
const BasicDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b1a', 'b1b', 'b1c']);
  const fade = useFade(sp.duration);
  const tC = rel('b1a', 'b1c');
  const xAt = wf('b1a', 'b1a', '중복되어');
  const squeezeAt = wf('b1a', 'b1a', '어색하고');
  const itAt = wf('b1a', 'b1b', 'it');
  const itGlow = Math.max(itAt + 22, wf('b1a', 'b1b', 'interesting'));
  const x2At = 8;
  const which2At = wf('b1c', 'b1c', 'which');
  const which2Glow = Math.max(which2At + 22, wf('b1c', 'b1c', 'interesting'));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: CX - 470, width: 940, top: 30, height: 100, borderRadius: 32, background: 'rgba(235,217,180,0.15)', border: '2px solid rgba(235,217,180,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 38, color: COLORS.sand, opacity: ramp(frame, 4, 18), whiteSpace: 'nowrap'}}>
        📖 “나는 책을 한 권 샀는데, 그리고 그 책은 재밌다”
      </div>
      <Sequence from={0} durationInFrames={tC} layout="none">
        <BridgeSentence
          left={parts('I bought a book, and')}
          prep="it"
          tone="teal"
          right={parts('which is interesting.')}
          replaces
          replaceCount={1}
          y={400}
          fontSize={96}
          maxLines={2}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: 'and + which 중복!'}}
          popAt={itAt}
          glowAt={itGlow}
        />
        <Caption y={600} text="✕ and + which = 중복" color="#FF9CA0" size={38} opacity={ramp(frame, xAt, xAt + 12) * (1 - ramp(frame, itAt - 4, itAt + 8))} />
        <Caption y={600} text="✓ and 를 쓰려면 대명사 it" color={REL.who.main} size={38} opacity={ramp(frame, itGlow, itGlow + 14)} />
      </Sequence>
      <Sequence from={tC} durationInFrames={sp.duration - tC} layout="none">
        <BridgeSentence
          left={parts('I bought a book')}
          prep="which"
          tone="orange"
          right={parts('and which is interesting.')}
          replaces
          replaceCount={2}
          y={400}
          fontSize={96}
          maxLines={2}
          appearAt={0}
          wrong={{xAt: x2At, squeezeAt: x2At + 14, label: 'and 를 빼고'}}
          popAt={which2At}
          glowAt={which2Glow}
        />
        <Caption y={600} text="✓ and 를 빼고 관계대명사만!" color={REL.which.main} size={38} opacity={ramp(frame - tC, which2Glow, which2Glow + 14)} />
      </Sequence>
    </div>
  );
};

// Header cue of an example group: shows the conjunction (or what) being practised.
const GroupHeader: React.FC<{scene: SceneSpan; cue: string; conj: 'and' | 'or' | 'but' | 'what'; chipNeedle: string; labelNeedle: string; label: string}> = ({scene, cue, conj, chipNeedle, labelNeedle, label}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, [cue]);
  const fade = useFade(sp.duration);
  const chipAt = wf(cue, cue, chipNeedle);
  const labelAt = wf(cue, cue, labelNeedle);
  const chip = useSpring(chipAt, {damping: 9, stiffness: 130});
  const isWhat = conj === 'what';
  const st = isWhat ? REL.what : {main: CONJ.main, edge: CONJ.edge, rgb: CONJ.rgb};
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24}}>
        <Tag text={conj} color={st.main} edge={st.edge} rgb={st.rgb} s={chip} on={frame >= chipAt} size={110} />
        {isWhat ? null : <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 70, color: COLORS.coral, opacity: ramp(frame, chipAt + 8, chipAt + 18)}}>✕ which</span>}
      </div>
      <Caption y={420} text={label} size={46} color={COLORS.cream} opacity={ramp(frame, labelAt, labelAt + 14)} />
    </div>
  );
};

// One spoken example: Korean line, then the corrected English sentence (the pronoun pops in).
const ExampleView: React.FC<{line: ExampleLine}> = ({line}) => {
  const frame = useCurrentFrame();
  const cue = cueById(line.id);
  const d = cue.duration;
  const out = ramp(frame, 0, 10) * (1 - ramp(frame, d - 8, d));
  const krWords = stripMarkup(line.kr).split(/\s+/).filter(Boolean).length;
  const at = (i: number, edge: 's' | 'e' = 's') => Math.round(cue.words[i][edge] * FPS);
  const popAt = at(krWords + line.left.split(' ').length);
  const lastAt = at(cue.words.length - 1);
  const glowAt = Math.max(popAt + 20, lastAt);
  const st = REL[line.pill];
  const isWhat = line.conj === 'what';
  const xAt = Math.max(14, Math.round(at(krWords - 1, 'e') * 0.6));
  const squeezeAt = Math.max(xAt + 6, Math.min(xAt + 14, popAt - 10));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: out}}>
      <div style={{position: 'absolute', left: CX - 480, width: 960, top: 30, minHeight: 90, boxSizing: 'border-box', padding: '10px 24px', borderRadius: 30, background: 'rgba(235,217,180,0.15)', border: '2px solid rgba(235,217,180,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 36, color: COLORS.sand, opacity: ramp(frame, 4, 18)}}>
        🇰🇷 {line.kr}
      </div>
      <BridgeSentence
        left={parts(line.left)}
        prep={line.pill}
        right={isWhat ? parts(line.rest) : [...parts(line.conj), ...parts(line.pill), ...parts(line.rest)]}
        tone={st.tone}
        replaces={!isWhat}
        replaceCount={2}
        maxLines={2}
        y={380}
        fontSize={100}
        appearAt={6}
        wrong={isWhat ? undefined : {xAt, squeezeAt, label: `${line.conj} + ${line.pill} 중복!`}}
        popAt={popAt}
        glowAt={glowAt}
        gloss={isWhat ? `🎁 ${line.gloss}` : undefined}
        glossAt={isWhat ? glowAt : undefined}
      />
      {isWhat ? null : (
        <>
          <Caption y={590} text={`✕ ${line.conj} + ${line.pill} = 접속사 중복`} color="#FF9CA0" size={38} opacity={ramp(frame, xAt, xAt + 12) * (1 - ramp(frame, popAt - 4, popAt + 8))} />
          <Caption y={590} text={`✓ ${line.conj} 없이 ${line.pill}만!`} color={st.main} size={38} opacity={ramp(frame, glowAt, glowAt + 14)} />
        </>
      )}
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const header = (cue: string, conj: 'and' | 'or' | 'but' | 'what', chipNeedle: string, labelNeedle: string, label: string) => ({
    ids: [cue],
    node: <GroupHeader scene={scene} cue={cue} conj={conj} chipNeedle={chipNeedle} labelNeedle={labelNeedle} label={label} />,
  });
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['p1', 'p2'], node: <NoDuplicate scene={scene} />},
    {ids: ['p3', 'p4', 'p5'], node: <DoubledMeaning scene={scene} />},
    {ids: ['p6'], node: <Collapse scene={scene} />},
    {ids: ['b1a', 'b1b', 'b1c'], node: <BasicDemo scene={scene} />},
    header('ea0', 'and', 'and', '올바른', '중복하지 않는 올바른 예시 3가지'),
    ...EXAMPLE_LINES.filter((l) => l.conj === 'and').map((l) => ({ids: [l.id], node: <ExampleView line={l} />})),
    header('eo0', 'or', 'or', '피하는', '중복을 피하는 예시 3가지'),
    ...EXAMPLE_LINES.filter((l) => l.conj === 'or').map((l) => ({ids: [l.id], node: <ExampleView line={l} />})),
    header('eb0', 'but', 'but', '피하는', '중복을 피하는 예시 3가지'),
    ...EXAMPLE_LINES.filter((l) => l.conj === 'but').map((l) => ({ids: [l.id], node: <ExampleView line={l} />})),
    header('ew0', 'what', 'what', '“내가', '“내가 ~하는 것”'),
    ...EXAMPLE_LINES.filter((l) => l.conj === 'what').map((l) => ({ids: [l.id], node: <ExampleView line={l} />})),
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
