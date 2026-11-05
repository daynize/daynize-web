export interface AccessState {
    checked: boolean;
    isAdmin: boolean;
    hasActiveSubscription: boolean;
}

export const DEFAULT_CHECKOUT_PATH = '/?checkout=required#register';

export async function fetchAccess(apiBase = 'https://api.daynize.co.kr'): Promise<AccessState> {
    const response = await fetch(`${apiBase}/api/auth/me`, {
        credentials: 'include',
        cache: 'no-store'
    });
    const body = response.ok ? await response.json().catch(() => ({})) : {};
    const isAdmin = body?.isAdmin === true;
    return {
        checked: true,
        isAdmin,
        hasActiveSubscription: isAdmin || body?.hasActiveSubscription === true
    };
}
