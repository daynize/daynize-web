export const TUTOR_INSTRUCTION = 'You are a warm, patient, and empathetic English conversation tutor for senior learners on Daynize (데이나이즈). Speak clearly, concisely, and encouragingly in a gentle tone. Mix Korean explanations when helpful, but encourage natural English conversation.';

export function createSetup(model = 'gemini-2.5-flash-native-audio-latest', voice = 'Kore') {
    return {
        setup: {
            model: model.startsWith('models/') ? model : `models/${model}`,
            generationConfig: {
                responseModalities: ['AUDIO'],
                thinkingConfig: { thinkingBudget: 0 },
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
            },
            systemInstruction: { parts: [{ text: TUTOR_INSTRUCTION }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            realtimeInputConfig: {
                automaticActivityDetection: {
                    disabled: false,
                    startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
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

export const CONNECTION_STATES = Object.freeze({ CONNECTING: 'CONNECTING', CONNECTED: 'CONNECTED', DISCONNECTED: 'DISCONNECTED', RECONNECTING: 'RECONNECTING' });

export function resolveWebSocketUrl({ endpoint, env = globalThis.process?.env, config = globalThis.DAYNIZE_CONFIG, page = globalThis.location } = {}) {
    const configured = endpoint || config?.wsUrl || env?.NEXT_PUBLIC_WS_URL || env?.WS_URL;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(page?.hostname);
    const fallback = local || page?.hostname?.endsWith('.trycloudflare.com')
        ? `${page.protocol === 'https:' ? 'wss:' : 'ws:'}//${page.host}/ws/gemini-live`
        : (page && page.protocol !== 'file:') || env?.NODE_ENV === 'production' ? 'wss://api.daynize.co.kr/ws/gemini-live' : 'ws://localhost:8080/ws/gemini-live';
    const url = new URL(configured || fallback);
    if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('WebSocket 주소를 확인해주세요.');
    if (page?.protocol === 'https:' && url.protocol !== 'wss:') throw new Error('HTTPS 페이지에는 보안 WebSocket(WSS) 주소가 필요합니다.');
    return url.toString();
}

export class LiveService extends EventTarget {
    constructor({ endpoint, mode = 'proxy', apiKey, model, voice = 'Kore', protocol = 'audio', maxRetries = 10, retryDelay = 1000, maxRetryDelay = 30000, timeout = 20000, heartbeatInterval = 20000, heartbeatTimeout = 10000, onConnectionState, WebSocketClass = globalThis.WebSocket } = {}) {
        super();
        if (!Number.isInteger(maxRetries) || maxRetries < 0 || [retryDelay, maxRetryDelay, timeout, heartbeatInterval, heartbeatTimeout].some(value => !Number.isFinite(value) || value <= 0)) throw new TypeError('Invalid connection retry or timeout options.');
        this.options = { endpoint, mode, apiKey, model, voice, protocol, maxRetries, retryDelay, maxRetryDelay, timeout, heartbeatInterval, heartbeatTimeout };
        this.onConnectionState = onConnectionState;
        this.connectionState = CONNECTION_STATES.DISCONNECTED;
        this.Socket = WebSocketClass;
        this.ready = false;
        this.active = false;
        this.generation = 0;
        this.retries = 0;
        this.pingSequence = 0;
    }

    emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

    setConnectionState(state, detail = {}) {
        this.connectionState = state;
        this.emit('connectionstate', { state, attempt: this.retries, ...detail });
        this.onConnectionState?.({ state, attempt: this.retries, ...detail });
    }

    clearHeartbeat() {
        clearInterval(this.heartbeatTimer);
        clearTimeout(this.pongTimer);
        this.heartbeatTimer = this.pongTimer = undefined;
        this.pendingPing = undefined;
    }

    start() {
        this.stop();
        this.active = true;
        this.retries = 0;
        this.setConnectionState(CONNECTION_STATES.CONNECTING);
        return new Promise((resolve, reject) => {
            this.resolveStart = resolve;
            this.rejectStart = reject;
            this.open(this.generation).catch(() => { });
        });
    }

    open(generation) {
        return new Promise((resolve, reject) => {
            let url;
            try {
                url = new URL(resolveWebSocketUrl({ endpoint: this.options.endpoint }));
                if (this.options.mode === 'direct') {
                    if (!this.options.apiKey) throw new Error('직접 테스트 모드에는 임시 테스트 키가 필요합니다.');
                    url.searchParams.set('key', this.options.apiKey);
                } else {
                    url.searchParams.set('voice', this.options.voice);
                }
                this.socket = new this.Socket(url.toString());
            } catch (error) {
                this.active = false;
                this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
                this.rejectStart?.(error);
                this.resolveStart = this.rejectStart = undefined;
                this.emit('error', error);
                reject(error);
                return;
            }
            const socket = this.socket;
            let settled = false;
            let closed = false;
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
                disconnect('Setup timeout');
            }, this.options.timeout);
            this.cancelPending = () => settle(new Error('연결이 취소되었습니다.'));
            const current = () => !closed && this.active && generation === this.generation && socket === this.socket;
            const disconnect = reason => {
                try { socket.close(4001, reason); }
                finally { socket.onclose({ code: 4001 }); }
            };
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
                    if (message.type === 'pong') {
                        if (message.id === this.pendingPing) {
                            clearTimeout(this.pongTimer);
                            this.pongTimer = this.pendingPing = undefined;
                        }
                        return;
                    }
                    if (message.error) {
                        if (message.error.retryable) {
                            connectionError = new Error(message.error.message || '음성 연결을 다시 시도하고 있습니다.');
                            disconnect('Transient upstream error');
                            return;
                        }
                        fatal = true;
                        throw new Error(message.error.message || '음성 서비스에서 오류가 발생했습니다.');
                    }
                    if (message.setupComplete) {
                        if (this.ready) return;
                        this.ready = true;
                        this.retries = 0;
                        settle();
                        this.resolveStart?.();
                        this.resolveStart = this.rejectStart = undefined;
                        this.setConnectionState(CONNECTION_STATES.CONNECTED);
                        this.emit('state', 'ready');
                        if (current() && this.options.mode !== 'direct') this.heartbeatTimer = setInterval(() => {
                            if (!current() || !this.ready || this.pendingPing !== undefined) return;
                            this.pendingPing = ++this.pingSequence;
                            this.pongTimer = setTimeout(() => {
                                connectionError = new Error('서버 응답이 없어 다시 연결합니다.');
                                disconnect('Heartbeat timeout');
                            }, this.options.heartbeatTimeout);
                            try { socket.send(JSON.stringify({ type: 'ping', id: this.pendingPing })); }
                            catch { disconnect('Heartbeat send failed'); }
                        }, this.options.heartbeatInterval);
                    }
                    const content = message.serverContent;
                    if (content?.inputTranscription?.text) this.emit('transcript', { speaker: 'user', ...content.inputTranscription });
                    if (content?.outputTranscription?.text) this.emit('transcript', { speaker: 'tutor', ...content.outputTranscription });
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
                    this.rejectStart?.(error);
                    this.resolveStart = this.rejectStart = undefined;
                    this.emit('error', error);
                    disconnect('Fatal protocol error');
                }
            };
            socket.onerror = () => {
                if (!current()) return;
                connectionError = new Error('음성 서버에 연결할 수 없습니다. 네트워크와 로그인을 확인해주세요.');
                disconnect('Network error');
            };
            socket.onclose = event => {
                if (!current()) return;
                closed = true;
                this.ready = false;
                this.clearHeartbeat();
                settle(connectionError || new Error('음성 연결이 끊어졌습니다.'));
                this.reconnectRequested = false;
                if (!fatal && event.code !== 1008 && this.retries < this.options.maxRetries) {
                    const delay = Math.min(this.options.maxRetryDelay, this.options.retryDelay * 2 ** this.retries++);
                    this.setConnectionState(CONNECTION_STATES.RECONNECTING, { delay });
                    this.emit('state', 'reconnecting');
                    this.retryTimer = setTimeout(() => {
                        this.retryTimer = undefined;
                        if (this.active && generation === this.generation) this.open(generation).catch(() => { });
                    }, delay);
                } else {
                    this.active = false;
                    const error = connectionError || new Error('연결이 종료되었습니다. 다시 시작해주세요.');
                    this.rejectStart?.(error);
                    this.resolveStart = this.rejectStart = undefined;
                    this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
                    this.emit('state', 'closed');
                    if (!fatal) this.emit('error', error);
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
        this.clearHeartbeat();
        this.cancelPending?.();
        this.cancelPending = undefined;
        this.rejectStart?.(new Error('연결이 취소되었습니다.'));
        this.resolveStart = this.rejectStart = undefined;
        this.resumeHandle = undefined;
        this.reconnectRequested = false;
        const socket = this.socket;
        this.socket = undefined;
        if (socket && socket.readyState < 2) socket.close(1000, 'User ended call');
        if (this.connectionState !== CONNECTION_STATES.DISCONNECTED) {
            this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
            this.emit('state', 'closed');
        }
    }
}