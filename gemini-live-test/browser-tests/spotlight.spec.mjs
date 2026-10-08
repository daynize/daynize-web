import { test, expect } from '@playwright/test';

test('one click opens inline and starts microphone and session; Escape releases both', async ({ page }) => {
    await page.goto('/');
    const url = page.url();
    await page.evaluate(() => {
        window.sessionTest = { tracks: [], sockets: [], requests: 0 };
        navigator.mediaDevices.getUserMedia = async () => {
            window.sessionTest.requests++;
            const context = new AudioContext();
            const destination = context.createMediaStreamDestination();
            const oscillator = context.createOscillator();
            oscillator.connect(destination);
            oscillator.start();
            await context.resume();
            window.sessionTest.context = context;
            window.sessionTest.tracks.push(...destination.stream.getTracks());
            return destination.stream;
        };
        class MockSocket {
            static OPEN = 1;
            constructor() {
                this.readyState = 1;
                this.bufferedAmount = 0;
                window.sessionTest.sockets.push(this);
                queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({ setupComplete: {} }) }));
            }
            send() { }
            close() { this.readyState = 3; }
        }
        window.WebSocket = MockSocket;
    });
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').audio.streaming);
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => window.sessionTest.requests)).toBe(1);
    expect(await page.evaluate(() => window.sessionTest.sockets.length)).toBe(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(await page.evaluate(() => window.sessionTest.tracks.every(track => track.readyState === 'ended'))).toBe(true);
    expect(await page.evaluate(() => window.sessionTest.sockets.every(socket => socket.readyState === 3))).toBe(true);
    await page.evaluate(() => window.sessionTest.context.close());
});

test('closing while microphone permission is pending releases late tracks and connection', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
        window.pendingTest = { sockets: [] };
        navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.pendingTest.resolve = resolve; });
        class MockSocket {
            static OPEN = 1;
            constructor() { this.readyState = 1; this.bufferedAmount = 0; window.pendingTest.sockets.push(this); }
            send() { }
            close() { this.readyState = 3; }
        }
        window.WebSocket = MockSocket;
    });
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await page.waitForFunction(() => Boolean(window.pendingTest.resolve));
    await page.keyboard.press('Escape');
    await page.evaluate(async () => {
        const context = new AudioContext();
        const stream = context.createMediaStreamDestination().stream;
        window.pendingTest.tracks = stream.getTracks();
        window.pendingTest.resolve(stream);
        await context.close();
    });
    await page.waitForFunction(() => window.pendingTest.tracks.every(track => track.readyState === 'ended'));
    expect(await page.evaluate(() => window.pendingTest.sockets.every(socket => socket.readyState === 3))).toBe(true);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.context)).toBeUndefined();
    await expect(page.getByRole('dialog')).not.toBeVisible();
});