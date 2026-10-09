import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createRelayServer } = require('../server.js');
const audioPath = process.argv[2];
if (!audioPath) throw new Error('Usage: node scripts/probe-latency.mjs path/to/test-voice.wav (uses Gemini API quota)');
const encoded = (await fs.readFile(audioPath)).toString('base64');
const relay = createRelayServer({ publicOrigin: '' });
let browser;

try {
    await new Promise((resolve, reject) => {
        relay.server.once('error', reject);
        relay.server.listen(0, '127.0.0.1', resolve);
    });
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = async () => {
            const context = new AudioContext();
            const destination = context.createMediaStreamDestination();
            const source = context.createOscillator();
            const gain = context.createGain();
            gain.gain.value = 0;
            source.connect(gain).connect(destination);
            source.start();
            await context.resume();
            window.latencyProbe = { context, destination, turns: 0, firstAudio: null, firstTranscript: null, transcript: '', endedAt: 0 };
            return destination.stream;
        };
    });
    await page.goto(`http://127.0.0.1:${relay.server.address().port}/`);
    await page.getByRole('button', { name: 'AI 음성 회화 시작하기', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('daynize-voice-tutor').service?.ready, {}, { timeout: 25000 });
    await page.evaluate(() => {
        const service = document.querySelector('daynize-voice-tutor').service;
        service.addEventListener('turnComplete', () => window.latencyProbe.turns++);
        service.addEventListener('audio', () => { window.latencyProbe.firstAudio ??= performance.now(); });
        service.addEventListener('transcript', event => {
            if (event.detail.speaker !== 'user') return;
            window.latencyProbe.firstTranscript ??= performance.now();
            window.latencyProbe.transcript += event.detail.text;
        });
    });
    await page.waitForFunction(() => window.latencyProbe.turns > 0 && document.querySelector('daynize-voice-tutor').audio.sources.size === 0, {}, { timeout: 30000 });
    const results = [];
    for (const gain of [1, 0.4, 0.12, 1]) {
        const previousTurn = await page.evaluate(() => {
            window.latencyProbe.firstAudio = window.latencyProbe.firstTranscript = null;
            window.latencyProbe.transcript = '';
            return window.latencyProbe.turns;
        });
        await page.evaluate(async ({ encoded, gain }) => {
            const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
            const probe = window.latencyProbe;
            const buffer = await probe.context.decodeAudioData(bytes.buffer);
            const source = probe.context.createBufferSource();
            const volume = probe.context.createGain();
            source.buffer = buffer;
            volume.gain.value = gain;
            source.connect(volume).connect(probe.destination);
            const samples = buffer.getChannelData(0);
            probe.rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length) * gain;
            await new Promise(resolve => {
                source.onended = () => {
                    probe.endedAt = performance.now();
                    source.disconnect();
                    volume.disconnect();
                    resolve();
                };
                source.start();
            });
        }, { encoded, gain });
        let replied = true;
        await page.waitForFunction(() => window.latencyProbe.firstAudio !== null, {}, { timeout: 12000 }).catch(() => { replied = false; });
        const result = await page.evaluate(({ gain, replied }) => {
            const probe = window.latencyProbe;
            const widget = document.querySelector('daynize-voice-tutor');
            return {
                gain, inputRms: probe.rms, recognized: Boolean(probe.transcript.trim()),
                firstTranscriptAfterEndMs: probe.firstTranscript === null ? null : Math.round(probe.firstTranscript - probe.endedAt),
                firstAudioAfterEndMs: replied ? Math.round(probe.firstAudio - probe.endedAt) : null,
                pcmSent: widget.sentFrames, audioState: widget.audio.context?.state
            };
        }, { gain, replied });
        results.push(result);
        console.log(JSON.stringify(result));
        if (!replied) {
            process.exitCode = 1;
            break;
        }
        await page.waitForFunction(previous => window.latencyProbe.turns > previous && document.querySelector('daynize-voice-tutor').audio.sources.size === 0, previousTurn, { timeout: 30000 });
    }
    const delays = results.map(result => result.firstAudioAfterEndMs).filter(value => value !== null).sort((first, second) => first - second);
    console.log(JSON.stringify({ replies: delays.length, medianFirstAudioMs: delays.length ? (delays[Math.floor((delays.length - 1) / 2)] + delays[Math.floor(delays.length / 2)]) / 2 : null }));
    await page.keyboard.press('Escape');
} finally {
    await browser?.close();
    await relay.close();
}