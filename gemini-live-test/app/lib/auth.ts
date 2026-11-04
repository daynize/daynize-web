export type SocialProvider = 'kakao' | 'google';

export const DEFAULT_API_BASE = 'https://api.daynize.co.kr';
export const DEFAULT_RETURN_TO = 'https://www.daynize.co.kr/?via=freepass';

// 백엔드 OAuth 시작 엔드포인트(auth-api.js GET /api/auth/{provider}?return_to=).
// 로그인 완료 후 return_to?login=kakao|google 로 돌아온다.
export function socialLoginUrl(provider: SocialProvider, { apiBase = DEFAULT_API_BASE, returnTo = DEFAULT_RETURN_TO } = {}): string {
    return `${apiBase}/api/auth/${provider}?return_to=${encodeURIComponent(returnTo)}`;
}

export function startSocialLogin(provider: SocialProvider, options?: { apiBase?: string; returnTo?: string }): void {
    window.location.href = socialLoginUrl(provider, options);
}
