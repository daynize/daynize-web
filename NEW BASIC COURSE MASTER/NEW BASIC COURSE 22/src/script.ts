import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

// ing = present participle (teal) · ed = past participle (orange) · subject = plain word
export type PartKind = 'subject' | 'ing' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type Place = 'morning' | 'park' | 'street' | 'cafe' | 'window' | 'warm';

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

/** One example sentence: `left` + the participle `word` (pops in) + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  /** Label shown with the participle, e.g. RISING. */
  tag: string;
  kind: 'ing' | 'ed';
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  morning: {label: '🌅  도시의 아침 · City morning', mood: 'morning'},
  park: {label: '🌳  공원 · Park', mood: 'park'},
  street: {label: '🍂  거리 · Street', mood: 'autumn'},
  cafe: {label: '☕  카페 · Café', mood: 'cafe'},
  window: {label: '🪟  창가 · By the window', mood: 'sunrise'},
  warm: {label: '💗  따뜻한 순간 · Warm moment', mood: 'sunny'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => text.split(' ').map((t) => ({text: t, kind}));

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'morning', kr: '아침 햇살 아래, 떠오르는 태양이 도시를 환하게 비춥니다.', tag: 'RISING', kind: 'ing',
    left: w('The'), word: 'rising', right: w('sun illuminates the city.'),
    actors: [],
    props: [
      {emoji: '☀️', x: 960, y: 470, size: 190, motion: 'pulse'},
      {emoji: '🏙️', x: 1500, y: 610, size: 170, motion: 'none'},
      {emoji: '🐦', x: 600, y: 420, size: 90, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'park', kr: '공원 한쪽에서는 자고 있는 아기 곁으로 바람이 스쳐 지나갑니다.', tag: 'SLEEPING', kind: 'ing',
    left: w('A gentle breeze passes by a'), word: 'sleeping', right: w('baby.'),
    actors: [],
    props: [
      {emoji: '👶', x: 960, y: 590, size: 150, motion: 'float'},
      {emoji: '🌬️', x: 1300, y: 500, size: 120, motion: 'float'},
      {emoji: '🌳', x: 500, y: 560, size: 160, motion: 'none'},
    ],
  },
  {
    id: 's03', place: 'street', kr: '그는 거리에서 바닥에 떨어진 나뭇잎들을 바라보았습니다.', tag: 'FALLEN', kind: 'ed',
    left: w('He looked at the'), word: 'fallen', right: w('leaves on the ground.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🍂', x: 1000, y: 590, size: 110, motion: 'float'},
      {emoji: '🍁', x: 1250, y: 560, size: 100, motion: 'float'},
      {emoji: '🍂', x: 1450, y: 600, size: 90, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'cafe', kr: '길 건너 카페에서는 흥미로운 음악이 흘러나오고 있었죠.', tag: 'INTERESTING', kind: 'ing',
    left: w('An'), word: 'interesting', right: w('melody was playing from the cafe.'),
    actors: [],
    props: [
      {emoji: '☕', x: 1350, y: 580, size: 150, motion: 'float'},
      {emoji: '🎵', x: 960, y: 480, size: 130, motion: 'float'},
      {emoji: '🎶', x: 700, y: 540, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'cafe', kr: '카페 안으로 들어선 그는 감동적인 이야기가 담긴 책을 펼쳤습니다.', tag: 'TOUCHING', kind: 'ing',
    left: w('He opened a book with a'), word: 'touching', right: w('story.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [{emoji: '📖', x: 1050, y: 580, size: 150, motion: 'float'}, {emoji: '💗', x: 1300, y: 480, size: 100, motion: 'float'}],
  },
  {
    id: 's06', place: 'cafe', kr: '이야기를 읽어내려가며, 그는 깊은 감동을 받았습니다.', tag: 'TOUCHED', kind: 'ed',
    left: w('Reading through the pages, he felt deeply'), word: 'touched', right: [],
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [{emoji: '📖', x: 1050, y: 590, size: 130, motion: 'float'}, {emoji: '🥹', x: 1300, y: 470, size: 130, motion: 'pulse'}],
  },
  {
    id: 's07', place: 'window', kr: '바로 그때, 닫힌 창문 너머로 반가운 친구의 모습이 보였습니다.', tag: 'CLOSED', kind: 'ed',
    left: w('He saw a dear friend beyond the'), word: 'closed', right: w('window.'),
    actors: [{who: 'he', x0: 560, x1: 560}, {who: 'she', x0: 1400, x1: 1400, flip: true, wave: true}],
    props: [{emoji: '🪟', x: 1000, y: 540, size: 200, motion: 'none'}],
  },
  {
    id: 's08', place: 'window', kr: '생각지도 못한 뜻밖의 재회에 그는 몹시 놀랐습니다.', tag: 'SURPRISED', kind: 'ed',
    left: w('He was greatly'), word: 'surprised', right: w('by the unexpected reunion.'),
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true}],
    props: [{emoji: '😲', x: 640, y: 450, size: 110, motion: 'pulse'}, {emoji: '✨', x: 960, y: 480, size: 100, motion: 'float'}],
  },
  {
    id: 's09', place: 'warm', kr: '지쳐 있던 그의 마음에 다시금 따뜻한 활력이 감돌기 시작했습니다.', tag: 'TIRED', kind: 'ed',
    left: w('Warm energy returned to his'), word: 'tired', right: w('heart.'),
    actors: [{who: 'he', x0: 640, x1: 640}, {who: 'she', x0: 1260, x1: 1260, flip: true}],
    props: [{emoji: '💗', x: 960, y: 520, size: 150, motion: 'pulse'}, {emoji: '⚡', x: 1250, y: 440, size: 100, motion: 'float'}],
  },
  {
    id: 's10', place: 'warm', kr: '그렇게 두 사람은 서로에게 환하게 미소 짓는 얼굴로 인사를 건넸습니다.', tag: 'SMILING', kind: 'ing',
    left: w('They greeted each other with'), word: 'smiling', right: w('faces.'),
    actors: [{who: 'he', x0: 640, x1: 640, wave: true}, {who: 'she', x0: 1260, x1: 1260, flip: true, wave: true}],
    props: [{emoji: '😊', x: 960, y: 480, size: 140, motion: 'pulse'}, {emoji: '🌸', x: 1300, y: 560, size: 100, motion: 'float'}],
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

const kindMarkup = (part: Part) =>
  `{${part.kind === 'unit' || part.kind === 'ed' ? 'p' : part.kind === 'noun' || part.kind === 'verb' || part.kind === 'ing' ? 'v' : 'e'}|${part.text}}`;
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map(kindMarkup), `{${line.kind === 'ing' ? 'v' : 'p'}|${line.word}}`, ...line.right.map(kindMarkup)].join(' ');

export const LECTURE_CUES: CueDef[] = [
  {id: 'i1a', scene: 'intro', mood: 'dawn', kr: '우리말은 동사에 ‘~하는’이나 ‘~된’을 붙여서 뒤에 오는 명사를 꾸며줍니다.', pad: 0.3},
  {id: 'i1b', scene: 'intro', mood: 'dawn', kr: '‘잠자는 아기’, ‘부서진 창문’처럼 말이죠.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '영어에서도 동사를 형용사처럼 바꿔서 명사를 꾸며주는 아주 특별한 장치가 있습니다.', pad: 0.5},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 현재분사({v|-ing})와 과거분사({p|-p.p.})입니다.', pad: 0.5},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '동사라는 뿌리에서 갈라져 나와 명사를 꾸며주는 품사, 분사입니다.', pad: 0.6},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '현재분사({v|-ing})는 스스로 하고 있는 능동과 진행의 의미를 가집니다.', pad: 0.5},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '자고 있는({v|sleeping}), 날아가고 있는({v|flying}), 흥미를 주는({v|interesting}), 놀라게 하는({v|surprising}) 형용사들입니다.', pad: 0.5},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: '과거분사({p|-ed}, {p|p.p.})는 남에 의해 당하거나 이미 완료된 수동과 완료의 의미를 가집니다.', pad: 0.5},
  {id: 'i8', scene: 'intro', mood: 'dawn', kr: '부서진({p|broken}), 감동받은({p|touched}), 놀란({p|surprised}), 힘들어진({p|tired}) 형용사들입니다.', pad: 0.6},

  {id: 'b1a', scene: 'bridge', mood: 'bridge', kr: '예를 들어, “나 정말 지루해”라고 할 때,', pad: 0.3},
  {id: 'b1b', scene: 'bridge', mood: 'bridge', kr: '{e|I am boring}이라고 쓰면 “나는 남을 지루하게 만드는 재미없는 사람이다”라는 뜻이 되어 아주 어색하고 황당한 문장이 됩니다.', pad: 0.3},
  {id: 'b1c', scene: 'bridge', mood: 'bridge', kr: '내 감정이 지루함을 느낀 것이므로 {e|I am bored}처럼 {p|과거분사}를 써야 완성된 문장이 됩니다.', pad: 1.0},
  {id: 'b2a', scene: 'bridge', mood: 'bridge', kr: '다시 한 번 말하자면,', pad: 0.4},
  {id: 'b2b', scene: 'bridge', mood: 'bridge', kr: '{v|현재분사}({v|-ing})는 주체가 직접 행동을 내뿜는 것, {p|과거분사}({p|-ed})는 행동이나 감정을 전달받아 당하는 것입니다.', pad: 0.4},
  {id: 'b2c', scene: 'bridge', mood: 'bridge', kr: '따라서 명사의 관계에 따라 능동과 수동의 다리를 정확히 놓아주어야 합니다.', pad: 1.2},
  {id: 'b3a', scene: 'bridge', mood: 'bridge', kr: '{e|a sleeping baby}는 스스로 자고 있는 아기, 능동과 진행의 뜻이고,', pad: 0.9},
  {id: 'b3b', scene: 'bridge', mood: 'bridge', kr: '{e|a broken window}는 깨짐을 당해버린 창문, 수동과 완료의 뜻입니다.', pad: 1.4},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 동사의 변신, {v|현재분사}와 {p|과거분사}에 대해 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '내가 직접 내뿜는 능동은 {v|-ing}, 남에게 전달받아 당하는 수동은 {p|-ed}라는 점, 잊지 마세요.', pad: 0.5},
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
