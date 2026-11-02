import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

/**
 * Colour families: if (If) = blue, past (past verb in the if-clause) = teal, were = green,
 * hadpp (had p.p.) = violet, would (would/could/might + V) = orange, wouldhave (would/could/might have p.p.) = coral.
 */
export type WordKey = 'if' | 'past' | 'were' | 'hadpp' | 'would' | 'wouldhave';
export type Place = 'home' | 'memory';

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

/** One story example: `left` + the popped if-clause verb `word` + `right` (which contains the result modal `hi`). */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: WordKey;
  /** e.g. HAD NOT READ */
  tag: string;
  /** Why this form, e.g. 가정법 과거 · 지금의 반대 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  /** Result modal inside `right` that is coloured in the subtitle, e.g. "would have". */
  hi: string;
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  home: {label: '🏠  일상으로 돌아와서 · Back home', mood: 'sunny'},
  memory: {label: '🌌  그날 밤의 기억 · That night', mood: 'night'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  // ---- Part 1. 가정법 과거: 지금 현재 상황을 반대로 상상 ----
  {
    id: 's01', place: 'home', kr: '만약 내가 그 비밀 열쇠를 갖고 있다면, 나는 지금 당장 저 문을 열 텐데.', kind: 'past', tag: 'HAD', rule: '가정법 과거 · 지금의 반대',
    left: w('If I'), word: 'had', right: w('the secret key, I would open that door right now.'), hi: 'would',
    actors: [{who: 'he', x0: 440, x1: 620}],
    props: [
      {emoji: '🗝️', x: 1150, y: 520, size: 140, motion: 'float'},
      {emoji: '🚪', x: 1420, y: 560, size: 150, motion: 'pulse'},
      {emoji: '💭', x: 1620, y: 440, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'home', kr: '만약 그녀가 지금 이곳에 있다면, 우리에게 피아노에 얽힌 진실을 말해줄 텐데.', kind: 'were', tag: 'WERE', rule: '가정법 과거 · be동사는 were',
    left: w('If she'), word: 'were', right: w('here right now, she could tell us the truth behind the piano.'), hi: 'could',
    actors: [{who: 'he', x0: 460, x1: 460}],
    props: [
      {emoji: '👩', x: 1150, y: 520, size: 130, motion: 'float'},
      {emoji: '🎹', x: 1400, y: 540, size: 140, motion: 'none'},
      {emoji: '💭', x: 1620, y: 440, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's03', place: 'home', kr: '만약 저 골목길이 그렇게 어둡지 않다면, 우리는 더 멀리까지 탐험할 수 있을 텐데.', kind: 'were', tag: 'WERE NOT', rule: '가정법 과거 · were not',
    left: w('If that alley'), word: 'were not', right: w('so dark, we could explore even further.'), hi: 'could',
    actors: [{who: 'he', x0: 420, x1: 620}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🌃', x: 1150, y: 540, size: 150, motion: 'none'},
      {emoji: '🔦', x: 1400, y: 540, size: 120, motion: 'pulse'},
      {emoji: '🧭', x: 1620, y: 480, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'home', kr: '만약 이 오래된 오르골이 작동한다면, 아름다운 멜로디가 온 방에 퍼질 텐데.', kind: 'past', tag: 'WORKED', rule: '가정법 과거 · 과거동사',
    left: w('If this ancient music box'), word: 'worked', right: w('a beautiful melody would spread across the room.'), hi: 'would',
    actors: [{who: 'she', x0: 460, x1: 460}],
    props: [
      {emoji: '🎼', x: 1150, y: 530, size: 140, motion: 'float'},
      {emoji: '🎶', x: 1400, y: 470, size: 120, motion: 'pulse'},
      {emoji: '🏠', x: 1620, y: 560, size: 120, motion: 'none'},
    ],
  },
  {
    id: 's05', place: 'home', kr: '만약 내가 도시의 모든 비밀을 안다면, 나는 더 이상 아무것도 두렵지 않을 텐데.', kind: 'past', tag: 'KNEW', rule: '가정법 과거 · 과거동사',
    left: w('If I'), word: 'knew', right: w('all the secrets of the city, I would not be afraid of anything.'), hi: 'would not',
    actors: [{who: 'he', x0: 440, x1: 620}],
    props: [
      {emoji: '🌆', x: 1150, y: 550, size: 150, motion: 'none'},
      {emoji: '🔓', x: 1400, y: 520, size: 120, motion: 'pulse'},
      {emoji: '😌', x: 1620, y: 450, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's06', place: 'home', kr: '만약 우리가 지금 자유롭다면, 그 마법 같은 음악을 찾아 다시 떠날 텐데.', kind: 'were', tag: 'WERE', rule: '가정법 과거 · be동사는 were',
    left: w('If we'), word: 'were', right: w('free right now, we might set off again to find that magical music.'), hi: 'might',
    actors: [{who: 'he', x0: 420, x1: 640}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🎒', x: 1150, y: 560, size: 130, motion: 'float'},
      {emoji: '🎵', x: 1400, y: 480, size: 120, motion: 'pulse'},
      {emoji: '🛤️', x: 1620, y: 580, size: 120, motion: 'none'},
    ],
  },

  // ---- Part 2. 가정법 과거완료: 지나간 과거를 돌아보며 아쉬워함 ----
  {
    id: 's07', place: 'memory', kr: '만약 우리가 그때 랜턴을 챙겼었더라면, 어두운 서재 구석을 더 자세히 보았을 텐데.', kind: 'hadpp', tag: 'HAD BROUGHT', rule: '가정법 과거완료 · 지난 일',
    left: w('If we'), word: 'had brought', right: w('a lantern back then, we would have seen the dark corner of the library better.'), hi: 'would have',
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🏮', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '📚', x: 1400, y: 560, size: 130, motion: 'none'},
      {emoji: '😔', x: 1620, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's08', place: 'memory', kr: '만약 내가 그 일기장을 읽지 않았었더라면, 피아니스트의 슬픔을 절대 몰랐을 텐데.', kind: 'hadpp', tag: 'HAD NOT READ', rule: '가정법 과거완료 · 지난 일',
    left: w('If I'), word: 'had not read', right: w('that diary, I would have never known the sadness of the pianist.'), hi: 'would have',
    actors: [{who: 'she', x0: 480, x1: 480}],
    props: [
      {emoji: '📔', x: 1150, y: 550, size: 140, motion: 'float'},
      {emoji: '🎹', x: 1400, y: 540, size: 130, motion: 'none'},
      {emoji: '😢', x: 1620, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's09', place: 'memory', kr: '만약 시계가 1시를 치지 않았었더라면, 우리는 더 오래 그곳에 머물 수 있었을 텐데.', kind: 'hadpp', tag: 'HAD NOT STRUCK', rule: '가정법 과거완료 · 지난 일',
    left: w('If the clock'), word: 'had not struck', right: w('one, we could have stayed there much longer.'), hi: 'could have',
    actors: [{who: 'he', x0: 420, x1: 620}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🕐', x: 1150, y: 520, size: 140, motion: 'pulse'},
      {emoji: '🏛️', x: 1400, y: 560, size: 140, motion: 'none'},
      {emoji: '⏳', x: 1620, y: 470, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's10', place: 'memory', kr: '만약 그녀가 지난밤에 문을 잠그지 않았었더라면, 누군가 그 비밀 보물을 가져갔을지도 모른다.', kind: 'hadpp', tag: 'HAD NOT LOCKED', rule: '가정법 과거완료 · 지난 일',
    left: w('If she'), word: 'had not locked', right: w('the door last night, someone might have taken that secret treasure.'), hi: 'might have',
    actors: [{who: 'she', x0: 460, x1: 600}],
    props: [
      {emoji: '🔓', x: 1150, y: 540, size: 130, motion: 'pulse'},
      {emoji: '💎', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '🥷', x: 1620, y: 520, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's11', place: 'memory', kr: '만약 우리가 자정에 그 골목길을 지나가지 않았었더라면, 이 모든 기적을 놓쳤을 텐데.', kind: 'hadpp', tag: 'HAD NOT PASSED', rule: '가정법 과거완료 · 지난 일',
    left: w('If we'), word: 'had not passed', right: w('by the alley at midnight, we would have missed all these miracles.'), hi: 'would have',
    actors: [{who: 'he', x0: 440, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🌃', x: 1150, y: 540, size: 140, motion: 'none'},
      {emoji: '🕛', x: 1400, y: 480, size: 120, motion: 'pulse'},
      {emoji: '✨', x: 1620, y: 520, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's12', place: 'memory', kr: '만약 네가 그때 나에게 용기를 주지 않았었더라면, 나는 2층 계단을 올라가지 못했을 텐데.', kind: 'hadpp', tag: 'HAD NOT GIVEN', rule: '가정법 과거완료 · 지난 일',
    left: w('If you'), word: 'had not given', right: w('me courage at that time, I could not have climbed the stairs to the second floor.'), hi: 'could not have',
    actors: [{who: 'he', x0: 440, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '💪', x: 1150, y: 520, size: 130, motion: 'float'},
      {emoji: '🪜', x: 1400, y: 560, size: 130, motion: 'none'},
      {emoji: '🌟', x: 1620, y: 460, size: 110, motion: 'pulse'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /**
   * Korean narration (ALL of it is read by the Korean voice). `{e|text}` = English phrase, `{y|}` emphasis;
   * colours: `{b|}` If, `{v|}` past verb, `{g|}` were, `{l|}` had p.p., `{p|}` would + V, `{c|}` would have p.p.
   */
  kr: string;
  en?: string;
  /** Voice text when it must differ from the subtitle (spaces/punctuation only). */
  say?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const KIND_LETTER: Record<WordKey, string> = {if: 'b', past: 'v', were: 'g', hadpp: 'l', would: 'p', wouldhave: 'c'};

// The English line (read by the English voice): the if-clause verb and the result modal are coloured, the rest is plain.
export const storyEnMarkup = (line: StoryLine) => {
  const resultLetter = line.kind === 'hadpp' ? 'c' : 'p';
  const hi = line.hi.split(' ');
  const right: string[] = [];
  for (let i = 0; i < line.right.length; i += 1) {
    const match = hi.every((h, k) => line.right[i + k]?.text === h);
    if (match) {
      right.push(`{${resultLetter}|${line.hi}}`);
      i += hi.length - 1;
    } else {
      right.push(`{e|${line.right[i].text}}`);
    }
  }
  return [...line.left.map((p) => `{e|${p.text}}`), `{${KIND_LETTER[line.kind]}|${line.word}}`, ...right].join(' ');
};

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '17강에서는 우리가 {y|가정법}이라는 걸 다뤄볼 건데요. 사실 가정법이라는 말이 좀 어렵게 느껴질 수 있지만, 알고 보면 정말 별거 아닙니다.', pad: 0.7},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '쉽게 말해서, {y|지금 현실은 전혀 안 그런데, 만약 이라면 얼마나 좋을까?} 하고, 현실과 살짝 거리를 두고 마음속으로 예쁜 상상을 해보는 거거든요.', pad: 0.8},
];

export const BRIDGE_CUES: CueDef[] = [
  // 시제를 과거로 쓱 밀어내기
  {id: 'a1', scene: 'bridge', mood: 'bridge', kr: '여기서 가장 재미있는 포인트가 하나 있어요. 영어에서는 현실하고 전혀 다른 가상의 상상을 할 때, {y|시제를 일부러 과거로 쓱 밀어내서} 표현합니다.', pad: 0.7},
  {id: 'a2', scene: 'bridge', mood: 'bridge', kr: '13강에서 조동사 과거형 배울 때 기억나시죠? 시제를 과거로 밀면 현실과의 거리가 멀어지면서, 불확실함이나 가상의 뉘앙스가 만들어지거든요.', pad: 0.8},

  // 가정법 과거
  {id: 'b1', scene: 'bridge', mood: 'bridge', kr: '그래서 지금 현재 사실과 반대로, 만약 지금 이라면, 할 텐데, 하고 상상할 때는 {v|과거동사}를 써요. 이걸 문법 책에서는 {y|가정법 과거}라고 부르는 거죠.', pad: 0.8},
  {id: 'b2', scene: 'bridge', mood: 'bridge', kr: '특히 이때 {e|be}동사는 인칭 상관없이 {g|were}를 쓰는 게 아주 매력적인 기본 규칙입니다.', pad: 0.9},

  // 가정법 과거완료
  {id: 'c1', scene: 'bridge', mood: 'bridge', kr: '반대로, 아, 그때 내가 했었더라면, 그때 했을 텐데, 하고 이미 지나간 과거 일을 후회하거나 상상할 때는, 과거보다 한 단계 더 옛날인 {l|had p.p.}를 가져와서 써줍니다.', pad: 0.8},
  {id: 'c2', scene: 'bridge', mood: 'bridge', kr: '이걸 {y|가정법 과거완료}라고 하고요.', pad: 1.0},

  // 이야기 소개
  {id: 'd1', scene: 'bridge', mood: 'bridge', kr: '그럼 우리가 계속 따라오던 그 도심 동화 이야기 있죠? 닫힌 카페 2층 서재의 비밀을 뒤로하고 일상으로 돌아온 주인공이 떠올리는 가상의 순간들을, 영어 문장으로 하나씩 느껴볼게요.', pad: 0.7},
  {id: 'd2', scene: 'bridge', mood: 'bridge', kr: '한글 의미부터 먼저 마음에 담고, 그 뒤에 나오는 영어 소리에 귀를 기울여 보세요.', pad: 1.0},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 가정법의 핵심, 딱 두 가지만 마음속에 담아두세요.', pad: 0.5},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '가정법은 과거 시제를 써서 현실과 거리를 두는 {y|마음의 상상}이라는 것.', pad: 0.5},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '그리고 지금 일을 상상할 땐 {v|과거동사}를, 지나간 옛일을 상상할 땐 {l|had p.p.}를 쓴다는 점입니다.', pad: 0.7},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '오늘 익힌 예문들도 한글 의미부터 느끼시면서, 입으로 소리 내어 중얼거려 보세요.', pad: 0.6},
  {id: 'o5', scene: 'outro', mood: 'sunrise', kr: '다음 18강에서는 가상이 아니라 진짜 일어날 법한 일을 전제로 하는 {y|조건문}으로 찾아오겠습니다. 수고 많으셨습니다!', pad: 2},
];

// Story cues: a short part intro (no line) before each group of six examples.
export const PART_INTROS: Record<string, {title: string; sub: string}> = {
  p1: {title: 'Part 1 · 가정법 과거', sub: '지금 현재 상황을 반대로 상상해보는 이야기'},
  p2: {title: 'Part 2 · 가정법 과거완료', sub: '지나간 과거의 그 밤을 돌아보며 아쉬워하는 이야기'},
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
  {id: 'p1', scene: 'story', mood: 'sunny', kr: '먼저 지금 현재 상황을 반대로 상상해보는 이야기들입니다.', pad: 0.5},
  ...STORY_LINES.slice(0, 6).map(lineCue),
  {id: 'p2', scene: 'story', mood: 'night', kr: '이번에는 이미 지나간 과거의 그 밤을 돌아보며, 그때 그랬더라면, 하고 아쉬워하는 이야기들입니다.', pad: 0.5},
  ...STORY_LINES.slice(6).map(lineCue),
];

export const CUE_DEFS: CueDef[] = [...INTRO_CUES, ...BRIDGE_CUES, ...STORY_CUES, ...OUTRO_CUES];

export const stripMarkup = (s: string) => s.replace(/\{[vpeycgbml]\|([^}]*)\}/g, '$1');
