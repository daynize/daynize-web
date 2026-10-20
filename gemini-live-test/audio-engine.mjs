import { encodePcm, decodePcm } from './audio.mjs';

// Mobile Safari / in-app browsers throw "Overload resolution failed" when
// connect() receives a missing node or the context is already closed, so every
// connection goes through these guards.
function connectNodes(context, ...nodes) {
    if (!context || context.state === 'closed') throw new Error('오디오 장치가 종료되었습니다. 다시 연결해주세요.');
    if (context.state !== 'running') context.resume?.().catch(() => { });
    for (let index = 0; index < nodes.length - 1; index++) {
        if (!nodes[index] || !nodes[index + 1]) throw new Error('오디오 연결이 아직 준비되지 않았습니다.');
        try { nodes[index].connect(nodes[index + 1]); }
        catch (error) { throw new Error(`오디오 연결에 실패했습니다. 다시 연결해주세요. (${error.message})`); }
    }
}

function safely(action) {
    try { return action(); } catch { return undefined; }
}

function safeDisconnect(node) {
    if (node) safely(() => node.disconnect());
}

function safeCloseContext(context) {
    if (!context || context.state === 'closed') return;
    try { Promise.resolve(context.close()).catch(() => { }); } catch { /* already closed */ }
}

export class AudioEngine extends EventTarget {
    // Playback queue policy. Gemini may send audio faster than real time, so a deep queue is
    // normal and is never cut up. Only a stalled-network backlog is handled:
    //  - above catchUpAfterSeconds the queue plays slightly faster to catch up;
    //  - above maxQueuedSeconds the stale audio is skipped so the tutor never talks seconds late;
    //  - startLeadSeconds gives a restart after an empty queue a tiny safety margin against glitches.
    constructor({ workletUrl = new URL('./pcm-worklet.mjs', import.meta.url), maxQueuedSeconds = 8, catchUpAfterSeconds = 4, maxCatchUpRate = 1.15, startLeadSeconds = 0.04, localInterruption = false } = {}) {
        super();
        this.workletUrl = workletUrl;
        this.maxQueuedSeconds = maxQueuedSeconds;
        this.catchUpAfterSeconds = catchUpAfterSeconds;
        this.maxCatchUpRate = maxCatchUpRate;
        this.startLeadSeconds = startLeadSeconds;
        this.stats = { chunks: 0, maxBacklog: 0, skipped: 0 };
        this.localInterruption = localInterruption;
        this.sources = new Set();
        this.generation = 0;
        this.muted = false;
        this.streaming = false;
        this.nextPlayback = 0;
        this.speakerMuted = false;
        this.playbackRate = 1;
        this.active = false;
    }

    // True while any chunk is queued/playing on a running context.
    get outputActive() {
        return this.sources.size > 0 && this.context?.state === 'running';
    }

    // Seconds of tutor audio scheduled but not yet played.
    get queuedSeconds() {
        return this.context ? Math.max(0, this.nextPlayback - this.context.currentTime) : 0;
    }

    emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

    async start() {
        if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || !globalThis.AudioWorkletNode) {
            throw new Error('HTTPS에서 최신 Chrome, Edge 또는 Safari로 접속해주세요.');
        }
        this.stop();
        this.active = true;
        this.stats = { chunks: 0, maxBacklog: 0, skipped: 0 };
        const generation = this.generation;
        const context = new (globalThis.AudioContext || globalThis.webkitAudioContext)({ latencyHint: 'interactive' });
        this.context = context;
        // iOS may suspend/interrupt the context at any time (call, lock screen,
        // tab switch); try to recover instead of leaving a dead graph behind.
        context.onstatechange = () => {
            if (generation !== this.generation) return;
            if (context.state === 'suspended' || context.state === 'interrupted') context.resume().catch(() => { });
            else if (context.state === 'closed' && this.active) void this.reinitialize();
        };
        try {
            // The playback graph is built synchronously, before any await (mic permission,
            // worklet download), so the tutor's very first audio chunk always has an output
            // path and plays immediately instead of waiting for the microphone.
            this.outputAnalyser = context.createAnalyser();
            this.outputAnalyser.fftSize = 256;
            this.outputAnalyser.smoothingTimeConstant = 0.94;
            this.outputBins = new Uint8Array(this.outputAnalyser.frequencyBinCount);
            this.outputSamples = new Float32Array(this.outputAnalyser.fftSize);
            this.outputGain = context.createGain();
            this.outputGain.gain.value = this.speakerMuted ? 0 : 1;
            connectNodes(context, this.outputAnalyser, this.outputGain);
            // iOS Safari (and some Android Chrome builds) route raw AudioContext
            // output to the call receiver/earpiece while a getUserMedia mic stream
            // is active. Routing through a real <audio> element forces playback
            // through the main loudspeaker instead.
            const sinkDestination = context.createMediaStreamDestination();
            connectNodes(context, this.outputGain, sinkDestination);
            const sinkElement = new Audio();
            sinkElement.autoplay = true;
            sinkElement.playsInline = true;
            sinkElement.setAttribute('playsinline', '');
            sinkElement.srcObject = sinkDestination.stream;
            this.sinkElement = sinkElement;
            // Started inside the user-gesture call stack; if blocked, the next gesture unlocks it.
            sinkElement.play().catch(() => { });
            await context.resume();
            if (context.state === 'closed') throw new Error('오디오 장치가 종료되었습니다. 다시 연결해주세요.');
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
            const [audioTrack] = stream.getAudioTracks();
            if (!audioTrack) {
                const missing = new Error('마이크를 찾을 수 없습니다. 입력 장치를 연결해주세요.');
                missing.name = 'NotFoundError';
                throw missing;
            }
            audioTrack.onended = () => this.emit('error', new Error('마이크 연결이 종료되었습니다. 마이크를 확인해주세요.'));
            this.inputAnalyser = context.createAnalyser();
            this.inputAnalyser.fftSize = 256;
            this.inputAnalyser.smoothingTimeConstant = 0.94;
            this.inputBins = new Uint8Array(this.inputAnalyser.frequencyBinCount);
            this.inputSamples = new Float32Array(this.inputAnalyser.fftSize);
            this.microphone = context.createMediaStreamSource(stream);
            this.processor = new AudioWorkletNode(context, 'microphone-pcm', {
                channelCount: 1, channelCountMode: 'explicit', outputChannelCount: [1]
            });
            this.silence = context.createGain();
            this.silence.gain.value = 0;
            connectNodes(context, this.microphone, this.inputAnalyser, this.processor, this.silence, context.destination);
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

    // Called from touch/click/visibility handlers: resumes a suspended or
    // iOS-"interrupted" context, and rebuilds the graph if the OS closed it.
    unlock() {
        const context = this.context;
        if (context && context.state !== 'closed') {
            if (context.state !== 'running') context.resume().catch(() => { });
            this.sinkElement?.play().catch(() => { });
        } else if (this.active && !this.reinitializing) void this.reinitialize();
    }

    async reinitialize() {
        if (this.reinitializing || !this.active) return;
        this.reinitializing = true;
        const { streaming, muted } = this;
        try {
            await this.start();
            this.setMuted(muted);
            this.setStreaming(streaming);
        } catch (error) {
            this.emit('error', error);
        } finally {
            this.reinitializing = false;
        }
    }

    setStreaming(enabled) {
        if (this.streaming !== enabled) this.processor?.port.postMessage({ type: 'reset' });
        this.streaming = enabled;
    }

    inputVolume() {
        if (this.muted || !this.inputAnalyser || !this.inputSamples) return 0;
        this.inputAnalyser.getFloatTimeDomainData(this.inputSamples);
        return Math.sqrt(this.inputSamples.reduce((sum, sample) => sum + sample * sample, 0) / this.inputSamples.length);
    }

    outputVolume() {
        if (this.speakerMuted || !this.outputAnalyser || !this.outputSamples) return 0;
        this.outputAnalyser.getFloatTimeDomainData(this.outputSamples);
        return Math.sqrt(this.outputSamples.reduce((sum, sample) => sum + sample * sample, 0) / this.outputSamples.length);
    }

    setSpeakerMuted(muted) {
        this.speakerMuted = muted;
        if (this.outputGain && this.context) this.outputGain.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.015);
    }

    setPlaybackRate(rate) {
        if (!Number.isFinite(rate) || rate < 0.8 || rate > 1.2) throw new Error('재생 속도 범위를 확인해주세요.');
        this.playbackRate = rate;
        if (this.sources.size) this.interrupt();
    }

    async testSpeaker() {
        const ownsContext = !this.context || this.context.state === 'closed';
        const context = ownsContext ? new AudioContext({ latencyHint: 'interactive' }) : this.context;
        try {
            await context.resume();
            if (!ownsContext) await this.sinkElement?.play().catch(() => { });
            if (context.state !== 'running') throw new Error('음성 재생이 차단됐습니다. 브라우저 소리 권한을 확인해주세요.');
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.frequency.value = 660;
            const now = context.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
            gain.gain.setValueAtTime(0.12, now + 0.25);
            gain.gain.linearRampToValueAtTime(0, now + 0.35);
            // Reuse the real output sink (the <audio> element routing fix for
            // iOS earpiece/receiver audio) so the test tone proves the same path
            // the AI voice will play through, instead of bypassing it.
            connectNodes(context, oscillator, gain, ownsContext || !this.outputAnalyser ? context.destination : this.outputAnalyser);
            await new Promise(resolve => {
                oscillator.onended = resolve;
                oscillator.start(now);
                oscillator.stop(now + 0.36);
            });
            safeDisconnect(oscillator);
            safeDisconnect(gain);
        } finally {
            if (ownsContext) safeCloseContext(context);
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
        if (context.state !== 'running') {
            // Middleware: the first audio chunk after a suspend (mobile tab
            // backgrounding, screen lock, delayed gesture propagation) retries
            // resume automatically instead of requiring another manual tap.
            context.resume().catch(() => { });
            this.sinkElement?.play().catch(() => { });
            this.emit('blocked');
        }
        const samples = decodePcm(data);
        if (!samples.length) return;
        const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] || 24000);
        if (rate < 8000 || rate > 96000) throw new Error('지원되지 않는 음성 형식입니다.');
        if (this.queuedSeconds > this.maxQueuedSeconds) {
            this.stats.skipped++;
            this.emit('skipped', { seconds: this.queuedSeconds });
            this.interrupt();
        }
        // The context is created before the analyser/gain graph is ready
        // (getUserMedia is still pending) and is torn down by stop(); drop
        // chunks in that window instead of connecting to a missing node.
        if (!this.outputAnalyser) return;
        const buffer = context.createBuffer(1, samples.length, rate);
        buffer.copyToChannel(samples, 0);
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        const backlog = this.queuedSeconds;
        const rateNow = this.playbackRate * (backlog > this.catchUpAfterSeconds ? this.maxCatchUpRate : 1);
        if (source.playbackRate) source.playbackRate.value = rateNow;
        const duration = buffer.duration / rateNow;
        try { connectNodes(context, source, gain, this.outputAnalyser); }
        catch (error) {
            safeDisconnect(source);
            safeDisconnect(gain);
            if (context.state === 'closed' || !this.outputAnalyser) return;
            throw error;
        }
        const isFirstChunk = !this.sources.size;
        const start = this.nextPlayback <= context.currentTime ? context.currentTime + this.startLeadSeconds : this.nextPlayback;
        if (isFirstChunk) {
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(1, start + Math.min(0.003, buffer.duration / 2));
        }
        const entry = { source, gain };
        this.sources.add(entry);
        source.onended = () => {
            safeDisconnect(source);
            safeDisconnect(gain);
            if (this.sources.delete(entry) && !this.sources.size) this.emit('drained');
        };
        this.nextPlayback = start + duration;
        try { source.start(start); }
        catch (error) {
            this.sources.delete(entry);
            safeDisconnect(source);
            safeDisconnect(gain);
            throw error;
        }
        this.stats.chunks++;
        this.stats.maxBacklog = Math.max(this.stats.maxBacklog, backlog);
        this.emit('playing', { backlog, rate: rateNow });
    }

    interrupt() {
        const now = this.context?.currentTime || 0;
        for (const { source, gain } of this.sources) {
            safely(() => {
                gain.gain.cancelScheduledValues(now);
                gain.gain.setValueAtTime(gain.gain.value, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.005);
            });
            safely(() => source.stop(now + 0.005));
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
        this.active = false;
        this.interrupt();
        if (this.processor) {
            safely(() => { this.processor.port.onmessage = null; });
            safely(() => this.processor.port.close());
            safeDisconnect(this.processor);
        }
        safeDisconnect(this.microphone);
        safeDisconnect(this.silence);
        safeDisconnect(this.inputAnalyser);
        safeDisconnect(this.outputAnalyser);
        safeDisconnect(this.outputGain);
        if (this.sinkElement) {
            safely(() => this.sinkElement.pause());
            safely(() => { this.sinkElement.srcObject = null; });
        }
        this.sinkElement = undefined;
        this.stream?.getTracks().forEach(track => safely(() => { track.onended = null; track.stop(); }));
        if (this.context) {
            this.context.onstatechange = null;
            safeCloseContext(this.context);
        }
        this.context = this.stream = this.microphone = this.processor = this.silence = undefined;
        this.inputAnalyser = this.outputAnalyser = this.inputBins = this.outputBins = undefined;
        this.outputGain = undefined;
        this.inputSamples = undefined;
        this.outputSamples = undefined;
    }
}