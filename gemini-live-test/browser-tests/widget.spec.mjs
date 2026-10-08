import { test, expect } from '@playwright/test';

async function installAudioMocks(page) {
    await page.evaluate(() => {
        window.audioTest = { sent: [], sockets: [], tracks: [] };
        navigator.mediaDevices.getUserMedia = async () => {
            const context = new AudioContext();
            const destination = context.createMediaStreamDestination();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            gain.gain.value = 0.005;
            oscillator.connect(gain).connect(destination);
            oscillator.start();
            await context.resume();
            window.audioTest.context = context;
            window.audioTest.gain = gain;
            window.audioTest.tracks.push(...destination.stream.getTracks());
            return destination.stream;
        };
        class MockSocket {
            static OPEN = 1;
            constructor() {
                this.readyState = 1;
                this.bufferedAmount = 0;
                window.audioTest.sockets.push(this);
                queueMicrotask(() => { this.onopen?.(); this.message({ setupComplete: {} }); });
            }
            send(data) { window.audioTest.sent.push(JSON.parse(data)); }
            message(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
            close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
        }
        window.WebSocket = MockSocket;
    });
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    test(`modal layout and keyboard focus at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
        await expect(page.getByRole('button', { name: '대화 시작', exact: true })).toBeFocused();
        const bounds = await dialog.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
        await page.waitForFunction(() => {
            const widget = document.querySelector('daynize-voice-tutor');
            const pixels = widget.canvasContext.getImageData(0, 0, widget.canvas.width, widget.canvas.height).data;
            return pixels.some((value, index) => index % 4 === 3 && value > 0);
        });
        const assets = await page.evaluate(() => [...document.querySelector('daynize-voice-tutor').shadowRoot.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
        expect(assets).toBe(true);
        await page.screenshot({ path: `test-results/widget-${viewport.width}.png`, fullPage: true });
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'AI 음성 회화 시작하기' })).toBeFocused();
    });
}

test('real AudioWorklet PCM, playback, barge-in, mute, reconnect and cleanup', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await page.getByRole('button', { name: '대화 시작', exact: true }).click();
    await expect(page.locator('.status-line')).toHaveText('답변 기다리는 중');
    await page.waitForFunction(() => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length >= 20);
    const input = await page.evaluate(() => {
        const audio = window.audioTest.sent.find(message => message.realtimeInput?.audio).realtimeInput.audio;
        const widget = document.querySelector('daynize-voice-tutor');
        return { mime: audio.mimeType, bytes: atob(audio.data).length, analyser: widget.audio.levels().input.some(value => value > 0) };
    });
    expect(input).toEqual({ mime: 'audio/pcm;rate=16000', bytes: 3200, analyser: true });
    expect(await page.evaluate(() => window.audioTest.sent.some(message => message.clientContent?.turnComplete))).toBe(true);
    await page.evaluate(async () => {
        const { encodePcm } = await import('/audio.mjs');
        const samples = new Float32Array(24000);
        for (let index = 0; index < samples.length; index++) samples[index] = Math.sin(index / 24000 * Math.PI * 440) * 0.08;
        const audio = { serverContent: { modelTurn: { parts: [{ inlineData: { data: encodePcm(samples), mimeType: 'audio/pcm;rate=24000' } }] } } };
        window.audioTest.sockets.at(-1).message(audio);
        window.audioTest.sockets.at(-1).message(audio);
    });
    await expect(page.locator('.status-line')).toHaveText('선생님이 말하는 중');
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.sources.size)).toBe(2);
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').audio.levels().output.some(value => value > 0));
    await page.screenshot({ path: 'test-results/widget-speaking.png' });
    await page.evaluate(() => { window.audioTest.gain.gain.value = 0.2; });
    await page.waitForTimeout(150);
    await expect(page.locator('.status-line')).toHaveText('선생님이 말하는 중');
    await page.evaluate(() => window.audioTest.sockets.at(-1).message({ serverContent: { interrupted: true, turnComplete: true } }));
    await expect(page.locator('.status-line')).toHaveText('듣는 중');
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.sources.size)).toBe(0);
    await page.evaluate(() => window.audioTest.sockets.at(-1).message({ serverContent: { interrupted: true, turnComplete: true } }));
    await page.getByRole('button', { name: '마이크 끄기', exact: true }).click();
    await expect(page.locator('.status-line')).toHaveText('마이크 꺼짐');
    const pausedTime = await page.locator('.time').textContent();
    await page.waitForTimeout(1200);
    expect(await page.locator('.time').textContent()).toBe(pausedTime);
    await expect(page.locator('.transport')).toContainText('연결 유지');
    expect(await page.evaluate(() => window.audioTest.tracks.every(track => !track.enabled))).toBe(true);
    expect(await page.evaluate(() => window.audioTest.sent.some(message => message.realtimeInput?.audioStreamEnd))).toBe(true);
    await page.evaluate(() => window.audioTest.sockets.at(-1).close(1006));
    await expect(page.locator('.status-line')).toHaveText('다시 연결 중');
    await expect(page.locator('.status-line')).toHaveText('마이크 꺼짐');
    expect(await page.evaluate(() => window.audioTest.sockets.length)).toBe(2);
    await page.getByRole('button', { name: '마이크 켜기', exact: true }).click();
    await expect(page.locator('.status-line')).toHaveText('듣는 중');
    const previousFrames = await page.evaluate(() => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length);
    await page.waitForFunction(previous => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length >= previous + 10, previousFrames);
    await page.getByRole('button', { name: '대화 종료', exact: true }).click();
    await expect(page.locator('.status-line')).toHaveText('대화 종료');
    expect(await page.evaluate(() => window.audioTest.tracks.every(track => track.readyState === 'ended'))).toBe(true);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.context === undefined)).toBe(true);
    await page.evaluate(() => window.audioTest.context.close());
});

test('speaker check requires no microphone and resumes suspended call audio', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await page.getByRole('button', { name: '스피커 확인', exact: true }).click();
    await expect(page.locator('.audio-check')).toContainText('확인음이 안 들리면');
    expect(await page.evaluate(() => window.audioTest.tracks.length)).toBe(0);
    await page.getByRole('button', { name: '대화 시작', exact: true }).click();
    await expect(page.locator('.status-line')).toHaveText('답변 기다리는 중');
    await page.evaluate(async () => {
        const widget = document.querySelector('daynize-voice-tutor');
        await widget.audio.context.suspend();
        const { encodePcm } = await import('/audio.mjs');
        window.audioTest.sockets.at(-1).message({
            serverContent: {
                modelTurn: {
                    parts: [{
                        inlineData: {
                            mimeType: 'audio/pcm;rate=24000', data: encodePcm(new Float32Array(24000))
                        }
                    }]
                }
            }
        });
    });
    await expect(page.locator('.status-line')).toHaveText('음성 재생 일시 중지');
    await page.getByRole('button', { name: '스피커 확인', exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.context.state)).toBe('running');
    await page.getByRole('button', { name: '마이크 끄기', exact: true }).click();
    await page.getByRole('button', { name: '대화 종료', exact: true }).click();
    await page.evaluate(() => window.audioTest.context.close());
});

test('microphone denial shows a retry action and no socket is opened', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await page.getByRole('button', { name: '대화 시작', exact: true }).click();
    await expect(page.locator('.status-line')).toHaveText('연결 확인 필요');
    await expect(page.getByRole('button', { name: '다시 연결하기' })).toBeVisible();
    expect(await page.evaluate(() => window.audioTest.sockets.length)).toBe(0);
});