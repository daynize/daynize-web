// 비회원 10분 무료 체험(Free Pass) — 정적 index.html 전용 바닐라 모듈.
// app/hooks/use10MinTimer.ts 와 같은 흐름: 관리자 토큰이 있으면 타이머를 시작하지 않는다.
// 그 외에는 /api/auth/me → /api/free-pass/start → 카운트다운 → 만료 시 /landing/?expired=1.
// 로그인 복귀(?login=kakao|google)에서는 localStorage 학습 기록을 /api/free-pass/migrate 로 올린다.

import { hasAdminAccess, mountAdminGate, ADMIN_AUTH_EVENT } from './admin-gate.js';

const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? `http://${location.hostname}:8081`
    : 'https://api.daynize.co.kr';
const RETURN_TO = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? `${location.origin}${location.pathname}?via=freepass`
    : 'https://www.daynize.co.kr/?via=freepass';
const EXPIRED_REDIRECT = ['localhost', '127.0.0.1'].includes(location.hostname) ? './landing/?expired=1' : '/landing/?expired=1';
const DURATION_MS = 10 * 60 * 1000;
const STORAGE_KEY = 'daynize_first_visit';
const MIGRATED_KEY = 'daynize.freepass.migrated.v1';
const SYNC_INTERVAL_MS = 30_000;
const WARN_AT_MS = 60_000;
const STUDY_KEYS = ['daynize.pop.completed.v1', 'daynize_recent_lesson', 'daynize.notes.v1'];

const COPY = {
    warning: {
        badge: '무료 체험 중',
        headline: '잠깐! 방금 공부하신 내용이 곧 사라져요 😢',
        sub: '카카오/구글 3초 회원가입만 하면 AI 음성대화 및 학습 기록을 무료로 보존할 수 있습니다.'
    },
    expired: {
        badge: '무료 체험 종료',
        headline: '10분 무료 체험이 완료되었습니다!',
        sub: '3초 소셜 로그인하고 방금 공부한 기록을 이어가세요.'
    }
};

const formatRemaining = ms => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const readFirstVisit = () => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const cookie = document.cookie.split('; ').find(row => row.startsWith(`${STORAGE_KEY}=`));
    const fromCookie = Number(cookie?.slice(STORAGE_KEY.length + 1));
    return Number.isFinite(fromCookie) && fromCookie > 0 ? fromCookie : null;
};
const writeFirstVisit = timestamp => {
    try { localStorage.setItem(STORAGE_KEY, String(timestamp)); } catch { }
    document.cookie = `${STORAGE_KEY}=${timestamp}; Max-Age=${365 * 24 * 60 * 60}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
};

async function fingerprint() {
    const raw = [navigator.userAgent, navigator.language, `${screen.width}x${screen.height}x${screen.colorDepth}`,
        Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.hardwareConcurrency ?? ''].join('|');
    if (crypto?.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    }
    let hash = 0;
    for (const char of raw) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return (hash >>> 0).toString(16).padStart(8, '0');
}

const api = (path, init = {}) => fetch(`${API_BASE}${path}`, { credentials: 'include', ...init });

const startSocialLogin = provider => {
    location.href = `${API_BASE}/api/auth/${provider}?return_to=${encodeURIComponent(RETURN_TO)}`;
};

// ── UI ───────────────────────────────────────────────────────────
function createBanner() {
    const root = document.createElement('div');
    root.className = 'free-pass-banner';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.innerHTML = `
        <div class="free-pass-pill">
            <span class="free-pass-label"><span aria-hidden="true">⏱️</span><span class="free-pass-label-long">10분 자유 체험 중</span><span class="free-pass-label-short">체험 중</span>
                <span class="free-pass-clock" data-clock>10:00</span></span>
            <span class="free-pass-divider" aria-hidden="true"></span>
            <button type="button" class="free-pass-cta" data-open><span class="free-pass-label-long">3초 가입으로 학습 기록 저장하기</span><span class="free-pass-label-short">3초 가입하기</span></button>
        </div>`;
    const clock = root.querySelector('[data-clock]');
    return {
        root,
        mount: () => document.body.prepend(root),
        setRemaining: (ms, urgent) => {
            clock.textContent = formatRemaining(ms);
            root.classList.toggle('is-urgent', urgent);
        },
        onOpen: handler => root.querySelector('[data-open]').addEventListener('click', handler),
        remove: () => root.remove()
    };
}

function createModal() {
    const root = document.createElement('div');
    root.className = 'free-pass-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
        <div class="free-pass-card">
            <div class="free-pass-card-head">
                <span class="free-pass-badge"><span aria-hidden="true">⏱️</span><span data-badge></span></span>
                <button type="button" class="free-pass-close" data-close aria-label="닫기">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <h3 class="free-pass-title" data-headline></h3>
            <p class="free-pass-sub" data-sub></p>
            <ul class="free-pass-perks">
                <li>지금까지 본 강의·노트 기록 보존</li>
                <li>AI 데이나 음성대화 계속 이용</li>
                <li>신용카드 입력 없음</li>
            </ul>
            <button type="button" class="free-pass-kakao" data-provider="kakao">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.31 4.66 6.73l-1.1 4.07a.4.4 0 0 0 .61.43l4.75-3.16c.35.03.7.05 1.08.05 5.52 0 10-3.58 10-8S17.52 3 12 3Z"/></svg>
                카카오로 3초 만에 시작하기
            </button>
            <button type="button" class="free-pass-google" data-provider="google">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.7h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.74 2.98-4.31 2.98-7.26Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.75-5.59-4.11H3.07v2.58A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.5H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.5l3.34-2.58Z"/><path fill="#EA4335" d="M12 5.97c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.95 2.99 14.7 2 12 2a10 10 0 0 0-8.93 5.5l3.34 2.58C7.2 7.72 9.4 5.97 12 5.97Z"/></svg>
                구글로 계속하기
            </button>
            <button type="button" class="free-pass-later" data-close>나중에 할게요</button>
        </div>`;
    let dismissible = true;
    const close = () => {
        if (!dismissible) return;
        root.classList.remove('open');
        root.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('free-pass-lock');
    };
    root.addEventListener('click', event => { if (event.target === root) close(); });
    root.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
    root.querySelectorAll('[data-provider]').forEach(button => button.addEventListener('click', () => startSocialLogin(button.dataset.provider)));
    window.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    return {
        mount: () => document.body.append(root),
        forceClose: () => {
            dismissible = true;
            close();
            root.remove();
        },
        open: (variant, { dismissible: canDismiss = true } = {}) => {
            dismissible = canDismiss;
            const copy = COPY[variant];
            root.querySelector('[data-badge]').textContent = copy.badge;
            root.querySelector('[data-headline]').textContent = copy.headline;
            root.querySelector('[data-sub]').textContent = copy.sub;
            root.classList.toggle('no-dismiss', !canDismiss);
            root.classList.add('open');
            root.setAttribute('aria-hidden', 'false');
            document.body.classList.add('free-pass-lock');
        }
    };
}

// ── 로그인 복귀: 로컬 학습 기록을 서버로 이전 ──────────────────────
async function migrateStudyData() {
    const data = {};
    for (const key of STUDY_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
    if (!Object.keys(data).length) return;
    const response = await api('/api/free-pass/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
    });
    if (!response.ok) throw new Error(`migrate HTTP ${response.status}`);
    localStorage.setItem(MIGRATED_KEY, String(Date.now()));
}

// 회원: 서버 기록을 로컬에 없는 키만 채워 넣는다(다른 기기에서 이어보기).
async function restoreStudyData() {
    const response = await api('/api/free-pass/study-data');
    if (!response.ok) return;
    const { data = {} } = await response.json();
    for (const [key, value] of Object.entries(data)) {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
    }
}

function clearLoginParam() {
    const url = new URL(location.href);
    if (!url.searchParams.has('login')) return;
    url.searchParams.delete('login');
    history.replaceState(history.state, '', url);
}

// ── 메인 ─────────────────────────────────────────────────────────
export async function startFreePass() {
    mountAdminGate();
    if (hasAdminAccess()) return { status: 'admin' };

    const params = new URLSearchParams(location.search);
    const justLoggedIn = ['kakao', 'google'].includes(params.get('login'));

    let loggedIn = false;
    try {
        const me = await api('/api/auth/me');
        loggedIn = me.ok && (await me.json())?.loggedIn === true;
    } catch (error) {
        console.warn('[free-pass] auth check failed; treating as guest', error);
    }

    if (loggedIn) {
        try {
            if (justLoggedIn || !localStorage.getItem(MIGRATED_KEY)) await migrateStudyData();
            await restoreStudyData();
        } catch (error) {
            console.warn('[free-pass] study data sync failed', error);
        }
        clearLoginParam();
        return { status: 'member' };
    }
    if (params.get('login') === 'error') clearLoginParam();

    const firstVisit = readFirstVisit() ?? Date.now();
    writeFirstVisit(firstVisit);
    const localState = () => ({ status: Date.now() - firstVisit >= DURATION_MS ? 'expired' : 'active', remainingMs: Math.max(0, DURATION_MS - (Date.now() - firstVisit)) });

    const banner = createBanner();
    const modal = createModal();
    let deadline = null;
    let expired = false;
    let warned = false;
    let stopped = false;
    let ticker;
    let syncTimer;

    const stop = () => {
        if (stopped) return;
        stopped = true;
        clearInterval(ticker);
        clearInterval(syncTimer);
        document.removeEventListener('visibilitychange', onVisible);
        banner.remove();
        modal.forceClose();
    };
    window.addEventListener(ADMIN_AUTH_EVENT, stop, { once: true });

    const expire = () => {
        if (expired || stopped) return;
        expired = true;
        clearInterval(ticker);
        clearInterval(syncTimer);
        banner.setRemaining(0, true);
        location.replace(EXPIRED_REDIRECT);
    };

    const apply = state => {
        if (state.status === 'member') { banner.remove(); return; }
        if (state.status === 'expired' || state.remainingMs <= 0) { expire(); return; }
        deadline = Date.now() + state.remainingMs;
        tick();
    };

    const tick = () => {
        if (deadline === null) return;
        const left = Math.max(0, deadline - Date.now());
        banner.setRemaining(left, left <= WARN_AT_MS);
        if (left <= WARN_AT_MS && !warned) {
            warned = true;
            modal.open('warning');
        }
        if (left === 0) expire();
    };

    const sync = async () => {
        try {
            const response = await api('/api/free-pass/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstVisit, fingerprint: await fingerprint() })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            apply(await response.json());
        } catch (error) {
            console.warn('[free-pass] server unavailable; using local timestamp', error);
            apply(localState());
        }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };

    banner.mount();
    modal.mount();
    banner.onOpen(() => modal.open('warning'));
    await sync();
    if (expired || stopped) return { status: expired ? 'expired' : 'admin' };

    ticker = setInterval(tick, 1000);
    syncTimer = setInterval(sync, SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return { status: 'active' };
}

if (!globalThis.__disableFreePass) startFreePass().catch(error => console.error('[free-pass] failed to start', error));
