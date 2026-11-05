const { randomBytes } = require('node:crypto');
const { SESSION_COOKIE, b64url, createCookieCodec, isSecure, setCookie, readCookie } = require('./session-cookie');

// 카카오/구글/네이버 OAuth 2.0 인가 코드 플로우. payment-api와 같은 모듈 패턴:
// createAuthApi(options) -> { handle(request, response, pathname) }.
// 세션은 HMAC 서명된 무상태 쿠키 하나로 유지한다(재시작해도 로그인 유지).
// 로그인 성공 시 options.onLogin({ request, user }) 훅으로 회원 저장/게스트 패스 연결을 위임한다.

const STATE_COOKIE = 'daynize_oauth_state';
const DEFAULT_SESSION_TTL_S = 30 * 24 * 60 * 60;
const PERSISTENT_SESSION_TTL_S = 10 * 365 * 24 * 60 * 60;
const STATE_TTL_S = 10 * 60;

const PROVIDERS = {
    kakao: {
        authorizeUrl: 'https://kauth.kakao.com/oauth/authorize',
        tokenUrl: 'https://kauth.kakao.com/oauth/token',
        profileUrl: 'https://kapi.kakao.com/v2/user/me',
        profile: info => {
            const kakaoId = String(info?.id ?? '');
            const account = info?.kakao_account ?? {};
            const name = account.profile?.nickname ?? info?.properties?.nickname ?? '';
            const email = String(account.email ?? '').trim().toLowerCase();
            // Kakao 계정이 이메일 동의를 거부해도 고유 ID로 회원을 안정적으로 식별한다.
            return { id: kakaoId, name, email: email || `kakao_${kakaoId}@users.daynize.local` };
        }
    },
    google: {
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        profileUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        scope: 'openid email profile',
        profile: info => ({
            id: String(info.sub ?? ''),
            name: info.name ?? '',
            email: (info.email ?? '').toLowerCase()
        })
    },
    naver: {
        authorizeUrl: 'https://nid.naver.com/oauth2.0/authorize',
        tokenUrl: 'https://nid.naver.com/oauth2.0/token',
        profileUrl: 'https://openapi.naver.com/v1/nid/me',
        profile: info => ({
            id: String(info.response?.id ?? ''),
            name: info.response?.name ?? info.response?.nickname ?? '',
            email: (info.response?.email ?? '').toLowerCase()
        })
    }
};

function json(response, status, value, headers = {}) {
    response.writeHead(status, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        ...headers
    });
    response.end(JSON.stringify(value));
}

function createAuthApi(options = {}) {
    const credentials = {
        kakao: {
            clientId: options.kakaoClientId ?? process.env.KAKAO_CLIENT_ID ?? '',
            clientSecret: options.kakaoClientSecret ?? process.env.KAKAO_CLIENT_SECRET ?? '',
            redirectUri: options.kakaoRedirectUri ?? process.env.KAKAO_REDIRECT_URI ?? ''
        },
        google: {
            clientId: options.googleClientId ?? process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: options.googleClientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? '',
            redirectUri: options.googleRedirectUri ?? process.env.GOOGLE_REDIRECT_URI ?? ''
        },
        naver: {
            clientId: options.naverClientId ?? process.env.NAVER_CLIENT_ID ?? '',
            clientSecret: options.naverClientSecret ?? process.env.NAVER_CLIENT_SECRET ?? '',
            redirectUri: options.naverRedirectUri ?? process.env.NAVER_REDIRECT_URI ?? ''
        }
    };
    const allowedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const now = options.now ?? Date.now;
    // Production sessions survive browser/device restarts until logout. Test clocks retain the short TTL.
    const sessionTtlS = options.sessionTtlS ?? (options.now ? DEFAULT_SESSION_TTL_S : PERSISTENT_SESSION_TTL_S);
    const onLogin = options.onLogin;
    const getProfile = options.getProfile ?? (() => ({}));
    const hasActiveSubscription = options.hasActiveSubscription ?? (() => false);
    const getMembershipStatus = options.getMembershipStatus ?? (session => hasActiveSubscription(session) ? 'PAID' : 'GUEST');
    const isAdmin = options.isAdmin ?? (() => false);
    let codec = options.codec;
    if (!codec) {
        let sessionSecret = options.sessionSecret ?? process.env.AUTH_SESSION_SECRET ?? '';
        if (!sessionSecret) {
            sessionSecret = randomBytes(32).toString('hex');
            console.warn('[auth] AUTH_SESSION_SECRET is not set; using a per-boot secret, so logins reset on every restart. Set it with: fly secrets set AUTH_SESSION_SECRET=$(openssl rand -hex 32)');
        }
        codec = createCookieCodec({ secret: sessionSecret, now });
    }
    const { seal, unseal } = codec;
    // 로그인 완료 후 돌아갈 기본 페이지(보통 www 메인). return_to는 허용 오리진으로 제한해 오픈 리다이렉트를 막는다.
    const defaultReturnTo = options.defaultReturnTo ?? (allowedOrigins[0] ? `${allowedOrigins[0]}/` : '/');

    const ready = provider => Boolean(credentials[provider]?.clientId && credentials[provider]?.redirectUri);
    for (const provider of Object.keys(PROVIDERS)) {
        console.info(`[auth] ${provider}: ${ready(provider) ? 'ready' : `DISABLED, missing ${['CLIENT_ID', 'REDIRECT_URI'].filter(key => !credentials[provider][key === 'CLIENT_ID' ? 'clientId' : 'redirectUri']).map(key => `${provider.toUpperCase()}_${key}`).join(', ')}`}`);
    }

    const loopbackHost = /^(localhost|127\.0\.0\.1|\[::1\]):\d+$/;
    const devOrigin = /^http:\/\/(localhost|127\.0\.0\.1):(4173|5500|8081)$/;
    const isAllowedOrigin = (origin, request) => {
        if (typeof origin !== 'string') return false;
        if (allowedOrigins.includes(origin)) return true;
        const host = request.headers.host || '';
        return loopbackHost.test(host) && (origin === `http://${host}` || devOrigin.test(origin));
    };
    const corsHeaders = request => isAllowedOrigin(request.headers.origin, request) ? {
        'Access-Control-Allow-Origin': request.headers.origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin'
    } : {};
    const secure = isSecure;
    const cookie = setCookie;
    const productionCookie = request => process.env.NODE_ENV === 'production'
        || String(request.headers.host || '').endsWith('daynize.co.kr');
    const sessionCookie = (request, value, maxAge) => cookie(request, SESSION_COOKIE, value, maxAge, '/', productionCookie(request)
        ? { sameSite: 'None', secure: true, domain: '.daynize.co.kr' }
        : {});

    // return_to는 허용된 오리진(또는 로컬 개발 오리진)의 URL만 받는다.
    const safeReturnTo = raw => {
        if (typeof raw !== 'string' || !raw) return defaultReturnTo;
        try {
            const url = new URL(raw);
            if (allowedOrigins.includes(url.origin) || devOrigin.test(url.origin)) return url.href;
        } catch { }
        return defaultReturnTo;
    };
    const redirect = (response, location, headers = {}) => {
        response.writeHead(302, { Location: location, 'Cache-Control': 'no-store', ...headers });
        response.end();
    };
    // defaultReturnTo가 '/'(ALLOWED_ORIGINS 미설정 로컬 개발)여도 URL 생성이 깨지지 않게 host 기준으로 해석한다.
    const resolveTarget = (request, returnTo) =>
        new URL(returnTo, `${secure(request) ? 'https' : 'http'}://${request.headers.host || 'localhost'}`);
    const backWithError = (request, response, returnTo, reason) => {
        const target = resolveTarget(request, returnTo);
        target.searchParams.set('login', 'error');
        console.error(`[auth] login failed: ${reason}`);
        redirect(response, target.href, { 'Set-Cookie': cookie(request, STATE_COOKIE, '', 0, '/api/auth') });
    };

    async function handle(request, response, pathname) {
        if (!pathname.startsWith('/api/auth/')) return false;
        try {
            return await route(request, response, pathname);
        } catch (error) {
            console.error(`[auth] unexpected error on ${request.method} ${pathname}`, error);
            if (response.headersSent) response.destroy();
            else json(response, 500, { error: '로그인 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, corsHeaders(request));
            return true;
        }
    }

    async function route(request, response, pathname) {
        const cors = corsHeaders(request);
        if (request.method === 'OPTIONS') {
            response.writeHead(Object.keys(cors).length ? 204 : 403, { ...cors, 'Cache-Control': 'no-store' }).end();
            return true;
        }

        if (pathname === '/api/auth/config' && request.method === 'GET') {
            json(response, 200, { kakao: ready('kakao'), google: ready('google'), naver: ready('naver') }, cors);
            return true;
        }
        if (pathname === '/api/auth/me' && request.method === 'GET') {
            const session = unseal(readCookie(request, SESSION_COOKIE));
            const admin = Boolean(isAdmin(request));
            json(response, 200, session
                ? { loggedIn: true, isAdmin: admin, hasActiveSubscription: admin || Boolean(hasActiveSubscription(session)), user: { provider: session.provider, id: session.id, name: session.name, email: session.email, membershipStatus: admin ? 'PAID' : getMembershipStatus(session) } }
                : { loggedIn: false, isAdmin: admin, hasActiveSubscription: admin }, cors);
            return true;
        }
        if (pathname === '/api/auth/profile' && request.method === 'GET') {
            const session = unseal(readCookie(request, SESSION_COOKIE));
            if (!session) {
                json(response, 401, { error: '로그인이 필요합니다.' }, cors);
                return true;
            }
            const admin = Boolean(isAdmin(request));
            const profile = await getProfile(session);
            json(response, 200, {
                ...profile,
                user: { provider: session.provider, id: session.id, name: session.name, email: session.email, ...profile?.user },
                membershipStatus: admin ? 'PAID' : getMembershipStatus(session),
                hasActiveSubscription: admin || Boolean(hasActiveSubscription(session))
            }, cors);
            return true;
        }
        if (pathname === '/api/auth/logout' && request.method === 'POST') {
            request.resume();
            json(response, 200, { success: true }, { ...cors, 'Set-Cookie': sessionCookie(request, '', 0) });
            return true;
        }

        const match = /^\/api\/auth\/(kakao|google|naver)(\/callback)?$/.exec(pathname);
        if (!match || request.method !== 'GET') {
            json(response, 404, { error: '로그인 API 경로를 찾을 수 없습니다.' }, cors);
            return true;
        }
        const provider = match[1];
        const config = PROVIDERS[provider];
        const creds = credentials[provider];
        const query = new URL(request.url, 'http://localhost').searchParams;

        if (!ready(provider)) {
            json(response, 503, { error: '소셜 로그인 설정이 아직 준비되지 않았습니다. 고객센터: 070-4010-1147' }, cors);
            return true;
        }

        // 1) 로그인 시작: state 쿠키를 심고 공급자 인가 페이지로 보낸다.
        if (!match[2]) {
            const state = randomBytes(16).toString('base64url');
            const returnTo = safeReturnTo(query.get('return_to'));
            const authorize = new URL(config.authorizeUrl);
            authorize.searchParams.set('client_id', creds.clientId);
            authorize.searchParams.set('redirect_uri', creds.redirectUri);
            authorize.searchParams.set('response_type', 'code');
            authorize.searchParams.set('state', state);
            if (config.scope) authorize.searchParams.set('scope', config.scope);
            redirect(response, authorize.href, {
                'Set-Cookie': cookie(request, STATE_COOKIE, `${state}.${b64url(returnTo)}`, STATE_TTL_S, '/api/auth')
            });
            return true;
        }

        // 2) 콜백: state 검증 -> 토큰 교환 -> 프로필 조회 -> 세션 쿠키 발급.
        const [cookieState, encodedReturnTo] = String(readCookie(request, STATE_COOKIE) || '').split('.');
        const returnTo = safeReturnTo(encodedReturnTo ? Buffer.from(encodedReturnTo, 'base64url').toString('utf8') : '');
        if (!query.get('code') || !cookieState || query.get('state') !== cookieState) {
            backWithError(request, response, returnTo, `${provider} callback rejected (${query.get('error') || 'state mismatch or missing code'})`);
            return true;
        }
        let profile;
        try {
            const tokenResponse = await fetchImpl(config.tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: creds.clientId,
                    ...(creds.clientSecret ? { client_secret: creds.clientSecret } : {}),
                    redirect_uri: creds.redirectUri,
                    code: query.get('code')
                }).toString(),
                signal: AbortSignal.timeout(10000)
            });
            const token = await tokenResponse.json().catch(() => ({}));
            if (!tokenResponse.ok || !token.access_token) {
                backWithError(request, response, returnTo, `${provider} token exchange failed (${token.error || tokenResponse.status})`);
                return true;
            }
            const profileResponse = await fetchImpl(config.profileUrl, {
                headers: { Authorization: `Bearer ${token.access_token}` },
                signal: AbortSignal.timeout(10000)
            });
            if (!profileResponse.ok) {
                backWithError(request, response, returnTo, `${provider} profile fetch failed (${profileResponse.status})`);
                return true;
            }
            profile = config.profile(await profileResponse.json().catch(() => ({})));
        } catch (error) {
            backWithError(request, response, returnTo, `${provider} upstream error (${error.message})`);
            return true;
        }
        if (!profile.id) {
            backWithError(request, response, returnTo, `${provider} profile has no id`);
            return true;
        }

        const issuedAt = Math.floor(now() / 1000);
        const user = { provider, id: profile.id, name: profile.name, email: profile.email };
        const session = seal({ ...user, iat: issuedAt, exp: issuedAt + sessionTtlS });
        // 회원 저장 실패가 로그인 자체를 막아서는 안 된다.
        try {
            await onLogin?.({ request, user });
        } catch (error) {
            console.error(`[auth] onLogin hook failed for ${provider}:${profile.id}`, error);
        }
        const target = resolveTarget(request, returnTo);
        target.searchParams.set('login', provider);
        target.searchParams.set('status', 'success');
        console.info(`[auth] ${provider} login ok (user ${profile.id})`);
        response.writeHead(302, {
            Location: target.href,
            'Cache-Control': 'no-store',
            'Set-Cookie': [
                sessionCookie(request, session, sessionTtlS),
                cookie(request, STATE_COOKIE, '', 0, '/api/auth')
            ]
        });
        response.end();
        return true;
    }

    return { handle };
}

module.exports = { createAuthApi };
