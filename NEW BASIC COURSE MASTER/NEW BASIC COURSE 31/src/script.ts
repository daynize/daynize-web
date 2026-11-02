import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type PrepName = 'in' | 'on' | 'at' | 'of' | 'for' | 'from' | 'by' | 'with';
/** Prepositions taught in this video (9-1강: in, on, at). */
export const PREP_NAMES: PrepName[] = ['in', 'on', 'at'];
export type Place = 'city' | 'street' | 'bookstore' | 'night' | 'heart' | 'greeting';

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

/** One story example: `left` + the pill `word` ("in which" ...) + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  prep: PrepName;
  /** e.g. IN WHICH */
  tag: string;
  /** Meaning, e.g. 공간 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  city: {label: '🏙️  아름다운 도시 · The city', mood: 'morning'},
  street: {label: '🪑  거리 한쪽 · The street', mood: 'autumn'},
  bookstore: {label: '📚  고풍스러운 서점 · The bookstore', mood: 'cafe'},
  night: {label: '🌙  서점의 밤 · The night', mood: 'night'},
  heart: {label: '💛  이어지는 마음 · Hearts', mood: 'sunrise'},
  greeting: {label: '✉️  첫 인사 · The greeting', mood: 'sunny'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'city', kr: '그는 아름다운 도시 하나를 방문했습니다. 그런데 그 도시 안에서 새로운 꿈이 시작되었죠.', prep: 'in', tag: 'IN WHICH', rule: '공간',
    left: w('He visited a beautiful city'), word: 'in which', right: w('his new dream began.'),
    actors: [{who: 'he', x0: 400, x1: 640}],
    props: [
      {emoji: '🏙️', x: 1120, y: 540, size: 150, motion: 'float'},
      {emoji: '🌠', x: 1400, y: 450, size: 110, motion: 'pulse'},
      {emoji: '✨', x: 1570, y: 540, size: 90, motion: 'pulse'},
    ],
  },
  {
    id: 's02', place: 'street', kr: '거리 한쪽에 자그마한 테이블이 놓여 있었습니다. 그런데 그 테이블 위에 오래된 상자가 하나 놓여 있었죠.', prep: 'on', tag: 'ON WHICH', rule: '표면',
    left: w('There was a small table'), word: 'on which', right: w('an old box was placed.'),
    actors: [{who: 'she', x0: 560, x1: 560}],
    props: [
      {emoji: '🪑', x: 1120, y: 580, size: 140, motion: 'none'},
      {emoji: '📦', x: 1360, y: 540, size: 130, motion: 'float'},
      {emoji: '🍂', x: 1560, y: 460, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'bookstore', kr: '마침내 서점 문이 열리는 정각이 되었습니다. 그런데 그 시점에 한 여인이 서점으로 걸어왔습니다.', prep: 'at', tag: 'AT WHICH', rule: '특정 시점',
    left: w('It reached the exact time'), word: 'at which', right: w('the bookstore opened.'),
    actors: [{who: 'she', x0: 300, x1: 700}],
    props: [
      {emoji: '🕰️', x: 1120, y: 520, size: 140, motion: 'pulse'},
      {emoji: '🚪', x: 1380, y: 540, size: 150, motion: 'none'},
      {emoji: '📚', x: 1570, y: 590, size: 110, motion: 'float'},
    ],
  },
];

/** Subtitle markup letter per preposition. */
export const PREP_KIND: Record<PrepName, 'v' | 'p' | 'y' | 'c' | 'g' | 'b' | 'm' | 'l'> = {
  in: 'v',
  on: 'p',
  at: 'y',
  of: 'c',
  for: 'g',
  from: 'b',
  by: 'm',
  with: 'l',
};

/** One of the eight typical "<prep> which" examples (explanation part). */
export interface SampleLine {
  id: string;
  prep: PrepName;
  /** Spoken + shown meaning, e.g. 공간, 장소, 시간 */
  label: string;
  emoji: string;
  /** English example split around the pill. */
  left: string;
  rest: string;
  /** Korean meaning of the example. */
  gloss: string;
}

export const SAMPLE_LINES: SampleLine[] = [
  {id: 'k1', prep: 'in', label: '공간, 장소, 시간', emoji: '🏠', left: 'This is the room', rest: 'I study.', gloss: '이것은 방이다, 그런데 그 방 안에서 나는 공부한다.'},
  {id: 'k2', prep: 'on', label: '표면, 날짜', emoji: '📚', left: 'There is a table', rest: 'books are placed.', gloss: '테이블이 하나 있다, 그런데 그 표면 위에 책들이 놓여 있다.'},
  {id: 'k3', prep: 'at', label: '특정 시점, 장소', emoji: '⏰', left: 'He specified the time', rest: 'we should meet.', gloss: '그는 시간을 지정했다, 그런데 그 시점에 우리가 만나야 한다.'},
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase; `{v|p|y|c|g|b|m|l|}` colour an English phrase by preposition. */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

// The English line: the "<prep> which" pill is coloured by preposition, the rest is plain.
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map((p) => `{e|${p.text}}`), `{${PREP_KIND[line.prep]}|${line.word}}`, ...line.right.map((p) => `{e|${p.text}}`)].join(' ');

const sampleKr = (s: SampleLine) =>
  `{${PREP_KIND[s.prep]}|${s.prep} which}는 ${s.label}입니다. {e|${s.left}} {${PREP_KIND[s.prep]}|${s.prep} which} {e|${s.rest}} ${s.gloss}`;

const k = (p: PrepName, text: string) => `{${PREP_KIND[p]}|${text}}`;

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '우리가 지난 시간에 배웠듯이, 관계대명사는 접속사와 대명사가 하나로 합쳐진 요술봉이라고 했습니다.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '사물 뒤에서 “그런데 이것은...” 하고 부드럽게 말을 이어주는 것이 바로 {e|which}였죠.', pad: 0.6},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: `그렇다면 ${PREP_NAMES.map((p) => k(p, `${p} which`)).join(', ')} 같은 녀석들은 대체 왜 이렇게 길고 복잡해 보이는 걸까요?`, pad: 0.7},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '이유는 아주 간단하고 명쾌합니다!', pad: 0.5},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: `원래 문장 맨 뒤에서 명사와 짝을 이루던 전치사, ${PREP_NAMES.map((p) => k(p, p)).join(', ')}가, 문장이 길어지면서 뒤에 혼자 덩그러니 남겨져 외로워졌기 때문입니다.`, pad: 0.7},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '그래서 이 전치사가 자신의 짝꿍이었던 대명사를 끌어안은 관계대명사 {e|which} 바로 앞으로 찰싹 붙어 이동한 것뿐입니다!', pad: 0.8},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: '원리를 알면 해석도 직관적입니다.', pad: 0.4},
  {id: 'i8', scene: 'intro', mood: 'dawn', kr: `${k('in', 'in which')}는 “그런데 그 공간, 시간 안에서...”`, pad: 0.5},
  {id: 'i9', scene: 'intro', mood: 'dawn', kr: `${k('on', 'on which')}는 “그런데 그 표면, 날짜 위에...”`, pad: 0.5},
  {id: 'i10', scene: 'intro', mood: 'dawn', kr: `${k('at', 'at which')}는 “그런데 그 특정 시점, 장소에서...”`, pad: 0.5},
  {id: 'i16', scene: 'intro', mood: 'dawn', kr: '복잡한 공식을 암기할 필요 없이, “전치사 뜻 + 그런데 그것은!” 하고 매끄럽게 해석하면 깔끔하게 직관을 얻을 수 있습니다.', pad: 0.8},
];

export const BRIDGE_CUES: CueDef[] = [
  {id: 'b1', scene: 'bridge', mood: 'bridge', kr: '그렇다면 왜 전치사가 앞으로 당겨져 올까요? 예를 들어, “나는 집을 한 채 샀는데, 그 집 안에서 살고 있다”라고 할 때', pad: 0.4},
  {id: 'b2', scene: 'bridge', mood: 'bridge', kr: '두 문장으로 쓰면 {e|I bought a house}와 {e|I live in the house}입니다.', pad: 0.5},
  {id: 'b3', scene: 'bridge', mood: 'bridge', kr: '이 두 문장을 관계대명사 {e|which}로 잇되 전치사를 맨 뒤에 그냥 두면 {e|I bought a house which I live in}이 됩니다.', pad: 0.5},
  {id: 'b4', scene: 'bridge', mood: 'bridge', kr: `하지만 문장 끝에 ${k('in', 'in')} 혼자 덩그러니 남겨져 있으면 외롭고 세련되지 못한 문장이 되죠.`, pad: 0.4},
  {id: 'b5', scene: 'bridge', mood: 'bridge', kr: `그래서 전치사 ${k('in', 'in')}이 자신의 짝이었던 {e|which} 바로 앞으로 찰싹 당겨져 와 {e|I bought a house in which I live}가 되는 것입니다.`, pad: 1.2},
  {id: 'k0', scene: 'bridge', mood: 'bridge', kr: '3가지 주요 전치사 결합형을 직관적으로 확인해 볼까요?', pad: 0.6},
  ...SAMPLE_LINES.map((s): CueDef => ({id: s.id, scene: 'bridge', mood: 'bridge', kr: sampleKr(s), pad: 0.8})),
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: `오늘은 문장 맨 뒤에 홀로 남아 외로워하던 전치사가 관계대명사 앞으로 당겨져 오는 ${PREP_NAMES.map((p) => k(p, p)).join(', ')} {e|which}의 원리를 배웠습니다.`, pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '어렵게 생각할 필요 없이 “전치사의 원래 뜻 + 그런데 그것은!”으로 직관적으로 해석하는 원리를 꼭 기억하세요.', pad: 0.5},
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
