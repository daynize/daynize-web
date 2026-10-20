export const RECENT_LESSON_KEY = 'daynize_recent_lesson';
let recentLesson = null;

const clean = (value, max) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const position = value => Number.isInteger(value) && value > 0 && value < 10000 ? value : undefined;

// Optional course-progress fields; omitted (not undefined) when unknown so payloads stay minimal.
const progressFields = value => {
    const courseName = clean(value.courseName, 80);
    const lessonNumber = position(value.lessonNumber);
    const totalLessons = position(value.totalLessons);
    return {
        ...(courseName && { courseName }),
        ...(lessonNumber && { lessonNumber }),
        ...(lessonNumber && totalLessons >= lessonNumber && { totalLessons })
    };
};

export function normalizeRecentLesson(value) {
    if (!value || typeof value !== 'object') return null;
    const expressions = value.targetExpressions ?? value.keyExpressions;
    const targetExpressions = (Array.isArray(expressions) ? expressions : [])
        .map(expression => clean(expression, 160)).filter(Boolean).slice(0, 6);
    const lessonTitle = clean(value.lessonTitle ?? value.title, 120);
    if (!lessonTitle && targetExpressions.length === 0) return null;
    return {
        lessonId: clean(value.lessonId, 80) || undefined,
        source: clean(value.source, 40) || undefined,
        lessonTitle,
        targetExpressions,
        keyConcept: clean(value.keyConcept ?? value.concept, 400),
        ...progressFields(value),
        savedAt: Number.isFinite(value.savedAt) ? value.savedAt : undefined
    };
}

export function readRecentLesson(storage) {
    try {
        const stored = normalizeRecentLesson(JSON.parse((storage ?? globalThis.localStorage)?.getItem(RECENT_LESSON_KEY) ?? 'null'));
        if (stored && (!recentLesson || (stored.savedAt ?? 0) > (recentLesson.savedAt ?? 0))) recentLesson = stored;
    } catch {
        console.warn('[Daynize] Recent lesson storage could not be read; using in-memory lesson state.');
    }
    return recentLesson;
}

export function saveRecentLesson(lesson, storage) {
    const normalized = normalizeRecentLesson({ ...lesson, savedAt: Date.now() });
    if (!normalized) throw new TypeError('A recent lesson requires a title or target expressions.');
    recentLesson = normalized;
    try {
        (storage ?? globalThis.localStorage)?.setItem(RECENT_LESSON_KEY, JSON.stringify({
            ...normalized,
            title: normalized.lessonTitle,
            keyExpressions: normalized.targetExpressions,
            concept: normalized.keyConcept
        }));
    }
    catch {
        console.warn('[Daynize] Recent lesson could not be persisted; it remains available in this page.');
    }
    return normalized;
}

export function trackRecentLesson(item, { kind = 'lesson', source = 'course', storage, courseName, lessonNumber, totalLessons } = {}) {
    if (!item || typeof item !== 'object') throw new TypeError('A lesson object is required.');
    const uniqueTexts = items => [...new Set(items.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
    let lesson;
    if (kind === 'article') {
        lesson = {
            source: 'pop-culture',
            lessonTitle: item.title,
            targetExpressions: uniqueTexts([
                ...(item.practice || []).map(line => line.en),
                ...(item.sections || []).flatMap(section => (section.points || []).map(point => point.term)),
                ...(item.lyricsSection?.items || []).map(line => line.en),
                item.focusQuote?.en
            ]),
            keyConcept: [item.subtitle, item.focusQuote?.translation, item.explanationSection?.title].filter(Boolean).join(' · ')
        };
    } else if (Array.isArray(item.dialogue_lines)) {
        lesson = {
            source: 'root-verbs',
            lessonTitle: item.title,
            targetExpressions: uniqueTexts(item.dialogue_lines.map(line => line.en_text)),
            keyConcept: `뿌리동사 ${(item.root_verbs_used || []).join(', ')} 활용 · 상황 표현: ${(item.colloquial_keywords || []).join(', ')}`
        };
    } else if (Array.isArray(item.examples)) {
        lesson = {
            source: 'numbers',
            lessonTitle: item.title,
            targetExpressions: uniqueTexts(item.examples.map(example => example.en)),
            keyConcept: item.concept
        };
    } else {
        lesson = {
            source,
            lessonTitle: item.title,
            targetExpressions: uniqueTexts([item.keyPhrase, ...(item.script || []).map(line => line.en)]),
            keyConcept: [item.curriculumTopic, item.explanation || item.desc].filter(Boolean).join(' · ')
        };
    }
    return saveRecentLesson({ ...lesson, lessonId: item.id, courseName, lessonNumber, totalLessons }, storage);
}

export function createInitSessionMessage({ mode = 'TEACHING', storage } = {}) {
    const lesson = readRecentLesson(storage);
    return {
        type: 'INIT_SESSION',
        mode,
        context: lesson && {
            lessonTitle: lesson.lessonTitle,
            targetExpressions: lesson.targetExpressions,
            keyConcept: lesson.keyConcept,
            ...progressFields(lesson)
        }
    };
}
