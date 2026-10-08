import { encodePcm, decodePcm } from './audio.mjs';

export class AudioEngine extends EventTarget {
    constructor({ workletUrl = new URL('./pcm-worklet.mjs', import.meta.url), maxQueuedSeconds = 20, localInterruption = false } = {}) {
        super();
        this.workletUrl = workletUrl;
        this.maxQueuedSeconds = maxQueuedSeconds;
        this.localInterruption = localInterruption;
        this.sources = new Set();
        this.generation = 0;
        this.muted = false;
        this.streaming = false;
        this.nextPlayback = 0;
    }

    emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

    async start() {
        if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || !globalThis.AudioWorkletNode) {
            throw new Error('HTTPS에서 최신 Chrome, Edge 또는 Safari로 접속해주세요.');
        }
        this.stop();
        const generation = this.generation;
        const context = new AudioContext({ latencyHint: 'interactive' });
        this.context = context;
        try {
            await context.resume();
            await context.audioWorklet.addModule(this.workletUrl);
            if (generation !== this.generation) return;
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: { ideal: 16000 }, channelCount: 1,
                    echoCancellation: true, noiseSuppression: true, autoGainControl: true
                }
            });
            if (generation !== this.generation) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            this.stream = stream;
            stream.getAudioTracks()[0].onended = () => this.emit('error', new Error('마이크 연결이 종료되었습니다. 마이크를 확인해주세요.'));
            this.inputAnalyser = context.createAnalyser();
            this.outputAnalyser = context.createAnalyser();
            for (const analyser of [this.inputAnalyser, this.outputAnalyser]) {
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.82;
            }
            this.inputBins = new Uint8Array(this.inputAnalyser.frequencyBinCount);
            this.outputBins = new Uint8Array(this.outputAnalyser.frequencyBinCount);
            this.outputAnalyser.connect(context.destination);
            this.microphone = context.createMediaStreamSource(stream);
            this.processor = new AudioWorkletNode(context, 'microphone-pcm', {
                channelCount: 1, channelCountMode: 'explicit', outputChannelCount: [1]
            });
            this.silence = context.createGain();
            this.silence.gain.value = 0;
            this.microphone.connect(this.inputAnalyser).connect(this.processor).connect(this.silence).connect(context.destination);
            this.processor.port.onmessage = event => {
                if (!this.streaming || this.muted || generation !== this.generation) return;
                if (event.data.type === 'speech') {
                    if (this.localInterruption && this.sources.size) {
                        this.interrupt();
                        this.emit('interrupted');
                    }
                } else if (event.data instanceof Float32Array) this.emit('pcm', encodePcm(event.data));
            };
        } catch (error) {
            if (generation !== this.generation) return;
            this.stop();
            const messages = {
                NotAllowedError: '마이크 권한이 허용되지 않았습니다. 주소창의 마이크 권한을 확인해주세요.',
                NotFoundError: '마이크를 찾을 수 없습니다. 입력 장치를 연결해주세요.',
                NotReadableError: '다른 앱이 마이크를 사용 중입니다. 장치를 확인하고 다시 시작해주세요.',
                OverconstrainedError: '이 마이크의 오디오 설정을 지원하지 않습니다. 다른 입력 장치를 선택해주세요.'
            };
            throw new Error(messages[error.name] || error.message);
        }
    }

    setStreaming(enabled) { this.streaming = enabled; }

    async testSpeaker() {
        const ownsContext = !this.context || this.context.state === 'closed';
        const context = ownsContext ? new AudioContext({ latencyHint: 'interactive' }) : this.context;
        try {
            await context.resume();
            if (context.state !== 'running') throw new Error('음성 재생이 차단됐습니다. 브라우저 소리 권한을 확인해주세요.');
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.frequency.value = 660;
            const now = context.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
            gain.gain.setValueAtTime(0.12, now + 0.25);
            gain.gain.linearRampToValueAtTime(0, now + 0.35);
            oscillator.connect(gain).connect(context.destination);
            await new Promise(resolve => {
                oscillator.onended = resolve;
                oscillator.start(now);
                oscillator.stop(now + 0.36);
            });
            oscillator.disconnect();
            gain.disconnect();
        } finally {
            if (ownsContext) await context.close();
        }
    }

    setMuted(muted) {
        this.muted = muted;
        this.stream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
        this.processor?.port.postMessage({ type: 'reset' });
    }

    play(data, mimeType = 'audio/pcm;rate=24000') {
        const context = this.context;
        if (!context || context.state === 'closed') return;
        if (context.state !== 'running') this.emit('blocked');
        const samples = decodePcm(data);
        if (!samples.length) return;
        const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] || 24000);
        if (rate < 8000 || rate > 96000) throw new Error('지원되지 않는 음성 형식입니다.');
        if (this.nextPlayback - context.currentTime > this.maxQueuedSeconds) throw new Error('음성 재생이 지연되었습니다. 연결을 다시 시작해주세요.');
        const buffer = context.createBuffer(1, samples.length, rate);
        buffer.copyToChannel(samples, 0);
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.connect(gain).connect(this.outputAnalyser);
        const start = Math.max(this.nextPlayback, context.currentTime + (this.sources.size ? 0.005 : 0.04));
        if (!this.sources.size) {
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(1, start + Math.min(0.003, buffer.duration / 2));
        }
        const entry = { source, gain };
        this.sources.add(entry);
        source.onended = () => {
            source.disconnect();
            gain.disconnect();
            if (this.sources.delete(entry) && !this.sources.size) this.emit('drained');
        };
        this.nextPlayback = start + buffer.duration;
        source.start(start);
        this.emit('playing');
    }

    interrupt() {
        const now = this.context?.currentTime || 0;
        for (const { source, gain } of this.sources) {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.005);
            source.stop(now + 0.005);
        }
        this.sources.clear();
        this.nextPlayback = 0;
    }

    levels() {
        this.inputAnalyser?.getByteFrequencyData(this.inputBins);
        this.outputAnalyser?.getByteFrequencyData(this.outputBins);
        return { input: this.muted ? undefined : this.inputBins, output: this.outputBins };
    }

    stop() {
        this.generation++;
        this.streaming = false;
        this.muted = false;
        this.interrupt();
        if (this.processor) {
            this.processor.port.onmessage = null;
            this.processor.port.close();
            this.processor.disconnect();
        }
        this.microphone?.disconnect();
        this.silence?.disconnect();
        this.inputAnalyser?.disconnect();
        this.outputAnalyser?.disconnect();
        this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
        this.context?.close().catch(() => { });
        this.context = this.stream = this.microphone = this.processor = this.silence = undefined;
        this.inputAnalyser = this.outputAnalyser = this.inputBins = this.outputBins = undefined;
    }
}