import React from 'react';
import {Sequence} from 'remotion';
import {COLORS} from '../theme';
import {SceneSpan} from '../timeline';
import {span, WORD, wf, wfe} from './shared';
import {Demo, ModalBoard, ModalCard, PairBoard, PairCard} from './lesson';

// ---- 1. The six core modals --------------------------------------------------

const VerbBase: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '조동사의 6대 핵심 기본기', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🤝', x: 540, y: 690, size: 150, at: wf('m0', 'm0', '도와줍니다'), motion: 'float'}]}
    rows={[
      {
        y: 320,
        size: 64,
        items: [
          {text: '조동사', kind: 'will', at: wf('m0', 'm0', '조동사는'), glowAt: wf('m0', 'm0', '조동사는') + 8},
          {text: '+', kind: 'sym', at: wf('m0', 'm0', '동사원형을')},
          {text: '동사원형', kind: 'plain', at: wf('m0', 'm0', '동사원형을'), glowAt: wf('m0', 'm0', '동사원형을') + 4},
        ],
      },
    ]}
    footer={{text: '혼자는 ✕ · 반드시 동사원형과 함께 ✓', at: wf('m0', 'm0', '혼자'), y: 480, size: 44}}
  />
);

const SixModals: React.FC<{d: number}> = ({d}) => {
  const at = (id: string, word: string) => wfe('m1', id, word);
  const cards: ModalCard[] = [
    {name: 'Can / Be able to', tag: '가능 · 허가', meaning: '할 수 있다, 해도 된다', kind: 'can', at: at('m1', 'Can')},
    {name: 'Will / Be going to', tag: '의지 · 미래', meaning: '할 것이다, 하겠다', kind: 'will', at: at('m2', 'Will')},
    {name: 'Shall', tag: '제안 · 청유 · 격식', meaning: '할까요? / (법칙적으로) 하리라', kind: 'shall', at: at('m3', 'Shall')},
    {name: 'May', tag: '허가 · 약한 추측', meaning: '해도 좋다, 일지도 모른다', kind: 'may', at: at('m4', 'May')},
    {name: 'Must', tag: '강한 의무 · 확신', meaning: '반드시 해야 한다, 임에 틀림없다', kind: 'must', at: at('m5', 'Must')},
    {name: 'Should', tag: '당위 · 조언 · 기대', meaning: '하는 것이 좋다, 마땅히 일 것이다', kind: 'should', at: at('m6', 'Should')},
  ];
  return <ModalBoard duration={d} title="조동사 6대 핵심 기본기" cards={cards} />;
};

// ---- 2. Past forms = certainty, not tense ------------------------------------

const Twist: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '핵심 반전 🔄', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 310,
        size: 60,
        items: [
          {text: '과거형', kind: 'plain', at: wf('f1', 'f1', '과거형은')},
          {text: '≠', kind: 'sym', at: wf('f1', 'f1', '시제가')},
          {text: '시제', kind: 'warn', at: wf('f1', 'f1', '시제가')},
        ],
      },
      {y: 500, size: 64, items: [{text: '확신의 농도 🧪', kind: 'will', at: wf('f1', 'f1', '확신의'), glowAt: wf('f1', 'f1', '농도입니다')}]},
    ]}
  />
);

const NotPast: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '단순한 과거 시제?', at: 0}}
    rows={[
      {
        y: 310,
        size: 58,
        items: [
          {text: 'could', kind: 'can', at: wfe('f2', 'f2', 'could')},
          {text: 'would', kind: 'will', at: wfe('f2', 'f2', 'would')},
          {text: 'might', kind: 'may', at: wfe('f2', 'f2', 'might')},
          {text: 'should', kind: 'should', at: wfe('f2', 'f2', 'should')},
        ],
      },
      {y: 520, size: 50, items: [{text: '“옛날에 ~했다” ✕', kind: 'warn', at: wf('f2', 'f2', '옛날에')}]},
    ]}
  />
);

const SafetyNet: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '현대 영어 회화의 과거형', at: 0}}
    emojis={[{emoji: '🛡️', x: 540, y: 700, size: 200, at: wf('f3', 'f3', '안전장치로'), motion: 'pulse'}]}
    rows={[
      {y: 290, size: 50, items: [{text: '현실과 거리 두기', kind: 'plain', at: wf('f3', 'f3', '현실과')}]},
      {
        y: 450,
        size: 46,
        items: [
          {text: '불확실한 추측', kind: 'may', at: wf('f3', 'f3', '불확실한')},
          {text: '조심스러운 뉘앙스', kind: 'can', at: wf('f3', 'f3', '조심스러운')},
        ],
      },
    ]}
  />
);

const Certainty: React.FC<{d: number}> = ({d}) => {
  const e = (id: string, word: string, nth = 0) => wfe('g1', id, word, nth);
  const pairs: PairCard[] = [
    {base: 'Can', past: 'Could', kind: 'can', baseNote: '100% 가능', pastNote: '50% 부드러운 가능성', pct: [100, 50], baseAt: e('g1', 'Can'), pastAt: e('g1', 'Could')},
    {base: 'May', past: 'Might', kind: 'may', baseNote: '50% 추측', pastNote: '30% 이하 아슬아슬', pct: [50, 30], baseAt: e('g2', 'May'), pastAt: e('g2', 'Might')},
    {
      base: 'Will',
      past: 'Would',
      kind: 'will',
      baseNote: '단정한 미래',
      pastNote: '가상 상황의 추측',
      foot: '현실에서 한 발 물러선 추측',
      baseAt: e('g3', 'Will'),
      pastAt: e('g3', 'Would'),
      footAt: wf('g1', 'g3', '전제로'),
    },
    {
      base: 'Shall',
      past: 'Should',
      kind: 'should',
      baseKind: 'shall',
      baseNote: '정중한 제안 · 의지',
      pastNote: '마땅한 당위',
      foot: 'should have p.p. = 했어야 했는데 (후회·추정)',
      baseAt: e('g4', 'Shall'),
      pastAt: e('g4', 'Should'),
      footAt: e('g4', 'should', 1),
    },
  ];
  return <PairBoard duration={d} title="조동사 과거형 = 확신의 농도 ↓" pairs={pairs} />;
};

// ---- 3. Shall vs. Should -----------------------------------------------------

const ShallNuance: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'Shall 의 뉘앙스', at: 0, color: WORD.shall.main}}
    emojis={[{emoji: '🤝', x: 540, y: 720, size: 150, at: wf('n1', 'n1', '물어볼'), motion: 'float'}]}
    rows={[
      {
        y: 310,
        size: 62,
        items: [
          {text: 'Shall we ...?', kind: 'shall', at: wfe('n1', 'n1', 'Shall', 1), glowAt: wfe('n1', 'n1', 'Shall', 1) + 6},
          {text: '= 할까요?', kind: 'plain', at: wf('n1', 'n1', '할까요')},
        ],
      },
      {y: 500, size: 40, items: [{text: '격식체: 법률 · 정해진 운명 ⚖️', kind: 'plain', at: wf('n1', 'n1', '격식체에서는')}]},
    ]}
  />
);

const ShouldNuance: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'Should 의 뉘앙스', at: 0, color: WORD.should.main}}
    rows={[
      {
        y: 300,
        size: 58,
        items: [
          {text: 'shall', kind: 'shall', at: wfe('n2', 'n2', 'shall')},
          {text: '→', kind: 'sym', at: wf('n2', 'n2', '과거형에서')},
          {text: 'should', kind: 'should', at: wf('n2', 'n2', '출발했지만'), glowAt: wf('n2', 'n2', '이치상')},
        ],
      },
      {y: 480, size: 42, items: [{text: '이치상 당연히 ~하는 게 맞아', kind: 'plain', at: wf('n2', 'n2', '이치상')}]},
      {y: 620, size: 46, items: [{text: '조언 · 기대', kind: 'should', at: wf('n2', 'n2', '조언이나')}]},
    ]}
  />
);

const ShouldGuess: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'should = 추측', at: 0, color: WORD.should.main}}
    emojis={[{emoji: '🎯', x: 540, y: 720, size: 130, at: wf('n3', 'n3', '확신을'), motion: 'pulse'}]}
    rows={[
      {y: 310, size: 58, items: [{text: 'should + 동사', kind: 'should', at: wf('n3', 'n3', '추측으로')}]},
      {y: 470, size: 42, items: [{text: '상황을 볼 때 당연히 ~일 것이다', kind: 'plain', at: wf('n3', 'n3', '상황을')}]},
      {y: 600, size: 46, items: [{text: '기대가 섞인 확신', kind: 'should', at: wf('n3', 'n3', '기대가')}]},
    ]}
  />
);

const ShouldHave: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: 'should have p.p.', at: 0, color: WORD.should.main}}
    emojis={[{emoji: '😔', x: 540, y: 730, size: 140, at: wf('n4', 'n4', '아쉬움이나'), motion: 'float'}]}
    rows={[
      {y: 310, size: 64, items: [{text: 'should have p.p.', kind: 'should', at: wfe('n4', 'n4', 'should'), glowAt: wf('n4', 'n4', '그때')}]},
      {y: 480, size: 44, items: [{text: '그때 ~했어야 마땅했는데…', kind: 'plain', at: wf('n4', 'n4', '그때')}]},
      {y: 610, size: 44, items: [{text: '아쉬움 · 추정', kind: 'should', at: wf('n4', 'n4', '아쉬움이나')}]},
    ]}
  />
);

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['m0'], node: (d) => <VerbBase d={d} />},
    {ids: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], node: (d) => <SixModals d={d} />},
    {ids: ['f1'], node: (d) => <Twist d={d} />},
    {ids: ['f2'], node: (d) => <NotPast d={d} />},
    {ids: ['f3'], node: (d) => <SafetyNet d={d} />},
    {ids: ['g1', 'g2', 'g3', 'g4'], node: (d) => <Certainty d={d} />},
    {ids: ['n1'], node: (d) => <ShallNuance d={d} />},
    {ids: ['n2'], node: (d) => <ShouldNuance d={d} />},
    {ids: ['n3'], node: (d) => <ShouldGuess d={d} />},
    {ids: ['n4'], node: (d) => <ShouldHave d={d} />},
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
