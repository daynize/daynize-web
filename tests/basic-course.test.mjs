import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
test('homepage BASIC COURSE contains the 12 new curriculum videos', async () => {
    const categories = JSON.parse(await readFile(path.join(root, 'courses.json'), 'utf8'));
    const basic = categories.filter(category => category.categoryId === 'basic-course');
    assert.equal(basic.length, 1);
    assert.equal(basic[0].lessons.length, 12);
    for (const [index, lesson] of basic[0].lessons.entries()) {
        const number = String(index + 1).padStart(2, '0');
        assert.equal(lesson.id, `basic-${number}`);
        assert.equal(lesson.videoUrl, `VIDEOS/basic-course-12/renders/basic-${number}.mp4`);
        assert.equal(lesson.thumbnail, `IMAGE/basic-course-12/basic-${number}.jpg`);
        assert.ok(lesson.title.startsWith(`${index + 1}강 · `));
        assert.ok(lesson.script.length >= 3);
        assert.ok(lesson.durationSeconds > 120);
        assert.ok((await stat(path.join(root, lesson.videoUrl))).size > 0);
        assert.ok((await stat(path.join(root, lesson.thumbnail))).size > 0);
    }
    for (const id of ['speaking', 'daily', 'situations', 'culture', 'review']) assert.ok(categories.some(category => category.categoryId === id));
});
test('player preserves new nested video paths and legacy folder normalization', async () => {
    const html = await readFile(path.join(root, 'index.html'), 'utf8');
    const snippet = html.match(/const VIDEO_FOLDERS = [\s\S]*?(?=            const renderVideoSource)/)[0];
    const normalize = vm.runInNewContext(`${snippet}\nnormalizeVideoPath;`);
    for (let number = 1; number <= 12; number++) {
        const url = `VIDEOS/basic-course-12/renders/basic-${String(number).padStart(2, '0')}.mp4`;
        assert.equal(normalize(url, 'basic-course'), url);
    }
    assert.equal(normalize('VIDEOS/daily/lay-lie.mp4', 'speaking'), 'VIDEOS/daily/lay-lie.mp4');
    assert.equal(normalize('VIDEOS/verbs/bring.mp4', 'speaking'), 'VIDEOS/verbs/bring.mp4');
    assert.equal(normalize('https://example.com/movie.mp4', 'basic-course'), 'https://example.com/movie.mp4');
});