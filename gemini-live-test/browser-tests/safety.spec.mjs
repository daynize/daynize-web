import { test, expect } from '@playwright/test';

async function startSession(page, config = {}) {
    await page.clock.install();
    await page.goto('/');
    await page.evaluate(config => {
        window.safetyTest = { rms: 0, sockets: [] };
        const widget = document.querySelector('daynize-voice-tutor');
        widget.config = { ...widget.config, ...config };
        widget.audio.start = async () => { };
        widget.audio.inputVolume = () => window.safetyTest.rms;
        class MockSocket {
            static OPEN = 1;
            constructor() {
                this.readyState = 1;
                this.bufferedAmount = 0;
                window.safetyTest.sockets.push(this);
                queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({ setupComplete: {} }) }));
            }
            send(data) {
                const message = JSON.parse(data);
                if (message.type === 'ping') queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({ type: 'pong', id: message.id }) }));
            }
            close() { this.readyState = 3; }
        }
        window.WebSocket = MockSocket;
    }, config);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').service?.ready);
}

test('20s silence warning resets on sound; 30s silence releases session', async ({ page }) => {
    await startSession(page);
    await page.clock.fastForward(20000);
    await expect(page.locator('.safety-notice')).toContainText('생각 중이신가요?');
    await expect(page.locator('.safety-notice')).toContainText('10초 후');
    await page.evaluate(() => { window.safetyTest.rms = 0.04; });
    await page.clock.runFor(200);
    await expect(page.locator('.safety-notice')).not.toBeVisible();
    await page.evaluate(() => { window.safetyTest.rms = 0; });
    await page.clock.fastForward(30001);
    await expect(page.locator('.safety-notice')).toContainText('대화를 자동 종료했습니다');
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').callActive)).toBe(false);
    expect(await page.evaluate(() => window.safetyTest.sockets.every(socket => socket.readyState === 3))).toBe(true);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').safetyTimer)).toBeUndefined();
});

test('10-minute wall-clock limit closes minimized session despite ongoing sound', async ({ page }) => {
    await startSession(page);
    await page.evaluate(() => { window.safetyTest.rms = 0.04; });
    await page.evaluate(() => document.querySelector('daynize-voice-tutor').minimize());
    await page.clock.fastForward(600000);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').callActive)).toBe(false);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').messageElement.textContent)).toBe('오늘의 튜터링 시간이 완료되었습니다!');
    expect(await page.evaluate(() => window.safetyTest.sockets.every(socket => socket.readyState === 3))).toBe(true);
});

test('reconnection beyond 30 seconds does not trigger silence termination', async ({ page }) => {
    await startSession(page, { recoveryTimeout: 90000 });
    await page.evaluate(() => {
        const service = document.querySelector('daynize-voice-tutor').service;
        service.options.retryDelay = service.options.maxRetryDelay = 60000;
        service.socket.onerror();
    });
    await expect(page.locator('.status-line')).toHaveText('다시 연결 중');
    await page.clock.fastForward(31000);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').callActive)).toBe(true);
    await expect(page.locator('.safety-notice')).not.toBeVisible();
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').dataset.connectionState)).toBe('RECONNECTING');
    await page.clock.fastForward(30000);
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    expect(await page.evaluate(() => window.safetyTest.sockets.length)).toBe(2);
    await page.keyboard.press('Escape');
});

test('manual retry restores microphone controls without replacing the session', async ({ page }) => {
    await startSession(page);
    const sessionId = await page.evaluate(() => document.querySelector('daynize-voice-tutor').service.sessionId);
    await page.evaluate(() => document.querySelector('daynize-voice-tutor').service.socket.onerror());
    await expect(page.getByRole('button', { name: '마이크 끄기', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: '지금 다시 연결', exact: true }).click();
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    await expect(page.getByRole('button', { name: '마이크 끄기', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').service.sessionId)).toBe(sessionId);
    await expect(page.getByRole('button', { name: '지금 다시 연결', exact: true })).not.toBeVisible();
    await page.keyboard.press('Escape');
});

test('recovery timeout shows enabled fallback and manual restart succeeds', async ({ page }) => {
    await startSession(page, { recoveryTimeout: 1000 });
    await page.evaluate(() => {
        const service = document.querySelector('daynize-voice-tutor').service;
        service.options.retryDelay = 5000;
        service.socket.onerror();
    });
    await page.clock.fastForward(1001);
    await expect(page.locator('.status-line')).toHaveText('연결 확인 필요');
    await expect(page.getByRole('button', { name: '다시 연결하기', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').dataset.connectionState)).toBe('DISCONNECTED');
    await page.getByRole('button', { name: '다시 연결하기', exact: true }).click();
    await expect(page.getByRole('button', { name: '마이크 끄기', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
});

for (const width of [1280, 375]) {
    test(`horizontal 84px dark bar and right aligned icon row at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await startSession(page);
        await page.getByRole('dialog').evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
        const geometry = await page.evaluate(() => {
            const root = document.querySelector('daynize-voice-tutor').shadowRoot;
            const bounds = selector => { const rect = root.querySelector(selector).getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right }; };
            return { bar: bounds('.spotlight-bar'), modal: bounds('dialog'), orb: bounds('.ambient-orb'), wave: bounds('.visualizer'), tray: bounds('.icon-tray'), buttons: [...root.querySelectorAll('.icon-tray button')].map(button => button.getBoundingClientRect().y) };
        });
        expect(geometry.modal.height).toBe(84);
        expect(geometry.bar.height).toBe(82);
        if (width === 1280) expect(geometry.modal.width).toBe(720);
        expect(geometry.orb.width).toBe(64);
        expect(geometry.tray.x).toBeGreaterThanOrEqual(geometry.wave.right);
        expect(new Set(geometry.buttons).size).toBe(1);
        expect(geometry.modal.right).toBeLessThanOrEqual(width);
        await page.screenshot({ path: `test-results/compact-spotlight-${width}.png` });
        await page.keyboard.press('Escape');
    });
}