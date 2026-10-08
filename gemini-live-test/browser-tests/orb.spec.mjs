import { test, expect } from '@playwright/test';

for (const width of [1280, 375]) {
    test(`ambient orb stays translucent, smooth and 64px at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await page.evaluate(() => {
            const widget = document.querySelector('daynize-voice-tutor');
            widget.audio.start = async () => { };
            widget.audio.levels = () => ({ input: new Uint8Array(128).fill(55), output: new Uint8Array(128) });
            class MockSocket {
                static OPEN = 1;
                constructor() {
                    this.readyState = 1;
                    this.bufferedAmount = 0;
                    queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({ setupComplete: {} }) }));
                }
                send() { }
                close() { this.readyState = 3; }
            }
            window.WebSocket = MockSocket;
        });
        await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
        await page.evaluate(() => document.querySelector('daynize-voice-tutor').setState('listening'));
        await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').orb.motion.input > 0.1);
        const size = await page.locator('.ambient-orb').boundingBox();
        expect(size.width).toBe(64);
        expect(size.height).toBe(64);
        const pixels = await page.evaluate(() => {
            const widget = document.querySelector('daynize-voice-tutor');
            const data = widget.orb.context.getImageData(0, 0, widget.orb.canvas.width, widget.orb.canvas.height).data;
            const alpha = Array.from(data).filter((value, index) => index % 4 === 3);
            return { visible: alpha.filter(value => value > 5).length, peakAlpha: Math.max(...alpha), separateCanvases: widget.canvas !== widget.orb.canvas && widget.canvas.classList.contains('visualizer') };
        });
        expect(pixels.visible).toBeGreaterThan(500);
        expect(pixels.peakAlpha).toBeLessThanOrEqual(180);
        expect(pixels.separateCanvases).toBe(true);
        await page.screenshot({ path: `test-results/orb-listening-${width}.png` });
        await page.evaluate(() => document.querySelector('daynize-voice-tutor').setState('speaking'));
        await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').orb.motion.warmth > 0.7);
        await page.screenshot({ path: `test-results/orb-speaking-${width}.png` });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
        const phase = await page.evaluate(() => document.querySelector('daynize-voice-tutor').orb.motion.phase);
        const timestamp = await page.evaluate(() => document.querySelector('daynize-voice-tutor').orb.lastTimestamp);
        await page.waitForFunction(previous => document.querySelector('daynize-voice-tutor').orb.lastTimestamp > previous + 200, timestamp);
        expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').orb.motion.phase)).toBe(phase);
        await page.getByRole('button', { name: '최소화', exact: true }).click();
        const stopped = await page.evaluate(() => document.querySelector('daynize-voice-tutor').orb.lastTimestamp);
        await page.getByRole('button', { name: /AI 음성 회화 ·/ }).waitFor();
        expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').orb.lastTimestamp)).toBe(stopped);
        await page.getByRole('button', { name: /AI 음성 회화 ·/ }).click();
        await page.keyboard.press('Escape');
    });
}