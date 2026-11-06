import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
test('homepage BASIC COURSE contains the 20 new curriculum videos', async () => {
    const categories = JSON.parse(await readFile(path.join(root, 'courses.json'), 'utf8'));
    const basic = categories.filter(category => category.categoryId === 'basic-course');
    assert.equal(basic.length, 1);
    assert.equal(basic[0].lessons.length, 20);
    for (const [index, lesson] of basic[0].lessons.entries()) {
        const number = String(index + 1).padStart(2, '0');
        assert.equal(lesson.id, `basic-${number}`);
        // 영상은 Cloudflare R2에서 서비스된다(Pages 정적 자산의 25MB 파일 제한을 넘기 때문).
        // 로컬 VIDEOS/ 폴더는 그 업로드 원본으로만 남아 있어, R2 URL 자체가 아니라 업로드한
        // 원본 파일이 아직 로컬에 있는지로 무결성을 확인한다.
        assert.equal(lesson.videoUrl, `https://pub-0e9dc9c0460d43219870328d8caf683d.r2.dev/basic-course-20/renders/basic-${number}.mp4`);
        assert.equal(lesson.thumbnail, `IMAGE/basic-course-20/basic-${number}.jpg`);
        assert.ok(lesson.title.startsWith(`${index + 1}강 · `));
        assert.ok(lesson.script.length >= 3);
        assert.ok(lesson.durationSeconds > 120);
        assert.ok((await stat(path.join(root, 'VIDEOS/basic-course-20/renders', `basic-${number}.mp4`))).size > 0);
        assert.ok((await stat(path.join(root, lesson.thumbnail))).size > 0);
    }
    for (const id of ['speaking', 'daily', 'situations', 'culture', 'review']) assert.ok(categories.some(category => category.categoryId === id));
});
test('player preserves new nested video paths and legacy folder normalization', async () => {
    const html = await readFile(path.join(root, 'index.html'), 'utf8');
    const snippet = html.match(/const VIDEO_FOLDERS = [\s\S]*?(?=            const renderVideoSource)/)[0];
    const normalize = vm.runInNewContext(`${snippet}\nnormalizeVideoPath;`);
    for (let number = 1; number <= 20; number++) {
        const url = `VIDEOS/basic-course-20/renders/basic-${String(number).padStart(2, '0')}.mp4`;
        assert.equal(normalize(url, 'basic-course'), url);
    }
    assert.equal(normalize('VIDEOS/daily/lay-lie.mp4', 'speaking'), 'VIDEOS/daily/lay-lie.mp4');
    assert.equal(normalize('VIDEOS/verbs/bring.mp4', 'speaking'), 'VIDEOS/verbs/bring.mp4');
    assert.equal(normalize('https://example.com/movie.mp4', 'basic-course'), 'https://example.com/movie.mp4');
});