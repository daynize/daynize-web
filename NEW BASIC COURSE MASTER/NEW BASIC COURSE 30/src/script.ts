import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type WordKey = 'one' | 'another' | 'other' | 'theother';
export type Place = 'table' | 'pocket';

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

/** One story example: `left` + the popped word `word` + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: WordKey;
  /** e.g. THE OTHER */
  tag: string;
  /** Why this word, e.g. 정해진 나머지 전부 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  table: {label: '🍎  카페 테이블 · The table', mood: 'cafe'},
  pocket: {label: '🪙  주머니 속 · The pocket', mood: 'autumn'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'table', kr: '그는 테이블 위에 놓인 사과 10개 중 가장 먼저 빨간 사과 하나를 집어 들었습니다.', kind: 'one', tag: 'ONE', rule: '첫 번째',
    left: w('He picked'), word: 'one', right: w('red apple out of ten.'),
    actors: [{who: 'he', x0: 420, x1: 640}],
    props: [
      {emoji: '🍎', x: 1100, y: 540, size: 140, motion: 'float'},
      {emoji: '🧺', x: 1380, y: 580, size: 150, motion: 'none'},
      {emoji: '☝️', x: 1570, y: 470, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's02', place: 'table', kr: '그리고 아직 많이 남아있는 사과들 중 또 다른 사과 하나를 맛있게 베어 물었죠.', kind: 'another', tag: 'ANOTHER', rule: '막연한 하나 더',
    left: w('He took a bite of'), word: 'another', right: w('apple.'),
    actors: [{who: 'he', x0: 600, x1: 600, wave: true}],
    props: [
      {emoji: '🍎', x: 1100, y: 540, size: 140, motion: 'pulse'},
      {emoji: '🍎', x: 1330, y: 580, size: 110, motion: 'float'},
      {emoji: '😋', x: 1560, y: 470, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'table', kr: '이어서 친구들에게 줄 다른 사과 두 개를 접시 위에 놓았습니다.', kind: 'other', tag: 'OTHER', rule: '막연한 여러 개',
    left: w('He placed two'), word: 'other', right: w('apples on the plate.'),
    actors: [{who: 'he', x0: 420, x1: 640}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🍎', x: 1100, y: 560, size: 120, motion: 'float'},
      {emoji: '🍎', x: 1250, y: 560, size: 120, motion: 'float'},
      {emoji: '🍽️', x: 1450, y: 580, size: 140, motion: 'none'},
    ],
  },
  {
    id: 's04', place: 'table', kr: '이제 바구니에 남은 사과는 딱 두 개뿐이었습니다. 그는 남은 사과 전부를 가방에 챙겼습니다.', kind: 'theother', tag: 'THE OTHER APPLES', rule: '정해진 나머지 전부',
    left: w('He packed'), word: 'the other', right: w('apples into his bag.'),
    actors: [{who: 'he', x0: 560, x1: 560}],
    props: [
      {emoji: '🍎', x: 1100, y: 540, size: 130, motion: 'pulse'},
      {emoji: '🍎', x: 1250, y: 560, size: 130, motion: 'pulse'},
      {emoji: '🎒', x: 1450, y: 570, size: 140, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'pocket', kr: '주머니 속을 뒤져보니 동전 두 개가 잡혔습니다. 하나는 100원짜리였고, 마지막 남은 동전 하나는 500원짜리였죠.', kind: 'theother', tag: 'THE OTHER', rule: '둘 중 정해진 마지막 하나',
    left: w('He had two coins; one was 100 won, and'), word: 'the other', right: w('was 500 won.'),
    actors: [{who: 'he', x0: 560, x1: 560}],
    props: [
      {emoji: '🪙', x: 1100, y: 540, size: 130, motion: 'float'},
      {emoji: '🪙', x: 1300, y: 560, size: 150, motion: 'pulse'},
      {emoji: '✨', x: 1500, y: 450, size: 100, motion: 'pulse'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase; `{v|}` another (teal), `{b|}` other(s) (blue), `{p|}` the other(s) (orange). */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

// The English line: the popped word is coloured by type, the rest is plain.
export const storyEnMarkup = (line: StoryLine) => {
  const kind = line.kind === 'one' ? 'e' : line.kind === 'another' ? 'v' : line.kind === 'other' ? 'b' : 'p';
  return [...line.left.map((p) => `{e|${p.text}}`), `{${kind}|${line.word}}`, ...line.right.map((p) => `{e|${p.text}}`)].join(' ');
};

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '우리가 상자 안에서 사과나 볼펜을 하나씩 꺼낼 때, 영어는 손에 남은 나머지가 몇 개인지, 그리고 그 개수가 확실히 정해져 있는지에 따라 쓰는 단어를 철저하게 구별합니다.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 {v|another}, {b|other}, {p|the other}입니다.', pad: 0.6},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '어려운 문법 용어 대신, 손에 남은 사과의 개수만 떠올리면 됩니다!', pad: 0.6},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '{v|another}는 {e|an}에 {e|other}가 합쳐진 말로, 나머지가 있는 하나 더, 단수입니다.', pad: 0.5},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '{b|other}, {b|others}는 나머지가 있는 여러 개, 복수입니다.', pad: 0.5},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '{p|the other}는 마지막으로 딱 정해진 남은 하나, 단수이거나, {p|the others}, 정해진 남은 여러 개, 복수입니다.', pad: 0.6},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: '여기서 {e|the}는 “너도 알고 나도 아는 정해진 그것”을 딱 집어내는 족집게 손가락 역할을 합니다!', pad: 0.8},
];

export const BRIDGE_CUES: CueDef[] = [
  {id: 'a0', scene: 'bridge', mood: 'bridge', kr: '여기에 탐스러운 사과 10개가 담긴 바구니가 있다고 생각해 봅시다.', pad: 0.5},
  {id: 'a1', scene: 'bridge', mood: 'bridge', kr: '가장 처음에 꺼내는 사과 하나는 당연히 {e|one}입니다.', pad: 0.5},
  {id: 'a2', scene: 'bridge', mood: 'bridge', kr: '아직 바구니에 사과가 많이 남아있죠? 그래서 그다음 꺼내는 하나는 막연한 하나 더, {v|another apple}이 됩니다.', pad: 0.5},
  {id: 'a3', scene: 'bridge', mood: 'bridge', kr: '사과 2개나 3개를 한 번에 집어 올릴 때는, 막연한 여러 개이므로 {b|other apples}가 됩니다.', pad: 0.5},
  {id: 'a4', scene: 'bridge', mood: 'bridge', kr: '사과를 계속 꺼내고 바구니에 딱 2개가 남았습니다. 이제 남은 사과 전체가 눈에 딱 보이죠?', pad: 0.4},
  {id: 'a5', scene: 'bridge', mood: 'bridge', kr: '이 남은 사과 2개 전부를 가리킬 때는 족집게 {e|the}가 붙어 {p|the other apples}가 되는 것입니다!', pad: 1.0},

  {id: 'c1', scene: 'bridge', mood: 'bridge', kr: '다시 사과 10개를 바구니에 넣고 시작해 볼까요? 10개 중 처음에 집어 든 사과 하나는 {e|one}입니다.', pad: 0.4},
  {id: 'c2', scene: 'bridge', mood: 'bridge', kr: '그렇다면 손에 든 1개를 뺀 나머지 9개 전부는 눈에 명확히 보이는 정해진 남은 전부죠?', pad: 0.4},
  {id: 'c3', scene: 'bridge', mood: 'bridge', kr: '그래서 이 나머지 9개 전부는 바로 {p|the other apples}, 또는 {p|the others}가 되는 것입니다!', pad: 1.0},

  {id: 'd1', scene: 'bridge', mood: 'bridge', kr: '만약 사과가 딱 2개밖에 없는데, 하나를 먹고 마지막 남은 사과 하나를 가리키면서', pad: 0.3},
  {id: 'd2', scene: 'bridge', mood: 'bridge', kr: '{e|Give me another apple}이라고 말하면 아주 어색하고 틀린 표현이 됩니다.', pad: 0.3},
  {id: 'd3', scene: 'bridge', mood: 'bridge', kr: '남은 1개가 눈에 확실히 정해져 있으므로 {e|Give me the other apple}이라고 말해야 비로소 완벽한 문장이 됩니다.', pad: 1.2},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 사과의 개수로 {v|another}, {b|other}, {p|the other}의 차이를 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '남은 게 많아 막연하면 {v|another}와 {b|other}, 남은 게 눈에 딱 보여서 정해졌다면 족집게 {e|the}가 붙은 {p|the other}와 {p|the others}가 된다는 점을 꼭 기억하세요.', pad: 0.5},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '배운 내용을 스스로에게 다시 한 번 설명해 보시기 바랍니다.', pad: 0.5},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '감사합니다.', pad: 2},
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
