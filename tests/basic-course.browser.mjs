import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../gemini-live-test/node_modules/playwright/index.mjs';

const root = path.resolve(process.env.SITE_TEST_ROOT || fileURLToPath(new URL('..', import.meta.url)));
const mime = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4' };
const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        const file = path.resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
        const relative = path.relative(root, file);
        if (relative.startsWith('..') || path.isAbsolute(relative)) return response.writeHead(403).end();
        const metadata = await stat(file);
        const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
        const start = range ? Number(range[1]) : 0;
        const end = range?.[2] ? Math.min(Number(range[2]), metadata.size - 1) : metadata.size - 1;
        if (start > end) return response.writeHead(416).end();
        response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
        response.setHeader('Accept-Ranges', 'bytes');
        response.setHeader('Content-Length', end - start + 1);
        if (range) response.setHeader('Content-Range', `bytes ${start}-${end}/${metadata.size}`);
        response.writeHead(range ? 206 : 200);
        createReadStream(file, { start, end }).pipe(response);
    } catch { response.writeHead(404).end(); }
});

test('BASIC COURSE displays 21 lessons and plays new MP4s on desktop and mobile', { timeout: 180000 }, async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const data = JSON.parse(await readFile(path.join(root, 'courses.json'), 'utf8'));
    const basic = data.find(category => category.categoryId === 'basic-course');
    const browser = await chromium.launch({ headless: true });
    try {
        for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
            const page = await browser.newPage({ viewport });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(`${base}/?category=basic-course`);
            await page.locator('#category-dialog[open]').waitFor();
            assert.equal(await page.locator('#category-dialog-title').textContent(), 'BASIC COURSE');
            assert.equal(await page.locator('#lesson-grid [data-lesson-id]').count(), 21);
            const targets = viewport.width > 600 ? basic.lessons : [basic.lessons[0], basic.lessons.at(-1)];
            for (const lesson of targets) {
                await page.locator(`[data-lesson-id="${lesson.id}"]`).click();
                const video = page.locator('#video-frame video');
                await video.waitFor();
                await page.waitForFunction(() => document.querySelector('#video-frame video')?.readyState >= 1);
                const metadata = await video.evaluate(element => ({ src: element.currentSrc, duration: element.duration, width: element.videoWidth, height: element.videoHeight, inline: element.playsInline, poster: element.getAttribute('poster'), fit: getComputedStyle(element).objectFit }));
                assert.equal(new URL(metadata.src).pathname, `/${lesson.videoUrl}`);
                assert.ok(Math.abs(metadata.duration - 130) < 0.05);
                assert.equal(metadata.width, 1080);
                assert.equal(metadata.height, 1920);
                assert.equal(metadata.poster, lesson.thumbnail);
                assert.equal(metadata.inline, true);
                assert.equal(metadata.fit, 'contain');
                assert.equal(await page.locator('#video-dialog-title').textContent(), lesson.title);
                assert.equal(await page.locator('#lesson-key-phrase').textContent(), lesson.keyPhrase);
                await video.evaluate(async element => { element.muted = true; await element.play(); });
                await page.waitForFunction(() => document.querySelector('#video-frame video')?.currentTime > 0.05);
                await page.locator('#video-dialog').evaluate(dialog => dialog.close());
            }
            assert.deepEqual(errors, []);
            await page.close();
        }
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
});