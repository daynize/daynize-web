// Client-side navigation guard for paid lessons and the AI tutor.
// The API is authoritative: only a valid admin cookie or hasActiveSubscription
// can pass. This covers direct URL entry, hash navigation and back/forward.

const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? `http://${location.hostname}:8081`
    : 'https://api.daynize.co.kr';
const PROTECTED_PATH = /^\/(?:course|courses|lesson|lessons)(?:\/|$)/i;
const PROTECTED_HASHES = new Set(['#conversation', '#voice']);
let checking = false;
let lastAllowedUrl = '';

function requiresSubscription() {
    return document.documentElement.dataset.requiresSubscription === 'true'
        || PROTECTED_PATH.test(location.pathname)
        || new URLSearchParams(location.search).get('paywall') === '1'
        || PROTECTED_HASHES.has(location.hash.toLowerCase());
}

function goToCheckout() {
    const target = new URL('/?checkout=required', location.origin);
    target.searchParams.set('return_to', `${location.pathname}${location.search}${location.hash}`);
    target.hash = 'register';
    location.replace(target.href);
}

async function verifyAccess() {
    if (!requiresSubscription() || checking) return;
    if (location.pathname === '/admin-gate' || location.pathname.startsWith('/checkout')) return;
    const currentUrl = location.href;
    if (currentUrl === lastAllowedUrl) return;
    checking = true;
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include', cache: 'no-store' });
        const body = response.ok ? await response.json().catch(() => ({})) : {};
        if (body.isAdmin === true || body.hasActiveSubscription === true) {
            lastAllowedUrl = currentUrl;
            return;
        }
        goToCheckout();
    } catch {
        // Fail closed: an unavailable auth server must not expose paid UI.
        goToCheckout();
    } finally {
        checking = false;
    }
}

window.addEventListener('hashchange', verifyAccess);
window.addEventListener('popstate', verifyAccess);
document.addEventListener('DOMContentLoaded', verifyAccess, { once: true });
verifyAccess();
