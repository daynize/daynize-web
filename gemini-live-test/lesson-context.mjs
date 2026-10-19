export const RECENT_LESSON_KEY = 'daynize_recent_lesson';

const clean = (value, max) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function normalizeRecentLesson(value) {
    if (!value || typeof value !== 'object') return null;
    const targetExpressions = (Array.isArray(value.targetExpressions) ? value.targetExpressions : [])
        .map(expression => clean(expression, 160)).filter(Boolean).slice(0, 6);
    const lessonTitle = clean(value.lessonTitle, 120);
    if (!lessonTitle && targetExpressions.length === 0) return null;
    return {
        lessonId: clean(value.lessonId, 80) || undefined,
        source: clean(value.source, 40) || undefined,
        lessonTitle,
        targetExpressions,
        keyConcept: clean(value.keyConcept, 400),
        savedAt: Number.isFinite(value.savedAt) ? value.savedAt : undefined
    };
}

// localStorage can be missing or throw (private windows, blocked site data); treat that as "no history".
export function readRecentLesson(storage = globalThis.localStorage) {
    try { return normalizeRecentLesson(JSON.parse(storage?.getItem(RECENT_LESSON_KEY) ?? 'null')); }
    catch { return null; }
}

export function saveRecentLesson(lesson, storage = globalThis.localStorage) {
    const normalized = normalizeRecentLesson({ ...lesson, savedAt: Date.now() });
    if (!normalized) return null;
    try { storage?.setItem(RECENT_LESSON_KEY, JSON.stringify(normalized)); }
    catch { }
    return normalized;
}

export function createInitSessionMessage({ mode = 'TEACHING', storage } = {}) {
    const lesson = readRecentLesson(storage);
    return {
        type: 'INIT_SESSION',
        mode,
        context: lesson && {
            lessonTitle: lesson.lessonTitle,
            targetExpressions: lesson.targetExpressions,
            keyConcept: lesson.keyConcept
        }
    };
}
