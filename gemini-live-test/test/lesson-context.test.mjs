import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const freshModule = () => import(`../lesson-context.mjs?test=${crypto.randomUUID()}`);
const loadJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const memoryStorage = () => {
    const data = new Map();
    return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('real course data yields bounded, persistent teaching context and survives reload', async () => {
    const articles = await loadJson('../../src/data/pop-culture-episodes.json');
    const dialogues = await loadJson('../../data/root-verb-dialogues.json');
    const courses = await loadJson('../../courses.json');
    const { trackRecentLesson, createInitSessionMessage, RECENT_LESSON_KEY } = await freshModule();
    const storage = memoryStorage();
    for (const [item, options] of [
        [articles[0], { kind: 'article' }],
        [dialogues[0], {}],
        [courses[0].lessons[0], { source: courses[0].categoryId }],
        [{ title: '숫자 읽기', examples: [{ en: 'I have three apples.' }], concept: '기수로 개수를 셉니다.' }, {}]
    ]) {
        const saved = trackRecentLesson(item, { ...options, storage });
        assert.equal(saved.lessonTitle, item.title);
        assert.ok(saved.keyConcept);
        assert.ok(saved.targetExpressions.length > 0 && saved.targetExpressions.length <= 6);
        assert.ok(saved.targetExpressions.every(text => text.length <= 160));
        assert.equal(JSON.parse(storage.getItem(RECENT_LESSON_KEY)).savedAt, saved.savedAt);
        const stored = JSON.parse(storage.getItem(RECENT_LESSON_KEY));
        assert.equal(stored.title, saved.lessonTitle);
        assert.deepEqual(stored.keyExpressions, saved.targetExpressions);
        assert.equal(stored.concept, saved.keyConcept);
        const reloaded = await freshModule();
        assert.deepEqual(reloaded.createInitSessionMessage({ storage }), createInitSessionMessage({ storage }));
    }
    trackRecentLesson(articles[0], { kind: 'article', storage });
    assert.equal(createInitSessionMessage({ storage }).context.targetExpressions[0], articles[0].practice[0].en);
});

test('frontend field names are normalized into the relay handshake after reload', async () => {
    const module = await freshModule();
    const storage = memoryStorage();
    storage.setItem(module.RECENT_LESSON_KEY, JSON.stringify({
        title: 'Reading card', keyExpressions: ['Take your time.'], concept: 'Encouragement'
    }));
    assert.deepEqual(module.createInitSessionMessage({ storage }).context, {
        lessonTitle: 'Reading card', targetExpressions: ['Take your time.'], keyConcept: 'Encouragement'
    });
});

test('blocked localStorage getter and write failures retain state and report a warning', async context => {
    const warnings = [];
    context.mock.method(console, 'warn', message => warnings.push(message));
    const module = await freshModule();
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    context.after(() => {
        if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
        else delete globalThis.localStorage;
    });
    assert.equal(module.readRecentLesson(), null);
    const saved = module.saveRecentLesson({ lessonTitle: '최근 수업', targetExpressions: ['Hello!'], keyConcept: '인사' });
    assert.equal(module.readRecentLesson().lessonTitle, saved.lessonTitle);
    assert.equal(module.createInitSessionMessage().context.lessonTitle, saved.lessonTitle);
    assert.equal(warnings.length, 4);
    assert.ok(warnings.every(message => !message.includes(saved.lessonTitle)));
});

test('corrupt storage is reported and invalid new lessons are rejected explicitly', async context => {
    context.mock.method(console, 'warn', () => {});
    const module = await freshModule();
    assert.equal(module.readRecentLesson({ getItem: () => '{invalid' }), null);
    assert.throws(() => module.saveRecentLesson({}), /requires a title/);
    assert.throws(() => module.trackRecentLesson(null), /lesson object/);
    const normalized = module.normalizeRecentLesson({
        lessonTitle: 'a'.repeat(200), targetExpressions: [12, '', 'hello'.repeat(100)], keyConcept: 'b'.repeat(500)
    });
    assert.equal(normalized.lessonTitle.length, 120);
    assert.equal(normalized.targetExpressions[0].length, 160);
    assert.equal(normalized.keyConcept.length, 400);
});

test('a newer stored lesson refreshes state, which survives subsequent storage read failures', async context => {
    context.mock.method(console, 'warn', () => {});
    const module = await freshModule();
    const storage = memoryStorage();
    const first = module.saveRecentLesson({ lessonTitle: 'First' }, storage);
    storage.setItem(module.RECENT_LESSON_KEY, JSON.stringify({ lessonTitle: 'From another tab', savedAt: first.savedAt + 1 }));
    assert.equal(module.readRecentLesson(storage).lessonTitle, 'From another tab');
    assert.equal(module.readRecentLesson({ getItem() { throw new Error('blocked'); } }).lessonTitle, 'From another tab');
});

test('course name and lesson position travel in the handshake only when known', async () => {
    const module = await freshModule();
    const storage = memoryStorage();
    module.trackRecentLesson({ id: 'b5', title: '5강', keyPhrase: 'I go.', script: [] }, { storage, courseName: 'BASIC COURSE', lessonNumber: 5, totalLessons: 21 });
    const { context } = module.createInitSessionMessage({ storage });
    assert.equal(context.courseName, 'BASIC COURSE');
    assert.equal(context.lessonNumber, 5);
    assert.equal(context.totalLessons, 21);
    const bare = memoryStorage();
    module.trackRecentLesson({ id: 'x', title: 'No position', keyPhrase: 'Hi.', script: [] }, { storage: bare });
    assert.equal('courseName' in module.createInitSessionMessage({ storage: bare }).context, false);
});
