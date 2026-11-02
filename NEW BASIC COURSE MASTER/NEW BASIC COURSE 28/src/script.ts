import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

// adverb = teal ('ing') · adjective = orange ('ed') · everything else = plain
export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

export type Place = 'cafe' | 'street' | 'office' | 'talk' | 'park';

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

/** One example: `left` + the popped key word `word` + `right`. Other key words are coloured inside left/right. */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  /** Part of speech of the popped word: adverb = teal, adjective = orange. */
  pos: 'adv' | 'adj';
  /** e.g. FRIENDLY · BRIGHTLY */
  tag: string;
  /** Why each key word is an adjective / adverb. */
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  cafe: {label: '☕  아침 카페 · The café', mood: 'morning'},
  street: {label: '🚶‍♀️  약속 장소로 · On the way', mood: 'autumn'},
  office: {label: '💼  약속 장소 · The meeting place', mood: 'cafe'},
  talk: {label: '🗣️  대화 · The conversation', mood: 'sunny'},
  park: {label: '🌇  마무리 · Finally', mood: 'sunrise'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);
const adv = (text: string): Part[] => w(text, 'ing');
const adj = (text: string): Part[] => w(text, 'ed');

export const STORY_LINES: StoryLine[] = [
  {
    id: 's01', place: 'cafe', kr: '따스한 아침 햇살 아래, 그녀는 친근한 바리스타에게 밝게 인사를 건넸습니다.', pos: 'adj', tag: 'FRIENDLY · BRIGHTLY', rule: 'friendly 형용사 · brightly 부사',
    left: w('She greeted a'), word: 'friendly', right: [...w('barista'), ...adv('brightly'), ...w('in the morning.')],
    actors: [{who: 'she', x0: 520, x1: 520, wave: true}, {who: 'he', x0: 780, x1: 780, flip: true}],
    props: [
      {emoji: '☕', x: 1150, y: 560, size: 140, motion: 'float'},
      {emoji: '🌞', x: 1450, y: 430, size: 120, motion: 'pulse'},
      {emoji: '🥐', x: 1580, y: 590, size: 110, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'street', kr: '커피를 마신 후, 그녀는 일찍 약속 장소로 향하기 위해 빠르게 걸었습니다.', pos: 'adv', tag: 'FAST · EARLY', rule: 'fast 부사 · early 부사',
    left: w('She walked'), word: 'fast', right: [...w('to arrive'), ...adv('early'), ...w('for her meeting.')],
    actors: [{who: 'she', x0: 300, x1: 800}],
    props: [
      {emoji: '💨', x: 1100, y: 560, size: 130, motion: 'float'},
      {emoji: '⏰', x: 1380, y: 520, size: 120, motion: 'pulse'},
      {emoji: '🌳', x: 1580, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's03', place: 'office', kr: '약속 장소에서는 한 남자가 그녀를 위해 열심히 프로젝트를 준비하고 있었죠.', pos: 'adv', tag: 'HARD', rule: 'hard 부사 · 열심히',
    left: w('A man was working'), word: 'hard', right: w('for her project.'),
    actors: [{who: 'he', x0: 640, x1: 640}],
    props: [
      {emoji: '💻', x: 1120, y: 560, size: 150, motion: 'pulse'},
      {emoji: '📄', x: 1380, y: 540, size: 120, motion: 'float'},
      {emoji: '💪', x: 1580, y: 480, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's04', place: 'talk', kr: '비록 약속 시간이 조금 늦게 시작되었지만, 두 사람의 대화는 매우 즐거웠습니다.', pos: 'adv', tag: 'LATE · LOVELY', rule: 'late 부사 · lovely 형용사',
    left: w('Although the meeting started'), word: 'late,', right: [...w('they had a very'), ...adj('lovely'), ...w('time.')],
    actors: [{who: 'he', x0: 560, x1: 560}, {who: 'she', x0: 760, x1: 760, flip: true}],
    props: [
      {emoji: '🕰️', x: 1120, y: 520, size: 130, motion: 'pulse'},
      {emoji: '💬', x: 1380, y: 470, size: 120, motion: 'float'},
      {emoji: '😊', x: 1580, y: 560, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's05', place: 'park', kr: '마침내 두 사람은 마음에 품었던 생각을 서로에게 솔직하게 털어놓았습니다.', pos: 'adv', tag: 'FINALLY · HONESTLY', rule: 'finally 부사 · honestly 부사',
    left: [...adv('Finally,'), ...w('they shared their thoughts')], word: 'honestly', right: w('with each other.'),
    actors: [{who: 'he', x0: 560, x1: 560}, {who: 'she', x0: 760, x1: 760, flip: true}],
    props: [
      {emoji: '💛', x: 1120, y: 520, size: 120, motion: 'pulse'},
      {emoji: '🌇', x: 1400, y: 540, size: 150, motion: 'none'},
      {emoji: '✨', x: 1580, y: 450, size: 100, motion: 'pulse'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /** Korean narration. `{e|text}` = English phrase, `{v|text}` = adverb (teal), `{p|text}` = adjective (orange). */
  kr: string;
  en?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

// The English line: the popped word is teal (adverb) or orange (adjective); other key words keep their colour.
const partMarkup = (p: Part) => (p.kind === 'ing' ? `{v|${p.text}}` : p.kind === 'ed' ? `{p|${p.text}}` : `{e|${p.text}}`);

export const storyEnMarkup = (line: StoryLine) =>
  [...line.left.map(partMarkup), `{${line.pos === 'adv' ? 'v' : 'p'}|${line.word}}`, ...line.right.map(partMarkup)].join(' ');

export const LECTURE_CUES: CueDef[] = [
  // 1. Intro: what an adverb is.
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '우리말은 “그녀는 달린다”라고도 하지만, “그녀는 {v|빠르게} 달린다”처럼 행동을 더 생생하게 꾸며줍니다.', pad: 0.6},
  {id: 'i2', scene: 'intro', mood: 'dawn', kr: '영어에서도 동사나 형용사, 혹은 문장 전체에 양념을 쳐서 뜻을 풍성하게 만들어주는 특별한 단어들이 있습니다.', pad: 0.6},
  {id: 'i3', scene: 'intro', mood: 'dawn', kr: '그것을 알아야 영어의 기초가 됩니다. 바로 {v|부사}, {v|Adverb}입니다.', pad: 0.5},
  {id: 'i4', scene: 'intro', mood: 'dawn', kr: '밋밋한 문장에 감칠맛을 더해주는 만능 양념장, {v|부사}입니다.', pad: 0.6},
  {id: 'i5', scene: 'intro', mood: 'dawn', kr: '명사를 직접 꾸미는 {p|형용사}와 달리,', pad: 0.4},
  {id: 'i6', scene: 'intro', mood: 'dawn', kr: '{v|부사}는 동사가 어떻게 일어나는지, 빠르게, 천천히,', pad: 0.4},
  {id: 'i7', scene: 'intro', mood: 'dawn', kr: '형용사가 얼마나 강력한지, 매우, 정말로,', pad: 0.4},
  {id: 'i8', scene: 'intro', mood: 'dawn', kr: '그리고 문장 전체의 분위기를 다채롭게 꾸며줍니다.', pad: 0.6},

  // 2. The two traps of adjective / adverb forms.
  {id: 't1', scene: 'bridge', mood: 'bridge', kr: '보통은 {p|형용사} 뒤에 {e|-ly}를 붙이면 {v|부사}가 됩니다.', pad: 0.6},
  {id: 't2', scene: 'bridge', mood: 'bridge', kr: '하지만 여기서 수많은 영어 학습자들이 헷갈려하는 치명적인 예외 2가지가 있습니다!', pad: 0.8},

  {id: 'a1', scene: 'bridge', mood: 'bridge', kr: '함정 1! {e|-ly}가 없어도 형용사와 부사 형태가 똑같은 단어들입니다.', pad: 0.4},
  {id: 'a2', scene: 'bridge', mood: 'bridge', kr: '{e|-ly}를 붙이지 않고 모양 그대로 형용사와 부사 역할을 모두 하는 단어들이 있습니다.', pad: 0.8},
  {id: 'f1', scene: 'bridge', mood: 'bridge', kr: '{e|FAST}. ‘빠른’도 {e|fast}, ‘빠르게’도 {e|fast}입니다.', pad: 0.3},
  {id: 'f2', scene: 'bridge', mood: 'bridge', kr: '{e|fastly}라는 단어는 존재하지 않습니다!', pad: 0.8},
  {id: 'h1', scene: 'bridge', mood: 'bridge', kr: '{e|HARD}. ‘단단한’, ‘어려운’도 {e|hard}, ‘열심히’, ‘단단하게’도 {e|hard}입니다.', pad: 0.8},
  {id: 'l1', scene: 'bridge', mood: 'bridge', kr: '{e|LATE}. ‘늦은’도 {e|late}, ‘늦게’도 {e|late}입니다.', pad: 0.3},
  {id: 'l2', scene: 'bridge', mood: 'bridge', kr: '{e|lately}는 ‘최근에’라는 전혀 다른 뜻이 됩니다!', pad: 0.8},
  {id: 'e1', scene: 'bridge', mood: 'bridge', kr: '{e|EARLY}. ‘이른’도 {e|early}, ‘일찍’도 {e|early}입니다.', pad: 1.0},

  {id: 'c1', scene: 'bridge', mood: 'bridge', kr: '함정 2! {e|-ly}가 붙었는데 부사가 아니라 {p|형용사}인 단어들입니다.', pad: 0.4},
  {id: 'c2', scene: 'bridge', mood: 'bridge', kr: '명사 뒤에 {e|-ly}가 붙으면 부사가 아니라 명사를 꾸며주는 {p|형용사}가 됩니다!', pad: 0.8},
  {id: 'y1', scene: 'bridge', mood: 'bridge', kr: '{e|FRIENDLY}. 친구 같은, 친근한 {p|형용사}입니다.', pad: 0.3},
  {id: 'y2', scene: 'bridge', mood: 'bridge', kr: '{e|LOVELY}. 사랑스러운, {p|형용사}입니다.', pad: 0.3},
  {id: 'y3', scene: 'bridge', mood: 'bridge', kr: '{e|LONELY}. 외로운, {p|형용사}입니다.', pad: 0.8},
  {id: 'y4', scene: 'bridge', mood: 'bridge', kr: '이 단어들은 모양만 보고 부사라고 착각하기 쉽지만, 명사를 꾸며주는 어엿한 {p|형용사}들입니다!', pad: 1.0},

  // 3. Wrong vs. right forms.
  {id: 'w1', scene: 'bridge', mood: 'bridge', kr: '예를 들어, “그는 일을 열심히 한다”라고 할 때', pad: 0.3},
  {id: 'w2', scene: 'bridge', mood: 'bridge', kr: '{e|He works hardly}라고 쓰면 “그는 거의 일을 하지 않는다”라는 완전히 반대의 부정적인 뜻이 되어 버립니다.', pad: 0.3},
  {id: 'w3', scene: 'bridge', mood: 'bridge', kr: '‘열심히’라는 뜻의 {v|부사}는 그대로 {e|hard}를 써서 {e|He works hard}라고 해야 비로소 올바른 표현이 됩니다.', pad: 1.0},
  {id: 'w4', scene: 'bridge', mood: 'bridge', kr: '마찬가지로 “그녀는 빠르게 달린다”라고 할 때', pad: 0.3},
  {id: 'w5', scene: 'bridge', mood: 'bridge', kr: '{e|She runs fastly}가 아니라 {e|She runs fast}라고 써야 합니다.', pad: 1.4},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘은 행동과 상태를 꾸며주는 {v|부사}, 그리고 {e|-ly}가 없어도 {v|부사}인 {v|fast}, {v|hard}, {v|late}와,', pad: 0.3},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '{e|-ly}가 붙어도 {p|형용사}인 {p|friendly}, {p|lovely}의 차이를 배웠습니다.', pad: 0.5},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '형태의 함정에 속지 않는 직관을 꼭 기억하세요.', pad: 0.5},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '배운 내용을 스스로에게 다시 한 번 설명해 보시기 바랍니다.', pad: 0.5},
  {id: 'o5', scene: 'outro', mood: 'sunrise', kr: '감사합니다.', pad: 2},
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
