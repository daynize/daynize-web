import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const scenarios = JSON.parse(readFileSync(new URL('../data/root-verb-dialogues.json', import.meta.url), 'utf8'));
const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const allowedRoots = new Set([
    'get', 'take', 'care', 'bring', 'catch', 'check', 'clear', 'come', 'give', 'keep', 'hold',
    'put', 'run', 'set', 'stand', 'turn', 'look', 'feel', 'make', 'pass', 'drop', 'go', 'pick'
]);
const irregularForms = {
    get: ['got', 'getting'],
    take: ['took', 'taken', 'taking'],
    bring: ['brought', 'bringing'],
    catch: ['caught', 'catching'],
    come: ['came', 'coming'],
    give: ['gave', 'given', 'giving'],
    keep: ['kept', 'keeping'],
    hold: ['held', 'holding'],
    run: ['ran', 'running'],
    stand: ['stood', 'standing'],
    feel: ['felt', 'feeling'],
    make: ['made', 'making'],
    go: ['went', 'gone', 'going']
};

const formsOf = (verb) => {
    const stem = verb.endsWith('e') ? verb.slice(0, -1) : verb;
    const doubledStem = /[aeiou][bcdfghjklmnpqrstvwxyz]$/.test(verb) ? verb + verb.at(-1) : '';
    return new Set([
        verb, `${verb}s`, `${verb}es`, `${verb}ed`, `${verb}d`, `${verb}ing`,
        `${stem}ing`, `${stem}d`, `${doubledStem}ed`, `${doubledStem}ing`,
        ...(irregularForms[verb] || [])
    ]);
};

test('20 dialogue scenarios have at least ten alternating bilingual turns', () => {
    assert.equal(scenarios.length, 20);
    assert.equal(new Set(scenarios.map((scenario) => scenario.scenario_id)).size, 20);
    assert.equal(scenarios.reduce((count, scenario) => count + scenario.dialogue_lines.length, 0), 200);

    for (const scenario of scenarios) {
        assert.equal(scenario.categoryName, '뿌리동사 활용하기');
        assert.ok(scenario.dialogue_lines.length >= 10, `${scenario.title} has fewer than 10 turns`);

        scenario.dialogue_lines.forEach((line, index) => {
            const isFirstSpeaker = index % 2 === 0;
            assert.equal(line.line_number, index + 1);
            assert.equal(line.speaker, isFirstSpeaker ? 'A' : 'B');
            assert.equal(line.ko_voice, isFirstSpeaker ? '지안(프리미엄)' : '민수(고품질)');
            assert.equal(line.en_voice, 'Samantha');
            assert.ok(line.ko_text.trim());
            assert.ok(line.en_text.trim());
            assert.match(line.ko_audio, /^audio\/root-verb-dialogues\/scenario-\d{2}-line-\d{2}-ko\.mp3$/);
            assert.match(line.en_audio, /^audio\/root-verb-dialogues\/scenario-\d{2}-line-\d{2}-en\.mp3$/);
            assert.ok(existsSync(new URL(`../${line.ko_audio}`, import.meta.url)));
            assert.ok(existsSync(new URL(`../${line.en_audio}`, import.meta.url)));
        });
    }
});

test('declared root verbs belong to the root set and occur in the English dialogue', () => {
    for (const scenario of scenarios) {
        const words = new Set(scenario.dialogue_lines.flatMap((line) =>
            line.en_text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []
        ));

        for (const verb of scenario.root_verbs_used) {
            assert.ok(allowedRoots.has(verb), `${scenario.title} declares unknown root verb: ${verb}`);
            assert.ok([...formsOf(verb)].some((form) => words.has(form)), `${scenario.title} does not use ${verb}`);
        }
    }
});

test('homepage loads dialogue data and renders bilingual dialogue turns', () => {
    assert.match(homepage, /data\/root-verb-dialogues\.json/);
    assert.match(homepage, /lesson\.dialogue_lines\.forEach/);
    assert.match(homepage, /koreanPlay\.dataset\.audioSrc = line\.ko_audio/);
    assert.match(homepage, /englishPlay\.dataset\.audioSrc = line\.en_audio/);
    assert.match(homepage, /new Audio\(new URL\(button\.dataset\.audioSrc, document\.baseURI\)\.href\)/);
    assert.match(homepage, /videoDialog\.addEventListener\('click', async/);
    assert.doesNotMatch(homepage, /dialogue-speaker/);
    assert.match(homepage, /categoryId: 'root-verb-usage'/);
    assert.match(homepage, /categoryName: '뿌리동사 활용하기'/);
    assert.match(homepage, /speakingCategory\.lessons = \[\.\.\.verbLessons, \.\.\.retainedLessons, \.\.\.migratedLessons\]/);
    assert.match(homepage, /data\.splice\(situationsIndex < 0 \? 1 : situationsIndex, 0, dialogueCategory\)/);
    assert.match(homepage, /getTodayIndex\(todaySentencePool\.length\)/);
    assert.match(homepage, /scheduleTodaySentenceRefresh/);
    assert.match(homepage, /today-conversation-situation/);
    assert.match(homepage, /today-practice-situation/);
    assert.doesNotMatch(homepage, /따뜻한 차 한 잔 부탁드려요\./);
});