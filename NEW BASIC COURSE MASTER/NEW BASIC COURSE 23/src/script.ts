import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

// ing = gerund (teal, past/experience) · to = to-infinitive (orange, future/purpose)
export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type Place = 'cafe' | 'past' | 'newcity' | 'station' | 'train';

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

/** One example sentence: `left` + the -ing / to-V form `word` (pops in) + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  /** Label shown with the form, e.g. ENJOY -ING. */
  tag: string;
  kind: 'ing' | 'to';
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  cafe: {label: '☕  조용한 카페 · Quiet café', mood: 'cafe'},
  past: {label: '🍂  지난날 · The past', mood: 'autumn'},
  newcity: {label: '🌅  새로운 시작 · A new start', mood: 'morning'},
  station: {label: '🚉  기차역 · Station', mood: 'airport'},
  train: {label: '🚆  기차 창가 · Train window', mood: 'sunrise'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => text.split(' ').map((t) => ({text: t, kind}));

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'cafe', kr: '그는 조용한 카페에 앉아 좋아하는 음악 듣는 것을 즐겼습니다.', tag: 'ENJOY -ING', kind: 'ing',
    left: w('He enjoyed'), word: 'listening', right: w('to his favorite music.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '🎧', x: 1050, y: 540, size: 140, motion: 'float'},
      {emoji: '🎵', x: 1300, y: 460, size: 100, motion: 'float'},
      {emoji: '☕', x: 1350, y: 600, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'cafe', kr: '그동안 해오던 일을 마침내 잘 마무리한 후였죠.', tag: 'FINISH -ING', kind: 'ing',
    left: w('He finally finished'), word: 'working', right: w('on his project.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '💻', x: 1050, y: 570, size: 140, motion: 'float'},
      {emoji: '✅', x: 1300, y: 470, size: 110, motion: 'pulse'},
      {emoji: '📁', x: 1400, y: 600, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'past', kr: '복잡했던 지난날의 걱정들은 이제 모두 그만두기로 했습니다.', tag: 'STOP -ING', kind: 'ing',
    left: w('He stopped'), word: 'worrying', right: w('about the past.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '☁️', x: 1000, y: 440, size: 130, motion: 'float'},
      {emoji: '🍂', x: 1250, y: 560, size: 100, motion: 'float'},
      {emoji: '🚫', x: 1450, y: 480, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's04', place: 'newcity', kr: '그리고 낯선 도시로 새로운 여행을 떠나기로 결정했습니다.', tag: 'DECIDE TO-V', kind: 'to',
    left: w('He decided'), word: 'to travel', right: w('to a new city.'),
    actors: [{who: 'he', x0: 400, x1: 700}],
    props: [
      {emoji: '🧳', x: 900, y: 590, size: 120, motion: 'float'},
      {emoji: '🏙️', x: 1450, y: 590, size: 170, motion: 'none'},
      {emoji: '➡️', x: 1150, y: 470, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's05', place: 'newcity', kr: '그곳에서 뜻밖의 소중한 인연을 만나기를 진심으로 희망했죠.', tag: 'HOPE TO-V', kind: 'to',
    left: w('He hoped'), word: 'to meet', right: w('a special person there.'),
    actors: [{who: 'he', x0: 560, x1: 560}, {who: 'she', x0: 1400, x1: 1400, flip: true, wave: true}],
    props: [{emoji: '💫', x: 1000, y: 460, size: 120, motion: 'float'}, {emoji: '🤝', x: 1000, y: 590, size: 110, motion: 'pulse'}],
  },
  {
    id: 's06', place: 'station', kr: '기차역에 도착한 그는 기차표를 사기 위해 차분히 줄을 섰습니다.', tag: 'TO-V 목적', kind: 'to',
    left: w('He waited in line'), word: 'to buy', right: w('a train ticket.'),
    actors: [{who: 'he', x0: 600, x1: 600}],
    props: [{emoji: '🎫', x: 1150, y: 540, size: 130, motion: 'float'}, {emoji: '🚉', x: 1450, y: 590, size: 150, motion: 'none'}],
  },
  {
    id: 's07', place: 'train', kr: '창가에 앉아, 그는 떠나가는 풍경을 바라보는 것을 좋아했습니다.', tag: 'LIKE -ING', kind: 'ing',
    left: w('He liked'), word: 'watching', right: w('the passing scenery.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [{emoji: '🚆', x: 1050, y: 560, size: 150, motion: 'drive', dx: 300}, {emoji: '🌄', x: 1400, y: 500, size: 150, motion: 'float'}],
  },
  {
    id: 's08', place: 'train', kr: '동시에, 새로 마주할 그곳에서의 내일을 계속해서 꿈꾸었습니다.', tag: 'WISH TO-V', kind: 'to',
    left: w('He wished'), word: 'to create', right: w('unforgettable memories.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [{emoji: '🌠', x: 1050, y: 450, size: 140, motion: 'float'}, {emoji: '📸', x: 1350, y: 560, size: 110, motion: 'pulse'}],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase, `{v|text}` = -ing (teal), `{p|text}` = to-V (orange). */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const kindMarkup = (part: Part) =>
  `{${part.kind === 'unit' || part.kind === 'ed' || part.kind === 'to' ? 'p' : part.kind === 'noun' || part.kind === 'verb' || part.kind === 'ing' ? 'v' : 'e'}|${part.text}}`;
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map(kindMarkup), `{${line.kind === 'ing' ? 'v' : 'p'}|${line.word}}`, ...line.right.map(kindMarkup)].join(' ');

export const LECTURE_CUES: CueDef[] = [
  {id: 'i1a', scene: 'intro', mood: 'dawn', kr: '우리말은 동사에 ‘~하는 것’이나 ‘~하기’를 붙여서 명사처럼 만들어 사용합니다.', pad: 0.3},
  {id: 'i1b', scene: 'intro', mood: 'dawn', kr: '‘공부하기’, ‘여행하는 것’처럼 말이죠.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '영어에서도 동사를 명사처럼 바꿔쓰는 두 가지 변신 장치가 있습니다.', pad: 0.5},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 동명사({v|-ing})와 to부정사({p|to-V})입니다.', pad: 0.5},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '동사의 옷을 벗고 명사의 자리로 들어가는 품사, 동명사와 부정사입니다.', pad: 0.6},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '동명사({v|-ing})는 이미 일어났거나 생생하게 경험해 본 과거와 현재의 느낌을 가집니다.', pad: 0.5},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '즐겼던 것({v|enjoying}), 끝낸 것({v|finishing}), 포기했던 것({v|giving up}), 피했던 것({v|avoiding})을 나타내는 명사들입니다.', pad: 0.5},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: 'to부정사({p|to-V})는 화살표({p|to})처럼 앞으로 나아갈 미래의 계획과 의지의 느낌을 가집니다.', pad: 0.5},
  {id: 'i8', scene: 'intro', mood: 'dawn', kr: '원하는 것({p|to want}), 희망하는 것({p|to hope}), 약속하는 것({p|to promise}), 결정하는 것({p|to decide})을 나타내는 명사들입니다.', pad: 0.6},

  {id: 'b1a', scene: 'bridge', mood: 'bridge', kr: '예를 들어, “나 담배 끊었어”라고 할 때,', pad: 0.3},
  {id: 'b1b', scene: 'bridge', mood: 'bridge', kr: '{e|I stopped to smoke}라고 쓰면 “나 길을 가다가 담배를 피우기 위해 멈춰 섰다”라는 완전히 반대의 뜻이 되어 아주 어색하고 위험한 문장이 됩니다.', pad: 0.3},
  {id: 'b1c', scene: 'bridge', mood: 'bridge', kr: '내가 이전에 계속해 오던 행동을 그만둔 것이므로 {e|I stopped smoking}처럼 {v|동명사}를 써야 완성된 문장이 됩니다.', pad: 1.0},
  {id: 'b2a', scene: 'bridge', mood: 'bridge', kr: '다시 한 번 말하자면,', pad: 0.4},
  {id: 'b2b', scene: 'bridge', mood: 'bridge', kr: '{v|동명사}({v|-ing})는 지나온 과거의 생생한 경험, {p|to부정사}({p|to-V})는 앞으로 나아갈 미래의 목적입니다.', pad: 0.4},
  {id: 'b2c', scene: 'bridge', mood: 'bridge', kr: '따라서 동사가 바라보는 시간의 방향에 따라 {v|-ing}와 {p|to-V}라는 다리를 정확히 선택해 주어야 합니다.', pad: 1.2},
  {id: 'b3a', scene: 'bridge', mood: 'bridge', kr: '{e|I plan visiting Seoul}은 서울 방문했던 것을 계획한다는 어색한 문장이고,', pad: 0.9},
  {id: 'b3b', scene: 'bridge', mood: 'bridge', kr: '{e|I plan to visit Seoul}은 앞으로 서울을 방문할 것을 계획한다는 올바른 문장입니다.', pad: 1.4},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 동사의 명사 변신, {v|동명사}와 {p|to부정사}에 대해 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '지나온 생생한 경험은 {v|-ing}, 앞으로 나아갈 미래의 의지는 {p|to-V}라는 시간의 방향을 꼭 기억하세요.', pad: 0.5},
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
