import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../gemini-live-test/node_modules/playwright/index.mjs';

const root = path.resolve(process.env.SITE_TEST_ROOT || fileURLToPath(new URL('..', import.meta.url)));
const mime = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4', '.ico': 'image/vnd.microsoft.icon' };
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

test('teaching context persists from course and reading clicks with working static assets', { timeout: 180000 }, async () => {
    const remote = process.env.SITE_TEST_URL;
    if (!remote) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = remote || `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({
        headless: true,
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
    });
    try {
        for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
            const context = await browser.newContext({ viewport, permissions: ['microphone'] });
            const page = await context.newPage();
            const errors = [];
            const warnings = [];
            const messages = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('console', message => {
                if (message.type() === 'warning') warnings.push(message.text());
            });
            await page.routeWebSocket(/\/ws\/gemini-live(?:\?|$)/, socket => {
                socket.onMessage(data => {
                    const message = JSON.parse(data);
                    messages.push(message);
                    if (message.type === 'INIT_SESSION') socket.send(JSON.stringify({ setupComplete: {} }));
                });
            });
            await page.goto(base);
            await page.locator('[data-category-id="culture"]').waitFor();
            assert.equal(await page.evaluate(() => localStorage.getItem('daynize_recent_lesson')), null);
            const config = await page.request.get(new URL('/gemini-live-test/runtime-config.json', base).href);
            assert.equal(config.status(), 200);
            assert.equal((await config.json()).wsUrl, 'wss://daynize-relay-api.fly.dev/ws/gemini-live');
            const favicon = await page.request.get(new URL('/favicon.ico', base).href);
            assert.equal(favicon.status(), 200);
            assert.deepEqual([...(await favicon.body()).subarray(0, 4)], [0, 0, 1, 0]);
            assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), '/favicon.ico');

            for (const category of ['culture', 'root-verb-usage', 'speaking', 'numbers', 'basic-course']) {
                await page.locator(`[data-category-id="${category}"]`).click();
                if (await page.locator('#exit-quiz-modal').evaluate(dialog => dialog.open)) {
                    await page.locator('#exit-quiz-modal .quiz-close').click();
                }
                await page.locator('#category-dialog[open]').waitFor();
                await page.locator('#lesson-grid [data-lesson-id]').first().click();
                const title = await page.locator(category === 'culture' ? '#pop-article-title' : '#video-dialog-title').textContent();
                const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('daynize_recent_lesson')));
                assert.equal(stored.title, title);
                assert.equal(stored.lessonTitle, title);
                assert.ok(stored.keyExpressions.length > 0);
                assert.deepEqual(stored.keyExpressions, stored.targetExpressions);
                assert.ok(stored.concept);
                assert.equal(stored.concept, stored.keyConcept);
                await page.locator(category === 'culture' ? '#pop-article-dialog' : '#video-dialog').evaluate(dialog => dialog.close());
                await page.locator('#category-dialog').evaluate(dialog => { if (dialog.open) dialog.close(); });
            }

            const previous = await page.evaluate(() => localStorage.getItem('daynize_recent_lesson'));
            await page.reload();
            await page.locator('[data-category-id="culture"]').waitFor();
            assert.equal(await page.evaluate(() => localStorage.getItem('daynize_recent_lesson')), previous);
            await page.locator('#conversation-card').focus();
            await page.keyboard.press('Enter');
            const reading = await page.evaluate(() => JSON.parse(localStorage.getItem('daynize_recent_lesson')));
            assert.equal(reading.source, 'daily-reading');
            assert.deepEqual(reading.keyExpressions, [await page.locator('#today-en-expression').textContent()]);
            assert.equal(reading.concept, await page.locator('#today-conversation-explanation').textContent());
            await page.evaluate(() => localStorage.removeItem('daynize_recent_lesson'));
            await page.locator('#translation-toggle').click();
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('daynize_recent_lesson')).source), 'daily-reading');

            await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
            await page.waitForFunction(() => document.querySelector('daynize-voice-tutor')?.shadowRoot.querySelector('.status-label')?.textContent === '듣고 있어요...');
            assert.deepEqual(messages[0], {
                type: 'INIT_SESSION', mode: 'TEACHING',
                context: { lessonTitle: reading.title, targetExpressions: reading.keyExpressions, keyConcept: reading.concept }
            });
            await page.getByRole('button', { name: '세션 종료', exact: true }).click();
            assert.deepEqual(errors, []);
            assert.deepEqual(warnings.filter(message => /GSAP target|Public runtime configuration|Recent lesson/.test(message)), []);
            console.log(`Teaching tracking, assets and tutor handshake verified at ${base} (${viewport.width}px)`);
            await context.close();
        }
    } finally {
        await browser.close();
        if (!remote) await new Promise(resolve => server.close(resolve));
    }
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