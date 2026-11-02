import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

// subject = plain word · unit/ing/ed = highlighted word (the relative pronoun is the popped pill)
export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type RelName = 'who' | 'which' | 'that' | 'what';
export type Place = 'street' | 'studio' | 'cafe' | 'memory';

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

/** One story example: `left` + the relative pronoun `word` (pops in) + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  rel: RelName;
  /** e.g. WHO */
  tag: string;
  /** Why this pronoun, e.g. 사람 · 그런데 이 사람은... */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  street: {label: '🏙️  도시의 거리 · The street', mood: 'morning'},
  studio: {label: '🎨  따뜻한 화실 · The studio', mood: 'sunny'},
  cafe: {label: '☕  아늑한 카페 · The cafe', mood: 'cafe'},
  memory: {label: '💛  소중한 기억 · Memories', mood: 'sunrise'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'street', kr: '그는 한 여자를 만났습니다. 그런데 그 여자는 환하게 미소 짓고 있었죠.', rel: 'who', tag: 'WHO', rule: '사람 · 그런데 이 사람은...',
    left: w('He met a woman'), word: 'who', right: w('was smiling brightly.'),
    actors: [{who: 'he', x0: 420, x1: 640}, {who: 'she', x0: 900, x1: 760, flip: true, wave: true}],
    props: [
      {emoji: '🙂', x: 1300, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🌤️', x: 1550, y: 430, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'studio', kr: '그녀는 아름다운 그림을 그리고 있었습니다. 그런데 그 그림은 마음을 따뜻하게 해주었죠.', rel: 'which', tag: 'WHICH', rule: '사물 · 그런데 이것은...',
    left: w('She was painting a picture'), word: 'which', right: w('warmed his heart.'),
    actors: [{who: 'she', x0: 560, x1: 560}],
    props: [
      {emoji: '🖼️', x: 1100, y: 520, size: 150, motion: 'float'},
      {emoji: '🎨', x: 1360, y: 570, size: 120, motion: 'float'},
      {emoji: '💛', x: 1550, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's03', place: 'studio', kr: '그는 그녀가 진심으로 필요로 했던 ‘것’을 조심스럽게 선물했습니다.', rel: 'what', tag: 'WHAT', rule: '명사 없이 · ~하는 것',
    left: w('He gave her'), word: 'what', right: w('she really needed.'),
    actors: [{who: 'he', x0: 420, x1: 600}, {who: 'she', x0: 860, x1: 760, flip: true}],
    props: [
      {emoji: '🎁', x: 1160, y: 540, size: 140, motion: 'float'},
      {emoji: '✨', x: 1400, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's04', place: 'studio', kr: '그것은 바로 그녀가 오랫동안 원했던 ‘것’이었습니다.', rel: 'what', tag: 'WHAT', rule: '명사 없이 · ~하는 것',
    left: w('It was exactly'), word: 'what', right: w('she had wanted for a long time.'),
    actors: [{who: 'she', x0: 600, x1: 600, wave: true}],
    props: [
      {emoji: '🎁', x: 1100, y: 540, size: 140, motion: 'pulse'},
      {emoji: '🕰️', x: 1370, y: 520, size: 120, motion: 'float'},
      {emoji: '💖', x: 1560, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's05', place: 'cafe', kr: '두 사람은 작고 아늑한 카페로 들어갔습니다. 그런데 그 카페는 거리에 위치해 있었죠.', rel: 'that', tag: 'THAT', rule: '다재다능 접착제',
    left: w('They entered a cozy cafe'), word: 'that', right: w('was located on the street.'),
    actors: [{who: 'he', x0: 380, x1: 620}, {who: 'she', x0: 500, x1: 740}],
    props: [
      {emoji: '☕', x: 1160, y: 560, size: 130, motion: 'float'},
      {emoji: '🏠', x: 1400, y: 540, size: 150, motion: 'none'},
      {emoji: '🛣️', x: 1580, y: 600, size: 100, motion: 'none'},
    ],
  },
  {
    id: 's06', place: 'cafe', kr: '그곳에서 그들은 한 친절한 바리스타를 보았습니다. 그런데 그 사람은 따뜻한 차를 내어주었습니다.', rel: 'who', tag: 'WHO', rule: '사람 · 그런데 이 사람은...',
    left: w('They saw a kind barista'), word: 'who', right: w('served warm tea.'),
    actors: [{who: 'he', x0: 420, x1: 520}, {who: 'she', x0: 540, x1: 640}],
    props: [
      {emoji: '🧑‍🍳', x: 1200, y: 520, size: 140, motion: 'float'},
      {emoji: '🍵', x: 1440, y: 570, size: 120, motion: 'float'},
      {emoji: '♨️', x: 1560, y: 450, size: 90, motion: 'pulse'},
    ],
  },
  {
    id: 's07', place: 'cafe', kr: '그들은 오늘 서로가 마음속으로 배운 ‘것’에 대해 깊은 대화를 나누었습니다.', rel: 'what', tag: 'WHAT', rule: '명사 없이 · ~하는 것',
    left: w('They talked about'), word: 'what', right: w('they learned today.'),
    actors: [{who: 'he', x0: 520, x1: 520}, {who: 'she', x0: 720, x1: 720, flip: true}],
    props: [
      {emoji: '💬', x: 1180, y: 480, size: 130, motion: 'pulse'},
      {emoji: '💡', x: 1420, y: 520, size: 120, motion: 'float'},
      {emoji: '☕', x: 1580, y: 590, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's08', place: 'cafe', kr: '테이블 위에는 오래된 시집 한 권이 놓여 있었습니다. 그런데 그 시집은 깊은 감동을 주었죠.', rel: 'that', tag: 'THAT', rule: '다재다능 접착제',
    left: w('A poetry book'), word: 'that', right: w('brought deep emotion was on the table.'),
    actors: [{who: 'he', x0: 560, x1: 560}],
    props: [
      {emoji: '📖', x: 1100, y: 560, size: 140, motion: 'float'},
      {emoji: '🪑', x: 1330, y: 590, size: 120, motion: 'none'},
      {emoji: '💫', x: 1540, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's09', place: 'memory', kr: '그것은 그에게 잊을 수 없는 소중한 기억이 되었습니다. 그런데 그 기억은 오래도록 머물렀습니다.', rel: 'which', tag: 'WHICH', rule: '사물 · 그런데 이것은...',
    left: w('It became a precious memory'), word: 'which', right: w('stayed with him for a long time.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '💛', x: 1100, y: 520, size: 140, motion: 'pulse'},
      {emoji: '📚', x: 1350, y: 570, size: 130, motion: 'float'},
      {emoji: '🌅', x: 1560, y: 470, size: 120, motion: 'float'},
    ],
  },
];

/** One spoken example of the explanation part: Korean sentence, then the CORRECT English sentence. */
export interface ExampleLine {
  id: string;
  /** and / or / but = duplicated conjunction (the wrong sentence shows `conj + pill`); what = plain what example. */
  conj: 'and' | 'or' | 'but' | 'what';
  kr: string;
  left: string;
  pill: RelName;
  /** Words after the relative pronoun. */
  rest: string;
  /** Extra Korean gloss line shown for `what` examples. */
  gloss?: string;
}

export const EXAMPLE_LINES: ExampleLine[] = [
  {id: 'ea1', conj: 'and', kr: '나는 영화를 보았는데, 그 영화는 무서웠습니다.', left: 'I saw a movie', pill: 'which', rest: 'was scary.'},
  {id: 'ea2', conj: 'and', kr: '그는 친구를 한 명 가지고 있는데, 그 친구는 서울에 삽니다.', left: 'He has a friend', pill: 'who', rest: 'lives in Seoul.'},
  {id: 'ea3', conj: 'and', kr: '그녀는 자전거를 샀는데, 그 자전거는 매우 빨랐습니다.', left: 'She bought a bicycle', pill: 'which', rest: 'was very fast.'},
  {id: 'eo1', conj: 'or', kr: '네가 좋아하는 펜을 고르거나 정해라.', left: 'Choose a pen', pill: 'which', rest: 'you like.'},
  {id: 'eo2', conj: 'or', kr: '네가 신뢰하는 사람을 한 명 선택해라.', left: 'Pick a person', pill: 'who', rest: 'you trust.'},
  {id: 'eo3', conj: 'or', kr: '네게 영감을 주는 상자를 하나 찾아라.', left: 'Find a box', pill: 'which', rest: 'inspires you.'},
  {id: 'eb1', conj: 'but', kr: '그는 차를 한 대 샀지만, 그 차는 오래된 것이었습니다.', left: 'He bought a car', pill: 'which', rest: 'was old.'},
  {id: 'eb2', conj: 'but', kr: '그녀는 한 남자를 알고 있었지만, 그 남자는 수줍음이 많았습니다.', left: 'She knew a man', pill: 'who', rest: 'was shy.'},
  {id: 'eb3', conj: 'but', kr: '나는 집을 한 채 방문했지만, 그 집은 비어 있었습니다.', left: 'I visited a house', pill: 'which', rest: 'was empty.'},
  {id: 'ew1', conj: 'what', kr: '나는 네가 말한 ‘것’을 원한다.', left: 'I want', pill: 'what', rest: 'you said.', gloss: '네가 말한 ‘것’'},
  {id: 'ew2', conj: 'what', kr: '이것이 내가 찾던 ‘것’이다.', left: 'This is', pill: 'what', rest: 'I looked for.', gloss: '내가 찾던 ‘것’'},
];

export const REL_KIND: Record<RelName, 'v' | 'p' | 'y' | 'c'> = {who: 'v', which: 'p', that: 'y', what: 'c'};

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase; `{v|}` who, `{p|}` which, `{y|}` that, `{c|}` what get their colour. */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const words = (text: string) => text.split(' ').map((t) => `{e|${t}}`);

// The English line: the relative pronoun is coloured by type, the rest is plain.
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map((p) => `{e|${p.text}}`), `{${REL_KIND[line.rel]}|${line.word}}`, ...line.right.map((p) => `{e|${p.text}}`)].join(' ');

export const exampleEnMarkup = (line: ExampleLine) => [...words(line.left), `{${REL_KIND[line.pill]}|${line.pill}}`, ...words(line.rest)].join(' ');

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '“나는 어제 그 사람을 만났다”는 {e|I met him yesterday}입니다. 하지만 “내가 어제 만난 그 사람”은 {e|He who I met yesterday}가 되죠.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '“나는 카페에서 그 책을 읽었다”는 {e|I read the book at the cafe yesterday}이고, “카페에서 내가 읽은 책”은 {e|The book which I read}입니다.', pad: 0.6},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '우리말은 “내가 어제 만난 사람”, “카페에서 읽은 책”처럼 꾸며 주는 말을 명사 앞에 붙여 길게 만듭니다.', pad: 0.6},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '하지만 영어는 먼저 명사를 던져 놓고, 그 뒤에 “그런데 이 사람은...”, “그런데 이것은...” 하고 말을 덧붙여 나갑니다.', pad: 0.6},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 관계대명사 {v|who}, {p|which}, {y|that}, 그리고 {c|what}입니다.', pad: 0.6},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '아! 그렇다면 관계대명사라는 이름은 대체 무슨 뜻일까요?', pad: 0.6},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: '관계대명사는 관계를 맺어 주며 문장과 문장을 연결하는 접속사 {e|and}, {e|or}, {e|but} 등의 역할과, 명사를 대신해 주는 대명사의 역할, 두 가지를 한다는 뜻입니다.', pad: 0.6},
  {id: 'i8', scene: 'intro', mood: 'dawn', kr: '문장을 연결해 주는 접속사와 명사를 받는 대명사가 하나로 합체된 요술봉, 관계대명사입니다.', pad: 0.6},
  {id: 'i9', scene: 'intro', mood: 'dawn', kr: '사람 뒤에는 “그런데 이 사람은...” 하고 잇는 {v|who}, 사물이나 동물 뒤에는 “그런데 이것은...” 하고 잇는 {p|which},', pad: 0.5},
  {id: 'i10', scene: 'intro', mood: 'dawn', kr: '그리고 이 둘을 모두 다재다능하게 붙여 주는 만능 접착제 {y|that}이 있습니다.', pad: 0.6},
  {id: 'i11', scene: 'intro', mood: 'dawn', kr: '그리고 앞에 꾸며 줄 명사가 아예 없을 때, 스스로 “~하는 것”이라는 덩어리를 만들어 버리는 {c|what}이 있습니다.', pad: 0.7},
];

export const BRIDGE_CUES: CueDef[] = [
  {id: 'p1', scene: 'bridge', mood: 'bridge', kr: '그래서 접속사 {e|and}, {e|or}, {e|but} 등이 있는 문장에서는 관계대명사를 쓰지 않습니다.', pad: 0.5},
  {id: 'p2', scene: 'bridge', mood: 'bridge', kr: '관계대명사 자체에 이미 접속사의 역할이 포함되어 있기 때문이죠.', pad: 0.6},
  {id: 'p3', scene: 'bridge', mood: 'bridge', kr: '{e|and which}는 “그리고 그래서”라는 중복된 뜻이 되고,', pad: 0.4},
  {id: 'p4', scene: 'bridge', mood: 'bridge', kr: '{e|or which}는 “또한 그런데”라는 중복된 뜻,', pad: 0.4},
  {id: 'p5', scene: 'bridge', mood: 'bridge', kr: '{e|but which}는 “그러나, 하지만”이라는 중복된 뜻이 됩니다.', pad: 0.6},
  {id: 'p6', scene: 'bridge', mood: 'bridge', kr: '이미 접속사가 두 문장을 잇고 있는데 그 뒤에 관계대명사를 또 쓰면 뜻이 중복되어 문장이 무너져 버립니다!', pad: 0.9},

  {id: 'b1a', scene: 'bridge', mood: 'bridge', kr: '예를 들어, “나는 책을 한 권 샀는데, 그리고 그 책은 재밌다”라고 할 때 {e|I bought a book, and which is interesting}이라고 쓰면 {e|and}와 {e|which}가 중복되어 아주 어색하고 틀린 문장이 됩니다.', pad: 0.4},
  {id: 'b1b', scene: 'bridge', mood: 'bridge', kr: '{e|and}를 쓰려면 대명사 {e|it}을 써서 {e|I bought a book, and it is interesting}이라고 하거나,', pad: 0.5},
  {id: 'b1c', scene: 'bridge', mood: 'bridge', kr: '아니면 {e|and}를 빼고 관계대명사만 써서 {e|I bought a book which is interesting}이라고 써야 올바른 문장이 됩니다.', pad: 1.0},

  {id: 'ea0', scene: 'bridge', mood: 'bridge', kr: '접속사 {e|and}와 관계대명사를 중복하지 않는 올바른 예시 3가지를 들어볼까요?', pad: 0.5},
  ...EXAMPLE_LINES.filter((l) => l.conj === 'and').map(toExampleCue),
  {id: 'eo0', scene: 'bridge', mood: 'bridge', kr: '다음으로 접속사 {e|or}와의 중복을 피하는 예시 3가지입니다.', pad: 0.5},
  ...EXAMPLE_LINES.filter((l) => l.conj === 'or').map(toExampleCue),
  {id: 'eb0', scene: 'bridge', mood: 'bridge', kr: '마지막으로 접속사 {e|but}과의 중복을 피하는 예시 3가지입니다.', pad: 0.5},
  ...EXAMPLE_LINES.filter((l) => l.conj === 'but').map(toExampleCue),
  {id: 'ew0', scene: 'bridge', mood: 'bridge', kr: '그렇다면 명사가 없을 때 쓰는 {c|what}은 어떻게 쓸까요? {c|what}은 “내가 ~하는 것”이라고 해석하면 됩니다.', pad: 0.6},
  ...EXAMPLE_LINES.filter((l) => l.conj === 'what').map(toExampleCue),
];

function toExampleCue(line: ExampleLine): CueDef {
  return {id: line.id, scene: 'bridge', mood: 'bridge', kr: line.kr, en: exampleEnMarkup(line), pad: 0.9};
}

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 관계대명사의 본질인 ‘접속사+대명사’의 역할과, {e|and}, {e|or}, {e|but}과 함께 중복해서 쓰지 않는다는 중요한 규칙을 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '사람이면 {v|who}, 사물이면 {p|which}, 다재다능한 {y|that}, 스스로 ‘~하는 것’을 만드는 {c|what}의 원리를 꼭 기억하세요.', pad: 0.5},
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

export const stripMarkup = (s: string) => s.replace(/\{[vpeyc]\|([^}]*)\}/g, '$1');
