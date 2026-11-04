import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

// ed = highlighted word (orange) · subject = plain word
export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type Place = 'morning' | 'noon' | 'busstop' | 'cafe' | 'summer' | 'night';

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

/** at = point shorter than 24 h (gold) · on = exactly 24 h / a surface (orange) · in = longer span / enclosed space (coral). */
export type PrepKind = 'at' | 'on' | 'in';

/** One example sentence: `left` + the preposition `word` (pops in) + `right`. `pill:false` only highlights the word. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: PrepKind;
  /** e.g. ON MONDAY */
  tag: string;
  /** Why this preposition, e.g. 24시간 기준 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  /** false = the sentence has no preposition to insert; the word is just highlighted. */
  pill?: boolean;
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  morning: {label: '🌅  도시의 아침 · Morning', mood: 'morning'},
  noon: {label: '🌞  정오 · Noon', mood: 'sunny'},
  busstop: {label: '🚏  버스 정류장 · Bus stop', mood: 'airport'},
  cafe: {label: '☕  카페 · Café', mood: 'cafe'},
  summer: {label: '🌴  올여름 · This summer', mood: 'park'},
  night: {label: '🌙  밤 · Night', mood: 'night'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'morning', kr: '상쾌한 월요일 아침, 그는 기분 좋게 눈을 떴습니다.', kind: 'on', tag: 'ON MONDAY', rule: '24시간 기준',
    left: [], word: 'On', right: w('Monday morning, he woke up cheerfully.'),
    actors: [{who: 'he', x0: 640, x1: 640, wave: true}],
    props: [
      {emoji: '☀️', x: 1500, y: 400, size: 150, motion: 'pulse'},
      {emoji: '⏰', x: 1050, y: 560, size: 120, motion: 'float'},
      {emoji: '📅', x: 1300, y: 560, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'morning', kr: '24시간보다 긴 넓은 아침 시간 동안, 그는 약속 준비를 마쳤죠.', kind: 'in', tag: 'IN THE MORNING', rule: '24시간보다 많은 시간대',
    left: w('He prepared for his meeting'), word: 'in', right: w('the morning.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '👔', x: 1050, y: 540, size: 130, motion: 'float'},
      {emoji: '🗓️', x: 1300, y: 470, size: 120, motion: 'float'},
      {emoji: '🌅', x: 1500, y: 560, size: 120, motion: 'pulse'},
    ],
  },
  {
    id: 's03', place: 'noon', kr: '그는 24시간보다 짧은 시점인 정오 12시에 친구를 만나기로 했습니다.', kind: 'at', tag: 'AT NOON', rule: '24시간보다 적은 점',
    left: w('He agreed to meet his friend'), word: 'at', right: w('noon.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🌞', x: 1250, y: 400, size: 170, motion: 'pulse'},
      {emoji: '🕛', x: 1000, y: 540, size: 130, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'busstop', kr: '약속 장소인 버스 정류장에서 조용히 친구를 기다렸습니다.', kind: 'at', tag: 'AT THE BUS STOP', rule: '좁은 장소의 점',
    left: w('He waited quietly'), word: 'at', right: w('the bus stop.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🚏', x: 1100, y: 560, size: 170, motion: 'none'},
      {emoji: '🚌', x: 1450, y: 590, size: 140, motion: 'drive', dx: -120},
    ],
  },
  {
    id: 's05', place: 'cafe', kr: '그리고 카페라는 칸막이 공간 안으로 함께 들어갔습니다.', kind: 'in', tag: 'IN THE CAFE', rule: '칸막이 공간 내부',
    left: w('They stepped'), word: 'into', right: w('the cozy cafe.'),
    actors: [{who: 'he', x0: 400, x1: 700}, {who: 'she', x0: 520, x1: 820, flip: false}],
    props: [
      {emoji: '☕', x: 1300, y: 540, size: 130, motion: 'float'},
      {emoji: '🏠', x: 1480, y: 560, size: 150, motion: 'none'},
    ],
  },
  {
    id: 's06', place: 'cafe', kr: '테이블이라는 평평한 면 위에서 따뜻한 차를 함께 즐겼죠.', kind: 'on', tag: 'ON THE TABLE', rule: '평평한 표면',
    left: w('Warm tea was served'), word: 'on', right: w('the table.'),
    actors: [{who: 'he', x0: 560, x1: 560}, {who: 'she', x0: 1360, x1: 1360, flip: true}],
    props: [
      {emoji: '🍵', x: 960, y: 590, size: 130, motion: 'float'},
      {emoji: '🪑', x: 1100, y: 580, size: 110, motion: 'none'},
    ],
  },
  {
    id: 's07', place: 'summer', kr: '24시간보다 훨씬 길고 넓은 올여름은 그에게 잊지 못할 계절이 되었습니다.', kind: 'in', tag: 'IN SUMMER', rule: '24시간보다 긴 기간', pill: false,
    left: w('This'), word: 'summer', right: w('became an unforgettable season for him.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🌴', x: 1150, y: 520, size: 160, motion: 'float'},
      {emoji: '🏖️', x: 1450, y: 580, size: 140, motion: 'none'},
      {emoji: '☀️', x: 900, y: 400, size: 120, motion: 'pulse'},
    ],
  },
  {
    id: 's08', place: 'night', kr: '24시간보다 짧은 조용한 밤에, 그는 오늘의 추억을 담아 집으로 돌아왔습니다.', kind: 'at', tag: 'AT NIGHT', rule: '24시간보다 적은 시간',
    left: [], word: 'At', right: w('night, he returned home with happy memories.'),
    actors: [{who: 'he', x0: 300, x1: 700}],
    props: [
      {emoji: '🌙', x: 1350, y: 400, size: 150, motion: 'pulse'},
      {emoji: '🏠', x: 1300, y: 580, size: 150, motion: 'none'},
      {emoji: '✨', x: 1000, y: 480, size: 90, motion: 'float'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase, `{v|text}` = at (gold), `{p|text}` = on/in/other preposition (orange). */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

// The English line: the preposition (or highlighted word) is orange, the rest plain.
export const storyEnMarkup = (line: StoryLine) =>
  [
    ...line.left.map((p) => `{e|${p.text}}`),
    `{p|${line.word}}`,
    ...line.right.map((p) => `{e|${p.text}}`),
  ].join(' ');

export const LECTURE_CUES: CueDef[] = [
  {id: 'i1a', scene: 'intro', mood: 'dawn', kr: '우리말은 “7시에 만나”, “월요일에 봐”, “여름에 가자”처럼 시공간에 똑같이 ‘~에’나 ‘~에서’를 붙입니다.', pad: 0.5},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '하지만 영어는 24시간이라는 확실한 시간의 기준점을 가지고 전치사를 세밀하게 다르게 씁니다.', pad: 0.5},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 전치사 {p|at}, {p|on}, {p|in}입니다.', pad: 0.5},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '24시간을 기준으로 나뉘는 시공간의 나침반, 전치사입니다.', pad: 0.6},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '기준은 아주 명확합니다. 딱 하루, 정확히 24시간은 {p|on}을 씁니다.', pad: 0.5},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '월요일에({p|on Monday}), 생일에({p|on my birthday}), 크리스마스 날에({p|on Christmas Day})처럼 정확히 24시간 분량의 날짜입니다.', pad: 0.5},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: '이 24시간보다 단 1초라도 적은 시간은 {p|at}을 씁니다. 콕 집어내는 점의 느낌이죠.', pad: 0.5},
  {id: 'i8', scene: 'intro', mood: 'dawn', kr: '7시에({p|at 7 o’clock}), 정오에({p|at noon}), 밤에({p|at night})처럼 24시간보다 짧은 특정 시점입니다.', pad: 0.5},
  {id: 'i9', scene: 'intro', mood: 'deepgreen', kr: '반대로 24시간보다 단 {k|1초}라도 많은 길고 넓은 시간은 {h|in}을 씁니다.', pad: 0.5},
  {id: 'i10', scene: 'intro', mood: 'dawn', kr: '아침에({p|in the morning}), 이번 달에({p|in this month}), 여름에({p|in summer}), 2026년에({p|in 2026})처럼 24시간을 훌쩍 넘어가는 기간입니다.', pad: 0.5},
  {id: 'i11', scene: 'intro', mood: 'dawn', kr: '아! 여기서 정말 중요한 꿀팁 하나! 아무리 짧은 시간이나 장소라도, 그 안의 ‘칸막이 공간’ 내부로 들어가면 무조건 {p|in}으로 변한다는 것도 꼭 기억해 두세요.', pad: 0.6},

  {id: 'b1a', scene: 'bridge', mood: 'bridge', kr: '예를 들어, “나 월요일에 만나”라고 할 때,', pad: 0.3},
  {id: 'b1b', scene: 'bridge', mood: 'bridge', kr: '{e|I meet him in Monday}라고 쓰면 24시간짜리 특정 하루를 긴 기간으로 착각해 아주 어색하고 틀린 표현이 됩니다.', pad: 0.3},
  {id: 'b1c', scene: 'bridge', mood: 'bridge', kr: '월요일은 딱 24시간짜리 하루이므로 {e|I meet him on Monday}라고 써야 비로소 완성된 문장이 됩니다.', pad: 1.0},
  {id: 'b2a', scene: 'bridge', mood: 'bridge', kr: '마찬가지로 7시는 24시간보다 훨씬 짧은 점이므로 {e|at 7 o’clock}, 한 달이나 일 년은 24시간보다 긴 기간이므로 {e|in May}가 됩니다.', pad: 0.6},
  {id: 'b2b', scene: 'bridge', mood: 'bridge', kr: '다시 한 번 말하자면,', pad: 0.4},
  {id: 'b2c', scene: 'bridge', mood: 'bridge', kr: '24시간보다 적으면 {p|at}, 딱 24시간은 {p|on}, 24시간보다 많으면 {p|in}입니다.', pad: 0.4},
  {id: 'b2d', scene: 'bridge', mood: 'bridge', kr: '따라서 시간의 길이에 맞게 전치사의 다리를 정확히 놓아주어야 합니다.', pad: 1.2},
  {id: 'b3a', scene: 'bridge', mood: 'bridge', kr: '{e|I arrive in 7 o’clock}은 7시라는 넓은 기간 안에 도착한다는 어색한 문장이고,', pad: 0.9},
  {id: 'b3b', scene: 'bridge', mood: 'bridge', kr: '{e|I arrive at 7 o’clock}은 7시라는 정확한 점에 도착한다는 올바른 문장입니다.', pad: 1.4},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 시간 전치사의 명확한 기준을 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '24시간보다 적으면 {p|at}, 딱 24시간은 {p|on}, 24시간보다 많으면 {p|in}! 그리고 칸막이 공간 속으로 들어가면 {p|in}이 된다는 원리를 꼭 기억하세요.', pad: 0.5},
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

export const stripMarkup = (s: string) => s.replace(/\{[vpehk]\|([^}]*)\}/g, '$1');
