import { test, expect } from '@playwright/test';

async function installAudioMocks(page) {
    await page.evaluate(() => {
        window.audioTest = { sent: [], sockets: [], tracks: [], holdNextSetup: false };
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
            constructor(url) {
                this.url = url;
                this.readyState = 1;
                this.bufferedAmount = 0;
                window.audioTest.sockets.push(this);
                const holdSetup = window.audioTest.holdNextSetup;
                window.audioTest.holdNextSetup = false;
                queueMicrotask(() => {
                    this.onopen?.();
                    if (!holdSetup) this.message({ setupComplete: {} });
                });
            }
            send(data) { window.audioTest.sent.push(JSON.parse(data)); }
            message(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
            close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
        }
        window.WebSocket = MockSocket;
    });
}

test('a new tutor call sends the saved recent lesson before microphone audio', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    const lesson = { lessonTitle: '숫자와 순서', targetExpressions: ['She came in first.'], keyConcept: '서수로 순서를 말해요.' };
    await page.evaluate(async lesson => {
        const { saveRecentLesson } = await import('/lesson-context.mjs');
        saveRecentLesson(lesson);
    }, lesson);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    const messages = await page.evaluate(() => window.audioTest.sent);
    expect(messages[0]).toEqual({ type: 'INIT_SESSION', mode: 'TEACHING', context: lesson });
    expect(messages.filter(message => message.type === 'INIT_SESSION')).toHaveLength(1);
    await page.getByRole('button', { name: '세션 종료', exact: true }).click();
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    test(`modal layout and keyboard focus at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        await installAudioMocks(page);
        await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
        await expect(page.getByRole('button', { name: '세션 종료', exact: true })).toBeFocused();
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

test('Spotlight shows Daynize labs without traffic lights and closes from backdrop', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    const initialUrl = page.url();
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Daynize labs', { exact: true })).toBeVisible();
    await expect(page.locator('.traffic-lights')).toHaveCount(0);
    const bounds = await page.getByRole('dialog').boundingBox();
    expect(bounds.width).toBeLessThanOrEqual(720);
    expect(page.url()).toBe(initialUrl);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').callActive)).toBe(true);
    await page.mouse.click(4, 4);
    await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('real AudioWorklet PCM, playback, barge-in, mute, reconnect and cleanup', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    await page.waitForFunction(() => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length >= 20);
    const input = await page.evaluate(() => {
        const audio = window.audioTest.sent.find(message => message.realtimeInput?.audio).realtimeInput.audio;
        const widget = document.querySelector('daynize-voice-tutor');
        return { mime: audio.mimeType, bytes: atob(audio.data).length, analyser: widget.audio.levels().input.some(value => value > 0) };
    });
    expect(input).toEqual({ mime: 'audio/pcm;rate=16000', bytes: 1280, analyser: true });
    const socketCount = await page.evaluate(() => window.audioTest.sockets.length);
    const framesBeforeMinimize = await page.evaluate(() => document.querySelector('daynize-voice-tutor').sentFrames);
    await page.evaluate(() => document.querySelector('daynize-voice-tutor').minimize());
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.waitForFunction(previous => document.querySelector('daynize-voice-tutor').sentFrames > previous + 5, framesBeforeMinimize);
    await page.getByRole('button', { name: /AI 음성 회화 ·/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => window.audioTest.sockets.length)).toBe(socketCount);
    await page.getByRole('dialog').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    expect(await page.evaluate(() => window.audioTest.sent.some(message => message.clientContent))).toBe(false);
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
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').waveLevels[1] > 0.01);
    await page.screenshot({ path: 'test-results/widget-speaking.png' });
    await page.evaluate(() => { window.audioTest.gain.gain.value = 0.2; });
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.sources.size)).toBe(0);
    const framesAtInterruption = await page.evaluate(() => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length);
    await page.evaluate(async () => {
        const { encodePcm } = await import('/audio.mjs');
        window.audioTest.sockets.at(-1).message({ serverContent: { modelTurn: { parts: [{
            inlineData: { data: encodePcm(new Float32Array(24000)), mimeType: 'audio/pcm;rate=24000' }
        }] } } });
    });
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.sources.size)).toBe(0);
    await page.waitForFunction(previous => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length > previous + 2, framesAtInterruption);
    await page.evaluate(() => { window.audioTest.gain.gain.value = 0.005; });
    await page.evaluate(() => window.audioTest.sockets.at(-1).message({ serverContent: { interrupted: true } }));
    await page.evaluate(async () => {
        const { encodePcm } = await import('/audio.mjs');
        window.audioTest.sockets.at(-1).message({ serverContent: { modelTurn: { parts: [{
            inlineData: { data: encodePcm(new Float32Array(24000)), mimeType: 'audio/pcm;rate=24000' }
        }] } } });
    });
    await expect(page.locator('.status-line')).toHaveText('선생님이 말하는 중');
    expect(await page.evaluate(() => window.audioTest.sockets.length)).toBe(1);
    await page.evaluate(() => window.audioTest.sockets.at(-1).message({ serverContent: { interrupted: true } }));
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.sources.size)).toBe(0);
    await page.evaluate(() => window.audioTest.sockets.at(-1).message({ serverContent: { interrupted: true } }));
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
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    const previousFrames = await page.evaluate(() => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length);
    await page.waitForFunction(previous => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length >= previous + 10, previousFrames);
    await page.getByRole('button', { name: '세션 종료', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('.status-line')).toHaveText('대화 종료');
    expect(await page.evaluate(() => window.audioTest.tracks.every(track => track.readyState === 'ended'))).toBe(true);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.context === undefined)).toBe(true);
    await page.evaluate(() => window.audioTest.context.close());
});

test('speaker check requires no microphone and resumes suspended call audio', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    await page.getByRole('button', { name: '환경설정', exact: true }).click();
    await page.getByRole('button', { name: '스피커 확인', exact: true }).click();
    await expect(page.locator('.audio-check')).toContainText('확인음이 안 들리면');
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
    await page.getByRole('button', { name: '세션 종료', exact: true }).click();
    await page.evaluate(() => window.audioTest.context.close());
});

test('microphone denial shows a retry action and no socket is opened', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await expect(page.locator('.status-line')).toHaveText('연결 확인 필요');
    await expect(page.getByRole('button', { name: '다시 연결하기' })).toBeVisible();
    expect(await page.evaluate(() => window.audioTest.sockets.every(socket => socket.readyState === 3))).toBe(true);
});

test('Spotlight hides transcripts and keeps speaker, playback speed and voice preferences functional', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    await page.getByRole('button', { name: '스피커 끄기', exact: true }).click();
    await expect(page.getByRole('button', { name: '스피커 켜기', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.outputGain.gain.value)).toBeLessThan(0.05);
    await page.getByRole('button', { name: '스피커 켜기', exact: true }).click();
    await expect(page.getByRole('button', { name: '대화 자막', exact: true })).toHaveCount(0);
    await expect(page.locator('.transcripts')).toHaveCount(0);
    await page.evaluate(() => window.audioTest.sockets.at(-1).message({
        serverContent: {
            inputTranscription: { text: 'How are you?' }, outputTranscription: { text: 'I am well, thank you.' }
        }
    }));
    await expect(page.getByText('How are you?')).toHaveCount(0);
    await expect(page.getByText('I am well, thank you.')).toHaveCount(0);
    await page.getByRole('button', { name: '환경설정', exact: true }).click();
    await page.getByRole('slider', { name: '재생 속도' }).fill('0.9');
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').audio.playbackRate)).toBe(0.9);
    await page.getByRole('combobox').selectOption('Puck');
    await page.getByRole('button', { name: '음성 적용 · 다시 연결' }).click();
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    await expect.poll(() => page.evaluate(() => window.audioTest.sockets.length)).toBe(2);
    expect(await page.evaluate(() => window.audioTest.sockets.at(-1).url)).toContain('voice=Puck');
    expect(await page.evaluate(() => window.audioTest.sockets[0].readyState)).toBe(3);
    await page.screenshot({ path: 'test-results/spotlight-drawers.png', fullPage: true });
    await page.getByRole('button', { name: '세션 종료', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(await page.evaluate(() => window.audioTest.tracks.every(track => track.readyState === 'ended'))).toBe(true);
});

test('greeting and feedback turns keep the same session and microphone stream', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기' }).click();
    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    const firstSession = await page.evaluate(() => new URL(window.audioTest.sockets[0].url).searchParams.get('session'));
    const previousAudioCount = await page.evaluate(() => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length);

    await page.evaluate(() => {
        window.audioTest.sockets[0].message({ serverContent: { turnComplete: true } });
        window.audioTest.sockets[0].message({ setupComplete: {} });
    });
    await page.waitForFunction(previous => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length > previous + 3, previousAudioCount);
    await page.evaluate(() => window.audioTest.sockets[0].message({ serverContent: { turnComplete: true } }));
    expect(await page.evaluate(() => window.audioTest.sockets.length)).toBe(1);
    expect(await page.evaluate(() => new URL(window.audioTest.sockets[0].url).searchParams.get('session'))).toBe(firstSession);
    expect(await page.evaluate(() => window.audioTest.sent.filter(message => message.type === 'INIT_SESSION').length)).toBe(1);
    expect(await page.evaluate(() => window.audioTest.tracks.every(track => track.readyState === 'live'))).toBe(true);

    await expect(page.locator('.status-line')).toHaveText('듣고 있어요...');
    await page.waitForFunction(previous => window.audioTest.sent.filter(message => message.realtimeInput?.audio).length > previous, previousAudioCount);
    expect(await page.evaluate(() => document.querySelector('daynize-voice-tutor').pendingAudioFrames.length)).toBe(0);
    expect(await page.evaluate(() => window.audioTest.sent.some(message => message.clientContent))).toBe(false);
    await expect(page.getByRole('button', { name: '대화 자막', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '세션 종료', exact: true }).click();
    await page.evaluate(() => window.audioTest.context.close());
});

test('Voice Studio never sends a greeting and accepts turn completion without a callback', async ({ page }) => {
    await page.goto('/');
    await installAudioMocks(page);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(async () => {
        const { startVoiceStudioLiveTranscription } = await import('/voice-studio-live.mjs');
        window.studioLive = await startVoiceStudioLiveTranscription();
    });
    await page.waitForFunction(() => window.audioTest.sent.some(message => message.realtimeInput?.audio));
    await page.evaluate(() => {
        const socket = window.audioTest.sockets[0];
        socket.message({ setupComplete: {} });
        socket.message({ serverContent: { turnComplete: true } });
    });
    expect(await page.evaluate(() => window.audioTest.sockets.length)).toBe(1);
    expect(await page.evaluate(() => new URL(window.audioTest.sockets[0].url).pathname)).toBe('/ws/transcribe');
    expect(await page.evaluate(() => window.audioTest.sent.some(message => message.type === 'INIT_SESSION' || message.clientContent))).toBe(false);
    await page.evaluate(() => window.studioLive.stop());
    expect(errors).toEqual([]);
    await page.evaluate(() => window.audioTest.context.close());
});