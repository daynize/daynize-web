import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '../gemini-live-test/node_modules/playwright/index.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const mimeTypes = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
    '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml'
};

const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
        if (!target.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) {
            response.writeHead(403).end();
            return;
        }
        const info = await stat(target);
        const file = info.isDirectory() ? resolve(target, 'index.html') : target;
        const bytes = await readFile(file);
        response.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream' }).end(bytes);
    } catch (_) {
        response.writeHead(404).end();
    }
});

test('speech recognition updates the yellow transcript live and restores recording UI', { timeout: 30000 }, async () => {
    await new Promise((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'mediaDevices', {
                configurable: true,
                value: {
                    getUserMedia: async () => {
                        if (window.__microphonePermission === 'denied') {
                            throw new DOMException('Microphone access denied.', 'NotAllowedError');
                        }
                        return { getTracks: () => [{ stop() { } }] };
                    }
                }
            });
            window.__microphonePermission = 'granted';
            Object.defineProperty(navigator, 'permissions', {
                configurable: true,
                value: {
                    query: async () => window.__permissionQueryNeverResolves
                        ? new Promise(() => { })
                        : ({ state: window.__microphonePermission })
                }
            });

            class MockMediaRecorder extends EventTarget {
                static isTypeSupported() { return true; }
                constructor() { super(); this.state = 'inactive'; this.mimeType = 'audio/webm'; }
                start() { this.state = 'recording'; }
                stop() {
                    this.state = 'inactive';
                    queueMicrotask(() => {
                        this.ondataavailable?.({ data: new Blob(['recorded audio'], { type: this.mimeType }) });
                        this.onstop?.();
                    });
                }
            }
            window.MediaRecorder = MockMediaRecorder;

            class MockSpeechRecognition {
                start() {
                    this.started = true;
                    this.config = { lang: this.lang, continuous: this.continuous, interimResults: this.interimResults };
                    this.onstart?.();
                }
                stop() {
                    this.started = false;
                    this.onend?.();
                }
                emitResult(text, isFinal) {
                    const result = [{ transcript: text }];
                    result.isFinal = isFinal;
                    this.onresult?.({ resultIndex: 0, results: [result] });
                }
                emitError(error) { this.onerror?.({ error }); }
            }
            window.SpeechRecognition = MockSpeechRecognition;
            window.__mockRecognitions = [];
            window.__originalRecognition = window.SpeechRecognition;
            window.SpeechRecognition = class extends window.__originalRecognition {
                constructor() {
                    super();
                    window.__mockRecognitions.push(this);
                }
            };
        });

        await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
        await page.locator('#category-track [data-category-id="speaking"]').waitFor();
        await page.locator('#record-button').click();
        await page.waitForFunction(() => window.__mockRecognitions?.length === 1);
        assert.deepEqual(await page.evaluate(() => window.__mockRecognitions[0].config), {
            lang: 'en-US', continuous: true, interimResults: true
        });
        assert.equal(await page.locator('#record-label').textContent(), '녹음 중지');
        assert.equal(await page.locator('#transcript').textContent(), '음성을 듣고 있습니다. 영어로 말씀해 주세요.');

        await page.evaluate(() => window.__mockRecognitions[0].emitResult('I might', false));
        assert.equal(await page.locator('#transcript').textContent(), 'I might');

        await page.evaluate(() => window.__mockRecognitions[0].emitResult('I might take a cab.', true));
        assert.equal(await page.locator('#transcript').textContent(), 'I might take a cab.');

        await page.evaluate(() => window.__mockRecognitions[0].emitError('not-allowed'));
        assert.match(await page.locator('#voice-status').textContent(), /브라우저 설정에서 마이크와 음성 인식을 허용/);
        assert.match(await page.locator('#transcript').textContent(), /I might take a cab\./);

        await page.locator('#record-button').click();
        await page.waitForFunction(() => document.querySelector('#record-label').textContent === '녹음 시작');
        assert.equal(await page.locator('#record-button').isDisabled(), false);
        assert.match(await page.locator('#transcript').textContent(), /I might take a cab\./);
        assert.equal(await page.locator('#playback-button').isDisabled(), false);

        await page.evaluate(() => { window.__microphonePermission = 'denied'; });
        await page.locator('#record-button').click();
        assert.match(await page.locator('#transcript').textContent(), /마이크 권한이 차단/);
        assert.match(await page.locator('#voice-status').textContent(), /사이트 설정에서 마이크를 허용/);
        assert.equal(await page.locator('#record-label').textContent(), '녹음 시작');
        assert.equal(await page.locator('#record-button').isDisabled(), false);

        await page.evaluate(() => {
            window.__microphonePermission = 'granted';
            window.__permissionQueryNeverResolves = true;
        });
        await page.locator('#record-button').click();
        await page.waitForFunction(() => window.__mockRecognitions.length === 2);
        assert.equal(await page.locator('#record-label').textContent(), '녹음 중지');
        await page.locator('#record-button').click();
        await page.waitForFunction(() => document.querySelector('#record-label').textContent === '녹음 시작');
    } finally {
        await browser?.close();
        await new Promise((resolveClose) => server.close(resolveClose));
    }
});

test('iOS Safari and mobile Chrome use single-shot recognition and restart safely', { timeout: 30000 }, async () => {
    const mobileAgents = [
        ['iOS Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'],
        ['Mobile Chrome', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36']
    ];
    await new Promise((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        for (const [label, userAgent] of mobileAgents) {
            const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
            page.setDefaultTimeout(5000);
            await page.addInitScript((mobileAgent) => {
                Object.defineProperty(navigator, 'userAgent', { configurable: true, value: mobileAgent });
                Object.defineProperty(navigator, 'mediaDevices', {
                    configurable: true,
                    value: { getUserMedia: async () => ({ getTracks: () => [{ stop() { } }] }) }
                });
                Object.defineProperty(navigator, 'permissions', {
                    configurable: true,
                    value: { query: async () => ({ state: 'granted' }) }
                });
                class MockRecorder {
                    static isTypeSupported() { return true; }
                    constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
                    start() { this.state = 'recording'; }
                    stop() {
                        this.state = 'inactive';
                        queueMicrotask(() => {
                            this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) });
                            this.onstop?.();
                        });
                    }
                }
                window.MediaRecorder = MockRecorder;
                window.__mobileRecognitions = [];
                const MockMobileRecognition = class {
                    start() {
                        this.config = { lang: this.lang, continuous: this.continuous, interimResults: this.interimResults };
                        window.__mobileRecognitions.push(this);
                        this.onstart?.();
                    }
                    stop() { this.onend?.(); }
                    emitResult(text) {
                        const result = [{ transcript: text }];
                        result.isFinal = true;
                        this.onresult?.({ resultIndex: 0, results: [result] });
                    }
                    emitError(error) { this.onerror?.({ error }); }
                };
                window.SpeechRecognition = MockMobileRecognition;
                window.webkitSpeechRecognition = MockMobileRecognition;
            }, userAgent);

            await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
            await page.locator('#category-track [data-category-id="speaking"]').waitFor();
            await page.locator('#record-button').click();
            await page.waitForFunction(() => window.__mobileRecognitions?.length === 1).catch(async (error) => {
                const state = await page.evaluate(() => ({
                    recognitionCount: window.__mobileRecognitions?.length,
                    label: document.querySelector('#record-label').textContent,
                    transcript: document.querySelector('#transcript').textContent,
                    status: document.querySelector('#voice-status').textContent,
                    isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
                    prefixedApi: typeof window.webkitSpeechRecognition,
                    standardApi: typeof window.SpeechRecognition
                }));
                throw new Error(`${label} recognition did not start: ${JSON.stringify(state)}; ${error.message}`);
            });
            const expected = label === 'iOS Safari'
                ? { lang: 'en-US', continuous: false, interimResults: false }
                : { lang: 'en-US', continuous: false, interimResults: true };
            assert.deepEqual(await page.evaluate(() => window.__mobileRecognitions[0].config), expected, label);

            await page.evaluate(() => window.__mobileRecognitions[0].emitResult('Can you drop me off here?'));
            assert.equal(await page.locator('#transcript').textContent(), 'Can you drop me off here?');
            await page.evaluate(() => window.__mobileRecognitions[0].onend());
            await page.waitForFunction(() => window.__mobileRecognitions.length === 2);
            assert.deepEqual(await page.evaluate(() => window.__mobileRecognitions[1].config), expected, `${label} restart`);

            await page.evaluate(() => window.__mobileRecognitions[1].emitError('not-allowed'));
            assert.match(await page.locator('#voice-status').textContent(), /사파리\/크롬 설정에서 마이크 및 음성 인식을 허용해 주세요/);
            assert.equal(await page.locator('#record-label').textContent(), '녹음 중지');
            await page.locator('#record-button').click();
            await page.waitForFunction(() => document.querySelector('#record-label').textContent === '녹음 시작');
            await page.close();
        }
    } finally {
        await browser?.close();
        await new Promise((resolveClose) => server.close(resolveClose));
    }
});