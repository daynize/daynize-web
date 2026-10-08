export const TUTOR_INSTRUCTION = 'You are a warm, patient, and empathetic English conversation tutor for senior learners on Daynize (데이나이즈). Speak clearly, concisely, and encouragingly in a gentle tone. Mix Korean explanations when helpful, but encourage natural English conversation.';

export function createSetup(model = 'gemini-2.5-flash-native-audio-latest', voice = 'Kore') {
    return {
        setup: {
            model: model.startsWith('models/') ? model : `models/${model}`,
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
            },
            systemInstruction: { parts: [{ text: TUTOR_INSTRUCTION }] },
            realtimeInputConfig: {
                automaticActivityDetection: {
                    disabled: false,
                    startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
                    endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                    prefixPaddingMs: 200,
                    silenceDurationMs: 450
                }
            },
            sessionResumption: {},
            contextWindowCompression: { slidingWindow: {} }
        }
    };
}

export class LiveService extends EventTarget {
    constructor({ endpoint, mode = 'proxy', apiKey, model, voice = 'Kore', protocol = 'audio', maxRetries = 3, retryDelay = 1000, timeout = 20000, WebSocketClass = globalThis.WebSocket } = {}) {
        super();
        this.options = { endpoint, mode, apiKey, model, voice, protocol, maxRetries, retryDelay, timeout };
        this.Socket = WebSocketClass;
        this.ready = false;
        this.active = false;
        this.generation = 0;
        this.retries = 0;
    }

    emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

    async start() {
        this.stop();
        this.active = true;
        this.retries = 0;
        return this.open(this.generation);
    }

    open(generation) {
        return new Promise((resolve, reject) => {
            let url;
            try {
                url = new URL(this.options.endpoint);
                if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('WebSocket 주소를 확인해주세요.');
                if (this.options.mode === 'direct') {
                    if (!this.options.apiKey) throw new Error('직접 테스트 모드에는 임시 테스트 키가 필요합니다.');
                    url.searchParams.set('key', this.options.apiKey);
                }
                this.socket = new this.Socket(url.toString());
            } catch (error) { reject(error); return; }
            const socket = this.socket;
            let settled = false;
            let fatal = false;
            let connectionError;
            const settle = error => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this.cancelPending = undefined;
                if (error) reject(error); else resolve();
            };
            const timer = setTimeout(() => {
                connectionError = new Error('연결 시간이 초과되었습니다. 다시 시도해주세요.');
                socket.close(4001, 'Setup timeout');
            }, this.options.timeout);
            this.cancelPending = () => settle(new Error('연결이 취소되었습니다.'));
            const current = () => this.active && generation === this.generation && socket === this.socket;
            socket.onopen = () => {
                if (!current()) return;
                if (this.options.mode === 'direct') {
                    const setup = createSetup(this.options.model, this.options.voice);
                    if (this.resumeHandle) setup.setup.sessionResumption.handle = this.resumeHandle;
                    socket.send(JSON.stringify(setup));
                }
            };
            socket.onmessage = async event => {
                if (!current()) return;
                try {
                    const text = typeof event.data === 'string' ? event.data : await event.data.text();
                    if (!current()) return;
                    const message = JSON.parse(text);
                    if (message.error) {
                        if (message.error.retryable) {
                            connectionError = new Error(message.error.message || '음성 연결을 다시 시도하고 있습니다.');
                            socket.close(4001, 'Transient upstream error');
                            return;
                        }
                        fatal = true;
                        throw new Error(message.error.message || '음성 서비스에서 오류가 발생했습니다.');
                    }
                    if (message.setupComplete) {
                        this.ready = true;
                        settle();
                        this.emit('state', 'ready');
                    }
                    const content = message.serverContent;
                    if (content?.interrupted) this.emit('interrupted');
                    for (const part of content?.modelTurn?.parts || []) {
                        if (part.inlineData?.mimeType?.startsWith('audio/pcm')) this.emit('audio', part.inlineData);
                    }
                    if (content?.turnComplete) this.emit('turnComplete');
                    if (message.sessionResumptionUpdate?.resumable) this.resumeHandle = message.sessionResumptionUpdate.newHandle;
                    if (message.goAway) {
                        this.reconnectRequested = true;
                        socket.close(1000, 'Session renewal');
                    }
                } catch (error) {
                    fatal = true;
                    settle(error);
                    this.emit('error', error);
                    socket.close();
                }
            };
            socket.onerror = () => {
                if (!current()) return;
                connectionError = new Error('음성 서버에 연결할 수 없습니다. 네트워크와 로그인을 확인해주세요.');
            };
            socket.onclose = event => {
                if (!current()) return;
                this.ready = false;
                settle(connectionError || new Error('음성 연결이 끊어졌습니다.'));
                const renewable = this.reconnectRequested;
                this.reconnectRequested = false;
                if (!fatal && (renewable || ![1000, 1008].includes(event.code)) && this.retries < this.options.maxRetries) {
                    const delay = this.options.retryDelay * 2 ** this.retries++;
                    this.emit('state', 'reconnecting');
                    this.retryTimer = setTimeout(() => {
                        this.retryTimer = undefined;
                        if (this.active && generation === this.generation) this.open(generation).catch(() => { });
                    }, delay);
                } else {
                    this.active = false;
                    this.emit('state', 'closed');
                    if (!fatal) this.emit('error', new Error('연결이 종료되었습니다. 다시 시작해주세요.'));
                }
            };
        });
    }

    sendAudio(data) {
        if (!this.ready || this.socket?.readyState !== this.Socket.OPEN) return false;
        if (this.socket.bufferedAmount > 256 * 1024) {
            this.socket.close(4001, 'Audio backpressure');
            return false;
        }
        const audio = { mimeType: 'audio/pcm;rate=16000', data };
        const message = this.options.protocol === 'media_chunks'
            ? { realtime_input: { media_chunks: [{ mime_type: audio.mimeType, data }] } }
            : { realtimeInput: { audio } };
        this.socket.send(JSON.stringify(message));
        return true;
    }

    endAudio() {
        if (this.ready) this.socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    }

    requestGreeting() {
        if (!this.ready || this.socket?.readyState !== this.Socket.OPEN) return false;
        this.socket.send(JSON.stringify({
            clientContent: {
                turns: [{ role: 'user', parts: [{ text: 'Please greet me warmly in one short English sentence, then wait for me to speak.' }] }],
                turnComplete: true
            }
        }));
        return true;
    }

    stop() {
        this.active = this.ready = false;
        this.generation++;
        clearTimeout(this.retryTimer);
        this.retryTimer = undefined;
        this.cancelPending?.();
        this.cancelPending = undefined;
        this.resumeHandle = undefined;
        this.reconnectRequested = false;
        const socket = this.socket;
        this.socket = undefined;
        if (socket && socket.readyState < 2) socket.close(1000, 'User ended call');
    }
}