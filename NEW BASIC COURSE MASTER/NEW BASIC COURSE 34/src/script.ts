import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

/**
 * Colour families: est (the -est) = teal, most (more / the most) = orange, the = violet,
 * many (many / in) = blue, much (much) = green, smurf (어라? 이봐, 스머프! 5대장 / of) = coral.
 */
export type WordKey = 'est' | 'most' | 'the' | 'many' | 'much' | 'smurf';
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

/** One story example: `left` + the popped superlative `word` ("the oldest" / "the most mysterious") + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: WordKey;
  /** e.g. THE OLDEST */
  tag: string;
  /** Why this form, e.g. 1음절 old · in 장소 */
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
  // ---- Part 1. 1~2음절 단어 (the -est 최상급) ----
  {
    id: 's01', place: 'library', kr: '이곳은 이 건물 안에서 가장 오래된 비밀 공간이다.', kind: 'est', tag: 'THE OLDEST', rule: '1음절 old · in 건물',
    left: w('This is'), word: 'the oldest', right: w('secret space in this building.'),
    actors: [{who: 'he', x0: 420, x1: 640}],
    props: [
      {emoji: '🏛️', x: 1150, y: 540, size: 150, motion: 'none'},
      {emoji: '🕰️', x: 1400, y: 500, size: 120, motion: 'pulse'},
      {emoji: '📚', x: 1620, y: 560, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'library', kr: '지금 들려오는 피아노 소리가 오늘 밤 들은 것 중 가장 맑다.', kind: 'est', tag: 'THE CLEAREST', rule: '1음절 clear · of the night',
    left: w('The piano sound we hear now is'), word: 'the clearest', right: w('of the night.'),
    actors: [{who: 'she', x0: 480, x1: 620, wave: true}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '🎵', x: 1380, y: 450, size: 100, motion: 'pulse'},
      {emoji: '👂', x: 1600, y: 540, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'library', kr: '저 서재 구석에 놓인 상자가 방에서 가장 크다.', kind: 'est', tag: 'THE BIGGEST', rule: '1음절 big · in 방',
    left: w('The box in the corner of that library is'), word: 'the biggest', right: w('in the room.'),
    actors: [{who: 'he', x0: 460, x1: 460}],
    props: [
      {emoji: '📦', x: 1150, y: 530, size: 170, motion: 'pulse'},
      {emoji: '📚', x: 1430, y: 560, size: 120, motion: 'float'},
      {emoji: '🔍', x: 1620, y: 470, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'library', kr: '선반 위에 놓인 은색 열쇠가 세상에서 가장 밝게 빛난다.', kind: 'est', tag: 'THE BRIGHTEST', rule: '1음절 bright · in 세상',
    left: w('The silver key on the shelf shines'), word: 'the brightest', right: w('in the world.'),
    actors: [{who: 'she', x0: 460, x1: 620}],
    props: [
      {emoji: '🗝️', x: 1150, y: 520, size: 140, motion: 'pulse'},
      {emoji: '✨', x: 1400, y: 470, size: 110, motion: 'pulse'},
      {emoji: '🌍', x: 1620, y: 540, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'library', kr: '그녀의 발걸음은 빗소리보다 가볍고, 도시 전체에서 가장 가볍다.', kind: 'est', tag: 'THE LIGHTEST', rule: '1음절 light · in 도시',
    left: w('Her footsteps are lighter than the rain, and'), word: 'the lightest', right: w('in the whole city.'),
    actors: [{who: 'she', x0: 440, x1: 680}],
    props: [
      {emoji: '👣', x: 1150, y: 590, size: 110, motion: 'drive', dx: 140},
      {emoji: '🌧️', x: 1400, y: 470, size: 120, motion: 'float'},
      {emoji: '🌆', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's06', place: 'library', kr: '이 일기장이 책장에 꽂힌 모든 책들 중에서 가장 두껍다.', kind: 'est', tag: 'THE THICKEST', rule: '1음절 thick · of 복수',
    left: w('This diary is'), word: 'the thickest', right: w('of all the books on the bookshelf.'),
    actors: [{who: 'he', x0: 440, x1: 440}],
    props: [
      {emoji: '📔', x: 1150, y: 550, size: 150, motion: 'pulse'},
      {emoji: '📚', x: 1420, y: 560, size: 130, motion: 'none'},
      {emoji: '📏', x: 1620, y: 480, size: 100, motion: 'float'},
    ],
  },

  // ---- Part 2. 3음절 이상 단어 (the most 최상급) ----
  {
    id: 's07', place: 'inner', kr: '이 오르골은 비밀 서재에서 가장 신비로운 물건이다.', kind: 'most', tag: 'THE MOST', rule: '4음절 mysterious · in 서재',
    left: w('This music box is'), word: 'the most mysterious', right: w('object in the secret library.'),
    actors: [{who: 'she', x0: 460, x1: 620}],
    props: [
      {emoji: '🎼', x: 1150, y: 530, size: 140, motion: 'float'},
      {emoji: '🔮', x: 1400, y: 540, size: 130, motion: 'pulse'},
      {emoji: '🕯️', x: 1620, y: 560, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's08', place: 'inner', kr: '악보 끝에 적힌 문장이 내 인생에서 가장 아름다운 유언이다.', kind: 'most', tag: 'THE MOST', rule: '3음절 beautiful · of 인생',
    left: w('The sentence at the end of the sheet music is'), word: 'the most beautiful', right: w('testament of my life.'),
    actors: [{who: 'he', x0: 440, x1: 440}],
    props: [
      {emoji: '🎼', x: 1150, y: 520, size: 150, motion: 'pulse'},
      {emoji: '✒️', x: 1400, y: 560, size: 120, motion: 'float'},
      {emoji: '🌹', x: 1620, y: 540, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's09', place: 'inner', kr: '이 기밀 문서를 읽는 것이 우리의 탐험 중 가장 흥미진진한 순간이다.', kind: 'most', tag: 'THE MOST', rule: '3음절 exciting · of 탐험',
    left: w('Reading this secret document is'), word: 'the most exciting', right: w('moment of our exploration.'),
    actors: [{who: 'he', x0: 400, x1: 640}, {who: 'she', x0: 860, x1: 780, flip: true}],
    props: [
      {emoji: '📜', x: 1150, y: 530, size: 140, motion: 'float'},
      {emoji: '🔦', x: 1400, y: 540, size: 120, motion: 'pulse'},
      {emoji: '🤩', x: 1620, y: 450, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's10', place: 'inner', kr: '도시의 밤에 얽힌 비밀은 우리가 풀어야 할 가장 복잡한 수수께끼이다.', kind: 'most', tag: 'THE MOST', rule: '4음절 complicated',
    left: w('The secret of the city night is'), word: 'the most complicated', right: w('puzzle we must solve.'),
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🧩', x: 1150, y: 540, size: 140, motion: 'pulse'},
      {emoji: '🌃', x: 1400, y: 560, size: 130, motion: 'none'},
      {emoji: '🤔', x: 1620, y: 450, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's11', place: 'inner', kr: '서재 2층의 기적은 우리가 찾은 것 중 가장 값진 보물이다.', kind: 'most', tag: 'THE MOST', rule: '3음절 이상 valuable',
    left: w('The miracle on the second floor is'), word: 'the most valuable', right: w('treasure we found.'),
    actors: [{who: 'he', x0: 460, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '💎', x: 1150, y: 540, size: 140, motion: 'pulse'},
      {emoji: '👑', x: 1400, y: 500, size: 120, motion: 'float'},
      {emoji: '✨', x: 1620, y: 470, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's12', place: 'inner', kr: '마침내 진실을 만나는 것은 이 길고 긴 여행에서 가장 마법 같은 일이다.', kind: 'most', tag: 'THE MOST', rule: '3음절 magical · in 여행',
    left: w('Meeting the truth at last is'), word: 'the most magical', right: w('thing in this long journey.'),
    actors: [{who: 'he', x0: 420, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🌙', x: 1150, y: 470, size: 130, motion: 'float'},
      {emoji: '🪄', x: 1400, y: 540, size: 120, motion: 'pulse'},
      {emoji: '🛤️', x: 1620, y: 580, size: 120, motion: 'none'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /**
   * Korean narration (ALL of it is read by the Korean voice). `{e|text}` = English phrase, `{y|}` emphasis;
   * colours: `{v|}` -est, `{p|}` more/the most, `{l|}` the, `{b|}` many/in, `{g|}` much, `{c|}` of / 5대장.
   */
  kr: string;
  en?: string;
  /** Voice text when it must differ from the subtitle (spaces/punctuation only). */
  say?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const KIND_LETTER: Record<WordKey, string> = {est: 'v', most: 'p', the: 'l', many: 'b', much: 'g', smurf: 'c'};

// The English line (read by the English voice): the superlative is coloured by family, the rest is plain.
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map((p) => `{e|${p.text}}`), `{${KIND_LETTER[line.kind]}|${line.word}}`, ...line.right.map((p) => `{e|${p.text}}`)].join(' ');

/** The five intensifiers of the mnemonic "어라? 이봐, 스머프!", in the order they are chanted. */
export const SMURF_WORDS = [
  {syllable: '어라?', say: '어라', word: 'a lot'},
  {syllable: '이봐', say: '이봐', word: 'even'},
  {syllable: '스', say: '스', word: 'still'},
  {syllable: '머', say: '머', word: 'much'},
  {syllable: '프!', say: '프', word: 'far'},
] as const;

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '오늘은 {b|much}와 {p|more}의 뿌리, 비교급 강조 5대장, 그리고 최상급을 한 번에 정리합니다.', pad: 0.8},
];

export const BRIDGE_CUES: CueDef[] = [
  // 0. 선행 개념 1: 가산 명사 vs 불가산 명사
  {id: 'c1', scene: 'bridge', mood: 'bridge', kr: '선행 개념 하나, 가산 명사와 불가산 명사에 따른 구분입니다. 셀 수 있는 가산명사의 복수형 앞에는 {b|many}를 씁니다. 예를 들어 {b|many} books.', pad: 0.7},
  {id: 'c2', scene: 'bridge', mood: 'bridge', kr: '셀 수 없는 불가산명사 앞에는 {g|much}를 씁니다. 예를 들어 {g|much} water.', pad: 0.7},
  {id: 'c3', scene: 'bridge', mood: 'bridge', kr: '이 {b|many}와 {g|much}가 “더 많은”으로 변신한 형태가 바로 {p|more}입니다!', pad: 0.8},
  {id: 'c4', scene: 'bridge', mood: 'bridge', kr: '즉 {p|more}는 셀 수 있는 명사와 셀 수 없는 명사, 둘 다 뒤에 올 수 있습니다. 예를 들어 {p|more} books, {p|more} water.', pad: 1.0},

  // 0. 선행 개념 2: "어라? 이봐, 스머프!" 비교급 강조 5대장
  {id: 'k1', scene: 'bridge', mood: 'bridge', kr: '선행 개념 둘, {y|어라? 이봐, 스머프!} 비교급 강조 5대장입니다.', pad: 0.7},
  {id: 'k2', scene: 'bridge', mood: 'bridge', kr: '“더 한”이라는 비교급, {e|older}나 {e|more beautiful} 앞에 붙어서, “훨씬 더 한”으로 격차를 팍 틔워주는 단어 5개가 있습니다.', pad: 0.7},
  {id: 'k3', scene: 'bridge', mood: 'bridge', kr: '이건 딱 한 번에 외웁니다.', pad: 0.5},
  // The chant: voiced "어라? 이봐, 스, 머, 프!" so every syllable is audible and carries its own pop.
  {id: 'k4', scene: 'bridge', mood: 'bridge', kr: '{c|어라? 이봐, 스머프!}', say: '어라? 이봐, 스, 머, 프!', pad: 1.2},
  {id: 'k5', scene: 'bridge', mood: 'bridge', kr: '어라는 {c|a lot}, 이봐는 {c|even}, 스는 {c|still}, 머는 {c|much}, 프는 {c|far}입니다.', pad: 0.7},
  {id: 'k6', scene: 'bridge', mood: 'bridge', kr: '이 5개 단어는 비교급 바로 앞에서 “훨씬”이라는 뜻으로 쓰입니다. 예를 들어 {c|a lot} older, {c|even} {p|more} beautiful, {c|far} better.', pad: 1.0},

  // 1. 핵심 원칙: 최상급 앞에는 왜 항상 the가 붙을까?
  {id: 't1', scene: 'bridge', mood: 'bridge', kr: '이제 최상급입니다. 핵심 원칙, 최상급 앞에는 왜 항상 {l|the}가 붙을까요?', pad: 0.6},
  {id: 't2', scene: 'bridge', mood: 'bridge', kr: '셋 이상 중에서 최고는 오직 단 하나로 정해지기 때문에, 정관사 {l|the}와 최상급은 항상 짝을 이룹니다.', pad: 0.8},
  {id: 't3', scene: 'bridge', mood: 'bridge', kr: '1음절 단어와 짧은 2음절 단어는, {l|the} 더하기 단어 더하기 {v|est}입니다. 예를 들어 {v|the oldest}.', pad: 0.5},
  {id: 't4', scene: 'bridge', mood: 'bridge', kr: '3음절 이상 단어와 긴 2음절 단어는, {p|the most} 더하기 단어입니다. 예를 들어 {p|the most mysterious}.', pad: 1.0},

  // 2. 범위의 지정: in vs of
  {id: 'n1', scene: 'bridge', mood: 'bridge', kr: '범위의 지정, {b|in}과 {c|of}의 차이입니다. 장소나 단수 집단 앞에는 {b|in}을 사용합니다. 예를 들어 in the city, in the world.', pad: 0.7},
  {id: 'n2', scene: 'bridge', mood: 'bridge', kr: '여러 개체나 복수 대상들 앞에는 {c|of}를 사용합니다. 예를 들어 of all the books, of my life.', pad: 1.0},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 가산 명사와 불가산 명사의 구분, 어라? 이봐, 스머프! 비교급 강조 5대장, 그리고 정관사 {l|the}와 함께 쓰는 최상급 표현을 입으로 직접 연습해 보세요.', pad: 0.8},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '다음 16강에서는 접속사 편으로 찾아오겠습니다. 수고 많으셨습니다!', pad: 2},
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
