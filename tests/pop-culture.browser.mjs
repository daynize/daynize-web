import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { chromium } from '../gemini-live-test/node_modules/playwright/index.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const episodes = JSON.parse(readFileSync(join(root, 'src/data/pop-culture-episodes.json'), 'utf8'));
const screenshots = mkdtempSync(join(tmpdir(), 'daynize-pop-browser-'));
const mimeTypes = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.m4a': 'audio/mp4',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'
};

const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
        if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`) || !mimeTypes[extname(path)]) {
            response.writeHead(404).end();
            return;
        }
        const bytes = await readFile(path);
        const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
        response.setHeader('Content-Type', mimeTypes[extname(path)]);
        response.setHeader('Accept-Ranges', 'bytes');
        if (range) {
            const start = Number(range[1]);
            const end = Math.min(range[2] ? Number(range[2]) : bytes.length - 1, bytes.length - 1);
            response.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 });
            response.end(bytes.subarray(start, end + 1));
        } else {
            response.writeHead(200, { 'Content-Length': bytes.length }).end(bytes);
        }
    } catch (_) {
        response.writeHead(404).end();
    }
});

test('pop culture modals and listening audio on desktop and mobile', { timeout: 180000 }, async () => {
    await new Promise((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));
    const baseURL = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
            const page = await browser.newPage({ viewport });
            const errors = [];
            const previewRequests = [];
            page.on('pageerror', (error) => errors.push(error.message));
            page.on('request', (request) => {
                if (request.resourceType() === 'media') previewRequests.push(request.url());
            });
            await page.goto(baseURL);
            await page.locator('[data-category-id="culture"]').click();
            assert.equal(await page.locator('#lesson-grid [data-article-id]').count(), 9);
            assert.equal(await page.locator('#lesson-grid audio').count(), 4);
            assert.equal(await page.locator('#lesson-grid .pop-card-preview-unavailable:disabled').count(), 4);
            for (const episode of episodes) {
                const card = page.locator('.grid-lesson').filter({ has: page.locator(`[data-article-id="${episode.id}"]`) });
                if (!episode.audio.previewUrl) {
                    assert.equal(await card.locator('.pop-card-preview-unavailable').isDisabled(), true);
                    assert.equal(await card.locator('.pop-card-audio-status').textContent(), '저작권 문제로 샘플곡을 재생할 수 없습니다.');
                }
                assert.equal(await card.locator('img').getAttribute('src'), episodes.find((item) => item.id === episode.id).coverImage.replace('w=1200&q=88', 'w=800&q=80'));
                await card.locator('[data-article-id]').click();
                assert.equal(await page.locator('#pop-article-title').textContent(), episode.title);
                assert.equal(await page.locator('#pop-article-dialog').evaluate((dialog) => dialog.open), true);
                assert.equal(await page.locator('#video-dialog').evaluate((dialog) => dialog.open), false);
                assert.equal(await page.locator('.pop-holiday-section').count(), 3);
                assert.equal(await page.locator('.pop-episode-sentence').count(), 3);
                assert.equal(await page.locator('.pop-article-quiz').isVisible(), true);
                assert.equal(await page.locator('#pop-article-answer').isVisible(), false);
                assert.equal(await page.locator('.pop-holiday-track-label').textContent(), episode.audio.label);
                assert.equal(await page.locator('#pop-holiday-audio').getAttribute('src'), episode.audio.previewUrl);
                assert.equal(await page.locator('#pop-holiday-play').isDisabled(), !episode.audio.previewUrl);
                assert.equal(await page.locator('#pop-holiday-seek').isDisabled(), !episode.audio.previewUrl);
                if (!episode.audio.previewUrl) {
                    assert.equal(await page.locator('#pop-holiday-play').isVisible(), true);
                    assert.equal(await page.locator('.pop-holiday-progress').isVisible(), true);
                    assert.equal(await page.locator('#pop-holiday-status').textContent(), '저작권 문제로 샘플곡을 재생할 수 없습니다.');
                    assert.ok(Number(await page.locator('#pop-holiday-play').evaluate((button) => getComputedStyle(button).opacity)) < 0.5);
                    const requestCount = previewRequests.length;
                    await page.locator('#pop-holiday-play').evaluate((button) => button.click());
                    assert.equal(await page.locator('#pop-holiday-audio').evaluate((audio) => audio.paused), true);
                    assert.equal(previewRequests.length, requestCount);
                    assert.ok(!(await page.locator('.pop-holiday-player').getAttribute('class')).includes('is-fallback'));
                    assert.equal(await page.locator('#pop-holiday-quote').textContent(), `“${episode.focusQuote.en}”`);
                }
                if (episode.id === 'pop-08') {
                    await page.locator('#pop-holiday-play').click();
                    await page.waitForFunction(() => document.querySelector('#pop-holiday-audio').currentTime > 0);
                    assert.ok(await page.locator('#pop-holiday-audio').evaluate((audio) => audio.duration > 0));
                }
                await page.locator('#pop-episode-quiz-audio').evaluate(async (audio) => { await audio.play(); });
                await page.waitForFunction(() => document.querySelector('#pop-episode-quiz-audio').currentTime > 0);
                assert.equal(await page.locator('#pop-holiday-audio').evaluate((audio) => audio.paused), true);
                assert.ok(await page.locator('#pop-episode-quiz-audio').evaluate((audio) => audio.duration > 0));
                await page.locator('.pop-episode-sentence audio').first().evaluate(async (audio) => { await audio.play(); });
                assert.equal(await page.locator('#pop-episode-quiz-audio').evaluate((audio) => audio.paused), true);
                await page.locator('#pop-article-answer-toggle').click();
                assert.equal(await page.locator('.pop-article-answer-text').textContent(), episode.quizSection.answer);
                await page.locator('[data-article-complete]').click();
                assert.equal(await page.locator('[data-article-complete]').getAttribute('aria-pressed'), 'true');
                await page.waitForFunction(() => {
                    const image = document.querySelector('#pop-episode-image');
                    return image.complete && image.naturalWidth > 0;
                }, { timeout: 15000 });
                assert.equal(await page.locator('#pop-episode-image').getAttribute('src'), episode.coverImage);
                const overflow = await page.locator('.pop-article-scroll').evaluate((element) => element.scrollWidth - element.clientWidth);
                assert.ok(overflow <= 2, `Horizontal overflow: ${episode.id} at ${viewport.width}: ${overflow}`);
                const playerOverlap = await page.locator('.pop-holiday-player').evaluate((element) => {
                    const progress = element.querySelector('.pop-holiday-progress').getBoundingClientRect();
                    const status = element.querySelector('.pop-holiday-status').getBoundingClientRect();
                    return progress.bottom > status.top;
                });
                assert.equal(playerOverlap, false);
                if (episode.id === 'pop-06' || episode.id === 'pop-03') {
                    await page.locator('.pop-article-scroll').evaluate((element) => { element.scrollTop = 0; });
                    const path = join(screenshots, `${episode.id}-${viewport.width}.png`);
                    await page.screenshot({ path, animations: 'disabled' });
                    assert.ok((await stat(path)).size > 10000);
                    console.log(`Screenshot: ${path}`);
                    for (const [name, selector] of [['player', '.pop-holiday-player'], ['quiz', '.pop-article-quiz']]) {
                        await page.locator(selector).scrollIntoViewIfNeeded();
                        const detailPath = join(screenshots, `${episode.id}-${viewport.width}-${name}.png`);
                        await page.screenshot({ path: detailPath, animations: 'disabled' });
                        console.log(`Screenshot: ${detailPath}`);
                    }
                }
                await page.locator('[data-article-back]').click();
                assert.equal(await page.locator('#category-dialog').evaluate((dialog) => dialog.open), true);
                await page.waitForFunction(() => [...document.querySelectorAll('#pop-article-dialog audio')].every((audio) => audio.paused));
                assert.equal(await page.locator('#pop-article-dialog audio').evaluateAll((audios) => audios.every((audio) => audio.paused)), true);
            }
            await page.locator('[data-article-id="pop-02"]').click();
            assert.equal(await page.locator('#pop-holiday-track-title').textContent(), 'Last Christmas (Single Version)');
            assert.equal(await page.locator('#pop-episode-cover').isVisible(), false);
            assert.equal(await page.locator('#pop-episode-practice').isVisible(), false);
            assert.equal(await page.locator('.pop-article-quiz').isVisible(), false);
            await page.locator('[data-article-back]').click();
            await page.locator('[data-article-id="pop-01"]').click();
            assert.equal(await page.locator('#pop-article-lyrics-list .pop-article-lyric').count(), 2);
            assert.equal(await page.locator('#pop-episode-quiz-audio').isVisible(), false);
            await page.locator('[data-article-back]').click();
            await page.locator('[data-article-id="pop-09"]').click();
            assert.equal(await page.locator('#pop-article-answer').isVisible(), false);
            await page.locator('[data-article-note]').click();
            const stored = await page.evaluate(() => Object.keys(localStorage).map((key) => localStorage.getItem(key)).join('\n'));
            assert.ok(stored.includes('This bag belongs to Mina.'));
            assert.deepEqual(errors, []);
            await page.close();
        }
    } finally {
        await browser?.close();
        await new Promise((resolveClosed) => server.close(resolveClosed));
    }
});