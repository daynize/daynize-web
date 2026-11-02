import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

/**
 * Review colours: modal (13강 조동사) = teal, comp (14강 비교급) = orange, super (15강 최상급) = purple,
 * conj (16강 접속사) = coral, subj (17강 가정법) = gold, cond (18강 조건문) = blue, inv (19강 도치) = violet,
 * finale (완결 문장) = pink.
 */
export type WordKey = 'modal' | 'comp' | 'super' | 'conj' | 'subj' | 'cond' | 'inv' | 'finale';
export type Place = 'library' | 'city' | 'dawn';

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

/** One finale example: `left` + the popped key expression `word` + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: WordKey;
  /** Review tag, e.g. "13강 · 조동사" */
  tag: string;
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  library: {label: '📚  비밀 서재 · Library', mood: 'cafe'},
  city: {label: '🌃  도심의 밤 · City night', mood: 'night'},
  dawn: {label: '🌅  새로운 내일 · New day', mood: 'sunrise'},
};

/** The seven reviewed lessons (also used by the intro / outro visuals). */
export const LESSONS: {no: number; title: string; kind: WordKey}[] = [
  {no: 13, title: '조동사', kind: 'modal'},
  {no: 14, title: '비교급', kind: 'comp'},
  {no: 15, title: '최상급', kind: 'super'},
  {no: 16, title: '접속사', kind: 'conj'},
  {no: 17, title: '가정법', kind: 'subj'},
  {no: 18, title: '조건문', kind: 'cond'},
  {no: 19, title: '도치', kind: 'inv'},
];

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  // ---- Part 1. 13강~19강 핵심 문법 총집합 ----
  {
    id: 's01', place: 'library', kr: '우리는 이제 비밀 서재의 문을 주저함 없이 열 수 있다.', kind: 'modal', tag: '13강 · 조동사', rule: '마음의 농도',
    left: w('We'), word: 'can', right: w('open the door of the secret library without hesitation now.'),
    actors: [{who: 'he', x0: 420, x1: 620}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🚪', x: 1150, y: 560, size: 150, motion: 'pulse'},
      {emoji: '🗝️', x: 1400, y: 520, size: 130, motion: 'float'},
      {emoji: '📚', x: 1620, y: 560, size: 120, motion: 'none'},
    ],
  },
  {
    id: 's02', place: 'library', kr: '지금 흐르는 멜로디는 우리가 어제 들었던 것보다 훨씬 더 감동적이다.', kind: 'comp', tag: '14강 · 비교급', rule: '음절과 격차',
    left: w('The melody flowing now is'), word: 'much more touching', right: w('than what we heard yesterday.'),
    actors: [{who: 'she', x0: 460, x1: 620}],
    props: [
      {emoji: '🎼', x: 1150, y: 520, size: 140, motion: 'float'},
      {emoji: '🥹', x: 1400, y: 520, size: 120, motion: 'pulse'},
      {emoji: '🎹', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's03', place: 'library', kr: '이 순간이 올여름 밤 도심 속에서 우리가 경험한 가장 아름다운 기적이다.', kind: 'super', tag: '15강 · 최상급', rule: '단 하나의 존재',
    left: w('This moment is'), word: 'the most beautiful', right: w('miracle we experienced in the city this summer night.'),
    actors: [{who: 'he', x0: 420, x1: 600}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🌠', x: 1150, y: 480, size: 140, motion: 'float'},
      {emoji: '🏆', x: 1400, y: 540, size: 130, motion: 'pulse'},
      {emoji: '🌃', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's04', place: 'city', kr: '자정이 되었을 때 그 피아노 소리가 퍼졌기 때문에, 온 도시가 조용히 숨을 죽였다.', kind: 'conj', tag: '16강 · 접속사', rule: '풍성한 연결',
    left: w(''), word: 'Because', right: w('the piano sound spread when midnight arrived, the whole city held its breath quietly.'),
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🕛', x: 1150, y: 500, size: 140, motion: 'pulse'},
      {emoji: '🎹', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '🤫', x: 1620, y: 480, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'city', kr: '만약 네가 나와 함께 있지 않았더라면, 나는 이 기적의 순간을 절대 만나지 못했을 텐데.', kind: 'subj', tag: '17강 · 가정법', rule: '마음의 상상',
    left: w('If you'), word: 'had not been', right: w('with me, I would have never met this moment of miracle.'),
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '💭', x: 1150, y: 480, size: 130, motion: 'float'},
      {emoji: '🤝', x: 1400, y: 540, size: 130, motion: 'pulse'},
      {emoji: '✨', x: 1620, y: 480, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's06', place: 'city', kr: '만약 우리가 매일 밤 이 골목길을 기억한다면, 마법은 영원히 우리 곁에 남아있을 것이다.', kind: 'cond', tag: '18강 · 조건문', rule: '현실의 조건',
    left: w('If we'), word: 'remember', right: w('this alley every night, the magic will stay by our side forever.'),
    actors: [{who: 'he', x0: 440, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🌃', x: 1150, y: 540, size: 150, motion: 'none'},
      {emoji: '🔮', x: 1400, y: 530, size: 130, motion: 'float'},
      {emoji: '💫', x: 1620, y: 470, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's07', place: 'city', kr: '나는 내 인생에서 이렇게 깊은 울림을 주는 음악을 단 한 번도 들어본 적이 없다.', kind: 'inv', tag: '19강 · 도치', rule: '극적인 스포트라이트',
    left: w(''), word: 'Never', right: w('have I heard such a deeply touching music in my whole life.'),
    actors: [{who: 'she', x0: 460, x1: 620}],
    props: [
      {emoji: '🔦', x: 1150, y: 480, size: 140, motion: 'pulse'},
      {emoji: '🎶', x: 1400, y: 500, size: 130, motion: 'float'},
      {emoji: '😮', x: 1620, y: 480, size: 110, motion: 'float'},
    ],
  },

  // ---- Part 2. 도심 동화 완결 문장 ----
  {
    id: 's08', place: 'dawn', kr: '오래된 일기장 마지막 페이지에 적힌 문장은 우리 모두에게 전하는 희망의 메시지였다.', kind: 'finale', tag: '완결 문장 ①', rule: '희망의 메시지',
    left: w('The sentence written on the last page of the old diary was a'), word: 'message of hope', right: w('to us all.'),
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '📔', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '🌟', x: 1400, y: 500, size: 130, motion: 'pulse'},
      {emoji: '🕊️', x: 1620, y: 480, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's09', place: 'dawn', kr: '카페 2층의 불빛은 꺼졌지만, 그 울림은 우리의 가슴속에 영원히 꺼지지 않을 것이다.', kind: 'finale', tag: '완결 문장 ②', rule: '꺼지지 않는 울림',
    left: w(''), word: 'Though', right: w('the light on the second floor went out, its echo will never fade in our hearts.'),
    actors: [{who: 'he', x0: 440, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '☕', x: 1150, y: 550, size: 130, motion: 'pulse'},
      {emoji: '💡', x: 1400, y: 520, size: 130, motion: 'float'},
      {emoji: '❤️', x: 1620, y: 480, size: 120, motion: 'pulse'},
    ],
  },
  {
    id: 's10', place: 'dawn', kr: '이제 우리는 각자의 일상으로 돌아가지만, 우리의 언어는 이전보다 훨씬 더 풍성해졌다.', kind: 'finale', tag: '완결 문장 ③', rule: '더 풍성해진 언어',
    left: w('Now we return to our daily lives, but our language has become'), word: 'much richer', right: w('than before.'),
    actors: [{who: 'he', x0: 420, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🏠', x: 1150, y: 550, size: 140, motion: 'none'},
      {emoji: '📖', x: 1400, y: 520, size: 130, motion: 'float'},
      {emoji: '🌈', x: 1620, y: 480, size: 120, motion: 'pulse'},
    ],
  },
  {
    id: 's11', place: 'dawn', kr: '만약 네가 다시 영어 문장을 세우고 싶다면, 언제든 이 도심 동화의 골목길로 찾아오면 된다.', kind: 'finale', tag: '완결 문장 ④', rule: '언제든 환영',
    left: w(''), word: 'If', right: w('you want to build English sentences again, you can always visit this alley of urban fairy tale.'),
    actors: [{who: 'she', x0: 460, x1: 620}, {who: 'he', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🧱', x: 1150, y: 550, size: 130, motion: 'pulse'},
      {emoji: '🌃', x: 1400, y: 540, size: 140, motion: 'none'},
      {emoji: '👋', x: 1620, y: 480, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's12', place: 'dawn', kr: '마침내 우리의 긴 여행은 끝났고, 새로운 시작을 향해 기분 좋게 발걸음을 옮긴다.', kind: 'finale', tag: '완결 문장 ⑤', rule: '새로운 시작',
    left: w(''), word: 'At last', right: w('our long journey has ended, and we take a pleasant step toward a new beginning.'),
    actors: [{who: 'he', x0: 400, x1: 700}, {who: 'she', x0: 860, x1: 900, flip: true}],
    props: [
      {emoji: '🛤️', x: 1150, y: 580, size: 130, motion: 'none'},
      {emoji: '🌅', x: 1400, y: 500, size: 150, motion: 'float'},
      {emoji: '🚶', x: 1620, y: 560, size: 110, motion: 'drive', dx: 100},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /**
   * Korean narration (ALL of it is read by the Korean voice). `{e|text}` = English phrase, `{y|}` emphasis (gold);
   * colours: `{v|}` 조동사, `{p|}` 비교급, `{g|}` 최상급, `{c|}` 접속사, `{y|}` 가정법, `{b|}` 조건문, `{l|}` 도치, `{m|}` 완결.
   */
  kr: string;
  en?: string;
  /** Voice text when it must differ from the subtitle (spaces/punctuation only). */
  say?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const KIND_LETTER: Record<WordKey, string> = {modal: 'v', comp: 'p', super: 'g', conj: 'c', subj: 'y', cond: 'b', inv: 'l', finale: 'm'};

// The English line (read by the English voice): the key expression of the reviewed grammar is coloured.
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map((p) => `{e|${p.text}}`), `{${KIND_LETTER[line.kind]}|${line.word}}`, ...line.right.map((p) => `{e|${p.text}}`)].join(' ');

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '20강. 마침내 완성된 이야기. 13강 조동사부터 19강 도치까지, 우리는 문법이라는 단단한 뼈대 위에 마음의 결을 입히며, 도심 속 비밀 서재의 이야기를 함께 이어왔습니다.', pad: 0.8},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '마지막 20강에서는, 우리가 배운 핵심 표현들이 하나의 완성된 도심 동화 안에서 어떻게 눈부시게 피어나는지, 열두 개의 종합 예문을 통해 느껴보는 시간입니다.', pad: 0.9},
];

export const BRIDGE_CUES: CueDef[] = [
  {id: 'd1', scene: 'bridge', mood: 'bridge', kr: '오늘의 이야기는 이렇습니다. 마침내 비밀 서재의 문을 열고, 피아니스트의 음악과 하나가 되어, 도심의 밤을 마법으로 물들이고, 새로운 내일을 향해 나아가는 대단원 이야기입니다.', pad: 1.0},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '1강 기초 원리부터 시작해 오늘 20강 마침표를 찍기까지, 나와 함께 걸어오신 수강생 여러분, 참으로 고생 많으셨습니다.', pad: 0.7},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '단순히 영단어를 암기하고 공식을 외우는 영어가 아니라, 문장 하나하나에 {y|마음의 결}을 담고, 입으로 소리 내어 중얼거리며 내 것으로 만드는 과정이었습니다.', pad: 0.7},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '도심 속 비밀 서재에서 솟아오른 피아노 소리처럼, 여러분의 입에서 나오는 영어 문장도, 이제 세상에서 가장 아름답고 단단한 울림이 될 것입니다.', pad: 0.7},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '이번 기초 과정은 여기서 마침표를 찍지만, 여러분이 앞으로 마주할 수많은 영어 문장 속에서, 배운 원리들이 반짝이는 {y|이정표}가 되어줄 것입니다.', pad: 0.7},
  {id: 'o5', scene: 'outro', mood: 'sunrise', kr: '함께해 주셔서 진심으로 감사드리며, 멋진 영어를 향해 나아갈 여러분의 새로운 시작을, 언제나 응원하겠습니다.', pad: 0.8},
  {id: 'o6', scene: 'outro', mood: 'sunrise', kr: '지금까지 함께한 가이드였습니다. 수고 많으셨습니다!', pad: 4},
];

// A short card before each group of examples (cues p1 / p2).
export const PART_INTROS: Record<string, {title: string; sub: string}> = {
  p1: {title: '13강 ~ 19강 총집합', sub: '핵심 문법이 하나씩 피어나는 일곱 문장'},
  p2: {title: '도심 동화 완결 문장', sub: '이야기의 마지막을 장식하는 다섯 문장'},
};

const lineCue = (line: StoryLine): CueDef => ({
  id: line.id,
  scene: 'story',
  mood: PLACES[line.place].mood,
  kr: line.kr,
  en: storyEnMarkup(line),
  pad: 0.5,
});

const STORY_CUES: CueDef[] = [
  {id: 'p1', scene: 'story', mood: 'cafe', kr: '먼저 13강부터 19강까지, 핵심 문법이 하나씩 피어나는 일곱 문장입니다.', pad: 0.5},
  ...STORY_LINES.slice(0, 7).map(lineCue),
  {id: 'p2', scene: 'story', mood: 'sunrise', kr: '이어서 도심 동화의 마지막을 장식하는 완결 문장들입니다.', pad: 0.5},
  ...STORY_LINES.slice(7).map(lineCue),
];

export const CUE_DEFS: CueDef[] = [...INTRO_CUES, ...BRIDGE_CUES, ...STORY_CUES, ...OUTRO_CUES];

export const stripMarkup = (s: string) => s.replace(/\{[vpeycgbml]\|([^}]*)\}/g, '$1');
