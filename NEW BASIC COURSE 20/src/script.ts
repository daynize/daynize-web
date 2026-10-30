import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type Place = 'airport' | 'cafe' | 'night' | 'heart' | 'taxi';

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

export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  left: Part[];
  prep: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  airport: {label: '✈  공항 · Airport', mood: 'airport'},
  cafe: {label: '☕  카페 · Café', mood: 'cafe'},
  night: {label: '🌙  밤거리 · Night street', mood: 'night'},
  heart: {label: '💗  마음속 · His heart', mood: 'night'},
  taxi: {label: '🚕  택시 · Taxi', mood: 'taxi'},
};

const S = (text: string): Part => ({text, kind: 'subject'});
const V = (text: string): Part => ({text, kind: 'verb'});
const O = (text: string): Part => ({text, kind: 'object'});
const T = (text: string): Part => ({text, kind: 'tail'});

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'airport', kr: '그가 마침내 공항에 도착했습니다.',
    left: [S('He'), V('arrived')], prep: 'at', right: [O('the airport.')],
    actors: [{who: 'he', x0: 180, x1: 640}],
    props: [
      {emoji: '✈️', x: 1350, y: 560, size: 130, motion: 'drive', dx: 380},
      {emoji: '🏢', x: 1500, y: 600, size: 190, motion: 'none'},
    ],
  },
  {
    id: 's02', place: 'airport', kr: '그는 두근거리는 마음으로 그녀를 기다리고 있었죠.',
    left: [S('He'), V('was waiting')], prep: 'for', right: [O('her.')],
    actors: [{who: 'he', x0: 760, x1: 760}],
    props: [{emoji: '💓', x: 960, y: 520, size: 110, motion: 'pulse'}, {emoji: '🕒', x: 1350, y: 560, size: 120, motion: 'float'}],
  },
  {
    id: 's03', place: 'airport', kr: '바로 그때, 수많은 사람들 속에서 한 여자가 나타났습니다.',
    left: [S('A woman'), V('appeared')], prep: 'from', right: [O('the crowd.')],
    actors: [{who: 'he', x0: 360, x1: 360}, {who: 'she', x0: 1560, x1: 1260, flip: true}],
    props: [
      {emoji: '🚶', x: 880, y: 590, size: 100, motion: 'drive', dx: 90},
      {emoji: '🧍', x: 1020, y: 590, size: 100, motion: 'none'},
      {emoji: '🚶‍♂️', x: 1700, y: 590, size: 100, motion: 'drive', dx: -80},
    ],
  },
  {
    id: 's04', place: 'airport', kr: '그녀는 그를 발견하고 환하게 미소 지었습니다.',
    left: [S('She'), V('smiled')], prep: 'at', right: [O('him.')],
    actors: [{who: 'he', x0: 560, x1: 560}, {who: 'she', x0: 1260, x1: 1260, flip: true, wave: true}],
    props: [{emoji: '😊', x: 1260, y: 470, size: 100, motion: 'pulse'}, {emoji: '✨', x: 940, y: 560, size: 90, motion: 'float'}],
  },
  {
    id: 's05', place: 'airport', kr: '그녀는 수줍게 웃으며 그에게 다가왔습니다.',
    left: [S('She'), V('walked')], prep: 'to', right: [O('him'), T('with a shy laugh.')],
    actors: [{who: 'he', x0: 980, x1: 980}, {who: 'she', x0: 1560, x1: 1180, flip: true}],
    props: [{emoji: '🌸', x: 1200, y: 470, size: 90, motion: 'float'}],
  },
  {
    id: 's06', place: 'cafe', kr: '두 사람은 분위기 좋은 카페로 들어가 서로의 이야기에 귀를 기울였습니다.',
    left: [S('They'), V('listened')], prep: 'to', right: [O('each other.')],
    actors: [{who: 'he', x0: 700, x1: 700}, {who: 'she', x0: 1220, x1: 1220, flip: true}],
    props: [
      {emoji: '☕', x: 960, y: 640, size: 110, motion: 'float'},
      {emoji: '💬', x: 960, y: 500, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's07', place: 'cafe', kr: '그는 그녀가 나누는 모든 이야기에 깊이 동의했습니다.',
    left: [S('He'), V('agreed')], prep: 'with', right: [O('her.')],
    actors: [{who: 'he', x0: 700, x1: 700}, {who: 'she', x0: 1220, x1: 1220, flip: true, wave: true}],
    props: [{emoji: '👍', x: 700, y: 470, size: 100, motion: 'pulse'}, {emoji: '💬', x: 1220, y: 470, size: 90, motion: 'float'}],
  },
  {
    id: 's08', place: 'cafe', kr: '그들은 서로의 꿈과 미래에 대해 한참 동안 이야기했습니다.',
    left: [S('They'), V('talked')], prep: 'about', right: [O('their dreams and future.')],
    actors: [{who: 'he', x0: 700, x1: 700}, {who: 'she', x0: 1220, x1: 1220, flip: true}],
    props: [
      {emoji: '💭', x: 960, y: 500, size: 130, motion: 'float'},
      {emoji: '🌠', x: 1480, y: 520, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's09', place: 'cafe', kr: '그는 그녀의 모든 질문에 진심으로 응답했습니다.',
    left: [S('He'), V('responded')], prep: 'to', right: [O('all her questions.')],
    actors: [{who: 'he', x0: 700, x1: 700}, {who: 'she', x0: 1220, x1: 1220, flip: true}],
    props: [{emoji: '❓', x: 1220, y: 470, size: 100, motion: 'float'}, {emoji: '💡', x: 700, y: 470, size: 100, motion: 'pulse'}],
  },
  {
    id: 's10', place: 'cafe', kr: '그리고 사랑스러운 눈빛으로 그녀를 오랫동안 바라보았습니다.',
    left: [S('He'), V('looked')], prep: 'at', right: [O('her.')],
    actors: [{who: 'he', x0: 700, x1: 700}, {who: 'she', x0: 1220, x1: 1220, flip: true}],
    props: [{emoji: '👀', x: 820, y: 480, size: 100, motion: 'pulse'}, {emoji: '💗', x: 1000, y: 560, size: 80, motion: 'float'}],
  },
  {
    id: 's11', place: 'heart', kr: '‘아, 나의 마음은 이제 그녀에게 속해 있구나.’',
    left: [S('My heart'), V('belongs')], prep: 'to', right: [O('her.')],
    actors: [],
    props: [{emoji: '❤️', x: 960, y: 560, size: 230, motion: 'pulse'}],
  },
  {
    id: 's12', place: 'heart', kr: '‘나는 정말 그녀에 대해 깊이 신경 쓰고 있구나.’',
    left: [S('I'), V('really care')], prep: 'about', right: [O('her.')],
    actors: [],
    props: [{emoji: '💗', x: 960, y: 560, size: 230, motion: 'pulse'}],
  },
  {
    id: 's13', place: 'night', kr: '바로 그 순간, 그에게 거짓말 같은 기적이 일어난 것이었습니다.',
    left: [S('A miracle'), V('happened')], prep: 'to', right: [O('him'), T('at that moment.')],
    actors: [{who: 'he', x0: 960, x1: 960}],
    props: [
      {emoji: '✨', x: 700, y: 540, size: 110, motion: 'float'},
      {emoji: '🌟', x: 1220, y: 520, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's14', place: 'taxi', kr: '하지만 꿈같던 시간이 지나가고, 그녀를 실은 택시가 서울로 출발했습니다.',
    left: [S('The taxi'), V('departed')], prep: 'for', right: [O('Seoul.')],
    actors: [{who: 'he', x0: 360, x1: 360, wave: true}],
    props: [{emoji: '🚕', x: 700, y: 610, size: 170, motion: 'drive', dx: 760}],
  },
  {
    id: 's15', place: 'taxi', kr: '택시는 도로 멀리 시야에서 사라졌지만,',
    left: [S('The taxi'), V('disappeared')], prep: 'from', right: [O('view,')],
    actors: [{who: 'he', x0: 360, x1: 360, wave: true}],
    props: [{emoji: '🚕', x: 1000, y: 610, size: 170, motion: 'drive', dx: 800, fadeOut: true}],
  },
  {
    id: 's16', place: 'taxi', kr: '그녀가 다시 이곳으로 돌아올 날을 그는 기쁨으로 생각했습니다.',
    left: [S('He'), V('thought')], prep: 'about', right: [O('the day she would return to this place.')],
    actors: [{who: 'he', x0: 560, x1: 560}],
    props: [{emoji: '🌅', x: 1300, y: 520, size: 180, motion: 'pulse'}, {emoji: '💭', x: 760, y: 470, size: 100, motion: 'float'}],
  },
  {
    id: 's17', place: 'night', kr: '그의 마음속에는 그녀의 따뜻한 여운이 오래도록 머물러 있었습니다.',
    left: [S('Her warm presence'), V('stayed')], prep: 'in', right: [O('his heart'), T('for a long time.')],
    actors: [],
    props: [{emoji: '🕯️', x: 960, y: 570, size: 190, motion: 'pulse'}, {emoji: '💗', x: 1250, y: 520, size: 100, motion: 'float'}],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase, `{v|text}` = verb (teal), `{p|text}` = preposition (orange). */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const kindMarkup = (part: Part) => `{${part.kind === 'verb' ? 'v' : 'e'}|${part.text}}`;
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map(kindMarkup), `{p|${line.prep}}`, ...line.right.map(kindMarkup)].join(' ');

export const LECTURE_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '우리말은 동사가 문장 맨 끝에 오면서 말을 끝내는 역할을 하죠.'},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '하지만 영어는 주어 다음에 동사가 바로 옵니다.', pad: 0.3},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '그 동사 뒤에 오는 명사는 목적어로 해석되는데요, 우리말로는 ‘에게’, ‘을’, ‘를’로 해석됩니다.'},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 잡힙니다. 바로 {v|타동사}와 {v|자동사}입니다.'},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '{e|타동사}는 남을 움직이는 품사입니다.', pad: 0.4},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '반면에 {v|자동사}는 혼자서 할 수 있는 행동, 즉 나 스스로를 움직이는 품사죠.', pad: 0.4},
  {id: 'i7a', scene: 'intro', mood: 'dawn', kr: '혼자 누워 있다가, 자다가, 꿈을 꾸다가, 깨어나고, 기어다니다가, 쭈그려 앉았다가, 일어나고,'},
  {id: 'i7b', scene: 'intro', mood: 'dawn', kr: '걷고, 뛰다가, 깡충깡충 뛰다가, 점프도 하고, 날아가는 동사들이 바로 대표적인 {v|자동사}입니다.', pad: 0.5},

  {id: 'b1a', scene: 'bridge', mood: 'bridge', kr: '예를 들어볼까요? “그녀는 그에게 거짓말을 했다”라고 할 때,', pad: 0.3},
  {id: 'b1b', scene: 'bridge', mood: 'bridge', kr: '{e|She lied him}이라고 쓰면 “그녀는 그를 거짓말했다”라는 아주 어색한 문장이 됩니다.', pad: 0.3},
  {id: 'b1c', scene: 'bridge', mood: 'bridge', kr: '{e|She lied} {p|to} {e|him}처럼 중간에 {p|to}를 넣어야 완성된 문장이 되죠.', pad: 0.9},
  {id: 'b2a', scene: 'bridge', mood: 'bridge', kr: '다시 한 번 말하자면, {v|자동사} 바로 뒤에는 목적어가 직접 오지 못합니다.', pad: 0.3},
  {id: 'b2b', scene: 'bridge', mood: 'bridge', kr: '따라서 {v|자동사} 뒤에 대상이나 장소를 붙이려면, 반드시 {p|전치사}가 다리 역할을 해주어야 합니다.', pad: 1.6},
  {id: 'b3a', scene: 'bridge', mood: 'bridge', kr: '{e|She sat the chair}라고 쓰면 어색하지만,', pad: 0.9},
  {id: 'b3b', scene: 'bridge', mood: 'bridge', kr: '{e|She sat} {p|on} {e|the chair}라고 써야', pad: 0.4},
  {id: 'b3c', scene: 'bridge', mood: 'bridge', kr: '“그녀는 그 의자에 앉았다”라는 올바른 문장이 되는 것처럼 말이죠.', pad: 1.2},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘 {v|자동사}와 타동사의 구분을 배웠습니다.', pad: 0.4},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '{v|자동사} 뒤에는 목적어가 바로 올 수 없고, 반드시 {p|전치사}라는 다리가 와야 한다는 점을 잊지 마세요.', pad: 0.5},
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
