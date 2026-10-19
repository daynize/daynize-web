export const SESSION_MODES = Object.freeze({ TEACHING: 'TEACHING', FREE: 'FREE' });

export const TEACHING_INSTRUCTION_TEMPLATE = `너는 데이나이즈(Daynize)의 다정하고 격려를 아끼지 않는 시니어 전담 전문 영어 튜터 '데이나(Dayna)'야.
너의 목표는 사용자가 눈으로 배운 영어를 직접 입으로 말할 수 있도록 부드럽게 이끌어주는 거야.

[현재 유저의 학습 맥락 (Context)]
- 학습 주제: {{lessonTitle}}
- 핵심 표현: {{targetExpressions}}
- 핵심 개념/뉘앙스: {{keyConcept}}

[대화 진행 및 음성 인터랙션 규칙]
1. [첫 인사 및 선제 질문]:
   - 세션이 연결되면 유저가 말하기를 기다리지 말고, 네가 먼저 친근하고 활기차게 인사해라.
   - 예: "안녕하세요! 방금 배운 '{{lessonTitle}}' 복습해볼까요? '{{firstExpression}}'을 활용해서 ~는 영어로 어떻게 표현할까요?"
2. [피드백 루프 (Feedback Loop)]:
   - 유저가 답변하면 반드시 잘한 점을 먼저 크게 칭찬해라.
   - 발음이나 문법에 어색함이 있다면 비난하지 않고 다정하게 교정해줘라. ("아주 훌륭해요! 현지에서는 ~라고 말하면 더 자연스러워요.")
   - 문화적 맥락이나 뉘앙스 차이가 있다면 쉽고 간결하게 1~2문장으로 설명해라.
3. [턴 제어 (Turn Control)]:
   - 한 번 발화할 때 절대로 길게 말하지 마라 (최대 2~3문장 이내).
   - 피드백 후에는 자연스럽게 다음 질문이나 변형 문장 연습으로 넘어가라.
4. [언어 사용 기준]:
   - 유저에 대한 설명, 칭찬, 질문 제시는 '한국어'로 친절하게 안내하고, 연습할 영어 문장은 천천히 명확한 발음으로 전달해라.`;

// Used when the learner has no saved lesson yet (first visit, cleared storage, private window).
export const FALLBACK_LESSON_CONTEXT = Object.freeze({
    lessonTitle: '일상 인사와 안부 표현',
    targetExpressions: ['How are you doing today?', "I'm doing well, thank you."],
    keyConcept: '아직 수강 기록이 없으니, 가벼운 인사 표현으로 말문을 열고 오늘 배우고 싶은 주제를 물어봐 주세요.'
});

export const TEACHING_KICKOFF_TEXT = '[세션 시작] 학습자가 방금 음성대화에 연결했습니다. 학습자의 말을 기다리지 말고, 지침에 따라 지금 먼저 한국어로 반갑게 인사한 뒤 학습 주제와 관련된 첫 질문을 2~3문장 이내로 해주세요.';

const LIMITS = { lessonTitle: 120, expression: 160, expressions: 6, keyConcept: 400 };

const clean = (value, max) => typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\{\{|\}\}/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';

export function normalizeSessionMode(mode) {
    return typeof mode === 'string' && mode.toUpperCase() === SESSION_MODES.FREE ? SESSION_MODES.FREE : SESSION_MODES.TEACHING;
}

export function normalizeLessonContext(context) {
    if (!context || typeof context !== 'object') return null;
    const rawExpressions = Array.isArray(context.targetExpressions)
        ? context.targetExpressions
        : typeof context.targetExpressions === 'string' ? context.targetExpressions.split(/\n|\s*\|\s*/) : [];
    const targetExpressions = [...new Set(rawExpressions.slice(0, 20).map(item => clean(item, LIMITS.expression)).filter(Boolean))].slice(0, LIMITS.expressions);
    const lessonTitle = clean(context.lessonTitle, LIMITS.lessonTitle);
    const keyConcept = clean(context.keyConcept, LIMITS.keyConcept);
    if (!lessonTitle && targetExpressions.length === 0) return null;
    return { lessonTitle: lessonTitle || '최근 학습한 표현', targetExpressions, keyConcept };
}

export function buildTeachingInstruction(context) {
    const lesson = normalizeLessonContext(context) ?? FALLBACK_LESSON_CONTEXT;
    const expressions = lesson.targetExpressions.length ? lesson.targetExpressions : FALLBACK_LESSON_CONTEXT.targetExpressions;
    const values = {
        lessonTitle: lesson.lessonTitle,
        targetExpressions: expressions.map(expression => `"${expression}"`).join(', '),
        keyConcept: lesson.keyConcept || '핵심 표현을 실제 상황에서 자연스럽게 말해보는 연습',
        firstExpression: expressions[0]
    };
    // split/join instead of String#replace so "$&"-style sequences in lesson text stay literal.
    return Object.entries(values).reduce((text, [key, value]) => text.split(`{{${key}}}`).join(value), TEACHING_INSTRUCTION_TEMPLATE);
}

export function createTeachingKickoff() {
    return { clientContent: { turns: [{ role: 'user', parts: [{ text: TEACHING_KICKOFF_TEXT }] }], turnComplete: true } };
}
