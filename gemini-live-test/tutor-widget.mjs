import { AudioEngine } from './audio-engine.mjs';
import { LiveService, resolveWebSocketUrl } from './live-service.mjs';
import { AmbientOrb } from './ambient-orb.mjs';
import { SessionSafety } from './session-safety.mjs';

const asset = name => new URL(name, import.meta.url).href;
const STATES = {
    idle: ['대화 준비', '오늘은 어떤 이야기를 나눠볼까요?'],
    connecting: ['연결 중', '마이크와 선생님을 연결하고 있어요.'],
    listening: ['듣고 있어요...', '편안하게 말씀해주세요.'],
    speaking: ['선생님이 말하는 중', '천천히 함께 이야기해요.'],
    muted: ['마이크 꺼짐', '말씀하시려면 마이크를 켜주세요.'],
    waiting: ['선생님이 생각 중...', '선생님의 음성 답변을 기다리고 있어요.'],
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
            <link rel="stylesheet" href="${asset('spotlight-bar.css')}?v=dark-horizontal-1">
            <button class="launch" type="button" aria-haspopup="dialog">${icon('mic', true)}<span>AI 음성 회화 시작하기</span></button>
            <dialog id="spotlight-modal" aria-labelledby="tutor-title" aria-describedby="privacy">
                <div class="spotlight-bar">
                    <section class="identity">
                        <span class="labs-label">Daynize labs</span>
                        <div class="tutor-profile"><canvas class="ambient-orb" width="64" height="64" aria-hidden="true"></canvas><h2 id="tutor-title" class="sr-only">Gemini 튜터</h2></div>
                    </section>
                    <canvas class="visualizer" aria-label="마이크와 선생님 음성의 실시간 파형" role="img"></canvas>
                    <div class="icon-tray">
                        <button class="icon-button mute" type="button" aria-label="마이크 끄기" title="마이크 끄기" aria-pressed="false" disabled>${icon('mic')}</button>
                        <button class="icon-button speaker" type="button" aria-label="스피커 끄기" title="스피커 끄기" aria-pressed="false">${icon('volume-2')}</button>
                        <button class="icon-button captions" type="button" aria-label="대화 자막" title="대화 자막" aria-expanded="false" aria-controls="text-drawer">${icon('message-square')}</button>
                        <button class="icon-button preferences" type="button" aria-label="환경설정" title="환경설정" aria-expanded="false" aria-controls="preferences-drawer">${icon('settings-2')}</button>
                        <button class="icon-button end" type="button" aria-label="세션 종료" title="세션 종료">${icon('x')}</button>
                    </div>
                </div>
                <div class="session-strip"><div class="status-line" role="status" aria-live="polite"><span class="status-dot" aria-hidden="true"></span><span class="status-label"></span></div><p class="message"></p><span class="time">00:00</span></div>
                <p class="safety-notice" role="status" aria-live="polite" hidden></p>
                <section id="text-drawer" class="drawer" hidden><h3>대화 자막</h3><p class="caption-empty">음성이 인식되면 자막이 표시됩니다.</p><div class="transcripts" role="log" aria-live="polite" aria-label="실시간 대화 자막"></div></section>
                <section id="preferences-drawer" class="drawer" hidden>
                    <h3>음성 환경설정</h3><div class="settings-grid">
                    <label>선생님 음성<select class="voice"><option value="Kore">Kore</option><option value="Puck">Puck</option></select></label>
                    <label>재생 속도 <output class="speed-value">1.0×</output><input class="speed" type="range" min="0.8" max="1.2" step="0.05" value="1" aria-label="재생 속도"></label>
                    </div><div class="settings-actions"><button class="action apply-voice" type="button">음성 적용 · 다시 연결</button><button class="icon-button speaker-check" type="button" aria-label="스피커 확인" title="스피커 확인">${icon('volume-2')}</button></div><p class="audio-check" role="status" aria-live="polite"></p>
                </section>
                <div class="retry-actions"><button class="action start" type="button" hidden>${icon('rotate-ccw')}<span>다시 연결하기</span></button></div>
                <footer class="foot"><p id="privacy">음성은 Google로 전송됩니다. 민감한 내용은 말씀하지 마세요.</p><p class="transport" aria-live="off">음성 전송 0 · 수신 0</p></footer>
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
        this.canvas = query('.visualizer');
        this.canvasContext = this.canvas.getContext('2d');
        this.orb = new AmbientOrb(query('.ambient-orb'));
        this.resize = new ResizeObserver(() => this.resizeCanvas());
        this.resize.observe(this.canvas);
        this.launch.addEventListener('click', () => this.open(), { signal });
        this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); }, { signal });
        this.dialog.addEventListener('click', event => {
            if (event.target !== this.dialog) return;
            const rect = this.dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
        }, { signal });
        this.startButton.addEventListener('click', () => {
            if (this.callActive) this.service?.retryNow();
            else void this.begin();
        }, { signal });
        this.muteButton.addEventListener('click', () => this.toggleMute(), { signal });
        this.endButton.addEventListener('click', () => this.close(), { signal });
        query('.captions').addEventListener('click', () => this.toggleDrawer('text-drawer', '.captions'), { signal });
        query('.preferences').addEventListener('click', () => this.toggleDrawer('preferences-drawer', '.preferences'), { signal });
        query('.speaker').addEventListener('click', async () => {
            const muted = !this.audio.speakerMuted;
            this.audio.setSpeakerMuted(muted);
            query('.speaker').setAttribute('aria-pressed', String(muted));
            query('.speaker').setAttribute('aria-label', muted ? '스피커 켜기' : '스피커 끄기');
            query('.speaker').title = muted ? '스피커 켜기' : '스피커 끄기';
            query('.speaker img').src = asset(`icons/${muted ? 'volume-x' : 'volume-2'}.svg`);
            if (!muted && this.audio.context) {
                try { await this.audio.context.resume(); } catch (error) { query('.audio-check').textContent = error.message; }
            }
        }, { signal });
        query('.speed').addEventListener('input', () => {
            this.audio.setPlaybackRate(Number(query('.speed').value));
            query('.speed-value').value = `${Number(query('.speed').value).toFixed(2)}×`;
        }, { signal });
        query('.apply-voice').addEventListener('click', () => {
            this.end();
            void this.begin();
        }, { signal });
        this.audio.addEventListener('pcm', event => {
            if (this.service?.sendAudio(event.detail)) {
                this.sentFrames++;
                if (this.sentFrames % 10 === 0) this.updateTransport();
            }
        }, { signal });
        this.audio.addEventListener('playing', () => this.setState('speaking'), { signal });
        this.audio.addEventListener('blocked', () => { this.playbackBlocked = true; }, { signal });
        query('.speaker-check').addEventListener('click', async () => {
            const button = query('.speaker-check');
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
        document.addEventListener('visibilitychange', () => this.checkSafety(), { signal });
        this.setState('idle');
    }

    get endpoint() {
        return resolveWebSocketUrl({ endpoint: this.config?.endpoint || this.getAttribute('endpoint') });
    }

    open() {
        if (this.dialog.open) return;
        this.minimized = false;
        this.dialog.showModal();
        this.dialog.classList.add('active');
        this.launch.hidden = true;
        this.resizeCanvas();
        this.draw();
        if (!this.callActive && !this.config?.designPreview) void this.begin();
        this.endButton.focus();
    }

    minimize() {
        this.minimized = true;
        this.dialog.close();
        this.dialog.classList.remove('active');
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
        this.dialog.classList.remove('active');
        this.launch.hidden = false;
        this.updateLauncher();
        cancelAnimationFrame(this.frame);
        this.launch.focus();
    }

    async begin() {
        if (this.callActive) return;
        const generation = ++this.generation;
        this.callActive = true;
        this.safety = new SessionSafety(performance.now());
        this.shadowRoot.querySelector('.safety-notice').hidden = true;
        this.safetyTimer = setInterval(() => this.checkSafety(), 100);
        this.duration = 0;
        this.sentFrames = this.receivedFrames = 0;
        this.transcriptRows = {};
        this.updateTransport();
        this.bargeIn = false;
        this.timeElement.textContent = '00:00';
        this.startButton.hidden = true;
        this.endButton.hidden = false;
        this.muteButton.hidden = false;
        this.muteButton.disabled = true;
        this.setState('connecting');
        this.service = new LiveService({ ...this.config, endpoint: this.endpoint, voice: this.shadowRoot.querySelector('.voice').value });
        const service = this.service;
        service.addEventListener('transcript', event => {
            if (generation === this.generation && this.callActive) this.appendTranscript(event.detail);
        });
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
        service.addEventListener('turnComplete', () => { this.bargeIn = false; this.transcriptRows = {}; });
        service.addEventListener('connectionstate', event => {
            if (generation !== this.generation) return;
            const { state, attempt, delay } = event.detail;
            this.dataset.connectionState = state;
            this.audio.setStreaming(state === 'CONNECTED');
            if (state === 'RECONNECTING') {
                clearTimeout(this.responseTimer);
                this.audio.interrupt();
                this.bargeIn = false;
                this.muteButton.disabled = true;
                this.startButton.hidden = false;
                this.startButton.disabled = delay === 0;
                this.startButton.querySelector('span').textContent = '지금 다시 연결';
                this.setState('reconnecting', `${Math.ceil(delay / 1000)}초 후 다시 연결합니다. (${attempt}/${service.options.maxRetries})`);
            } else if (state === 'CONNECTED') {
                this.startButton.hidden = true;
                this.startButton.disabled = false;
                this.safety.lastSoundAt = performance.now();
                this.muteButton.disabled = false;
                this.setState(this.audio.muted ? 'muted' : 'listening');
                if (!this.clock) this.clock = setInterval(() => {
                    if (service.ready && !this.audio.muted) this.duration++;
                    this.timeElement.textContent = `${String(Math.floor(this.duration / 60)).padStart(2, '0')}:${String(this.duration % 60).padStart(2, '0')}`;
                }, 1000);
            }
        });
        service.addEventListener('error', event => { if (generation === this.generation) this.fail(event.detail); });
        try {
            const microphoneReady = this.audio.start();
            const sessionReady = service.start();
            await Promise.all([microphoneReady, sessionReady]);
            if (generation !== this.generation || !this.callActive) return;
            this.audio.setStreaming(service.ready);
            if (service.requestGreeting()) {
                this.setState('waiting');
                this.responseTimer = setTimeout(() => {
                    if (generation === this.generation && !this.audio.sources.size) {
                        this.setState(this.audio.muted ? 'muted' : 'listening', '아직 음성 응답이 도착하지 않았습니다. 마이크를 켜고 말씀해주세요.');
                    }
                }, 15000);
            }
        } catch (error) {
            if (generation !== this.generation || !this.callActive) return;
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

    checkSafety() {
        if (!this.callActive || !this.safety) return;
        if (this.service?.active && !this.service.ready) this.safety.lastSoundAt = performance.now();
        const result = this.safety.check(performance.now(), this.audio.inputVolume());
        const notice = this.shadowRoot.querySelector('.safety-notice');
        if (result.reason) {
            const message = result.reason === 'timeout' ? '오늘의 튜터링 시간이 완료되었습니다!' : '30초 동안 음성 입력이 없어 대화를 자동 종료했습니다.';
            this.end();
            this.setState('ended', message);
            notice.textContent = message;
            notice.hidden = false;
            return;
        }
        notice.hidden = !result.warning;
        if (result.warning) notice.textContent = `생각 중이신가요? ${result.remaining}초 후 대화가 자동 종료됩니다.`;
    }

    toggleDrawer(id, selector) {
        const panel = this.shadowRoot.getElementById(id);
        const opening = panel.hidden;
        for (const [otherId, otherSelector] of [['text-drawer', '.captions'], ['preferences-drawer', '.preferences']]) {
            if (otherId !== id) {
                this.shadowRoot.getElementById(otherId).hidden = true;
                this.shadowRoot.querySelector(otherSelector).setAttribute('aria-expanded', 'false');
            }
        }
        panel.hidden = !opening;
        this.shadowRoot.querySelector(selector).setAttribute('aria-expanded', String(!panel.hidden));
    }

    appendTranscript({ speaker, text }) {
        const log = this.shadowRoot.querySelector('.transcripts');
        this.transcriptRows ??= {};
        if (!this.transcriptRows[speaker]) {
            const row = document.createElement('p');
            row.className = `transcript ${speaker}`;
            const label = document.createElement('strong');
            label.textContent = speaker === 'user' ? '나' : '선생님';
            const content = document.createElement('span');
            row.append(label, content);
            log.append(row);
            this.transcriptRows[speaker] = content;
            while (log.children.length > 100) log.firstElementChild.remove();
        }
        const content = this.transcriptRows[speaker];
        content.textContent = (content.textContent + text).slice(-6000);
        this.shadowRoot.querySelector('.caption-empty').hidden = true;
        log.scrollTop = log.scrollHeight;
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
        clearInterval(this.safetyTimer);
        this.safetyTimer = undefined;
        this.safety = undefined;
        clearTimeout(this.responseTimer);
        this.playbackBlocked = false;
        this.clock = undefined;
        if (!this.initialized) return;
        this.startButton.hidden = true;
        this.startButton.disabled = false;
        this.dataset.connectionState = 'DISCONNECTED';
        this.startButton.querySelector('span').textContent = '다시 대화하기';
        this.muteButton.disabled = true;
        this.muteButton.setAttribute('aria-pressed', 'false');
        this.muteButton.setAttribute('aria-label', '마이크 끄기');
        this.muteButton.title = '마이크 끄기';
        this.muteButton.querySelector('img').src = asset('icons/mic.svg');
        this.setState('ended');
    }

    fail(error) {
        this.end();
        this.setState('error', error.message);
        this.startButton.hidden = false;
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
        this.orb?.resize();
    }

    draw() {
        if (!this.dialog.open) return;
        const context = this.canvasContext;
        const { width, height } = this.canvas.getBoundingClientRect();
        context.clearRect(0, 0, width, height);
        const phase = performance.now() / 650;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const timestamp = performance.now();
        const delta = Math.min(0.05, Math.max(0, (timestamp - (this.lastVisualTimestamp ?? timestamp - 16.67)) / 1000));
        this.lastVisualTimestamp = timestamp;
        const voiceLevels = [this.audio.inputVolume(), this.audio.outputVolume()].map(volume => Math.min(1, Math.max(0, (volume - 0.003) * 14)));
        this.orb.render({ timestamp, input: voiceLevels[0], output: voiceLevels[1], state: this.dataset.state, reduced });
        this.waveLevels ??= [0, 0];
        for (const [channel, level] of voiceLevels.entries()) {
            const response = 1 - Math.exp(-delta / (level > this.waveLevels[channel] ? 0.045 : 0.18));
            this.waveLevels[channel] += (level - this.waveLevels[channel]) * response;
        }
        const activity = this.config?.designPreview ? 0.45 : Math.max(...this.waveLevels);
        const amplitude = height * 0.38 * activity;
        const drift = reduced ? 0 : phase * 0.45;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        for (let layer = 0; layer < 12; layer++) {
            const gradient = context.createLinearGradient(0, 0, Math.max(width, 1), 0);
            gradient.addColorStop(0, 'rgba(117,220,171,0.04)');
            gradient.addColorStop(0.18, '#76dcb0');
            gradient.addColorStop(0.48, layer % 3 === 0 ? '#75adcf' : '#70cfbd');
            gradient.addColorStop(0.76, '#d5c48b');
            gradient.addColorStop(1, 'rgba(224,209,158,0.04)');
            context.strokeStyle = gradient;
            context.globalAlpha = layer % 4 === 0 ? 0.7 : 0.22;
            context.lineWidth = layer % 4 === 0 ? 1.05 : 0.65;
            context.beginPath();
            for (let position = 0; position <= width; position += 1.5) {
                const progress = position / Math.max(width, 1);
                const envelope = Math.sin(progress * Math.PI) ** 1.4;
                const wave = Math.sin(progress * Math.PI * 4 - drift + layer * 0.16);
                const secondary = Math.sin(progress * Math.PI * 6 + drift * 0.35 + layer * 0.12) * 0.16;
                const vertical = height / 2 + (wave * 0.8 + secondary) * amplitude * envelope * (0.74 + layer * 0.02);
                if (position === 0) context.moveTo(position, vertical); else context.lineTo(position, vertical);
            }
            context.stroke();
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