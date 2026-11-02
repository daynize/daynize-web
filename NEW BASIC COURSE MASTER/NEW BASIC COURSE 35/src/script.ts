import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

/**
 * Colour families: and = teal, but = coral, or = blue, because = orange,
 * where = green, when = violet, why = pink, how = gold.
 */
export type WordKey = 'and' | 'but' | 'or' | 'because' | 'where' | 'when' | 'why' | 'how';
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

/** One story example: `left` + the popped connector `word` + `right`. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: WordKey;
  /** e.g. THE PLACE WHERE */
  tag: string;
  /** Why this connector, e.g. 장소 · 하는 곳 */
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
  // ---- Part 1. 등위접속사 & 종속접속사 ----
  {
    id: 's01', place: 'library', kr: '그녀는 옛날 열쇠를 집어 들었고, 천천히 비밀 상자를 열었다.', kind: 'and', tag: 'AND', rule: '내용의 덧붙임',
    left: w('She picked up the old key,'), word: 'and', right: w('she slowly opened the secret box.'),
    actors: [{who: 'she', x0: 460, x1: 640}],
    props: [
      {emoji: '🗝️', x: 1150, y: 520, size: 140, motion: 'float'},
      {emoji: '📦', x: 1400, y: 560, size: 140, motion: 'pulse'},
      {emoji: '✨', x: 1620, y: 460, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's02', place: 'library', kr: '문은 무거웠지만, 우리는 힘껏 당겨서 안으로 들어갔다.', kind: 'but', tag: 'BUT', rule: '앞뒤 내용의 반전',
    left: w('The door was heavy,'), word: 'but', right: w('we pulled it hard and went inside.'),
    actors: [{who: 'he', x0: 400, x1: 620}, {who: 'she', x0: 860, x1: 780, flip: true}],
    props: [
      {emoji: '🚪', x: 1150, y: 560, size: 160, motion: 'pulse'},
      {emoji: '💪', x: 1420, y: 500, size: 120, motion: 'float'},
      {emoji: '😤', x: 1620, y: 450, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'library', kr: '너는 서재 안에 남아도 되고, 나와 함께 밖으로 나가도 된다.', kind: 'or', tag: 'OR', rule: '선택의 기로',
    left: w('You can stay inside the library,'), word: 'or', right: w('you can go outside with me.'),
    actors: [{who: 'she', x0: 460, x1: 460, wave: true}, {who: 'he', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '📚', x: 1150, y: 540, size: 140, motion: 'none'},
      {emoji: '🤔', x: 1400, y: 470, size: 110, motion: 'float'},
      {emoji: '🌃', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's04', place: 'library', kr: '피아노 소리는 멈췄지만, 그 울림은 여전히 방 안에 남아있었다.', kind: 'but', tag: 'BUT', rule: '앞뒤 내용의 반전',
    left: w('The piano sound stopped,'), word: 'but', right: w('its echo still remained in the room.'),
    actors: [{who: 'he', x0: 480, x1: 480}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'none'},
      {emoji: '🎵', x: 1400, y: 480, size: 110, motion: 'float'},
      {emoji: '🌫️', x: 1620, y: 560, size: 130, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'library', kr: '우리는 오래된 일기장을 챙겼고, 조용히 카페 2층을 내려왔다.', kind: 'and', tag: 'AND', rule: '내용의 덧붙임',
    left: w('We packed the ancient diary,'), word: 'and', right: w('we quietly walked down from the second floor.'),
    actors: [{who: 'he', x0: 420, x1: 640}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '📔', x: 1150, y: 550, size: 140, motion: 'float'},
      {emoji: '🎒', x: 1400, y: 560, size: 130, motion: 'none'},
      {emoji: '🤫', x: 1620, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's06', place: 'library', kr: '그 음악이 내 마음을 울렸기 때문에, 나는 발걸음을 멈출 수밖에 없었다.', kind: 'because', tag: 'BECAUSE', rule: '확실한 원인과 이유',
    left: w(''), word: 'Because', right: w('that music touched my heart, I had to stop my steps.'),
    actors: [{who: 'she', x0: 520, x1: 520}],
    props: [
      {emoji: '🎼', x: 1150, y: 520, size: 140, motion: 'float'},
      {emoji: '💓', x: 1400, y: 540, size: 130, motion: 'pulse'},
      {emoji: '👣', x: 1620, y: 590, size: 100, motion: 'none'},
    ],
  },

  // ---- Part 2. 관계부사 (Where / When / Why / How) ----
  {
    id: 's07', place: 'inner', kr: '이곳은 우리가 비밀 피아노 소리를 들었던 그 장소이다.', kind: 'where', tag: 'THE PLACE WHERE', rule: '장소 · 하는 곳',
    left: w('This is the place'), word: 'where', right: w('we heard the secret piano sound.'),
    actors: [{who: 'he', x0: 420, x1: 620}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '📍', x: 1150, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🎹', x: 1400, y: 540, size: 140, motion: 'none'},
      {emoji: '🎵', x: 1620, y: 450, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's08', place: 'inner', kr: '자정이 되었을 때가 바로 모든 네온사인이 빛나기 시작한 순간이다.', kind: 'when', tag: 'THE TIME WHEN', rule: '시간 · 하는 때',
    left: w('Midnight is the time'), word: 'when', right: w('all the neon signs started to shine.'),
    actors: [{who: 'he', x0: 460, x1: 460}],
    props: [
      {emoji: '🕛', x: 1150, y: 500, size: 140, motion: 'pulse'},
      {emoji: '💡', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '🌆', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's09', place: 'inner', kr: '이것이 그 피아니스트가 매일 밤 홀로 연주했던 이유이다.', kind: 'why', tag: 'THE REASON WHY', rule: '이유 · 하는 이유',
    left: w('This is the reason'), word: 'why', right: w('the pianist played alone every night.'),
    actors: [{who: 'she', x0: 480, x1: 620}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'none'},
      {emoji: '🌙', x: 1400, y: 470, size: 120, motion: 'float'},
      {emoji: '❓', x: 1620, y: 500, size: 120, motion: 'pulse'},
    ],
  },
  {
    id: 's10', place: 'inner', kr: '그녀는 서재의 잠긴 문을 쉽게 여는 방법을 알고 있었다.', kind: 'how', tag: 'HOW', rule: '방법 · the way 없이 how만',
    left: w('She knew'), word: 'how', right: w('she could open the locked door easily.'),
    actors: [{who: 'she', x0: 440, x1: 620}],
    props: [
      {emoji: '🔒', x: 1150, y: 540, size: 140, motion: 'pulse'},
      {emoji: '🗝️', x: 1400, y: 520, size: 130, motion: 'float'},
      {emoji: '🚪', x: 1620, y: 570, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's11', place: 'inner', kr: '우리가 다시 만날 그날이 오면, 더 놀라운 이야기들을 나누게 될 것이다.', kind: 'when', tag: 'THE DAY WHEN', rule: '시간 · 하는 때',
    left: w('When the day comes'), word: 'when', right: w('we meet again, we will share even more amazing stories.'),
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '📅', x: 1150, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🤝', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '📖', x: 1620, y: 560, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's12', place: 'inner', kr: '이 비밀스러운 밤은 우리가 함께 새로운 추억을 만든 방식이었다.', kind: 'how', tag: 'HOW', rule: '방법 · 방식',
    left: w('This secret night was'), word: 'how', right: w('we created a new memory together.'),
    actors: [{who: 'he', x0: 440, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🌙', x: 1150, y: 470, size: 130, motion: 'float'},
      {emoji: '📸', x: 1400, y: 540, size: 120, motion: 'pulse'},
      {emoji: '💖', x: 1620, y: 500, size: 110, motion: 'float'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /**
   * Korean narration (ALL of it is read by the Korean voice). `{e|text}` = English phrase, `{y|}` emphasis;
   * colours: `{v|}` and, `{c|}` but, `{b|}` or, `{p|}` because, `{g|}` where, `{l|}` when, `{m|}` why, `{y|}` how.
   */
  kr: string;
  en?: string;
  /** Voice text when it must differ from the subtitle (spaces/punctuation only). */
  say?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const KIND_LETTER: Record<WordKey, string> = {and: 'v', but: 'c', or: 'b', because: 'p', where: 'g', when: 'l', why: 'm', how: 'y'};

// The English line (read by the English voice): the connector is coloured by family, the rest is plain.
export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map((p) => `{e|${p.text}}`), `{${KIND_LETTER[line.kind]}|${line.word}}`, ...line.right.map((p) => `{e|${p.text}}`)].join(' ');

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '16강, 접속사와 관계부사 총정리. 문장을 단단하고 풍성하게 이어주는 다리입니다.', pad: 0.7},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '단순히 문장을 이어주는 접속사부터, 장소, 시간, 이유, 방법의 정보로 문장을 다채롭게 꾸며주는 {y|관계부사}까지, 한 번에 정리합니다.', pad: 0.8},
];

export const BRIDGE_CUES: CueDef[] = [
  // 1. 3대 등위접속사
  {id: 'a0', scene: 'bridge', mood: 'bridge', kr: '첫째, 3대 등위접속사입니다. {v|And}, {c|But}, {b|Or}.', pad: 0.6},
  {id: 'a1', scene: 'bridge', mood: 'bridge', kr: '{v|And}, 그리고, 하고. 내용의 덧붙임입니다.', pad: 0.4},
  {id: 'a2', scene: 'bridge', mood: 'bridge', kr: '{c|But}, 하지만, 그러나. 앞뒤 내용의 반전입니다.', pad: 0.4},
  {id: 'a3', scene: 'bridge', mood: 'bridge', kr: '{b|Or}, 또는, 아니면. 선택의 기로입니다.', pad: 0.9},

  // 2. 종속접속사 & 관계부사의 비밀
  {id: 'b0', scene: 'bridge', mood: 'bridge', kr: '둘째, 종속접속사와 관계부사의 비밀입니다. 관계부사는 접속사 더하기 부사의 역할을 동시에 하면서, 앞선 명사, 즉 선행사를 뒤에서 부드럽게 설명해 주는 아주 편리한 연결 도구입니다.', pad: 0.9},
  {id: 'b1', scene: 'bridge', mood: 'bridge', kr: '{p|Because}, 때문에. 확실한 원인과 이유입니다.', pad: 0.4},
  {id: 'b2', scene: 'bridge', mood: 'bridge', kr: '{g|Where}, 장소, 하는 곳. {e|the place} {g|where}, 하는 그 장소입니다.', pad: 0.4},
  {id: 'b3', scene: 'bridge', mood: 'bridge', kr: '{l|When}, 시간, 하는 때. {e|the time} {l|when}, 하는 그 시간입니다.', pad: 0.4},
  {id: 'b4', scene: 'bridge', mood: 'bridge', kr: '{m|Why}, 이유, 하는 이유. {e|the reason} {m|why}, 하는 그 이유입니다.', pad: 0.4},
  {id: 'b5', scene: 'bridge', mood: 'bridge', kr: '{y|How}, 방법, 하는 방식. {e|the way} 또는 {y|how}, 둘 중 하나만 쓰입니다.', pad: 1.0},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '등위접속사 {v|And}, {c|But}, {b|Or}는 단어와 단어, 문장과 문장을 대등하게 연결합니다.', pad: 0.6},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '종속접속사와 관계부사 {p|Because}, {g|Where}, {l|When}, {m|Why}, {y|How}는 문장에 이유, 시간, 장소의 깊이를 더해줍니다.', pad: 0.6},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '특히 {e|the way}와 {y|how}는 중복해서 쓰지 않고, 둘 중 하나만 깔끔하게 사용하는 점을 꼭 기억해 주세요.', pad: 0.8},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 예문들을 입으로 소리 내어 연습해 보시고, 다음 17강 가정법 강좌에서 다시 뵙겠습니다. 수고하셨습니다!', pad: 2},
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
