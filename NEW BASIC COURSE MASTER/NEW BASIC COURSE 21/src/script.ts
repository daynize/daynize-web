import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

// subject = plain word, noun = uncountable noun (teal), unit = container/measure word (orange)
export type PartKind = 'subject' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type Place = 'sunny' | 'cafe' | 'warm';

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

/** One example sentence: `left` + the uncountable `noun` (pops in, teal) + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  /** Label shown with the noun, e.g. TIME. */
  tag: string;
  left: Part[];
  noun: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  sunny: {label: '☀️  카페 창가 · By the window', mood: 'sunny'},
  cafe: {label: '☕  카페 · Café', mood: 'cafe'},
  warm: {label: '💗  따뜻한 순간 · Warm moment', mood: 'sunrise'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => text.split(' ').map((t) => ({text: t, kind}));

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'sunny', kr: '따뜻한 햇살 아래, 카페 창가에 앉아 시간을 보냅니다.', tag: 'TIME',
    left: w('He spends'), noun: 'time', right: w('sitting by the window.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '☀️', x: 1500, y: 380, size: 150, motion: 'pulse'},
      {emoji: '🪟', x: 1330, y: 560, size: 170, motion: 'none'},
      {emoji: '⏳', x: 420, y: 470, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'sunny', kr: '테이블 위에는 시원한 물 한 잔이 놓여 있죠.', tag: 'WATER',
    left: [...w('A'), ...w('glass of', 'unit')], noun: 'water', right: w('is on the table.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🥛', x: 1050, y: 590, size: 150, motion: 'float'},
      {emoji: '💧', x: 1250, y: 470, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'sunny', kr: '창밖으로 은은하게 불어오는 공기를 느껴봅니다.', tag: 'AIR',
    left: w('He feels the fresh'), noun: 'air', right: w('from outside.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🌬️', x: 1150, y: 500, size: 150, motion: 'float'},
      {emoji: '🍃', x: 1450, y: 580, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'cafe', kr: '지인이 찾아와 인생에 대한 좋은 조언을 건넸습니다.', tag: 'ADVICE',
    left: w('His friend gave him good'), noun: 'advice', right: [],
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true, wave: true}],
    props: [{emoji: '💬', x: 960, y: 480, size: 120, motion: 'float'}],
  },
  {
    id: 's05', place: 'cafe', kr: '그 조언은 그에게 커다란 희망과 용기를 주었죠.', tag: 'HOPE',
    left: w('The advice brought him great'), noun: 'hope', right: [],
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true}],
    props: [{emoji: '🌈', x: 960, y: 480, size: 160, motion: 'pulse'}, {emoji: '✨', x: 1300, y: 420, size: 90, motion: 'float'}],
  },
  {
    id: 's06', place: 'cafe', kr: '그는 고마운 마음으로 맛있는 음식을 대접했습니다.', tag: 'FOOD',
    left: w('He shared delicious'), noun: 'food', right: w('with gratitude.'),
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true}],
    props: [{emoji: '🍽️', x: 960, y: 600, size: 140, motion: 'float'}, {emoji: '🍰', x: 1110, y: 590, size: 100, motion: 'float'}],
  },
  {
    id: 's07', place: 'cafe', kr: '함께 이야기를 나누며 가슴속에 행복이 차올랐습니다.', tag: 'HAPPINESS',
    left: w('His heart was filled with'), noun: 'happiness', right: [],
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true}],
    props: [{emoji: '😊', x: 960, y: 480, size: 130, motion: 'pulse'}, {emoji: '💗', x: 1130, y: 560, size: 90, motion: 'float'}],
  },
  {
    id: 's08', place: 'warm', kr: '지인은 미소를 지으며 새로운 정보도 공유해 주었습니다.', tag: 'INFORMATION',
    left: w('His friend shared useful'), noun: 'information', right: [],
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true, wave: true}],
    props: [{emoji: '📚', x: 960, y: 520, size: 130, motion: 'float'}, {emoji: '💡', x: 1250, y: 430, size: 100, motion: 'pulse'}],
  },
  {
    id: 's09', place: 'warm', kr: '돈으로는 결코 살 수 없는 아주 소중한 시간이었죠.', tag: 'MONEY',
    left: w('It was a precious moment that'), noun: 'money', right: w('cannot buy.'),
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true}],
    props: [{emoji: '💰', x: 960, y: 520, size: 140, motion: 'pulse'}, {emoji: '🚫', x: 1130, y: 460, size: 90, motion: 'float'}],
  },
  {
    id: 's10', place: 'warm', kr: '그렇게 두 사람의 우정 속에 따뜻한 사랑이 피어났습니다.', tag: 'LOVE',
    left: w('Warm'), noun: 'love', right: w('bloomed in their friendship.'),
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true}],
    props: [{emoji: '💞', x: 960, y: 500, size: 170, motion: 'pulse'}, {emoji: '🌸', x: 1300, y: 560, size: 100, motion: 'float'}],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase, `{v|text}` = noun (teal), `{p|text}` = unit/bridge (orange). */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const kindMarkup = (part: Part) => `{${part.kind === 'unit' ? 'p' : part.kind === 'noun' || part.kind === 'verb' ? 'v' : 'e'}|${part.text}}`;
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map(kindMarkup), `{v|${line.noun}}`, ...line.right.map(kindMarkup)].join(' ');

export const LECTURE_CUES: CueDef[] = [
  {id: 'i1a', scene: 'intro', mood: 'dawn', kr: '우리말은 명사를 셀 때 개수만 붙이면 끝납니다.', pad: 0.3},
  {id: 'i1b', scene: 'intro', mood: 'dawn', kr: '사과 한 개, 물 한 컵처럼 말이죠.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '하지만 영어는 셀 수 있는 명사와, 절대로 하나둘 셀 수 없는 명사를 아주 까다롭게 구별합니다.', pad: 0.5},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 {v|가산명사}와 {v|불가산명사}입니다.', pad: 0.5},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '{e|가산명사}는 손으로 하나씩 쥐거나 형태가 명확해서 ‘하나, 둘’ 셀 수 있는 명사입니다.', pad: 0.5},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '{v|불가산명사}는 쪼개도 형태가 사라지지 않거나, 눈에 보이지 않거나, 너무 형태가 가변적이어서 개수를 직접 셀 수 없는 명사입니다.', pad: 0.6},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '스스로 형태를 가지지 못하는 명사, {v|불가산명사}입니다.', pad: 0.6},
  {id: 'i7a', scene: 'intro', mood: 'dawn', kr: '컵에 담긴 물({v|water}), 공기({v|air}), 돈이라는 개념({v|money}), 사랑({v|love}), 정보({v|information}),', pad: 0.3},
  {id: 'i7b', scene: 'intro', mood: 'dawn', kr: '조언({v|advice}), 시간({v|time}), 소금({v|salt}), 행복({v|happiness}), 그리고 당신의 머리카락({v|hair}) 같은 명사들입니다.', pad: 0.6},

  {id: 'b1a', scene: 'bridge', mood: 'bridge', kr: '예를 들어, “나 물 두 잔만 줘”라고 할 때,', pad: 0.3},
  {id: 'b1b', scene: 'bridge', mood: 'bridge', kr: '{e|I want two waters}라고 쓰면 아주 어색하고 틀린 문장이 됩니다.', pad: 0.3},
  {id: 'b1c', scene: 'bridge', mood: 'bridge', kr: '물은 형태가 없기 때문에 {e|I want two} {p|glasses of} {e|water}처럼 중간에 ‘컵({p|glass})’이라는 다리가 수량을 나타내주어야 완성된 문장이 됩니다.', pad: 0.9},
  {id: 'b2a', scene: 'bridge', mood: 'bridge', kr: '다시 한 번 말하자면, {v|불가산명사} 바로 앞에는 숫자({e|one}, {e|two})나 부정관사({e|a}, {e|an})가 직접 오지 못하고, 복수형 {e|s}도 붙지 못합니다.', pad: 0.4},
  {id: 'b2b', scene: 'bridge', mood: 'bridge', kr: '따라서 {v|불가산명사}의 양을 표현하려면, 반드시 {p|단위}나 {p|용기}가 다리 역할을 해주어야 합니다.', pad: 1.4},
  {id: 'b3a', scene: 'bridge', mood: 'bridge', kr: '{e|I bought a bread}라고 쓰면 어색하지만,', pad: 0.9},
  {id: 'b3b', scene: 'bridge', mood: 'bridge', kr: '{e|I bought a} {p|loaf of} {e|bread}라고 써야', pad: 0.4},
  {id: 'b3c', scene: 'bridge', mood: 'bridge', kr: '“나는 빵 한 덩어리를 샀다”라는 올바른 문장이 되는 것처럼 말이죠.', pad: 1.2},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 셀 수 없는 명사, {v|불가산명사}에 대해 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '{v|불가산명사}는 직접 숫자를 붙이지 않고 {p|단위}나 {p|맥락}을 함께 써야 한다는 점, 잊지 마세요.', pad: 0.5},
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

export const CUE_DEFS: CueDef[] = [...LECTURE_CUES, ...STORY_CUES, ...OUTRO_CUES];

export const stripMarkup = (s: string) => s.replace(/\{[vpe]\|([^}]*)\}/g, '$1');
