import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

// ing = teal (emotion given out, -ing) · unit/ed = orange (emotion received, -ed) · subject = plain word
export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type Place = 'city' | 'gallery' | 'street' | 'home';

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

/** One example: `left` + the emotion adjective `word` (pops in) + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  /** -ing = the cause gives the feeling out (teal) · -ed = the person receives the feeling (orange) */
  emotion: 'ing' | 'ed';
  /** e.g. INTERESTING */
  tag: string;
  /** Why it is -ing / -ed, e.g. 흥미를 일으키는 전시회 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  city: {label: '🏙️  도심 · The city', mood: 'morning'},
  gallery: {label: '🖼️  전시장 · The exhibition', mood: 'cafe'},
  street: {label: '🌇  거리 · The street', mood: 'autumn'},
  home: {label: '🏠  집으로 가는 길 · Heading home', mood: 'sunrise'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'city', kr: '주말 아침, 그는 도심에서 열린 아주 흥미로운 전시회 소식을 들었습니다.', emotion: 'ing', tag: 'INTERESTING', rule: '흥미를 일으키는 전시회',
    left: w('He heard about a very'), word: 'interesting', right: w('exhibition in the city.'),
    actors: [{who: 'he', x0: 640, x1: 640, wave: true}],
    props: [
      {emoji: '📰', x: 1100, y: 540, size: 150, motion: 'float'},
      {emoji: '🖼️', x: 1360, y: 560, size: 140, motion: 'float'},
      {emoji: '✨', x: 1550, y: 430, size: 90, motion: 'pulse'},
    ],
  },
  {
    id: 's02', place: 'city', kr: '그 새로운 소식에 그는 마음이 몹시 신나고 설레었죠.', emotion: 'ed', tag: 'EXCITED', rule: '그가 신남을 느낌',
    left: w('He felt extremely'), word: 'excited', right: w('about the news.'),
    actors: [{who: 'he', x0: 640, x1: 640, wave: true}],
    props: [
      {emoji: '🎉', x: 1100, y: 520, size: 140, motion: 'float'},
      {emoji: '💓', x: 1350, y: 560, size: 120, motion: 'pulse'},
      {emoji: '📰', x: 1560, y: 570, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'gallery', kr: '전시장 안으로 들어서자, 놀라운 예술 작품들이 눈앞에 펼쳐졌습니다.', emotion: 'ing', tag: 'SURPRISING', rule: '놀라움을 주는 작품들',
    left: [], word: 'Surprising', right: w('artworks unfolded before his eyes.'),
    actors: [{who: 'he', x0: 400, x1: 640}],
    props: [
      {emoji: '🖼️', x: 1100, y: 520, size: 150, motion: 'float'},
      {emoji: '🎨', x: 1350, y: 570, size: 130, motion: 'pulse'},
      {emoji: '🌟', x: 1560, y: 450, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'gallery', kr: '작품의 웅장함에 그는 입을 벌린 채 깊이 놀랐습니다.', emotion: 'ed', tag: 'SURPRISED', rule: '그가 놀람을 느낌',
    left: w('He was completely'), word: 'surprised', right: w('by the grandeur of the art.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🏛️', x: 1150, y: 540, size: 160, motion: 'none'},
      {emoji: '😲', x: 1400, y: 480, size: 120, motion: 'pulse'},
      {emoji: '🖼️', x: 1580, y: 580, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'gallery', kr: '지루할 틈이 전혀 없는 정말 감동적인 순간이었죠.', emotion: 'ing', tag: 'TOUCHING · BORING', rule: '감동을 주는 순간',
    left: w('It was a'), word: 'touching', right: [...w('moment with no'), {text: 'boring', kind: 'ing'}, ...w('second.')],
    actors: [{who: 'he', x0: 600, x1: 600}, {who: 'she', x0: 760, x1: 760}],
    props: [
      {emoji: '💫', x: 1150, y: 500, size: 130, motion: 'pulse'},
      {emoji: '🎼', x: 1380, y: 560, size: 120, motion: 'float'},
      {emoji: '🖼️', x: 1580, y: 560, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's06', place: 'street', kr: '오랫동안 거리를 거닐었기에 몸은 조금 피곤해졌지만,', emotion: 'ed', tag: 'TIRED', rule: '그가 피곤함을 느낌',
    left: w('Although he felt a bit'), word: 'tired', right: w('from walking,'),
    actors: [{who: 'he', x0: 400, x1: 800}],
    props: [
      {emoji: '🌳', x: 1150, y: 560, size: 140, motion: 'none'},
      {emoji: '🌇', x: 1400, y: 540, size: 150, motion: 'none'},
      {emoji: '💤', x: 1580, y: 440, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's07', place: 'street', kr: '그의 마음만은 깊은 만족감으로 가득 차 있었습니다.', emotion: 'ing', tag: 'SATISFYING', rule: '만족을 주는 따뜻함',
    left: w('His heart was filled with a'), word: 'satisfying', right: w('warmth.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '💛', x: 1100, y: 520, size: 140, motion: 'pulse'},
      {emoji: '🌅', x: 1380, y: 560, size: 140, motion: 'float'},
      {emoji: '✨', x: 1580, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's08', place: 'home', kr: '집으로 돌아오는 길, 그는 오늘 하루가 선물해 준 감동에 깊이 감사했습니다.', emotion: 'ed', tag: 'MOVED', rule: '그가 감동을 받음',
    left: w('He was deeply'), word: 'moved', right: w('by the memories of the day.'),
    actors: [{who: 'he', x0: 400, x1: 700}],
    props: [
      {emoji: '💛', x: 1150, y: 500, size: 120, motion: 'pulse'},
      {emoji: '🏠', x: 1400, y: 550, size: 150, motion: 'none'},
      {emoji: '🌙', x: 1580, y: 420, size: 100, motion: 'pulse'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase, `{v|text}` = -ing (teal), `{p|text}` = -ed (orange). */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

// The English line: the adjective pill is teal (-ing) or orange (-ed); a trailing -ing word stays teal.
export const storyEnMarkup = (line: StoryLine) =>
  [
    ...line.left.map((p) => `{e|${p.text}}`),
    `{${line.emotion === 'ing' ? 'v' : 'p'}|${line.word}}`,
    ...line.right.map((p) => (p.kind === 'ing' ? `{v|${p.text}}` : p.kind === 'unit' ? `{p|${p.text}}` : `{e|${p.text}}`)),
  ].join(' ');

export const LECTURE_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '우리말은 “나 참 지루해”라고 할 때나 “그 영화 진짜 지루해”라고 할 때 똑같이 ‘지루하다’라는 말을 씁니다.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '하지만 영어는 주체가 감정을 직접 느끼는지, 아니면 그 감정을 밖으로 내뿜어 남에게 주는지에 따라 단어의 모양을 완전히 다르게 씁니다.', pad: 0.6},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 감정형용사의 {v|-ing}와 {p|-ed}입니다.', pad: 0.5},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '사람의 마음을 흔드는 감정의 화살표, 감정형용사입니다.', pad: 0.6},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '{v|현재분사}({v|-ing})는 감정을 밖으로 내뿜어 남에게 전달하는 에너지를 가진 형용사입니다.', pad: 0.6},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '지루함을 주는({v|BORING}), 흥미를 유발하는({v|INTERESTING}), 놀라움을 선사하는({v|SURPRISING}), 신나게 만드는({v|EXCITING}) 단어들입니다.', pad: 0.5},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: '{p|과거분사}({p|-ed})는 외부의 영향으로 그 감정을 직접 받아서 느끼는 형용사입니다.', pad: 0.6},
  {id: 'i8', scene: 'intro', mood: 'dawn', kr: '지루함을 느낀({p|BORED}), 흥미를 느끼게 된({p|INTERESTED}), 깜짝 놀란({p|SURPRISED}), 신이 난({p|EXCITED}) 단어들입니다.', pad: 0.6},

  {id: 'b1a', scene: 'bridge', mood: 'bridge', kr: '예를 들어, 내가 지루함을 느껴서 “나 너무 심심하고 지루해”라고 말할 때,', pad: 0.3},
  {id: 'b1b', scene: 'bridge', mood: 'bridge', kr: '{e|I am boring}이라고 쓰면 “나는 남을 지루하게 만드는 아주 따분한 사람이다”라는 완전히 엉뚱하고 자학적인 표현이 됩니다.', pad: 0.3},
  {id: 'b1c', scene: 'bridge', mood: 'bridge', kr: '내가 그 감정을 받아 느낀 것이므로 {e|I am bored}라고 써야 비로소 완성된 문장이 됩니다.', pad: 1.0},
  {id: 'b2a', scene: 'bridge', mood: 'bridge', kr: '다시 한 번 말하자면,', pad: 0.4},
  {id: 'b2b', scene: 'bridge', mood: 'bridge', kr: '감정을 내뿜는 원인에는 {v|-ing}, 그 감정을 받아서 느끼는 사람에게는 {p|-ed}를 씁니다.', pad: 0.4},
  {id: 'b2c', scene: 'bridge', mood: 'bridge', kr: '따라서 감정의 화살표가 어디로 향하는지 정확히 다리를 놓아주어야 합니다.', pad: 1.0},
  {id: 'b3a', scene: 'bridge', mood: 'bridge', kr: '{e|The movie was bored}는 그 영화가 지루함을 느꼈다는 어색한 문장이고,', pad: 0.9},
  {id: 'b3b', scene: 'bridge', mood: 'bridge', kr: '{e|The movie was boring}은 그 영화가 지루함을 주는 영화였다는 올바른 문장입니다.', pad: 1.4},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 감정을 표현하는 형용사, {v|-ing}와 {p|-ed}의 차이를 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '감정을 밖으로 뿜어내면 {v|-ing}, 그 감정을 내 마음으로 받아 느끼면 {p|-ed}라는 공식, 꼭 기억하세요.', pad: 0.5},
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
