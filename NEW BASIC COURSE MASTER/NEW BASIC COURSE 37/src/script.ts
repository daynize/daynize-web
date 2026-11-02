import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

/**
 * Colour families: if (If) = blue, present (present-tense verb in the If-clause) = teal,
 * will (will / can in the result clause) = orange, unless (Unless) = coral, not (If not) = green.
 */
export type WordKey = 'if' | 'present' | 'will' | 'unless' | 'not';
export type Place = 'cafe' | 'night';

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

/** One story example: `left` + the popped word (If-clause verb / "Unless") + `right` (which contains the result modal `hi`). */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: WordKey;
  /** e.g. IF + PRESENT */
  tag: string;
  /** Why this form, e.g. If절은 현재시제 */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  /** Result modal inside `right` that is coloured in the subtitle, e.g. "will". */
  hi: string;
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  cafe: {label: '☕  카페 2층 서재 · Library', mood: 'cafe'},
  night: {label: '🌃  자정이 가까운 밤 · Near midnight', mood: 'night'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

export const STORY_LINES: StoryLine[] = [
  // ---- Part 1. If 조건문: 현실적인 조건과 미래 결과 ----
  {
    id: 's01', place: 'cafe', kr: '만약 네가 그 옛날 열쇠를 돌린다면, 잠긴 문이 스르륵 열릴 것이다.', kind: 'present', tag: 'TURN', rule: 'If절은 현재시제',
    left: w('If you'), word: 'turn', right: w('that old key, the locked door will open softly.'), hi: 'will',
    actors: [{who: 'he', x0: 440, x1: 620}],
    props: [
      {emoji: '🗝️', x: 1150, y: 520, size: 140, motion: 'float'},
      {emoji: '🚪', x: 1420, y: 560, size: 150, motion: 'pulse'},
      {emoji: '✨', x: 1620, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's02', place: 'night', kr: '만약 밤 12시에 그 골목길을 지나간다면, 너는 피아노 소리를 들을 수 있을 것이다.', kind: 'present', tag: 'PASS BY', rule: 'If절은 현재시제',
    left: w('If you'), word: 'pass by', right: w('the alley at midnight, you can hear the piano sound.'), hi: 'can',
    actors: [{who: 'he', x0: 420, x1: 640}],
    props: [
      {emoji: '🌃', x: 1150, y: 540, size: 150, motion: 'none'},
      {emoji: '🎹', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '🎵', x: 1620, y: 450, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's03', place: 'cafe', kr: '만약 우리가 이 오래된 지도에 귀를 기울인다면, 비밀 서재의 위치를 찾게 될 것이다.', kind: 'present', tag: 'LISTEN', rule: 'If절은 현재시제',
    left: w('If we'), word: 'listen', right: w('to this ancient map, we will find the secret library.'), hi: 'will',
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🗺️', x: 1150, y: 530, size: 150, motion: 'float'},
      {emoji: '📍', x: 1400, y: 540, size: 120, motion: 'pulse'},
      {emoji: '📚', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's04', place: 'night', kr: '만약 그녀가 다시 피아노를 연주한다면, 도심 전체가 밤의 마법에 빠질 것이다.', kind: 'present', tag: 'PLAYS', rule: 'If절은 현재시제 · 3인칭 -s',
    left: w('If she'), word: 'plays', right: w('the piano again, the whole city will fall into night magic.'), hi: 'will',
    actors: [{who: 'she', x0: 460, x1: 460}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '🌆', x: 1420, y: 560, size: 150, motion: 'none'},
      {emoji: '🌙', x: 1620, y: 450, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'night', kr: '만약 우리가 지금 출발한다면, 자정이 되기 전에 그 빌딩에 도착할 수 있다.', kind: 'present', tag: 'LEAVE', rule: 'If절은 현재시제',
    left: w('If we'), word: 'leave', right: w('right now, we can arrive at that building before midnight.'), hi: 'can',
    actors: [{who: 'he', x0: 420, x1: 640}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🏃', x: 1150, y: 540, size: 130, motion: 'drive', dx: 120},
      {emoji: '🏢', x: 1420, y: 550, size: 150, motion: 'none'},
      {emoji: '🕛', x: 1620, y: 450, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's06', place: 'cafe', kr: '만약 네가 나와 함께 가겠다고 약속한다면, 내가 그 비밀 일기장을 보여줄게.', kind: 'present', tag: 'PROMISE', rule: 'If절은 현재시제',
    left: w('If you'), word: 'promise', right: w('to go with me, I will show you the secret diary.'), hi: 'will',
    actors: [{who: 'she', x0: 460, x1: 620}, {who: 'he', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🤝', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '📔', x: 1420, y: 550, size: 140, motion: 'pulse'},
      {emoji: '🤫', x: 1620, y: 450, size: 100, motion: 'float'},
    ],
  },

  // ---- Part 2. Unless: "만약 ~하지 않는다면" ----
  {
    id: 's07', place: 'night', kr: '만약 우리가 지금 서두르지 않는다면, 그 마지막 멜로디를 놓치게 될 것이다.', kind: 'unless', tag: 'UNLESS', rule: 'If not = Unless',
    left: w(''), word: 'Unless', right: w('we hurry right now, we will miss that last melody.'), hi: 'will',
    actors: [{who: 'he', x0: 420, x1: 640}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '⏰', x: 1150, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🎼', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '😮', x: 1620, y: 450, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's08', place: 'cafe', kr: '만약 네가 용기를 내지 않는다면, 진실의 문은 절대 열리지 않을 것이다.', kind: 'unless', tag: 'UNLESS', rule: 'If not = Unless',
    left: w(''), word: 'Unless', right: w('you take courage, the door of truth will never open.'), hi: 'will never',
    actors: [{who: 'she', x0: 460, x1: 460}],
    props: [
      {emoji: '💪', x: 1150, y: 530, size: 130, motion: 'float'},
      {emoji: '🚪', x: 1420, y: 560, size: 150, motion: 'none'},
      {emoji: '🔒', x: 1620, y: 470, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's09', place: 'night', kr: '만약 비가 내리지 않는다면, 우리는 오늘 밤 다시 그 카페 2층으로 갈 것이다.', kind: 'unless', tag: 'UNLESS', rule: 'If not = Unless',
    left: w(''), word: 'Unless', right: w('it rains, we will go back to that second-floor cafe tonight.'), hi: 'will',
    actors: [{who: 'he', x0: 420, x1: 620}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🌧️', x: 1150, y: 480, size: 140, motion: 'float'},
      {emoji: '☕', x: 1400, y: 550, size: 130, motion: 'pulse'},
      {emoji: '🌙', x: 1620, y: 460, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's10', place: 'cafe', kr: '만약 우리가 조용히 하지 않는다면, 도시의 정령이 순식간에 사라져 버릴지도 모른다.', kind: 'unless', tag: 'UNLESS', rule: 'If not = Unless',
    left: w(''), word: 'Unless', right: w('we stay quiet, the spirit of the city might vanish in a second.'), hi: 'might',
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🤫', x: 1150, y: 500, size: 120, motion: 'pulse'},
      {emoji: '🧚', x: 1400, y: 520, size: 130, motion: 'float'},
      {emoji: '💨', x: 1620, y: 540, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's11', place: 'night', kr: '만약 그 음악이 멈추지 않는다면, 우리는 밤새 그 골목에 머물게 될 것이다.', kind: 'unless', tag: 'UNLESS', rule: 'If not = Unless',
    left: w(''), word: 'Unless', right: w('the music stops, we will stay in that alley all night long.'), hi: 'will',
    actors: [{who: 'he', x0: 440, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 130, motion: 'none'},
      {emoji: '🎶', x: 1400, y: 480, size: 120, motion: 'pulse'},
      {emoji: '🌃', x: 1620, y: 550, size: 140, motion: 'none'},
    ],
  },
  {
    id: 's12', place: 'cafe', kr: '만약 네가 비밀을 지키지 않는다면, 다시는 이 마법 같은 경험을 할 수 없을 것이다.', kind: 'unless', tag: 'UNLESS', rule: 'If not = Unless',
    left: w(''), word: 'Unless', right: w('you keep the secret, you will never experience this magic again.'), hi: 'will never',
    actors: [{who: 'she', x0: 460, x1: 620}, {who: 'he', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🤐', x: 1150, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🔮', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '✨', x: 1620, y: 460, size: 100, motion: 'pulse'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /**
   * Korean narration (ALL of it is read by the Korean voice). `{e|text}` = English phrase, `{y|}` emphasis;
   * colours: `{b|}` If, `{v|}` present-tense verb, `{p|}` will / can, `{c|}` Unless, `{g|}` not.
   */
  kr: string;
  en?: string;
  /** Voice text when it must differ from the subtitle (spaces/punctuation only). */
  say?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const KIND_LETTER: Record<WordKey, string> = {if: 'b', present: 'v', will: 'p', unless: 'c', not: 'g'};

// The English line (read by the English voice): the If-clause verb / "Unless" and the result modal are coloured.
export const storyEnMarkup = (line: StoryLine) => {
  const hi = line.hi.split(' ');
  const right: string[] = [];
  for (let i = 0; i < line.right.length; i += 1) {
    const match = hi.every((h, k) => line.right[i + k]?.text === h);
    if (match) {
      right.push(`{p|${line.hi}}`);
      i += hi.length - 1;
    } else {
      right.push(`{e|${line.right[i].text}}`);
    }
  }
  return [...line.left.map((p) => `{e|${p.text}}`), `{${KIND_LETTER[line.kind]}|${line.word}}`, ...right].join(' ');
};

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '지난 17강에서는 현실과 반대로 상상해 보는 가정법을 배웠죠? 이번 시간에 다룰 {y|조건문}은 가정법과 비슷해 보이지만, 뉘앙스가 완전히 다릅니다.', pad: 0.7},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '가정법이, 지금 안 그런데 만약 이라면 얼마나 좋을까? 하고 {y|가상의 세계}를 그려보는 거였다면,', pad: 0.5},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '조건문은, {y|만약 이렇게 한다면, 진짜로 이렇게 될 거야!} 하고, 충분히 일어날 수 있는 현실적인 조건과 결과를 말하는 거거든요.', pad: 0.8},
];

export const BRIDGE_CUES: CueDef[] = [
  // If절은 현재시제
  {id: 'b1', scene: 'bridge', mood: 'bridge', kr: '여기서 아주 재미있는 시제의 비밀이 하나 있습니다. 조건문에서는 아직 일어나지 않은 미래의 일이라도, {b|If}절 안에서는 미래시제 {p|will}을 쓰지 않고, {v|현재시제}를 씁니다.', pad: 0.8},
  {id: 'b2', scene: 'bridge', mood: 'bridge', kr: '조건이 성립하는 순간을 현재로 딱 잡아두고, 그 뒤에 나오는 결과 문장에 {p|will}이나 {p|can}을 붙여서, 앞으로 일어날 미래를 보여주는 거죠.', pad: 0.9},

  // Unless
  {id: 'c1', scene: 'bridge', mood: 'bridge', kr: '반면에 만약 하지 않는다면, 하고 반대로 조건을 걸 때는, {b|If} {g|not}을 줄여서 {c|Unless}라는 단어 하나로 부드럽게 표현할 수도 있습니다.', pad: 1.0},

  // 이야기 소개
  {id: 'd1', scene: 'bridge', mood: 'bridge', kr: '그럼 도심 동화 속 카페 2층 서재의 다음 이야기로 들어가 볼까요? 현실로 돌아온 우리가 앞으로 펼쳐질 일들을 전제로 이야기하는 문장들입니다.', pad: 0.7},
  {id: 'd2', scene: 'bridge', mood: 'bridge', kr: '한글 의미를 먼저 마음에 새기시고, 영어 소리를 들어보세요.', pad: 1.0},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 조건문의 핵심, 딱 두 가지만 정리해 볼까요?', say: '오늘 배운 조건문의 핵심, 딱 두 가지만 정리해 볼까요.', pad: 0.5},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '첫째, 조건문은 가상이 아니라, {y|실제로 일어날 법한 현실의 조건과 결과}를 말한다는 점입니다.', pad: 0.6},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '둘째, {b|If}절 안에서는 미래 일이라도 {v|현재시제}를 쓰고, 부정 조건은 {c|Unless} 하나로 깔끔하게 처리한다는 사실입니다.', pad: 0.7},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 12개 문장을, 한글 해석부터 천천히 스며들게 하면서, 입으로 직접 소리 내어 중얼거려 보세요.', pad: 0.6},
  {id: 'o5', scene: 'outro', mood: 'sunrise', kr: '다음 19강에서는 문장의 분위기를 단번에 반전시키는 {y|도치}, {e|Inversion} 표현으로 찾아오겠습니다. 수고 많으셨습니다!', pad: 2},
];

// A short card before each group of six examples (cues p1 / p2).
export const PART_INTROS: Record<string, {title: string; sub: string}> = {
  p1: {title: 'Part 1 · If 조건문', sub: '현실적인 조건과 미래 결과를 말하는 문장들'},
  p2: {title: 'Part 2 · Unless 표현', sub: '“만약 ~하지 않는다면”을 뜻하는 표현들'},
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
  {id: 'p1', scene: 'story', mood: 'cafe', kr: '먼저 {b|If}를 써서 현실적인 조건과 미래 결과를 말하는 문장들입니다.', pad: 0.5},
  ...STORY_LINES.slice(0, 6).map(lineCue),
  {id: 'p2', scene: 'story', mood: 'night', kr: '이번에는 만약 하지 않는다면을 뜻하는 {c|Unless} 표현들입니다.', pad: 0.5},
  ...STORY_LINES.slice(6).map(lineCue),
];

export const CUE_DEFS: CueDef[] = [...INTRO_CUES, ...BRIDGE_CUES, ...STORY_CUES, ...OUTRO_CUES];

export const stripMarkup = (s: string) => s.replace(/\{[vpeycgbml]\|([^}]*)\}/g, '$1');
