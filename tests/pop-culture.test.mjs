import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const episodes = readJson('../src/data/pop-culture-episodes.json');
const originals = readJson('../data/articles.json');
const courses = readJson('../courses.json');
const lessons = courses.find((category) => category.categoryId === 'culture').lessons;

test('episodes 03–09 have distinct images and sample music without replacing 01–02', () => {
    assert.equal(episodes.length, 7);
    assert.deepEqual(originals.map((article) => article.id), ['pop-01', 'pop-02']);
    assert.equal(new Set([...originals, ...episodes].map((article) => article.id)).size, 9);
    assert.equal(new Set(episodes.map((episode) => episode.coverImage)).size, 7);
    assert.equal(new Set(episodes.map((episode) => episode.audio.previewUrl)).size, 7);
    assert.equal(episodes[5].song, 'Top of the World');
});

for (const [index, episode] of episodes.entries()) {
    test(`${episode.id}: card, essay, three sentences and playable quiz asset`, () => {
        assert.equal(episode.id, `pop-${String(index + 3).padStart(2, '0')}`);
        assert.equal(episode.episode, `${String(index + 3).padStart(2, '0')}회차`);
        assert.equal(episode.type, 'culture-essay');
        const lesson = lessons.find((item) => item.articleId === episode.id);
        assert.ok(lesson);
        assert.equal(lesson.title, episode.title);
        assert.equal(lesson.duration, episode.readTime);
        assert.equal(new URL(lesson.thumbnail).pathname, new URL(episode.coverImage).pathname);
        assert.equal(episode.sections.length, 3);
        assert.ok(episode.sections.every((section) => section.paragraphs.length >= 2));
        assert.ok(episode.sections[1].points.length >= 2);
        assert.equal(episode.practice.length, 3);
        if (episode.audio.previewUrl.includes('soundhelix.com')) {
            assert.ok(episode.audio.label.includes('원곡 아님'));
            assert.ok(episode.audio.credit.includes('SoundHelix'));
        } else {
            assert.equal(new URL(episode.audio.previewUrl).hostname, 'audio-ssl.itunes.apple.com');
            assert.ok(episode.audio.label.includes('공식 원곡 미리듣기'));
        }
        for (const value of [episode.coverImage, episode.audio.previewUrl, episode.audio.trackUrl]) {
            assert.equal(new URL(value).protocol, 'https:');
        }
        for (const [sentenceIndex, sentence] of episode.practice.entries()) {
            assert.ok(sentence.en && sentence.kr && sentence.tip);
            const audio = new URL(`../audio/pop-culture/${episode.id}-${sentenceIndex + 1}.m4a`, import.meta.url);
            assert.ok(statSync(audio).size > 1000);
            const bytes = readFileSync(audio);
            assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
            if (process.platform === 'darwin') {
                const info = execFileSync('/usr/bin/afinfo', [fileURLToPath(audio)], { encoding: 'utf8' });
                assert.ok(Number(info.match(/estimated duration:\s*([\d.]+)/)?.[1]) > 0);
            }
        }
        assert.ok(episode.practice.some((sentence) => sentence.en === episode.quizSection.audioText));
        assert.ok(episode.quizSection.question && episode.quizSection.answer && episode.quizSection.explanation);
    });
}

test('homepage inline JavaScript parses', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (!/src=|application\/ld\+json|type="module"/.test(match[1])) new vm.Script(match[2]);
    }
    assert.ok(html.includes('src/data/pop-culture-episodes.json'));
});