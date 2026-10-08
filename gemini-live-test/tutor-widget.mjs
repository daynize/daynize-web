import { AudioEngine } from './audio-engine.mjs';
import { LiveService } from './live-service.mjs';

const asset = name => new URL(name, import.meta.url).href;
const STATES = {
    idle: ['대화 준비', '오늘은 어떤 이야기를 나눠볼까요?'],
    connecting: ['연결 중', '마이크와 선생님을 연결하고 있어요.'],
    listening: ['듣는 중', '편안하게 말씀해주세요.'],
    speaking: ['선생님이 말하는 중', '천천히 함께 이야기해요.'],
    muted: ['마이크 꺼짐', '말씀하시려면 마이크를 켜주세요.'],
    waiting: ['답변 기다리는 중', '선생님의 음성 답변을 기다리고 있어요.'],
    blocked: ['음성 재생 일시 중지', '스피커 확인 버튼을 눌러 소리를 활성화해주세요.'],
    reconnecting: ['다시 연결 중', '잠시만 기다려주세요.'],
    error: ['연결 확인 필요', '연결을 다시 시작해주세요.'],
    ended: ['대화 종료', '오늘도 함께 이야기해서 반가웠어요.']
};

export class DaynizeVoiceTutor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.audio = new AudioEngine();
        this.generation = 0;
        this.callActive = false;
        this.duration = 0;
        this.bargeIn = false;
    }

    connectedCallback() {
        if (this.initialized) return;
        this.initialized = true;
        this.abort = new AbortController();
        const signal = this.abort.signal;
        const icon = (name, light = false) => `<img class="icon${light ? ' light' : ''}" src="${asset(`icons/${name}.svg`)}" alt="" aria-hidden="true">`;
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${asset('tutor.css')}">
            <button class="launch" type="button" aria-haspopup="dialog">${icon('mic', true)}<span>AI 음성 회화 시작하기</span></button>
            <dialog aria-labelledby="tutor-title" aria-describedby="privacy">
                <header class="head"><div class="traffic-lights"><button class="traffic close" type="button" aria-label="닫기" title="닫기">${icon('x')}</button><button class="traffic minimize" type="button" aria-label="최소화" title="최소화"><span aria-hidden="true">−</span></button><button class="traffic expand" type="button" aria-label="창 확장" title="창 확장" aria-pressed="false"><span aria-hidden="true">↗</span></button></div><h2 id="tutor-title">Daynize AI Live Tutor - 음성 회화</h2><span class="window-mark" aria-hidden="true">DAYNIZE</span></header>
                <section class="body">
                    <div class="status-line" role="status" aria-live="polite"><span class="status-dot" aria-hidden="true"></span><span class="status-label"></span></div>
                    <p class="message"></p>
                    <canvas class="visualizer" aria-label="마이크와 선생님 음성의 실시간 파형" role="img"></canvas>
                    <div class="legend"><span><i></i>내 목소리</span><span><i></i>선생님 목소리</span></div>
                    <p class="time">00:00</p>
                    <p class="transport" style="font-size:12px;color:var(--muted)" aria-live="off">음성 전송 0 · 수신 0</p>
                </section>
                <div class="actions">
                    <button class="action start" type="button">${icon('mic', true)}<span>대화 시작</span></button>
                    <button class="action mute" type="button" aria-label="마이크 끄기" title="마이크 끄기" aria-pressed="false" hidden>${icon('mic')}</button>
                    <button class="action end" type="button" hidden>${icon('phone-off')}<span>대화 종료</span></button>
                </div>
                <footer class="foot"><button class="icon-button speaker" type="button" aria-label="스피커 확인" title="스피커 확인">${icon('volume-2')}</button><p class="audio-check" role="status" aria-live="polite"></p><p id="privacy">대화 중 음성은 Google로 전송됩니다.<br>개인정보나 민감한 내용은 말씀하지 마세요.</p></footer>
            </dialog>`;
        const query = selector => this.shadowRoot.querySelector(selector);
        this.dialog = query('dialog');
        this.launch = query('.launch');
        this.startButton = query('.start');
        this.muteButton = query('.mute');
        this.endButton = query('.end');
        this.messageElement = query('.message');
        this.statusElement = query('.status-label');
        this.timeElement = query('.time');
        this.canvas = query('canvas');
        this.canvasContext = this.canvas.getContext('2d');
        this.resize = new ResizeObserver(() => this.resizeCanvas());
        this.resize.observe(this.canvas);
        this.launch.addEventListener('click', () => this.open(), { signal });
        query('.close').addEventListener('click', () => this.close(), { signal });
        query('.minimize').addEventListener('click', () => this.minimize(), { signal });
        query('.expand').addEventListener('click', () => {
            const expanded = this.dialog.classList.toggle('expanded');
            query('.expand').setAttribute('aria-pressed', String(expanded));
            query('.expand').setAttribute('aria-label', expanded ? '창 원래 크기' : '창 확장');
            query('.expand').title = expanded ? '창 원래 크기' : '창 확장';
        }, { signal });
        this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); }, { signal });
        this.dialog.addEventListener('click', event => {
            if (event.target !== this.dialog) return;
            const rect = this.dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
        }, { signal });
        this.startButton.addEventListener('click', () => this.begin(), { signal });
        this.muteButton.addEventListener('click', () => this.toggleMute(), { signal });
        this.endButton.addEventListener('click', () => this.end(), { signal });
        this.audio.addEventListener('pcm', event => {
            if (this.service?.sendAudio(event.detail)) {
                this.sentFrames++;
                if (this.sentFrames % 10 === 0) this.updateTransport();
            }
        }, { signal });
        this.audio.addEventListener('playing', () => this.setState('speaking'), { signal });
        this.audio.addEventListener('blocked', () => { this.playbackBlocked = true; }, { signal });
        query('.speaker').addEventListener('click', async () => {
            const button = query('.speaker');
            button.disabled = true;
            query('.audio-check').textContent = '스피커 테스트 중';
            try {
                await this.audio.testSpeaker();
                query('.audio-check').textContent = '확인음이 안 들리면 기기 음량·출력 장치·탭 음소거를 확인해주세요.';
                this.playbackBlocked = false;
                if (this.callActive) this.setState(this.audio.sources.size ? 'speaking' : this.audio.muted ? 'muted' : 'listening');
            } catch (error) { query('.audio-check').textContent = error.message; }
            finally { button.disabled = false; }
        }, { signal });
        this.audio.addEventListener('drained', () => {
            if (this.service?.ready) this.setState(this.audio.muted ? 'muted' : 'listening');
        }, { signal });
        this.audio.addEventListener('interrupted', () => {
            this.bargeIn = true;
            this.setState('listening');
        }, { signal });
        this.audio.addEventListener('error', event => this.fail(event.detail), { signal });
        window.addEventListener('pagehide', () => this.end(), { signal });
        this.setState('idle');
    }

    get endpoint() {
        return this.config?.endpoint || this.getAttribute('endpoint') ||
            (location.port === '8080' ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/gemini-live`
                : 'wss://api.daynize.co.kr/ws/gemini-live');
    }

    open() {
        if (this.dialog.open) return;
        this.minimized = false;
        this.dialog.showModal();
        this.launch.hidden = true;
        this.resizeCanvas();
        this.draw();
        (this.callActive ? this.endButton : this.startButton).focus();
    }

    minimize() {
        this.minimized = true;
        this.dialog.close();
        this.launch.hidden = false;
        cancelAnimationFrame(this.frame);
        this.updateLauncher();
        this.launch.focus();
    }

    updateLauncher() {
        this.launch.querySelector('span').textContent = this.minimized ? `AI 음성 회화${this.callActive ? ` · ${STATES[this.dataset.state][0]}` : ''}` : 'AI 음성 회화 시작하기';
    }

    close() {
        this.minimized = false;
        this.end();
        this.dialog.close();
        this.launch.hidden = false;
        this.updateLauncher();
        cancelAnimationFrame(this.frame);
        this.launch.focus();
    }

    async begin() {
        if (this.callActive) return;
        const generation = ++this.generation;
        this.callActive = true;
        this.duration = 0;
        this.sentFrames = this.receivedFrames = 0;
        this.updateTransport();
        this.bargeIn = false;
        this.timeElement.textContent = '00:00';
        this.startButton.hidden = true;
        this.endButton.hidden = false;
        this.muteButton.hidden = false;
        this.muteButton.disabled = true;
        this.setState('connecting');
        this.service = new LiveService({ ...this.config, endpoint: this.endpoint });
        const service = this.service;
        service.addEventListener('audio', event => {
            if (!this.callActive || generation !== this.generation) return;
            this.receivedFrames++;
            this.updateTransport();
            clearTimeout(this.responseTimer);
            try {
                this.audio.play(event.detail.data, event.detail.mimeType);
                if (this.playbackBlocked) this.setState('blocked');
            }
            catch (error) { this.fail(error); }
        });
        service.addEventListener('interrupted', () => {
            this.audio.interrupt();
            if (this.callActive) this.setState(this.audio.muted ? 'muted' : 'listening');
        });
        service.addEventListener('turnComplete', () => { this.bargeIn = false; });
        service.addEventListener('state', event => {
            if (generation !== this.generation) return;
            const state = event.detail;
            this.audio.setStreaming(state === 'ready');
            if (state === 'reconnecting') {
                this.audio.interrupt();
                this.bargeIn = false;
                this.muteButton.disabled = true;
                this.setState('reconnecting');
            } else if (state === 'ready') {
                this.muteButton.disabled = false;
                this.setState(this.audio.muted ? 'muted' : 'listening');
                if (!this.clock) this.clock = setInterval(() => {
                    if (service.ready && !this.audio.muted) this.duration++;
                    this.timeElement.textContent = `${String(Math.floor(this.duration / 60)).padStart(2, '0')}:${String(this.duration % 60).padStart(2, '0')}`;
                }, 1000);
            }
        });
        service.addEventListener('error', event => this.fail(event.detail));
        try {
            await this.audio.start();
            if (!this.callActive || generation !== this.generation) return;
            await service.start();
            if (generation !== this.generation || !this.callActive) return;
            if (service.requestGreeting()) {
                this.setState('waiting');
                this.responseTimer = setTimeout(() => {
                    if (generation === this.generation && !this.audio.sources.size) {
                        this.setState(this.audio.muted ? 'muted' : 'listening', '아직 음성 응답이 도착하지 않았습니다. 마이크를 켜고 말씀해주세요.');
                    }
                }, 15000);
            }
        } catch (error) {
            if (generation !== this.generation || !this.callActive || service.retryTimer) return;
            this.fail(error);
        }
    }

    toggleMute() {
        const muted = !this.audio.muted;
        this.audio.setMuted(muted);
        if (muted) this.service.endAudio();
        this.muteButton.setAttribute('aria-pressed', String(muted));
        const label = muted ? '마이크 켜기' : '마이크 끄기';
        this.muteButton.setAttribute('aria-label', label);
        this.muteButton.title = label;
        this.muteButton.querySelector('img').src = asset(`icons/${muted ? 'mic-off' : 'mic'}.svg`);
        if (!this.audio.sources.size) this.setState(muted ? 'muted' : 'listening');
        this.updateTransport();
    }

    updateTransport() {
        this.shadowRoot.querySelector('.transport').textContent = `음성 전송 ${this.sentFrames || 0} · 수신 ${this.receivedFrames || 0}${this.audio.muted ? ' · 마이크 일시 정지 (연결 유지)' : ''}`;
    }

    end() {
        this.generation++;
        this.callActive = false;
        this.service?.stop();
        this.service = undefined;
        this.audio.stop();
        clearInterval(this.clock);
        clearTimeout(this.responseTimer);
        this.playbackBlocked = false;
        this.clock = undefined;
        if (!this.initialized) return;
        this.startButton.hidden = false;
        this.startButton.querySelector('span').textContent = '다시 대화하기';
        this.muteButton.hidden = this.endButton.hidden = true;
        this.muteButton.setAttribute('aria-pressed', 'false');
        this.muteButton.setAttribute('aria-label', '마이크 끄기');
        this.muteButton.title = '마이크 끄기';
        this.muteButton.querySelector('img').src = asset('icons/mic.svg');
        this.setState('ended');
    }

    fail(error) {
        this.end();
        this.setState('error', error.message);
        this.startButton.querySelector('span').textContent = '다시 연결하기';
    }

    setState(state, message) {
        this.dataset.state = state;
        this.statusElement.textContent = STATES[state][0];
        this.messageElement.textContent = message || STATES[state][1];
        this.updateLauncher();
        this.dispatchEvent(new CustomEvent('tutor-state', { detail: { state, message }, bubbles: true, composed: true }));
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const ratio = Math.min(devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(rect.width * ratio);
        this.canvas.height = Math.round(rect.height * ratio);
        this.canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    draw() {
        if (!this.dialog.open) return;
        const context = this.canvasContext;
        const { width, height } = this.canvas.getBoundingClientRect();
        context.clearRect(0, 0, width, height);
        const { input, output } = this.audio.levels();
        const phase = performance.now() / 650;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.waveLevels ??= [0, 0];
        for (const [channel, bins] of [input, output].entries()) {
            const level = bins ? Math.sqrt(bins.reduce((sum, value) => sum + value * value, 0) / bins.length) / 255 : 0;
            this.waveLevels[channel] += (level - this.waveLevels[channel]) * 0.18;
            const amplitude = Math.min(42, this.waveLevels[channel] * 260);
            const center = height * (channel ? 0.67 : 0.34);
            for (let layer = 0; layer < 3; layer++) {
                context.beginPath();
                context.strokeStyle = channel ? '#CD8756' : '#319278';
                context.globalAlpha = layer === 0 ? 0.95 : 0.18;
                context.lineWidth = layer === 0 ? 2.5 : 1.5;
                for (let position = 0; position <= width; position += 2) {
                    const progress = position / Math.max(width, 1);
                    const envelope = Math.sin(progress * Math.PI) ** 2;
                    const wave = Math.sin(progress * Math.PI * (6 + layer * 2) - (reduced ? 0 : phase) + channel);
                    const vertical = center + wave * amplitude * envelope * (1 - layer * 0.22);
                    if (position === 0) context.moveTo(position, vertical); else context.lineTo(position, vertical);
                }
                context.stroke();
            }
        }
        context.globalAlpha = 1;
        this.frame = requestAnimationFrame(() => this.draw());
    }

    disconnectedCallback() {
        this.end();
        this.abort?.abort();
        this.resize?.disconnect();
        cancelAnimationFrame(this.frame);
        this.initialized = false;
    }
}

if (!customElements.get('daynize-voice-tutor')) customElements.define('daynize-voice-tutor', DaynizeVoiceTutor);

export function mountVoiceTutor({ target = document.body, ...config } = {}) {
    const widget = document.createElement('daynize-voice-tutor');
    widget.config = config;
    target.append(widget);
    return widget;
}