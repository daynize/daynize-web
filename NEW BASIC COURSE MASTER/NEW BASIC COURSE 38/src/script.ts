import {MoodName} from './theme';

export type SceneId = 'intro' | 'bridge' | 'story' | 'outro';

export type PartKind = 'subject' | 'ing' | 'to' | 'ed' | 'noun' | 'unit' | 'verb' | 'object' | 'tail';
export interface Part {
  text: string;
  kind: PartKind;
}

/** Colour families: subj (subject) = teal, verb (verb / auxiliary) = orange, neg (negative inversion word) = coral, place (place / direction / Only) = violet. */
export type WordKey = 'subj' | 'verb' | 'neg' | 'place';
export type Place = 'library' | 'alley';

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

/**
 * One story example. `word` = the fronted emphasis word that pops up; `hi` = the rest of the fronted phrase and the
 * inverted verb (e.g. "on the shelf lay"), coloured like the pill in the subtitle.
 */
export interface StoryLine {
  id: string;
  place: Place;
  kr: string;
  kind: 'neg' | 'place';
  tag: string;
  rule: string;
  left: Part[];
  word: string;
  right: Part[];
  hi: string;
  actors: ActorDef[];
  props: PropDef[];
}

export const PLACES: Record<Place, {label: string; mood: MoodName}> = {
  library: {label: '📚  카페 2층 서재 · Library', mood: 'cafe'},
  alley: {label: '🌃  밤의 골목길 · Night alley', mood: 'night'},
};

const w = (text: string, kind: PartKind = 'subject'): Part[] => (text ? text.split(' ').map((t) => ({text: t, kind})) : []);

// ---- Short pairs: original word order -> inverted word order ------------------------------------------

export type Role = 's' | 'v' | 'a' | 'e' | 'o';
export interface Token {
  text: string;
  /** s = subject (teal), v = verb (orange), a = auxiliary (orange), e = fronted emphasis word (coral), o = other (plain). */
  role: Role;
  /** Same id in both sentences = the same word, which glides to its new position. */
  id: string;
}

/** "I:s never:e knew:v#v" -> tokens; `#id` links words whose spelling changes (knew -> know). */
const tok = (s: string): Token[] =>
  s.split(' ').map((x) => {
    const [main, id] = x.split('#');
    const [text, role] = main.split(':');
    return {text, role: role as Role, id: id ?? text.toLowerCase()};
  });

export type PairCat = 'neg' | 'aux' | 'place' | 'only';
export interface PairDef {
  id: string;
  /** Korean meaning of the original sentence (read by the Korean voice first). */
  kr: string;
  orig: Token[];
  inv: Token[];
  cat: PairCat;
}

export const PAIR_CATS: Record<PairCat, {label: string; form: string; note: string}> = {
  neg: {label: '부정어 도치', form: '부정어 + 조동사 + 주어 + 동사', note: '부정어가 맨 앞으로!'},
  aux: {label: '부정어 도치', form: '부정어 + 조동사 + 주어 + 동사', note: '조동사가 있으면 그대로 앞으로'},
  place: {label: '장소 · 방향 도치', form: '장소·방향 + 동사 + 주어', note: '장소·방향이 맨 앞으로!'},
  only: {label: 'Only 도치', form: 'Only + 부사 + 조동사 + 주어 + 동사', note: 'Only가 이끄는 말이 맨 앞으로!'},
};

const pair = (id: string, kr: string, orig: string, inv: string, cat: PairCat): PairDef => ({id, kr, orig: tok(orig), inv: tok(inv), cat});

export const PAIRS: PairDef[] = [
  pair('q01', '나는 전혀 몰랐다.', 'I:s never:e knew:v#v', 'Never:e did:a I:s know:v#v', 'neg'),
  pair('q02', '나는 그것을 전혀 보지 못했다.', 'I:s never:e saw:v#v it:o', 'Never:e did:a I:s see:v#v it:o', 'neg'),
  pair('q03', '그녀는 좀처럼 울지 않는다.', 'She:s seldom:e cries:v#v', 'Seldom:e does:a she:s cry:v#v', 'neg'),
  pair('q04', '그는 좀처럼 말하지 않는다.', 'He:s rarely:e speaks:v#v', 'Rarely:e does:a he:s speak:v#v', 'neg'),
  pair('q05', '나는 꿈에도 생각지 못했다.', 'I:s little:e dreamed:v#v', 'Little:e did:a I:s dream:v#v', 'neg'),
  pair('q06', '우리는 전혀 알지 못했다.', 'We:s little:e knew:v#v', 'Little:e did:a we:s know:v#v', 'neg'),
  pair('q07', '나는 그것을 들어본 적이 없다.', 'I:s have:a never:e heard:v it:o', 'Never:e have:a I:s heard:v it:o', 'aux'),
  pair('q08', '그녀는 떠난 적이 없다.', 'She:s has:a never:e left:v', 'Never:e has:a she:s left:v', 'aux'),
  pair('q09', '그들은 그것을 본 적이 없었다.', 'They:s had:a never:e seen:v it:o', 'Never:e had:a they:s seen:v it:o', 'aux'),
  pair('q10', '나는 절대 잊을 수 없다.', 'I:s can:a never:e forget:v', 'Never:e can:a I:s forget:v', 'aux'),
  pair('q11', '버스가 이리로 온다.', 'The:s bus:s comes:v here:e', 'Here:e comes:v the:s bus:s', 'place'),
  pair('q12', '비가 아래로 내린다.', 'The:s rain:s comes:v down:e', 'Down:e comes:v the:s rain:s', 'place'),
  pair('q13', '해가 떠오른다.', 'The:s sun:s goes:v up:e', 'Up:e goes:v the:s sun:s', 'place'),
  pair('q14', '열쇠가 저기 놓여 있다.', 'The:s key:s lies:v there:e', 'There:e lies:v the:s key:s', 'place'),
  pair('q15', '영웅이 안으로 들어온다.', 'The:s hero:s enters:v in:e', 'In:e enters:v the:s hero:s', 'place'),
  pair('q16', '나는 오직 그때서야 깨달았다.', 'I:s realized:v#v it:o only:e then:e', 'Only:e then:e did:a I:s realize:v#v', 'only'),
  pair('q17', '그녀는 오직 이제야 떠났다.', 'She:s left:v#v only:e now:e', 'Only:e now:e did:a she:s leave:v#v', 'only'),
  pair('q18', '우리는 오직 한 번 이겼다.', 'We:s won:v#v only:e once:e', 'Only:e once:e did:a we:s win:v#v', 'only'),
  pair('q19', '나는 오직 나중에야 그것을 알았다.', 'I:s knew:v#v it:o only:e later:e', 'Only:e later:e did:a I:s know:v#v', 'only'),
  pair('q20', '우리는 오직 오늘만 이길 수 있다.', 'We:s can:a win:v only:e today:e', 'Only:e today:e can:a we:s win:v', 'only'),
];

export const STORY_LINES: StoryLine[] = [
  // ---- 부정어 도치: Never, Seldom, Rarely, Little ----
  {
    id: 's01', place: 'library', kr: '나는 내 인생에서 이렇게 아름다운 피아노 멜로디를 들어본 적이 없다.', kind: 'neg', tag: 'NEVER HAVE I', rule: '부정어 + 조동사 + 주어',
    left: w(''), word: 'Never', right: w('have I heard such a beautiful piano melody in my life.'), hi: 'have',
    actors: [{who: 'she', x0: 460, x1: 620}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'float'},
      {emoji: '🎶', x: 1400, y: 480, size: 120, motion: 'pulse'},
      {emoji: '😮', x: 1620, y: 460, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's02', place: 'library', kr: '그녀는 좀처럼 밤 12시 전에는 그 비밀 서재의 문을 열지 않는다.', kind: 'neg', tag: 'SELDOM DOES SHE', rule: '부정어 + 조동사 + 주어',
    left: w(''), word: 'Seldom', right: w('does she open the door of the secret library before midnight.'), hi: 'does',
    actors: [{who: 'she', x0: 440, x1: 440}],
    props: [
      {emoji: '🚪', x: 1150, y: 560, size: 150, motion: 'pulse'},
      {emoji: '🕛', x: 1400, y: 500, size: 120, motion: 'float'},
      {emoji: '📚', x: 1620, y: 560, size: 120, motion: 'none'},
    ],
  },
  {
    id: 's03', place: 'alley', kr: '우리는 그 어두운 골목길에서 그런 마법 같은 기적을 거의 본 적이 없다.', kind: 'neg', tag: 'RARELY HAVE WE', rule: '부정어 + 조동사 + 주어',
    left: w(''), word: 'Rarely', right: w('have we seen such a magical miracle in that dark alley.'), hi: 'have',
    actors: [{who: 'he', x0: 420, x1: 600}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🌃', x: 1150, y: 540, size: 150, motion: 'none'},
      {emoji: '✨', x: 1400, y: 480, size: 120, motion: 'pulse'},
      {emoji: '🔮', x: 1620, y: 540, size: 120, motion: 'float'},
    ],
  },
  {
    id: 's04', place: 'library', kr: '나는 그 피아니스트가 누구인지 꿈에도 상상하지 못했다.', kind: 'neg', tag: 'LITTLE DID I', rule: '부정어 + 조동사 + 주어',
    left: w(''), word: 'Little', right: w('did I dream who the pianist actually was.'), hi: 'did',
    actors: [{who: 'he', x0: 440, x1: 440}],
    props: [
      {emoji: '🎹', x: 1150, y: 540, size: 140, motion: 'none'},
      {emoji: '💭', x: 1400, y: 460, size: 120, motion: 'float'},
      {emoji: '🤔', x: 1620, y: 520, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's05', place: 'alley', kr: '우리는 그 시계가 멈추기 전까지 그 긴박한 상황을 전혀 알지 못했다.', kind: 'neg', tag: 'LITTLE DID WE', rule: '부정어 + 조동사 + 주어',
    left: w(''), word: 'Little', right: w('did we know the urgent situation until the clock stopped.'), hi: 'did',
    actors: [{who: 'he', x0: 420, x1: 600}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🕐', x: 1150, y: 520, size: 140, motion: 'pulse'},
      {emoji: '⚠️', x: 1400, y: 540, size: 120, motion: 'float'},
      {emoji: '😨', x: 1620, y: 470, size: 100, motion: 'float'},
    ],
  },
  {
    id: 's06', place: 'library', kr: '그녀는 자신의 음악이 온 도시를 밝게 비추리라고는 전혀 예상하지 못했다.', kind: 'neg', tag: 'NEVER DID SHE', rule: '부정어 + 조동사 + 주어',
    left: w(''), word: 'Never', right: w('did she expect that her music would illuminate the whole city.'), hi: 'did',
    actors: [{who: 'she', x0: 460, x1: 620}],
    props: [
      {emoji: '🎼', x: 1150, y: 520, size: 130, motion: 'float'},
      {emoji: '💡', x: 1400, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🌆', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },

  // ---- 장소 / 방향 / Only 도치 ----
  {
    id: 's07', place: 'library', kr: '저 멀리 서재 구석에 우리가 그토록 찾던 은색 열쇠가 놓여 있었다.', kind: 'place', tag: 'THERE LAY', rule: '장소 + 동사 + 주어',
    left: w(''), word: 'There', right: w('on the shelf lay the silver key we had been looking for so eagerly.'), hi: 'on the shelf lay',
    actors: [{who: 'he', x0: 440, x1: 600}],
    props: [
      {emoji: '🗝️', x: 1150, y: 530, size: 140, motion: 'float'},
      {emoji: '📚', x: 1400, y: 560, size: 140, motion: 'none'},
      {emoji: '🔍', x: 1620, y: 470, size: 110, motion: 'pulse'},
    ],
  },
  {
    id: 's08', place: 'library', kr: '비밀 계단 아래로 그 피아니스트가 조용히 걸어 내려왔다.', kind: 'place', tag: 'DOWN WALKED', rule: '방향 + 동사 + 주어',
    left: w(''), word: 'Down', right: w('the secret stairs walked the pianist very quietly.'), hi: 'the secret stairs walked',
    actors: [{who: 'she', x0: 460, x1: 460}],
    props: [
      {emoji: '🪜', x: 1150, y: 560, size: 140, motion: 'none'},
      {emoji: '🎹', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '🤫', x: 1620, y: 470, size: 100, motion: 'pulse'},
    ],
  },
  {
    id: 's09', place: 'alley', kr: '오직 자정이 되어서야 비로소 도심의 모든 네온사인이 밝게 빛났다.', kind: 'place', tag: 'ONLY AT MIDNIGHT DID', rule: 'Only + 부사구 + 조동사',
    left: w(''), word: 'Only', right: w('at midnight did all the neon signs in the city shine brightly.'), hi: 'at midnight did',
    actors: [{who: 'he', x0: 420, x1: 620}, {who: 'she', x0: 880, x1: 800, flip: true}],
    props: [
      {emoji: '🕛', x: 1150, y: 500, size: 140, motion: 'pulse'},
      {emoji: '💡', x: 1400, y: 520, size: 130, motion: 'float'},
      {emoji: '🌆', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's10', place: 'library', kr: '오직 그 마법 오르골을 통해서만 우리는 진실의 문을 열 수 있었다.', kind: 'place', tag: 'ONLY THROUGH… COULD', rule: 'Only + 부사구 + 조동사',
    left: w(''), word: 'Only', right: w('through the magic music box could we open the door of truth.'), hi: 'through the magic music box could',
    actors: [{who: 'he', x0: 440, x1: 600}, {who: 'she', x0: 900, x1: 820, flip: true}],
    props: [
      {emoji: '🎵', x: 1150, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🔮', x: 1400, y: 540, size: 130, motion: 'float'},
      {emoji: '🚪', x: 1620, y: 560, size: 140, motion: 'none'},
    ],
  },
  {
    id: 's11', place: 'alley', kr: '저 멀리 어둠 속에서 온 도시를 울리는 그 클래식 소리가 퍼져 나갔다.', kind: 'place', tag: 'FAR AWAY ECHOED', rule: '방향 + 동사 + 주어',
    left: w(''), word: 'Far', right: w('away into the darkness echoed the classic sound across the city.'), hi: 'away into the darkness echoed',
    actors: [{who: 'she', x0: 440, x1: 440}],
    props: [
      {emoji: '🌌', x: 1150, y: 500, size: 150, motion: 'float'},
      {emoji: '🎻', x: 1400, y: 540, size: 130, motion: 'pulse'},
      {emoji: '🏙️', x: 1620, y: 560, size: 130, motion: 'none'},
    ],
  },
  {
    id: 's12', place: 'library', kr: '오직 우리가 마음을 열었을 때 비로소 그 밤의 비밀이 드러났다.', kind: 'place', tag: 'ONLY WHEN… WAS', rule: 'Only + 절 + be동사',
    left: w(''), word: 'Only', right: w('when we opened our hearts was the secret of the night revealed.'), hi: 'when we opened our hearts was',
    actors: [{who: 'he', x0: 440, x1: 620}, {who: 'she', x0: 900, x1: 800, flip: true}],
    props: [
      {emoji: '💖', x: 1150, y: 520, size: 130, motion: 'pulse'},
      {emoji: '🌙', x: 1400, y: 470, size: 120, motion: 'float'},
      {emoji: '🔓', x: 1620, y: 540, size: 120, motion: 'float'},
    ],
  },
];

export interface CueDef {
  id: string;
  scene: SceneId;
  mood: MoodName;
  /**
   * Korean narration (ALL of it is read by the Korean voice). `{e|text}` = English phrase, `{y|}` emphasis;
   * colours: `{v|}` subject, `{p|}` verb / auxiliary, `{c|}` negative inversion word, `{l|}` place / Only.
   */
  kr: string;
  en?: string;
  /** Voice text when it must differ from the subtitle (spaces/punctuation only). */
  say?: string;
  /** Seconds the cue is held after its narration ends, so the animation can finish (default 0.3). */
  pad?: number;
}

const ROLE_LETTER: Record<Role, string> = {s: 'v', v: 'p', a: 'p', e: 'c', o: 'e'};

/** Subtitle / English voice line of a pair: original sentence, then the inverted one. */
export const pairEnMarkup = (p: PairDef) => {
  const sentence = (tokens: Token[]) => tokens.map((t, i) => `{${ROLE_LETTER[t.role]}|${t.text}${i === tokens.length - 1 ? '.' : ''}}`).join(' ');
  return `${sentence(p.orig)} ${sentence(p.inv)}`;
};

// The English line of a story cue: the fronted word and the inverted phrase share one colour (coral = negative, violet = place / Only).
export const storyEnMarkup = (line: StoryLine) => {
  const letter = line.kind === 'neg' ? 'c' : 'l';
  const hi = line.hi.split(' ');
  const right: string[] = [];
  for (let i = 0; i < line.right.length; i += 1) {
    const match = i === 0 && hi.every((h, k) => line.right[i + k]?.text === h);
    if (match) {
      right.push(`{${letter}|${line.hi}}`);
      i += hi.length - 1;
    } else {
      right.push(`{e|${line.right[i].text}}`);
    }
  }
  return [...line.left.map((p) => `{e|${p.text}}`), `{${letter}|${line.word}}`, ...right].join(' ');
};

export const INTRO_CUES: CueDef[] = [
  {id: 'i1', scene: 'intro', mood: 'dawn', kr: '19강, 도치. 문장에 스포트라이트를 비추는 어순의 반전입니다. 강의에 들어가기에 앞서, 주어와 동사의 자리가 어떻게 바뀌는지, 아주 짧은 문장 스무 개로 눈과 귀에 먼저 익혀봅시다!', pad: 0.8},
  ...PAIRS.map(
    (p): CueDef => ({id: p.id, scene: 'intro', mood: p.cat === 'place' ? 'sunny' : p.cat === 'only' ? 'cafe' : 'dawn', kr: p.kr, en: pairEnMarkup(p), pad: 0.6}),
  ),
];

export const BRIDGE_CUES: CueDef[] = [
  {id: 'c1', scene: 'bridge', mood: 'bridge', kr: '방금 짧은 문장들에서 보신 것처럼, 도치는 문법적으로 틀린 게 아니라, {y|내가 가장 강조하고 싶은 단어}를 문장 맨 앞으로 던질 때 일어나는, 자연스러운 어순 변화입니다.', pad: 0.8},
  {id: 'c2', scene: 'bridge', mood: 'bridge', kr: '주인공에게 스포트라이트를 비추듯 {c|강조어}가 맨 앞으로 나가다 보니, 그 뒤에 오는 주어와 동사도, 질문할 때처럼 {p|조동사 또는 be동사} + {v|주어} + {p|동사} 순서로 자리를 비켜주는 거거든요.', pad: 0.9},
  {id: 'c3', scene: 'bridge', mood: 'bridge', kr: '부정어 {c|Never}, {c|Seldom}, {c|Rarely}, {c|Little}부터 장소와 방향의 {l|Here}, {l|There}, {l|Down}, 그리고 {l|Only} 같은 단어들이 앞으로 튀어나갈 때, 이 멋진 도치 표현이 완성됩니다.', pad: 1.0},
  {id: 'd1', scene: 'bridge', mood: 'bridge', kr: '그럼 도심 동화 속 카페 2층 서재와 밤의 골목길에서 펼쳐지는 이야기들을, 도치 문장으로 만나볼까요?', pad: 0.7},
  {id: 'd2', scene: 'bridge', mood: 'bridge', kr: '한글 의미를 먼저 가슴에 담으시고, 영어 소리에 귀를 기울여 보세요.', pad: 1.0},
];

export const OUTRO_CUES: CueDef[] = [
  {id: 'o1', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 도치 표현의 핵심, 딱 두 가지만 기억해 두세요.', pad: 0.5},
  {id: 'o2', scene: 'outro', mood: 'sunrise', kr: '첫째, 도치는 {y|강조하고 싶은 말을 맨 앞으로 던져서}, 극적인 분위기를 만드는 연출법이라는 점입니다.', pad: 0.6},
  {id: 'o3', scene: 'outro', mood: 'sunrise', kr: '둘째, 강조하는 단어가 앞으로 나가면, 뒤의 {v|주어}와 {p|동사}는 {y|의문문처럼} 자리를 살짝 바꾼다는 사실입니다.', pad: 0.7},
  {id: 'o4', scene: 'outro', mood: 'sunrise', kr: '오늘 배운 문장들을, 한글 의미부터 천천히 새기시면서, 입으로 소리 내어 중얼거려 보세요.', pad: 0.6},
  {id: 'o5', scene: 'outro', mood: 'sunrise', kr: '다음 20강에서는 마침내 기초 과정 대단원의 마무리로 찾아오겠습니다. 수고 많으셨습니다!', pad: 2},
];

// A short card before each group of six examples (cues p1 / p2).
export const PART_INTROS: Record<string, {title: string; sub: string}> = {
  p1: {title: '부정어 도치', sub: 'Never, Seldom, Rarely, Little이 앞으로 나가는 이야기'},
  p2: {title: '장소 · 방향 · Only 도치', sub: '장소와 방향의 단어, 그리고 Only가 스포트라이트를 받는 이야기'},
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
  {id: 'p1', scene: 'story', mood: 'cafe', kr: '먼저 부정어 {c|Never}, {c|Seldom}, {c|Rarely}, {c|Little}이 앞으로 나가는 이야기들입니다.', pad: 0.5},
  ...STORY_LINES.slice(0, 6).map(lineCue),
  {id: 'p2', scene: 'story', mood: 'night', kr: '이번에는 장소와 방향의 단어들과 {l|Only}가 스포트라이트를 받는 이야기들입니다.', pad: 0.5},
  ...STORY_LINES.slice(6).map(lineCue),
];

export const CUE_DEFS: CueDef[] = [...INTRO_CUES, ...BRIDGE_CUES, ...STORY_CUES, ...OUTRO_CUES];

export const stripMarkup = (s: string) => s.replace(/\{[vpeycgbml]\|([^}]*)\}/g, '$1');
