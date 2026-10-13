import { AudioEngine } from './audio-engine.mjs';
import { LiveService } from './live-service.mjs';

export async function startVoiceStudioLiveTranscription({ onTranscript, onState } = {}) {
    const loader = document.querySelector('script[data-daynize-tutor]');
    const configured = loader?.dataset.transcriptionEndpoint || 'https://api.daynize.co.kr/transcribe';
    const endpoint = new URL(configured);
    endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
    endpoint.pathname = '/ws/transcribe';
    endpoint.search = '';
    endpoint.hash = '';

    const audio = new AudioEngine({ workletUrl: new URL('./pcm-worklet.mjs', import.meta.url) });
    const service = new LiveService({
        endpoint: endpoint.toString(),
        mode: 'proxy',
        protocol: 'audio',
        timeout: 10000,
        recoveryTimeout: 30000,
        stableConnectionTime: 30000
    });
    let sentFrames = 0;
    audio.addEventListener('pcm', event => {
        if (service.sendAudio(event.detail)) sentFrames += 1;
    });
    service.addEventListener('transcript', event => {
        if (event.detail.speaker === 'user') onTranscript?.(event.detail);
    });
    service.addEventListener('connectionstate', event => onState?.(event.detail));
    service.addEventListener('error', event => onState?.({ state: 'ERROR', message: event.detail.message }));

    try {
        await audio.start();
        await service.start();
        audio.setStreaming(true);
    } catch (error) {
        service.stop();
        audio.stop();
        throw error;
    }

    return {
        stream: audio.stream,
        async stop() {
            audio.setStreaming(false);
            if (sentFrames && service.ready) {
                const completed = new Promise(resolve => service.addEventListener('turnComplete', resolve, { once: true }));
                service.endAudio();
                await Promise.race([completed, new Promise(resolve => setTimeout(resolve, 2000))]);
            }
            service.stop();
            audio.stop();
        }
    };
}

if (!globalThis.__disableVoiceStudioLive) globalThis.startVoiceStudioLiveTranscription = startVoiceStudioLiveTranscription;
