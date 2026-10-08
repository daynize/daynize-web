import { test, expect } from '@playwright/test';

test('thin wave reacts to live input/output while orb rotates and glows softly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.evaluate(() => {
        navigator.mediaDevices.getUserMedia = async () => {
            const context = new AudioContext();
            const destination = context.createMediaStreamDestination();
            const source = context.createOscillator();
            source.frequency.value = 220;
            const gain = context.createGain();
            gain.gain.value = 0;
            source.connect(gain).connect(destination);
            source.start();
            await context.resume();
            window.speechTest = { context, gain };
            return destination.stream;
        };
        class MockSocket {
            static OPEN = 1;
            constructor() {
                this.readyState = 1;
                this.bufferedAmount = 0;
                window.testSocket = this;
                queueMicrotask(() => this.message({ setupComplete: {} }));
            }
            message(value) { this.onmessage?.({ data: JSON.stringify(value) }); }
            send() { }
            close() { this.readyState = 3; }
        }
        window.WebSocket = MockSocket;
    });
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').audio.streaming);
    expect(await page.evaluate(() => Math.max(...document.querySelector('daynize-voice-tutor').waveLevels))).toBe(0);
    await page.evaluate(() => { window.speechTest.gain.gain.value = 0.08; });
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').waveLevels[0] > 0.5);
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').orb.motion.input > 0.2);
    await page.screenshot({ path: 'test-results/speech-wave-input.png' });
    const phase = await page.evaluate(() => document.querySelector('daynize-voice-tutor').orb.motion.phase);
    await page.waitForFunction(previous => document.querySelector('daynize-voice-tutor').orb.motion.phase > previous + 0.04, phase);
    await page.evaluate(() => { window.speechTest.gain.gain.value = 0; });
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').waveLevels[0] < 0.025);
    await page.evaluate(async () => {
        const { encodePcm } = await import('/audio.mjs');
        const samples = new Float32Array(48000);
        for (let index = 0; index < samples.length; index++) samples[index] = Math.sin(index * Math.PI * 2 * 300 / 24000) * 0.12;
        window.testSocket.message({
            serverContent: {
                modelTurn: {
                    parts: [{
                        inlineData: {
                            data: encodePcm(samples), mimeType: 'audio/pcm;rate=24000'
                        }
                    }]
                }
            }
        });
    });
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').waveLevels[1] > 0.5);
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').orb.motion.output > 0.15);
    await page.screenshot({ path: 'test-results/speech-wave-output.png' });
    await page.getByRole('button', { name: '스피커 끄기', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').waveLevels[1] < 0.025);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.speechTest.context.close());
});