import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

// unit = highlighted word (orange: p.p. / by) · subject = plain word
export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type Place = 'bookstore' | 'past' | 'sunlight' | 'city' | 'memories';

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

/** One passive example: `left` + the be-verb `word` (pops in) + `right` (p.p. and by-phrase, orange). */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  /** e.g. BE OPENED */
  tag: string;
  /** Why it is passive, e.g. 문이 열림을 당함 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  bookstore: {label: '📚  옛 서점 · Old bookstore', mood: 'cafe'},
  past: {label: '🕰️  오랜 옛날 · Long ago', mood: 'autumn'},
  sunlight: {label: '☀️  따뜻한 햇살 · Sunlight', mood: 'sunny'},
  city: {label: '🏙️  도시 · The city', mood: 'morning'},
  memories: {label: '💛  추억 · Memories', mood: 'sunrise'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);
const u = (text: string): Part[] => w(text, 'unit');

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'bookstore', kr: '도심 한구석, 오랫동안 닫혀 있던 옛 서점의 문이 열렸습니다.', tag: 'BE OPENED', rule: '문이 열림을 당함',
    left: w('The door of the old bookstore'), word: 'was', right: u('opened.'),
    actors: [{who: 'he', x0: 640, x1: 640, wave: true}],
    props: [
      {emoji: '🚪', x: 1100, y: 540, size: 150, motion: 'float'},
      {emoji: '📚', x: 1380, y: 560, size: 130, motion: 'float'},
      {emoji: '✨', x: 1550, y: 430, size: 90, motion: 'pulse'},
    ],
  },
  {
    id: 's02', place: 'past', kr: '그 서점은 아주 오래전에 유명한 건축가에 의해 지어졌었죠.', tag: 'BE BUILT', rule: '서점이 지어짐 · by 건축가',
    left: w('The bookstore'), word: 'was', right: [...u('built by'), ...w('a famous architect.')],
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🏛️', x: 1150, y: 520, size: 160, motion: 'none'},
      {emoji: '📐', x: 1420, y: 560, size: 110, motion: 'float'},
      {emoji: '🕰️', x: 900, y: 560, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's03', place: 'bookstore', kr: '탁자 위에는 깊은 감동을 주는 아름다운 시집 한 권이 놓여 있었습니다.', tag: 'BE PLACED', rule: '시집이 놓임',
    left: w('A beautiful poetry book'), word: 'was', right: [...u('placed'), ...w('on the table.')],
    actors: [{who: 'he', x0: 560, x1: 560}],
    props: [
      {emoji: '📖', x: 1050, y: 580, size: 140, motion: 'float'},
      {emoji: '🪑', x: 1250, y: 590, size: 120, motion: 'none'},
      {emoji: '🕯️', x: 1450, y: 540, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's04', place: 'past', kr: '그 책은 먼 옛날, 어느 무명 시인에 의해 쓰여진 작품이었습니다.', tag: 'BE WRITTEN', rule: '책이 쓰여짐 · by 시인',
    left: w('The book'), word: 'was', right: [...u('written by'), ...w('an unknown poet.')],
    actors: [{who: 'she', x0: 640, x1: 640}],
    props: [
      {emoji: '✒️', x: 1100, y: 500, size: 140, motion: 'float'},
      {emoji: '📜', x: 1350, y: 560, size: 140, motion: 'float'},
      {emoji: '🌙', x: 1580, y: 580, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's05', place: 'sunlight', kr: '따뜻한 햇살 아래, 그 공간은 세심한 손길로 깨끗이 청소되었습니다.', tag: 'BE CLEANED', rule: '공간이 청소됨',
    left: w('The cozy space'), word: 'was', right: [...u('cleaned'), ...w('with great care.')],
    actors: [{who: 'he', x0: 520, x1: 520, wave: true}],
    props: [
      {emoji: '🧹', x: 1050, y: 560, size: 140, motion: 'float'},
      {emoji: '🪟', x: 1330, y: 500, size: 150, motion: 'pulse'},
      {emoji: '✨', x: 1520, y: 560, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's06', place: 'city', kr: '마침내 수많은 시민들에게 사랑받는 특별한 공간이 되었죠.', tag: 'BE LOVED', rule: '그곳이 사랑받음 · by 시민',
    left: w('It'), word: 'was', right: [...u('loved by'), ...w('many people in the city.')],
    actors: [{who: 'he', x0: 400, x1: 700}, {who: 'she', x0: 520, x1: 820}],
    props: [
      {emoji: '💖', x: 1160, y: 540, size: 110, motion: 'pulse'},
      {emoji: '🏙️', x: 1400, y: 540, size: 150, motion: 'none'},
      {emoji: '👥', x: 1600, y: 600, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's07', place: 'memories', kr: '그렇게 잊혀가던 옛 장소는 아름다운 추억으로 다시 채워졌습니다.', tag: 'BE FILLED', rule: '장소가 채워짐',
    left: w('The forgotten place'), word: 'was', right: [...u('filled'), ...w('with warm memories.')],
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '📚', x: 1100, y: 540, size: 140, motion: 'float'},
      {emoji: '💛', x: 1350, y: 470, size: 120, motion: 'pulse'},
      {emoji: '🌅', x: 1520, y: 570, size: 130, motion: 'float'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase, `{v|text}` = active (teal), `{p|text}` = passive / by (orange). */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

// The English line: the be-verb, p.p. and by are orange, the rest plain.
export const storyEnMarkup = (line: StoryLine) =>
  [
    ...line.left.map((p) => `{e|${p.text}}`),
    `{p|${line.word}}`,
    ...line.right.map((p) => (p.kind === 'unit' ? `{p|${p.text}}` : `{e|${p.text}}`)),
  ].join(' ');

export const LECTURE_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '우리말은 “내가 문을 열었다”라고도 하지만, 시점을 바꿔 “문이 열렸다”라고도 표현합니다.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '영어에서도 문장의 주인(주어)이 직접 행동을 하는가, 아니면 그 행동을 ‘당하는가’에 따라 문장의 모습을 완전히 바꿔 씁니다.', pad: 0.6},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 {v|능동태}와 {p|수동태}({p|Be + p.p.})입니다.', pad: 0.5},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '주인공의 시점에 따라 시선이 뒤바뀌는 영화 카메라, 수동태입니다.', pad: 0.6},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '{v|능동태}는 주어가 주체적으로 행동을 내뿜는 문장입니다.', pad: 0.6},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '내가 사랑하고({v|LOVE}), 누군가가 만들고({v|MAKE}), 그가 쓰고({v|WRITE}), 사람이 짓는({v|BUILD}) 문장들입니다.', pad: 0.5},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: '{p|수동태}({p|Be + p.p.})는 주어가 행동을 직접 하지 못하고 행동을 당하거나 받는 문장입니다.', pad: 0.6},
  {id: 'i8', scene: 'intro', mood: 'dawn', kr: '사랑받고({p|BE LOVED}), 만들어지고({p|BE MADE}), 쓰여지고({p|BE WRITTEN}), 지어지는({p|BE BUILT}) 문장들입니다.', pad: 0.6},

  {id: 'b1a', scene: 'bridge', mood: 'bridge', kr: '예를 들어, “이 책은 그에 의해 쓰여졌다”라고 할 때,', pad: 0.3},
  {id: 'b1b', scene: 'bridge', mood: 'bridge', kr: '{e|This book wrote by him}이라고 쓰면 “책이 스스로 펜을 들고 그에 의해 썼다”라는 말도 안 되는 괴기한 문장이 됩니다.', pad: 0.3},
  {id: 'b1c', scene: 'bridge', mood: 'bridge', kr: '책은 쓰임을 ‘당한’ 대상이므로 {e|This book was written by him}처럼 {p|be + p.p.}라는 다리를 놓아주어야 비로소 완성된 문장이 됩니다.', pad: 1.0},
  {id: 'b2a', scene: 'bridge', mood: 'bridge', kr: '다시 한 번 말하자면,', pad: 0.4},
  {id: 'b2b', scene: 'bridge', mood: 'bridge', kr: '주어가 직접 행동하면 {v|능동태}, 주어가 행동을 당하거나 전달받으면 {p|be + p.p.} {p|수동태}를 씁니다.', pad: 0.4},
  {id: 'b2c', scene: 'bridge', mood: 'bridge', kr: '그리고 행동을 가한 주체 앞에는 {p|by}라는 다리가 놓입니다.', pad: 1.0},
  {id: 'b3a', scene: 'bridge', mood: 'bridge', kr: '{e|The window broke}는 창문이 스스로 깨졌다는 어색한 문장이고,', pad: 0.9},
  {id: 'b3b', scene: 'bridge', mood: 'bridge', kr: '{e|The window was broken by the wind}는 창문이 바람에 의해 깨짐을 당했다는 올바른 문장입니다.', pad: 1.4},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 문장의 입장이 바뀌는 수동태({p|be + p.p.})에 대해 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '주어가 직접 행동을 하는지, 아니면 당하는지에 따라 모양이 달라진다는 점, 그리고 행동을 한 주체 앞에는 {p|by}가 온다는 원리를 꼭 기억하세요.', pad: 0.5},
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
