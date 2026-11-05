// 관리자 게이트. /admin-gate 또는 ?mode=admin_dev 에서 암호 모달을 연다.
// 검증은 POST /api/admin-gate (ADMIN_GATE_SECRET). 성공 토큰은
// localStorage daynize_admin_token 과 Cookie daynize_admin_auth (7일)에 남긴다.
// app/components/admin/AdminGate.tsx, app/lib/admin-access.ts 와 같은 키를 쓴다.

const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? `http://${location.hostname}:8081`
    : 'https://api.daynize.co.kr';

export const ADMIN_TOKEN_KEY = 'daynize_admin_token';
export const ADMIN_COOKIE = 'daynize_admin_auth';
export const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
export const ADMIN_AUTH_EVENT = 'daynize-admin-auth';

const TOKEN_PATTERN = /^[\w-]{8,}\.[\w-]{8,}$/;

export function adminGateRequested() {
    const path = location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
    if (path === '/admin-gate' || path.endsWith('/admin-gate')) return true;
    return new URLSearchParams(location.search).get('mode') === 'admin_dev';
}

export function readAdminToken() {
    try {
        const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (stored && TOKEN_PATTERN.test(stored)) return stored;
    } catch { /* private mode */ }
    const row = document.cookie.split('; ').find(part => part.startsWith(`${ADMIN_COOKIE}=`));
    if (!row) return null;
    try {
        const token = decodeURIComponent(row.slice(ADMIN_COOKIE.length + 1));
        return TOKEN_PATTERN.test(token) ? token : null;
    } catch {
        return null;
    }
}

export function hasAdminAccess() {
    return Boolean(readAdminToken());
}

export function persistAdminToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Max-Age=${ADMIN_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

function stripAdminMode() {
    const url = new URL(location.href);
    if (!url.searchParams.has('mode')) return;
    url.searchParams.delete('mode');
    history.replaceState(history.state, '', url);
}

function ensureStyles() {
    if (document.querySelector('link[data-admin-gate]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./admin-gate.css', import.meta.url).href;
    link.dataset.adminGate = '';
    document.head.append(link);
}

export function mountAdminGate() {
    if (globalThis.__daynizeAdminGateMounted) return;
    if (!adminGateRequested()) return;
    globalThis.__daynizeAdminGateMounted = true;
    ensureStyles();

    const pinned = (location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/').endsWith('/admin-gate');
    const root = document.createElement('div');
    root.className = 'admin-gate';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'admin-gate-title');
    root.innerHTML = `
        <div class="admin-gate-card">
            <span class="admin-gate-badge">관리자</span>
            <h2 id="admin-gate-title" data-title>관리자 확인</h2>
            <p data-copy>관리자 암호를 입력하면 맛보기 타이머를 끄고 콘텐츠를 제한 없이 엽니다.</p>
            <form data-form>
                <label for="admin-gate-password">관리자 암호</label>
                <input id="admin-gate-password" type="password" name="password" autocomplete="current-password" required>
                <p class="admin-gate-error" data-error role="alert" hidden></p>
                <button type="submit" data-submit>확인</button>
            </form>
            <button type="button" class="admin-gate-home" data-home hidden>학습 화면으로 가기</button>
            ${pinned ? '' : '<button type="button" class="admin-gate-close" data-close>닫기</button>'}
        </div>`;
    const form = root.querySelector('[data-form]');
    const error = root.querySelector('[data-error]');
    const title = root.querySelector('[data-title]');
    const copy = root.querySelector('[data-copy]');
    const home = root.querySelector('[data-home]');
    const submit = root.querySelector('[data-submit]');

    const showReady = () => {
        title.textContent = '관리자 모드가 켜졌습니다';
        copy.textContent = '10분 맛보기 제한 없이 모든 강의와 AI 데이나 대화를 사용할 수 있습니다.';
        form.hidden = true;
        home.hidden = false;
    };
    const close = () => {
        if (pinned) return;
        stripAdminMode();
        root.remove();
        document.body.classList.remove('admin-gate-lock');
        globalThis.__daynizeAdminGateMounted = false;
    };

    root.addEventListener('click', event => { if (event.target === root) close(); });
    root.querySelector('[data-close]')?.addEventListener('click', close);
    home.addEventListener('click', () => { stripAdminMode(); location.href = '/'; });
    window.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        error.hidden = true;
        submit.disabled = true;
        submit.textContent = '확인 중…';
        try {
            const response = await fetch(`${API_BASE}/api/admin-gate`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: form.password.value })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || !body.token) {
                error.textContent = typeof body.error === 'string' ? body.error : '확인에 실패했습니다. 다시 시도해 주세요.';
                error.hidden = false;
                return;
            }
            form.password.value = '';
            persistAdminToken(body.token);
            showReady();
        } catch {
            error.textContent = '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
            error.hidden = false;
        } finally {
            submit.disabled = false;
            submit.textContent = '확인';
        }
    });

    document.body.classList.add('admin-gate-lock');
    document.body.append(root);
    if (hasAdminAccess()) showReady();
    else root.querySelector('#admin-gate-password')?.focus();
}

if (!globalThis.__disableAdminGate) {
    const boot = () => mountAdminGate();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}
