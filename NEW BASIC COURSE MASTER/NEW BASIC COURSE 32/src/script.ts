import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

/** Colour family of a modal: can/could, will/would, shall, may/might, must, should(+have p.p.). */
export type WordKey = 'can' | 'will' | 'shall' | 'may' | 'must' | 'should';
export type Place = 'alley' | 'door' | 'cafe';

export interface ActorDef {
  who: 'he' | 'she';
  x0: number;
  x1: number;
  flip?: boolean;
  wave?: boolean;
}

export interface PropDef {
  emoji: string;
  x: number;
  y: number;
  size: number;
  motion?: 'float' | 'pulse' | 'drive' | 'none';
  dx?: number;
  fadeOut?: boolean;
}

/** One story example: `left` + the popped modal `word` + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: WordKey;
  /** e.g. SHOULD HAVE */
  tag: string;
  /** Why this modal, e.g. 했어야 했는데 · 후회 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  alley: {label: '🌙  골목길 · Alley', mood: 'night'},
  door: {label: '🏢  건물 앞 · Building', mood: 'taxi'},
  cafe: {label: '☕  카페 2층 · Cafe 2F', mood: 'cafe'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  // ---- Part 1. 기본형 (현재 / 의지 / 제안 / 의무 / 당위) ----
  {
    id: 's01', place: 'alley', kr: '어두운 골목길 너머로 희미한 피아노 선율을 들을 수 있다.', kind: 'can', tag: 'CAN', rule: '가능 · 할 수 있다',
    left: w('You'), word: 'can', right: w('hear a faint piano melody from the dark alley.'),
    actors: [{who: 'he', x0: 420, x1: 640}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '🎵', x: 1370, y: 450, size: 100, motion: 'pulse'},
      {emoji: '🌙', x: 1580, y: 430, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'alley', kr: '내가 자정에 누군가 연주하는 그 음악의 정체를 찾아내고 말겠다.', kind: 'will', tag: 'WILL', rule: '의지 · 하고 말겠다',
    left: w('I'), word: 'will', right: w('find out who is playing the music at midnight.'),
    actors: [{who: 'he', x0: 460, x1: 660}],
    props: [
      {emoji: '🔍', x: 1130, y: 540, size: 130, motion: 'pulse'},
      {emoji: '🕛', x: 1360, y: 470, size: 120, motion: 'float'},
      {emoji: '🎼', x: 1580, y: 560, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'alley', kr: '우리 함께 이 침묵에 휩싸인 건물 안으로 걸어 들어가 볼까요?', kind: 'shall', tag: 'SHALL', rule: '제안 · 할까요?',
    left: w(''), word: 'Shall', right: w('we step into the silent building together?'),
    actors: [{who: 'he', x0: 420, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🏢', x: 1200, y: 540, size: 160, motion: 'none'},
      {emoji: '🚪', x: 1440, y: 590, size: 130, motion: 'pulse'},
      {emoji: '🤫', x: 1620, y: 450, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'door', kr: '시계가 1시를 치기 전에 우리는 저 건물 안으로 들어가야만 한다.', kind: 'must', tag: 'MUST', rule: '강한 의무 · 반드시',
    left: w('We'), word: 'must', right: w('enter the building before the clock strikes one.'),
    actors: [{who: 'he', x0: 400, x1: 640}, {who: 'she', x0: 860, x1: 780, flip: true}],
    props: [
      {emoji: '🕐', x: 1150, y: 520, size: 140, motion: 'pulse'},
      {emoji: '🏢', x: 1400, y: 560, size: 150, motion: 'none'},
      {emoji: '⏰', x: 1620, y: 450, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'door', kr: '너는 밤의 리듬에 마땅히 귀를 기울이는 것이 좋다.', kind: 'should', tag: 'SHOULD', rule: '당위 · 조언',
    left: w('You'), word: 'should', right: w('listen closely to the rhythm of the night.'),
    actors: [{who: 'she', x0: 560, x1: 560, wave: true}],
    props: [
      {emoji: '🎧', x: 1130, y: 540, size: 140, motion: 'float'},
      {emoji: '🌃', x: 1400, y: 560, size: 150, motion: 'none'},
      {emoji: '🎶', x: 1610, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's06', place: 'door', kr: '밤이 되면 네온사인 간판이 당연히 자동으로 켜질 것이다.', kind: 'should', tag: 'SHOULD', rule: '기대 · 당연히 일 것이다',
    left: w('The neon sign'), word: 'should', right: w('turn on automatically at night.'),
    actors: [{who: 'he', x0: 500, x1: 500}],
    props: [
      {emoji: '💡', x: 1150, y: 520, size: 140, motion: 'pulse'},
      {emoji: '🌆', x: 1400, y: 560, size: 150, motion: 'none'},
      {emoji: '✨', x: 1610, y: 440, size: 100, motion: 'float'},
    ],
  },

  // ---- Part 2. 과거형 & 추측 / 불확실성 ----
  {
    id: 's07', place: 'cafe', kr: '어쩌면 그 신비로운 피아니스트는 도시의 정령일 수도 있다.', kind: 'can', tag: 'COULD', rule: '부드러운 가능성 · 50%',
    left: w('The mysterious pianist'), word: 'could', right: w('be a spirit of the city.'),
    actors: [{who: 'she', x0: 520, x1: 520}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '🧚', x: 1400, y: 500, size: 130, motion: 'float'},
      {emoji: '✨', x: 1610, y: 430, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's08', place: 'cafe', kr: '그는 피아노 의자 밑에 비밀 일기장을 숨겨두었을지도 모른다.', kind: 'may', tag: 'MIGHT HAVE', rule: '과거에 대한 불확실한 추측',
    left: w('He'), word: 'might have', right: w('hidden a secret diary under the piano seat.'),
    actors: [{who: 'he', x0: 460, x1: 460}],
    props: [
      {emoji: '📔', x: 1150, y: 560, size: 130, motion: 'float'},
      {emoji: '🎹', x: 1400, y: 540, size: 140, motion: 'none'},
      {emoji: '🤫', x: 1610, y: 440, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's09', place: 'cafe', kr: '저 푸른 불꽃이라면 아마 텅 빈 방 전체를 밝혀줄 텐데.', kind: 'will', tag: 'WOULD', rule: '가상 상황의 추측',
    left: w('That blue flame'), word: 'would', right: w('illuminate the entire empty room.'),
    actors: [{who: 'she', x0: 480, x1: 600}],
    props: [
      {emoji: '🔥', x: 1150, y: 530, size: 150, motion: 'pulse'},
      {emoji: '🕯️', x: 1400, y: 560, size: 120, motion: 'float'},
      {emoji: '🏚️', x: 1620, y: 540, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's10', place: 'cafe', kr: '누군가 불과 1분 전에 이 커피 잔을 남겨두고 떠났을 수도 있다.', kind: 'can', tag: 'COULD HAVE', rule: '과거에 대한 추측',
    left: w('Someone'), word: 'could have', right: w('left this coffee cup just a minute ago.'),
    actors: [{who: 'he', x0: 420, x1: 620}],
    props: [
      {emoji: '☕', x: 1150, y: 550, size: 140, motion: 'float'},
      {emoji: '⏱️', x: 1400, y: 500, size: 120, motion: 'pulse'},
      {emoji: '👣', x: 1620, y: 590, size: 100, motion: 'drive', dx: 120},
    ],
  },
  {
    id: 's11', place: 'cafe', kr: '우리가 작은 랜턴을 챙겨왔어야 했는데 그러지 못했다.', kind: 'should', tag: 'SHOULD HAVE', rule: '했어야 했는데 · 후회',
    left: w('We'), word: 'should have', right: w('brought a small lantern with us.'),
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🏮', x: 1180, y: 540, size: 140, motion: 'float'},
      {emoji: '🎒', x: 1420, y: 570, size: 130, motion: 'none'},
      {emoji: '😔', x: 1620, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's12', place: 'cafe', kr: '이런 마법 같은 밤이라면 우리의 지루한 일상을 영원히 바꿔놓을 텐데.', kind: 'will', tag: 'WOULD', rule: '가상 상황의 추측',
    left: w('A magical night like this'), word: 'would', right: w('change our daily routine forever.'),
    actors: [{who: 'he', x0: 460, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🌙', x: 1170, y: 470, size: 130, motion: 'float'},
      {emoji: '✨', x: 1400, y: 560, size: 120, motion: 'pulse'},
      {emoji: '🌃', x: 1620, y: 540, size: 140, motion: 'none'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /**
   * Korean narration (ALL of it is read by the Korean voice). `{e|text}` = English phrase, `{y|}` emphasis;
   * modal colours: `{v|}` can/could, `{p|}` will/would, `{l|}` shall, `{b|}` may/might, `{c|}` must, `{g|}` should.
   */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const KIND_LETTER: Record<WordKey, string> = {can: 'v', will: 'p', shall: 'l', may: 'b', must: 'c', should: 'g'};

// The English line (read by the English voice): the modal is coloured by family, the rest is plain.
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map((p) => `{e|${p.text}}`), `{${KIND_LETTER[line.kind]}|${line.word}}`, ...line.right.map((p) => `{e|${p.text}}`)].join(' ');

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '이런 말을 한다고 칩시다. 같은 조건이었으면, 나도 했지… 나도 그랬겠지.', pad: 0.7},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '아, 과거형이니까, {e|I did so}로 쓰면 되겠구나! 하지만, 여전히 그랬겠지는 표현이 안됩니다. 오늘 그 표현을 배웁니다.', pad: 0.8},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '문장에서 동사는 행동을 나타낸다면, 조동사는 그 행동에 말하는 사람의 {y|태도, 능력, 의지, 확신의 정도}라는 색깔을 입혀주는 역할을 합니다.', pad: 0.8},
];

export const BRIDGE_CUES: CueDef[] = [
  // 1. 조동사의 6대 핵심 기본기
  {id: 'm0', scene: 'bridge', mood: 'bridge', kr: '먼저 조동사의 6대 핵심 기본기입니다. 조동사는 혼자 쓰이지 않고, 반드시 뒤에 {y|동사원형}을 동반하여 동사를 도와줍니다.', pad: 0.6},
  {id: 'm1', scene: 'bridge', mood: 'bridge', kr: '첫째, {v|Can}, {v|Be able to}. 가능과 허가입니다. 할 수 있다, 해도 된다.', pad: 0.4},
  {id: 'm2', scene: 'bridge', mood: 'bridge', kr: '둘째, {p|Will}, {p|Be going to}. 의지와 미래입니다. 할 것이다, 하겠다.', pad: 0.4},
  {id: 'm3', scene: 'bridge', mood: 'bridge', kr: '셋째, {l|Shall}. 제안, 청유, 격식입니다. 할까요? 그리고 법칙적으로 하리라.', pad: 0.4},
  {id: 'm4', scene: 'bridge', mood: 'bridge', kr: '넷째, {b|May}. 허가와 약한 추측입니다. 해도 좋다, 일지도 모른다.', pad: 0.4},
  {id: 'm5', scene: 'bridge', mood: 'bridge', kr: '다섯째, {c|Must}. 강한 의무와 확신입니다. 반드시 해야 한다, 임에 틀림없다.', pad: 0.4},
  {id: 'm6', scene: 'bridge', mood: 'bridge', kr: '여섯째, {g|Should}. 당위, 조언, 자연스러운 기대입니다. 하는 것이 좋다, 마땅히 일 것이다.', pad: 0.8},

  // 2. 과거형은 시제가 아니라 확신의 농도
  {id: 'f1', scene: 'bridge', mood: 'bridge', kr: '핵심 반전입니다! 조동사의 과거형은 시제가 아니라, {y|확신의 농도}입니다!', pad: 0.5},
  {id: 'f2', scene: 'bridge', mood: 'bridge', kr: '많은 분들이 {v|could}, {p|would}, {b|might}, {g|should}를 단순히 옛날에 했다는 과거 시제로만 생각합니다.', pad: 0.4},
  {id: 'f3', scene: 'bridge', mood: 'bridge', kr: '하지만 실제 현대 영어 회화에서 조동사의 과거형은, 현실과 거리를 두어 불확실한 추측이나 조심스러운 뉘앙스를 만드는 {y|안전장치}로 훨씬 많이 쓰입니다.', pad: 0.8},
  {id: 'g1', scene: 'bridge', mood: 'bridge', kr: '{v|Can}은 100% 가능, {v|Could}는 50% 정도의 부드러운 가능성입니다.', pad: 0.6},
  {id: 'g2', scene: 'bridge', mood: 'bridge', kr: '{b|May}는 50% 추측, {b|Might}는 30% 이하의 아슬아슬한 불확실성입니다.', pad: 0.6},
  {id: 'g3', scene: 'bridge', mood: 'bridge', kr: '{p|Will}은 단정한 미래, {p|Would}는 가상의 상황을 전제로 한 추측입니다.', pad: 0.6},
  {id: 'g4', scene: 'bridge', mood: 'bridge', kr: '{l|Shall}은 정중한 제안과 의지, {g|Should}는 마땅한 당위입니다. 그리고 {g|should have p.p.}는, 했어야 했는데 안 했다는 후회나 추정을 나타냅니다.', pad: 1.0},

  // 3. Shall과 Should의 뉘앙스 포인트
  {id: 'n1', scene: 'bridge', mood: 'bridge', kr: '{l|Shall}은 회화에서 {l|Shall we}...? 할까요? 형태로, 상대방의 의사를 부드럽게 물어볼 때 가장 많이 쓰입니다. 격식체에서는 법률이나 정해진 운명을 나타내기도 합니다.', pad: 0.8},
  {id: 'n2', scene: 'bridge', mood: 'bridge', kr: '{g|Should}는 원래 {l|shall}의 과거형에서 출발했지만, 현대 영어에서는 이치상 당연히 하는 게 맞아라는 조언이나 기대를 나타냅니다.', pad: 0.8},
  {id: 'n3', scene: 'bridge', mood: 'bridge', kr: '추측으로 쓰일 때는, 상황을 볼 때 당연히 일 것이다라는 기대가 섞인 확신을 전달합니다.', pad: 0.8},
  {id: 'n4', scene: 'bridge', mood: 'bridge', kr: '그리고 {g|should have p.p.}가 되면, 그때 했어야 마땅했는데라는 불확실한 지난 일에 대한 아쉬움이나 추정을 표현합니다.', pad: 1.2},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘 다룬 조동사 핵심, 딱 두 가지만 기억해 주세요.', pad: 0.5},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '첫째, 조동사의 본질은 행동이 아니라 말하는 사람의 {y|마음의 태도}를 입히는 것입니다.', pad: 0.4},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '{l|Shall we}...?처럼 상대에게 다정하게 제안할 수도 있고, {c|Must}처럼 강한 확신을 남길 수도 있죠.', pad: 0.6},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '둘째, 조동사의 과거형, {v|could}, {b|might}, {p|would}, {g|should}는 지나간 과거가 아니라 {y|확신의 농도를 낮추는} 부드러운 안전장치라는 점입니다.', pad: 0.4},
  {id: 'o5', scene: 'outro', mood: 'sunrise', kr: '100% 확신할 수 없거나, 조심스럽게 내 생각을 던지고 싶을 때 과거형 조동사를 떠올려 보세요.', pad: 0.6},
  {id: 'o6', scene: 'outro', mood: 'sunrise', kr: '도심 속 닫힌 카페 2층의 피아노 소리처럼, 영어 문장도 조동사 하나로 순식간에 묘한 뉘앙스와 분위기를 만들어낼 수 있습니다.', pad: 0.6},
  {id: 'o7', scene: 'outro', mood: 'sunrise', kr: '그래서 처음에 언급했던 나도 그랬겠지라는 표현은, {e|I did so}가 아니라, {p|I would do so}로 표현한다는 겁니다.', pad: 1.2},
  {id: 'o8', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 12개의 도심 동화 예문들을 입으로 직접 중얼거리며 내 것으로 만들어 보세요.', pad: 0.6},
  {id: 'o9', scene: 'outro', mood: 'sunrise', kr: '다음 14강에서도 여러분의 영어가 한 층 더 가벼워지고 깊어질 수 있도록 알찬 콘텐츠로 찾아오겠습니다. 수고 많으셨습니다!', pad: 2},
];

const STORY_CUES: CueDef[] = STORY_LINES.map((line) => ({
  id: line.id,
  scene: 'story',
  mood: PLACES[line.place].mood,
  kr: line.kr,
  en: storyEnMarkup(line),
  pad: 0.5,
}));

export const CUE_DEFS: CueDef[] = [...INTRO_CUES, ...BRIDGE_CUES, ...STORY_CUES, ...OUTRO_CUES];

export const stripMarkup = (s: string) => s.replace(/\{[vpeycgbml]\|([^}]*)\}/g, '$1');
