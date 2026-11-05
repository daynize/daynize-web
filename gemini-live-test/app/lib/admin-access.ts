export const ADMIN_TOKEN_KEY = 'daynize_admin_token';
export const ADMIN_COOKIE = 'daynize_admin_auth';
export const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
export const ADMIN_AUTH_EVENT = 'daynize-admin-auth';
export const DEFAULT_API_BASE = 'https://api.daynize.co.kr';

const TOKEN_PATTERN = /^[\w-]{8,}\.[\w-]{8,}$/;

export function adminGateRequested(loc: Pick<Location, 'pathname' | 'search'> = window.location): boolean {
    const path = loc.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
    if (path === '/admin-gate' || path.endsWith('/admin-gate')) return true;
    return new URLSearchParams(loc.search).get('mode') === 'admin_dev';
}

export function readAdminToken(): string | null {
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

export function hasAdminAccess(): boolean {
    return Boolean(readAdminToken());
}

export function persistAdminToken(token: string): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Max-Age=${ADMIN_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

export function subscribeAdminAccess(onChange: () => void): () => void {
    window.addEventListener(ADMIN_AUTH_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(ADMIN_AUTH_EVENT, onChange);
        window.removeEventListener('storage', onChange);
    };
}
