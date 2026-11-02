import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type PrepName = 'in' | 'on' | 'at' | 'of' | 'for' | 'from' | 'by' | 'with';
/** Prepositions taught in this video (9-2강: of, for, from, by, with). */
export const PREP_NAMES: PrepName[] = ['of', 'for', 'from', 'by', 'with'];
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
    id: 's04', place: 'bookstore', kr: '그곳에는 고풍스러운 시집 한 권이 있었습니다. 그런데 그 시집의 표지는 은은하게 빛나고 있었죠.', prep: 'of', tag: 'OF WHICH', rule: '소유',
    left: w('There was an old poetry book'), word: 'of which', right: w('the cover shone softly.'),
    actors: [{who: 'she', x0: 540, x1: 540}],
    props: [
      {emoji: '📖', x: 1120, y: 560, size: 140, motion: 'float'},
      {emoji: '💫', x: 1380, y: 470, size: 110, motion: 'pulse'},
      {emoji: '📚', x: 1570, y: 580, size: 110, motion: 'none'},
    ],
  },
  {
    id: 's05', place: 'night', kr: '그것은 그가 이곳까지 먼 길을 찾아온 진짜 이유였습니다. 그런데 그 이유 때문에 그의 가슴이 두근거렸습니다.', prep: 'for', tag: 'FOR WHICH', rule: '이유',
    left: w('It was the reason'), word: 'for which', right: w('he had traveled a long way.'),
    actors: [{who: 'he', x0: 300, x1: 700}],
    props: [
      {emoji: '💓', x: 1130, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🛣️', x: 1380, y: 600, size: 110, motion: 'none'},
      {emoji: '🌙', x: 1570, y: 440, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's06', place: 'night', kr: '그녀가 상자를 열자 따뜻한 빛이 흘러나왔습니다. 그런데 그 상자로부터 잊고 있던 옛 기억이 피어올랐죠.', prep: 'from', tag: 'FROM WHICH', rule: '출처',
    left: w('She opened the box'), word: 'from which', right: w('warm memories emerged.'),
    actors: [{who: 'she', x0: 560, x1: 560}, {who: 'he', x0: 780, x1: 780, flip: true}],
    props: [
      {emoji: '📦', x: 1130, y: 580, size: 130, motion: 'pulse'},
      {emoji: '💡', x: 1380, y: 480, size: 120, motion: 'float'},
      {emoji: '💭', x: 1570, y: 440, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's07', place: 'heart', kr: '그것은 두 사람의 마음을 이어주는 소중한 열쇠였습니다. 그런데 그 열쇠에 의해 소중한 인연이 완성되었습니다.', prep: 'by', tag: 'BY WHICH', rule: '수단',
    left: w('It was a key'), word: 'by which', right: w('their hearts were connected.'),
    actors: [{who: 'he', x0: 560, x1: 560}, {who: 'she', x0: 760, x1: 760, flip: true}],
    props: [
      {emoji: '🗝️', x: 1130, y: 540, size: 140, motion: 'pulse'},
      {emoji: '💞', x: 1390, y: 480, size: 120, motion: 'pulse'},
      {emoji: '✨', x: 1570, y: 560, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's08', place: 'greeting', kr: '그는 품속에서 작고 예쁜 펜 하나를 꺼냈습니다. 그런데 그 펜을 가지고 그녀에게 첫 인사를 적어 건넸습니다.', prep: 'with', tag: 'WITH WHICH', rule: '도구',
    left: w('He took out a pen'), word: 'with which', right: w('he wrote a warm greeting.'),
    actors: [{who: 'he', x0: 440, x1: 640}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🖊️', x: 1130, y: 540, size: 130, motion: 'float'},
      {emoji: '✉️', x: 1380, y: 560, size: 130, motion: 'float'},
      {emoji: '💛', x: 1570, y: 450, size: 100, motion: 'pulse'},
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
  {id: 'k4', prep: 'of', label: '소유, 부분', emoji: '📘', left: 'I have a book', rest: 'the cover is blue.', gloss: '나는 책을 가지고 있다, 그런데 그 책의 표지는 파란색이다.'},
  {id: 'k5', prep: 'for', label: '목적, 이유', emoji: '🎯', left: 'This is the reason', rest: 'I came here.', gloss: '이것이 이유이다, 그런데 그 이유 때문에 내가 여기 왔다.'},
  {id: 'k6', prep: 'from', label: '출처, 시작점', emoji: '🐦', left: 'He opened the box', rest: 'a bird flew.', gloss: '그는 상자를 열었다, 그런데 그 상자로부터 새 한 마리가 날아올랐다.'},
  {id: 'k7', prep: 'by', label: '수단, 방법', emoji: '🧩', left: 'She found a way', rest: 'she could solve it.', gloss: '그녀는 방법을 찾았다, 그런데 그 수단에 의해 문제를 풀 수 있었다.'},
  {id: 'k8', prep: 'with', label: '도구, 동반', emoji: '🖊️', left: 'He bought a pen', rest: 'he wrote the letter.', gloss: '그는 펜을 샀다, 그런데 그 펜을 가지고 편지를 썼다.'},
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
  {id: 'i11', scene: 'intro', mood: 'dawn', kr: `${k('of', 'of which')}는 “그런데 그것의...”, “그런데 그것 중에서...”`, pad: 0.5},
  {id: 'i12', scene: 'intro', mood: 'dawn', kr: `${k('for', 'for which')}는 “그런데 그것을 위해...”, “그런데 그것 때문에...”`, pad: 0.5},
  {id: 'i13', scene: 'intro', mood: 'dawn', kr: `${k('from', 'from which')}는 “그런데 그것으로부터...”, “그런데 그 출처에서...”`, pad: 0.5},
  {id: 'i14', scene: 'intro', mood: 'dawn', kr: `${k('by', 'by which')}는 “그런데 그것에 의해...”, “그런데 그 수단으로...”`, pad: 0.5},
  {id: 'i15', scene: 'intro', mood: 'dawn', kr: `${k('with', 'with which')}는 “그런데 그것을 가지고...”, “그런데 그 도구, 동반으로...”`, pad: 0.6},
  {id: 'i16', scene: 'intro', mood: 'dawn', kr: '복잡한 공식을 암기할 필요 없이, “전치사 뜻 + 그런데 그것은!” 하고 매끄럽게 해석하면 깔끔하게 직관을 얻을 수 있습니다.', pad: 0.8},
];

export const BRIDGE_CUES: CueDef[] = [
  {id: 'b1', scene: 'bridge', mood: 'bridge', kr: '그렇다면 왜 전치사가 앞으로 당겨져 올까요? 예를 들어, “나는 집을 한 채 샀는데, 그 집의 지붕은 빨간색이다”라고 할 때', pad: 0.4},
  {id: 'b2', scene: 'bridge', mood: 'bridge', kr: '두 문장으로 쓰면 {e|I bought a house}와 {e|The roof of the house is red}입니다.', pad: 0.5},
  {id: 'b3', scene: 'bridge', mood: 'bridge', kr: '이 두 문장을 관계대명사 {e|which}로 잇되 전치사를 그냥 두면 {e|I bought a house which the roof of is red}가 됩니다.', pad: 0.5},
  {id: 'b4', scene: 'bridge', mood: 'bridge', kr: `하지만 문장 속에 ${k('of', 'of')} 혼자 덩그러니 남겨져 있으면 외롭고 세련되지 못한 문장이 되죠.`, pad: 0.4},
  {id: 'b5', scene: 'bridge', mood: 'bridge', kr: `그래서 전치사 ${k('of', 'of')}가 자신의 짝이었던 {e|which} 바로 앞으로 찰싹 당겨져 와 {e|I bought a house of which the roof is red}가 되는 것입니다.`, pad: 1.2},
  {id: 'k0', scene: 'bridge', mood: 'bridge', kr: '5가지 주요 전치사 결합형을 직관적으로 확인해 볼까요?', pad: 0.6},
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
