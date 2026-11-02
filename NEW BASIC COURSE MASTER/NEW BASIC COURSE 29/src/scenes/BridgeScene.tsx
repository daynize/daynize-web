import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, Part, PREP_NAMES, SAMPLE_LINES, SceneSpan, wordFrame} from '../timeline';
import {Caption, PREP, PrepName, span, useFade, wf, wfe} from './shared';
import {Demo, SampleCard} from './lesson';

const S = (text: string): Part => ({text, kind: 'subject'});
const CX = WIDTH / 2;
const PREPS: PrepName[] = PREP_NAMES;

// The Korean example sentence.
const HouseKorean: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '왜 전치사가 앞으로 당겨져 올까?', at: 0, color: COLORS.yellow}}
    emojis={[
      {emoji: '🏠', x: 330, y: 700, size: 120, at: wf('b1', 'b1', '샀는데,'), motion: 'float'},
      {emoji: '🔴', x: 750, y: 700, size: 110, at: wf('b1', 'b1', '빨간색이다”라고'), motion: 'pulse'},
    ]}
    rows={[
      {y: 300, size: 50, items: [{text: '“나는 집을 한 채 샀는데,', kind: 'plain', at: wf('b1', 'b1', '“나는')}]},
      {y: 470, size: 50, items: [{text: '그 집의 지붕은 빨간색이다”', kind: 'plain', at: wf('b1', 'b1', '집의')}]},
    ]}
  />
);

// Two plain sentences.
const TwoSentences: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '두 문장으로 쓰면', at: 0}}
    rows={[
      {
        y: 290,
        size: 56,
        items: [
          {text: 'I', kind: 'plain', at: wf('b2', 'b2', 'I')},
          {text: 'bought', kind: 'plain', at: wf('b2', 'b2', 'bought')},
          {text: 'a', kind: 'plain', at: wf('b2', 'b2', 'bought')},
          {text: 'house', kind: 'plain', at: wf('b2', 'b2', 'house와')},
        ],
      },
      {
        y: 470,
        size: 50,
        items: [
          {text: 'The', kind: 'plain', at: wfe('b2', 'b2', 'the')},
          {text: 'roof', kind: 'plain', at: wfe('b2', 'b2', 'roof')},
          {text: 'of', kind: 'of', at: wfe('b2', 'b2', 'of'), glowAt: wfe('b2', 'b2', 'of') + 4},
          {text: 'the', kind: 'plain', at: wfe('b2', 'b2', 'the', 1)},
          {text: 'house', kind: 'plain', at: wfe('b2', 'b2', 'house', 1)},
          {text: 'is', kind: 'plain', at: wfe('b2', 'b2', 'is')},
          {text: 'red', kind: 'plain', at: wfe('b2', 'b2', 'red')},
        ],
      },
    ]}
  />
);

// Hero: "...a house which the roof of is red" -> "...a house of which the roof is red".
const MoveHero: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const fade = useFade(d);
  const appearAt = wf('b3', 'b3', 'I');
  const xAt = wf('b3', 'b4', 'of');
  const squeezeAt = wf('b3', 'b4', '혼자');
  const popAt = wf('b3', 'b5', '찰싹');
  const glowAt = Math.max(popAt + 22, wf('b3', 'b5', '되는'));
  const c = PREP.of;
  const lone = ramp(frame, xAt, xAt + 10) * (1 - ramp(frame, popAt - 4, popAt + 8));
  const done = ramp(frame, glowAt, glowAt + 14);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          left: CX - 440,
          width: 880,
          top: 100,
          height: 110,
          borderRadius: 34,
          background: 'rgba(235,217,180,0.15)',
          border: '2px solid rgba(235,217,180,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 38,
          color: COLORS.sand,
          whiteSpace: 'nowrap',
          opacity: ramp(frame, 0, 14),
        }}
      >
        🏠 “집을 샀는데, 그 집의 지붕은 빨간색이다”
      </div>
      <BridgeSentence
        left={[S('I'), S('bought'), S('a'), S('house')]}
        prep="of which"
        tone="coral"
        right={[S('which'), S('the'), S('roof'), S('of'), S('is'), S('red.')]}
        rightFix={[S('the'), S('roof'), S(''), S('is'), S('red.')]}
        replaces
        replaceCount={1}
        y={430}
        fontSize={112}
        maxLines={2}
        appearAt={appearAt}
        wrong={{xAt, squeezeAt, label: 'of 혼자 남았어요!'}}
        popAt={popAt}
        glowAt={glowAt}
      />
      <Caption y={640} text="✕ 전치사 of 혼자 덩그러니…" color="#FF9CA0" size={38} opacity={lone} />
      <Caption y={640} text="✓ of which = 그런데 그것의 (소유)" color={c.main} size={38} opacity={done} />
    </div>
  );
};

// Header of the eight examples.
const EightHeader: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: `대표적인 전치사 + which ${PREPS.length}선`, at: 0, color: COLORS.yellow}}
    rows={Array.from({length: Math.ceil(PREPS.length / 2)}, (_, r) => ({
      y: 215 + r * 115,
      size: 46,
      items: PREPS.slice(r * 2, r * 2 + 2).map((p, i) => ({text: `${p} which`, kind: p, at: 14 + (r * 2 + i) * 8})),
    }))}
  />
);

const Sample: React.FC<{d: number; i: number}> = ({d, i}) => {
  const s = SAMPLE_LINES[i];
  const base = cueById(s.id).start;
  const at = (idx: number) => wordFrame(s.id, idx) - base;
  const labelIdx = 2;
  const leftIdx = labelIdx + s.label.split(' ').length;
  const pillIdx = leftIdx + s.left.split(' ').length;
  const restIdx = pillIdx + 2;
  const glossIdx = restIdx + s.rest.split(' ').length;
  return (
    <SampleCard
      duration={d}
      prep={s.prep}
      label={s.label}
      emoji={s.emoji}
      left={s.left}
      rest={s.rest}
      gloss={s.gloss}
      titleAt={at(0)}
      labelAt={at(labelIdx)}
      leftAt={at(leftIdx)}
      pillAt={at(pillIdx)}
      restAt={at(restIdx)}
      glossAt={at(glossIdx)}
    />
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['b1'], node: (d) => <HouseKorean d={d} />},
    {ids: ['b2'], node: (d) => <TwoSentences d={d} />},
    {ids: ['b3', 'b4', 'b5'], node: (d) => <MoveHero d={d} />},
    {ids: ['k0'], node: (d) => <EightHeader d={d} />},
    ...SAMPLE_LINES.map((s, i) => ({ids: [s.id], node: (d: number) => <Sample d={d} i={i} />})),
  ];
  return (
    <>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`bridge-${p.ids[0]}`}>
            {p.node(s.duration)}
          </Sequence>
        );
      })}
    </>
  );
};
