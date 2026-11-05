import { checkIsPaidUser, rememberMembershipEmail } from './membership-status.js';

const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? `http://${location.hostname}:8081`
    : 'https://api.daynize.co.kr';
export async function getAccessState(apiBase = API_BASE) {
    const response = await fetch(`${apiBase}/api/auth/me`, { credentials: 'include', cache: 'no-store' });
    const body = response.ok ? await response.json().catch(() => ({})) : {};
    rememberMembershipEmail(body?.email || body?.user?.email);
    return { loggedIn: body?.loggedIn === true, isPaid: checkIsPaidUser(body), user: body?.user || body };
}

function openAuthModal() {
    const dialog = document.querySelector('#login-dialog');
    if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
    window.dispatchEvent(new CustomEvent('daynize:auth-required'));
}

function openPayModal() {
    const dialog = document.querySelector('#login-dialog');
    if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
    window.dispatchEvent(new CustomEvent('daynize:payment-required'));
    const register = document.querySelector('#register');
    if (register) {
        history.pushState(history.state, '', '#register');
        register.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        const target = new URL('/?checkout=required#register', location.origin);
        target.searchParams.set('return_to', `${location.pathname}${location.search}${location.hash}`);
        location.assign(target.href);
    }
}

/** 권한 검사는 페이지 진입이 아니라 명시적인 보호 액션 직전에만 실행합니다. */
export async function requireActionAccess(apiBase = API_BASE) {
    try {
        const access = await getAccessState(apiBase);
        if (access.isPaid) return true;
        if (access.loggedIn) openPayModal();
        else openAuthModal();
    } catch {
        openAuthModal();
    }
    return false;
}

globalThis.daynizeAccess = Object.freeze({ getAccessState, requireActionAccess });
