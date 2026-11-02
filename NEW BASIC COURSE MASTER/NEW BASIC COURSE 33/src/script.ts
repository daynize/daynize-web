import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

/** Colour family: -er = teal, more = orange, strong (much/even/far) = coral, soft (a little/slightly) = green, than = violet, syl = blue. */
export type WordKey = 'er' | 'more' | 'strong' | 'soft' | 'than' | 'syl';
export type Place = 'library' | 'inner';

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

/** One story example: `left` + the popped comparative `word` (with its intensifier) + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: WordKey;
  /** e.g. MUCH OLDER */
  tag: string;
  /** Why this form, e.g. 1음절 old · much 강조 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  library: {label: '📚  비밀 서재 · Library', mood: 'autumn'},
  inner: {label: '🕯️  서재 안쪽 · Inner room', mood: 'night'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  // ---- Part 1. 1~2음절 단어 (-er 비교급) ----
  {
    id: 's01', place: 'library', kr: '이 비밀 서재는 밖에서 보던 골목길보다 훨씬 더 오래되었다.', kind: 'er', tag: 'MUCH OLDER', rule: '1음절 old · much 강조',
    left: w('This secret library is'), word: 'much older', right: w('than the alley outside.'),
    actors: [{who: 'he', x0: 420, x1: 640}],
    props: [
      {emoji: '📚', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '🕰️', x: 1400, y: 500, size: 120, motion: 'pulse'},
      {emoji: '🏛️', x: 1620, y: 540, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's02', place: 'library', kr: '2층에서 들려오는 피아노 소리가 아까보다 더 명확해진다.', kind: 'er', tag: 'CLEARER', rule: '1음절 clear',
    left: w('The piano sound from the second floor becomes'), word: 'clearer', right: w('than before.'),
    actors: [{who: 'he', x0: 460, x1: 600, wave: true}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '🎵', x: 1380, y: 450, size: 100, motion: 'pulse'},
      {emoji: '👂', x: 1600, y: 540, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'library', kr: '이 오래된 책장이 저 현대적인 스피커보다 더 크게 보인다.', kind: 'er', tag: 'BIGGER', rule: '1음절 big · g 겹쳐 쓰기',
    left: w('This old bookshelf looks'), word: 'bigger', right: w('than that modern speaker.'),
    actors: [{who: 'she', x0: 520, x1: 520}],
    props: [
      {emoji: '📚', x: 1130, y: 520, size: 170, motion: 'pulse'},
      {emoji: '🔊', x: 1450, y: 580, size: 100, motion: 'none'},
      {emoji: '🔍', x: 1620, y: 470, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'library', kr: '방 안의 은빛 조명이 밤하늘의 달보다 더 밝게 빛난다.', kind: 'er', tag: 'BRIGHTER', rule: '1음절 bright',
    left: w('The silver light in the room shines'), word: 'brighter', right: w('than the moon in the night sky.'),
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '💡', x: 1150, y: 520, size: 140, motion: 'pulse'},
      {emoji: '🌙', x: 1420, y: 450, size: 120, motion: 'float'},
      {emoji: '✨', x: 1620, y: 560, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's05', place: 'library', kr: '그녀의 걸음걸이가 바람 소리보다 더 가벼워진다.', kind: 'er', tag: 'LIGHTER', rule: '1음절 light',
    left: w('Her footsteps become'), word: 'lighter', right: w('than the sound of the wind.'),
    actors: [{who: 'she', x0: 440, x1: 680}],
    props: [
      {emoji: '👣', x: 1150, y: 590, size: 110, motion: 'drive', dx: 140},
      {emoji: '🍃', x: 1400, y: 480, size: 120, motion: 'float'},
      {emoji: '💨', x: 1620, y: 540, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's06', place: 'library', kr: '이 오래된 일기장이 생각했던 것보다 훨씬 더 무겁다.', kind: 'er', tag: 'MUCH HEAVIER', rule: '2음절 heavy · y→ier',
    left: w('This ancient diary is'), word: 'much heavier', right: w('than I thought.'),
    actors: [{who: 'he', x0: 460, x1: 460}],
    props: [
      {emoji: '📔', x: 1150, y: 560, size: 150, motion: 'pulse'},
      {emoji: '⚖️', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '💭', x: 1620, y: 450, size: 110, motion: 'float'},
    ],
  },

  // ---- Part 2. 3음절 이상 단어 (more 비교급 & 강조) ----
  {
    id: 's07', place: 'inner', kr: '이곳의 분위기는 도심의 카페보다 훨씬 더 신비롭다.', kind: 'more', tag: 'FAR MORE', rule: '4음절 mysterious · far 강조',
    left: w('The atmosphere here is'), word: 'far more mysterious', right: w('than a downtown cafe.'),
    actors: [{who: 'she', x0: 460, x1: 620}],
    props: [
      {emoji: '🔮', x: 1150, y: 530, size: 140, motion: 'pulse'},
      {emoji: '🕯️', x: 1400, y: 560, size: 120, motion: 'float'},
      {emoji: '☕', x: 1620, y: 560, size: 110, motion: 'none'},
    ],
  },
  {
    id: 's08', place: 'inner', kr: '벽에 걸린 붉은 그림이 실물보다 더 아름답게 보인다.', kind: 'more', tag: 'MORE', rule: '3음절 beautiful',
    left: w('The red painting on the wall looks'), word: 'more beautiful', right: w('than real life.'),
    actors: [{who: 'he', x0: 460, x1: 460}],
    props: [
      {emoji: '🖼️', x: 1150, y: 500, size: 160, motion: 'pulse'},
      {emoji: '🌹', x: 1420, y: 560, size: 120, motion: 'float'},
      {emoji: '😍', x: 1620, y: 450, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's09', place: 'inner', kr: '이 공간을 탐험하는 것이 평범한 일상보다 훨씬 더 흥미진진하다.', kind: 'more', tag: 'EVEN MORE', rule: '3음절 exciting · even 강조',
    left: w('Exploring this space is'), word: 'even more exciting', right: w('than daily routine.'),
    actors: [{who: 'he', x0: 400, x1: 640}, {who: 'she', x0: 860, x1: 780, flip: true}],
    props: [
      {emoji: '🧭', x: 1150, y: 540, size: 130, motion: 'float'},
      {emoji: '🔦', x: 1400, y: 540, size: 120, motion: 'pulse'},
      {emoji: '🤩', x: 1620, y: 450, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's10', place: 'inner', kr: '피아니스트의 비밀은 우리가 상상했던 것보다 더 복잡하다.', kind: 'more', tag: 'MORE', rule: '4음절 complicated',
    left: w("The pianist's secret is"), word: 'more complicated', right: w('than we imagined.'),
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'none'},
      {emoji: '🧩', x: 1400, y: 540, size: 120, motion: 'pulse'},
      {emoji: '🤔', x: 1620, y: 450, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's11', place: 'inner', kr: '이 마법 같은 밤이 어제보다 훨씬 더 값지게 느껴진다.', kind: 'more', tag: 'MUCH MORE', rule: '3음절 이상 valuable · much 강조',
    left: w('This magical night feels'), word: 'much more valuable', right: w('than yesterday.'),
    actors: [{who: 'he', x0: 460, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🌙', x: 1150, y: 470, size: 130, motion: 'float'},
      {emoji: '💎', x: 1400, y: 560, size: 120, motion: 'pulse'},
      {emoji: '✨', x: 1620, y: 480, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's12', place: 'inner', kr: '진실에 가까워질수록 모든 순간이 이전보다 더 위험해진다.', kind: 'more', tag: 'MORE', rule: '3음절 dangerous',
    left: w('As we get closer to the truth, every moment becomes'), word: 'more dangerous', right: w('than before.'),
    actors: [{who: 'he', x0: 420, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🗝️', x: 1150, y: 540, size: 130, motion: 'float'},
      {emoji: '⚠️', x: 1400, y: 560, size: 130, motion: 'pulse'},
      {emoji: '😨', x: 1620, y: 450, size: 100, motion: 'float'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /**
   * Korean narration (ALL of it is read by the Korean voice). `{e|text}` = English phrase, `{y|}` emphasis;
   * colours: `{v|}` -er, `{p|}` more, `{c|}` much/even/far, `{g|}` a little/slightly, `{l|}` than, `{b|}` syllable examples.
   */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const KIND_LETTER: Record<WordKey, string> = {er: 'v', more: 'p', strong: 'c', soft: 'g', than: 'l', syl: 'b'};

// The English line (read by the English voice): the comparative is coloured by family, the rest is plain.
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map((p) => `{e|${p.text}}`), `{${KIND_LETTER[line.kind]}|${line.word}}`, ...line.right.map((p) => `{e|${p.text}}`)].join(' ');

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '두 대상을 비교할 때 우리는 보통 “보다 더 한”이라는 표현을 씁니다.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '그런데 영어에서 비교급, 즉 {v|-er}을 붙일지, {p|more}를 붙일지 결정하는 절대적인 기준은 바로 {y|음절}, {e|Syllable}입니다.', pad: 0.9},
];

export const BRIDGE_CUES: CueDef[] = [
  // 1. 음절이란 무엇인가?
  {id: 'a1', scene: 'bridge', mood: 'bridge', kr: '먼저 기본기입니다. 많은 분들이 글자 수만 보고 음절을 오해하곤 합니다. 하지만 영어에서 음절은 글자의 개수가 아니라, {y|모음 소리가 몇 번 들리는가}입니다.', pad: 0.7},
  {id: 'a2', scene: 'bridge', mood: 'bridge', kr: '핵심 원칙, 영어에서 {y|으 발음}은 소리, 즉 음절이 아닙니다!', pad: 0.6},
  {id: 'a3', scene: 'bridge', mood: 'bridge', kr: '{b|Old}, 올드. 한국어로 쓰면 올드, 두 글자 같지만, 영어의 {e|d}에는 모음 소리가 없습니다. 으 소리는 껍데기일 뿐입니다. 모음 소리가 하나뿐이므로 {y|1음절}입니다.', pad: 0.8},
  {id: 'a4', scene: 'bridge', mood: 'bridge', kr: '{b|Pretty}, 프리티. 한국어로는 프리티, 세 글자처럼 느껴지지만, 실제 모음 소리는 {b|Pre}와 {b|tty}, 2개뿐입니다. 따라서 3음절이 아니라 {y|2음절}입니다.', pad: 0.9},
  // 음절에 따른 비교급 규칙
  {id: 'r1', scene: 'bridge', mood: 'bridge', kr: '음절에 따른 비교급 규칙입니다. 첫째, 1음절 단어와 짧은 2음절 단어는 뒤에 {v|-er}을 붙입니다.', pad: 0.5},
  {id: 'r2', scene: 'bridge', mood: 'bridge', kr: '둘째, 3음절 이상 단어는 앞에 {p|more}를 붙입니다.', pad: 0.9},

  // 2. 대상과의 격차를 조절하는 비교급 표현
  {id: 'b1', scene: 'bridge', mood: 'bridge', kr: '두 번째 핵심 뉘앙스입니다. 비교급 뒤에는 기준이 되는 대상을 가리키는 {l|than}, 보다가 따라옵니다.', pad: 0.7},
  {id: 'b2', scene: 'bridge', mood: 'bridge', kr: '그리고 비교의 차이를 강조하거나 부드럽게 만들 때는, 비교급 앞에 강조 어휘를 붙여줍니다.', pad: 0.7},
  {id: 'b3', scene: 'bridge', mood: 'bridge', kr: '훨씬 더 한, 강조할 때는 {c|much}, {c|even}, {c|far} 더하기 비교급입니다.', pad: 0.5},
  {id: 'b4', scene: 'bridge', mood: 'bridge', kr: '조금 더 한, 부드러운 차이는 {g|a little}, {g|slightly} 더하기 비교급입니다.', pad: 1.0},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 비교급의 핵심, 딱 두 가지만 정리해 볼까요?', pad: 0.5},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '첫째, 비교급의 형태, {v|-er}을 쓸지 {p|more}를 쓸지 결정하는 것은 글자 수가 아니라 {y|모음 소리의 개수}, 음절입니다.', pad: 0.5},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '한국어의 으 발음은 영어에서 소리가 아니라는 점, 절대 잊지 마세요. {b|old}는 1음절, {b|pretty}는 2음절입니다.', pad: 0.6},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '둘째, 비교급은 단순히 두 대상을 겨루는 것이 아니라, 문장에 {y|격차와 입체감}을 주는 도구입니다.', pad: 0.5},
  {id: 'o5', scene: 'outro', mood: 'sunrise', kr: '{c|much}나 {c|even} 같은 단어를 덧붙여 소리의 깊이를 더해 보세요.', pad: 0.6},
  {id: 'o6', scene: 'outro', mood: 'sunrise', kr: '비밀 서재의 불빛이 밖보다 더 밝게 빛나듯, 여러분의 영어 문장도 오늘 배운 비교급을 통해 훨씬 더 풍성해질 것입니다.', pad: 0.7},
  {id: 'o7', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 12개의 도심 동화 예문들을 한글 의미부터 천천히 느끼며 직접 소리 내어 연습해 보세요.', pad: 0.6},
  {id: 'o8', scene: 'outro', mood: 'sunrise', kr: '다음 15강에서는 최상급 표현과 함께 찾아오겠습니다. 수고 많으셨습니다!', pad: 2},
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
