const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createRelayServer } = require('../server');

const MAIN_ORIGIN = 'https://www.daynize.co.kr';

const authOptions = {
    kakaoClientId: 'kakao-client',
    kakaoClientSecret: 'kakao-secret',
    kakaoRedirectUri: 'https://api.daynize.co.kr/api/auth/kakao/callback',
    googleClientId: 'google-client',
    googleClientSecret: 'google-secret',
    googleRedirectUri: 'https://api.daynize.co.kr/api/auth/google/callback',
    authSessionSecret: 'session-secret-for-tests',
    allowedOrigins: [MAIN_ORIGIN]
};

async function withServer(context, options = {}) {
    const relay = createRelayServer({ apiKey: 'gemini-test-key', ...options });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    return `http://127.0.0.1:${relay.server.address().port}`;
}

const stateCookieOf = response => response.headers.getSetCookie()
    .find(line => line.startsWith('daynize_oauth_state='))?.split(';', 1)[0];
const sessionCookieOf = response => response.headers.getSetCookie()
    .find(line => line.startsWith('daynize_session='))?.split(';', 1)[0];

function mockOauthFetch(calls = []) {
    return async (url, request = {}) => {
        calls.push({ url, request });
        if (url.startsWith('https://kauth.kakao.com/oauth/token') || url.startsWith('https://oauth2.googleapis.com/token')) {
            const body = new URLSearchParams(request.body);
            if (body.get('grant_type') !== 'authorization_code' || !body.get('code')) {
                return Response.json({ error: 'invalid_grant' }, { status: 400 });
            }
            return Response.json({ access_token: `token-${body.get('code')}` });
        }
        if (url.startsWith('https://kapi.kakao.com/v2/user/me')) {
            assert.match(request.headers.Authorization, /^Bearer token-/);
            return Response.json({ id: 112233, kakao_account: { email: 'Learner@Example.com', profile: { nickname: '김하늘' } } });
        }
        if (url.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) {
            assert.match(request.headers.Authorization, /^Bearer token-/);
            return Response.json({ sub: 'google-7', email: 'learner@example.com', name: '김하늘' });
        }
        return Response.json({ error: 'unexpected upstream' }, { status: 500 });
    };
}

async function startLogin(base, provider, returnTo) {
    const response = await fetch(`${base}/api/auth/${provider}${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ''}`, { redirect: 'manual' });
    assert.equal(response.status, 302);
    const authorize = new URL(response.headers.get('location'));
    return { authorize, stateCookie: stateCookieOf(response), state: authorize.searchParams.get('state') };
}

test('kakao login round-trip issues a verified session and logout clears it', { timeout: 10000 }, async context => {
    const calls = [];
    const base = await withServer(context, { ...authOptions, authFetchImpl: mockOauthFetch(calls) });

    const config = await (await fetch(`${base}/api/auth/config`)).json();
    assert.deepEqual(config, { kakao: true, google: true });

    const { authorize, stateCookie, state } = await startLogin(base, 'kakao', `${MAIN_ORIGIN}/?via=landing#register`);
    assert.equal(authorize.origin + authorize.pathname, 'https://kauth.kakao.com/oauth/authorize');
    assert.equal(authorize.searchParams.get('client_id'), 'kakao-client');
    assert.equal(authorize.searchParams.get('redirect_uri'), authOptions.kakaoRedirectUri);
    assert.equal(authorize.searchParams.get('response_type'), 'code');
    assert.ok(state);
    assert.ok(stateCookie);

    const callback = await fetch(`${base}/api/auth/kakao/callback?code=abc123&state=${state}`, {
        redirect: 'manual',
        headers: { Cookie: stateCookie }
    });
    assert.equal(callback.status, 302);
    const landed = new URL(callback.headers.get('location'));
    assert.equal(landed.origin, MAIN_ORIGIN);
    assert.equal(landed.searchParams.get('via'), 'landing');
    assert.equal(landed.searchParams.get('login'), 'kakao');
    assert.equal(landed.hash, '#register');
    const sessionCookie = sessionCookieOf(callback);
    assert.ok(sessionCookie);
    assert.equal(new URLSearchParams(calls[0].request.body).get('client_secret'), 'kakao-secret');

    const me = await (await fetch(`${base}/api/auth/me`, { headers: { Cookie: sessionCookie } })).json();
    assert.deepEqual(me, {
        loggedIn: true,
        isAdmin: false,
        hasActiveSubscription: false,
        user: { provider: 'kakao', id: '112233', name: '김하늘', email: 'learner@example.com' }
    });

    const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: sessionCookie } });
    assert.equal((await logout.json()).success, true);
    assert.match(logout.headers.getSetCookie().find(line => line.startsWith('daynize_session=')), /Max-Age=0/);

    const anonymous = await (await fetch(`${base}/api/auth/me`)).json();
    assert.deepEqual(anonymous, { loggedIn: false, isAdmin: false, hasActiveSubscription: false });
});

test('google login lands back with login=google and a session', { timeout: 10000 }, async context => {
    const base = await withServer(context, { ...authOptions, authFetchImpl: mockOauthFetch() });
    const { authorize, stateCookie, state } = await startLogin(base, 'google');
    assert.equal(authorize.origin + authorize.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(authorize.searchParams.get('scope'), 'openid email profile');

    const callback = await fetch(`${base}/api/auth/google/callback?code=xyz&state=${state}`, {
        redirect: 'manual',
        headers: { Cookie: stateCookie }
    });
    assert.equal(callback.status, 302);
    const landed = new URL(callback.headers.get('location'));
    assert.equal(landed.href.replace(landed.search, ''), `${MAIN_ORIGIN}/`);
    assert.equal(landed.searchParams.get('login'), 'google');
    const me = await (await fetch(`${base}/api/auth/me`, { headers: { Cookie: sessionCookieOf(callback) } })).json();
    assert.equal(me.user.provider, 'google');
    assert.equal(me.user.id, 'google-7');
});

test('callback rejects state mismatch and forged or expired sessions stay logged out', { timeout: 10000 }, async context => {
    let currentTime = Date.now();
    const base = await withServer(context, { ...authOptions, authFetchImpl: mockOauthFetch(), authNow: () => currentTime });

    const { stateCookie } = await startLogin(base, 'kakao');
    const mismatch = await fetch(`${base}/api/auth/kakao/callback?code=abc&state=wrong-state`, {
        redirect: 'manual',
        headers: { Cookie: stateCookie }
    });
    assert.equal(mismatch.status, 302);
    assert.equal(new URL(mismatch.headers.get('location')).searchParams.get('login'), 'error');
    assert.equal(sessionCookieOf(mismatch), undefined);

    const forged = await (await fetch(`${base}/api/auth/me`, {
        headers: { Cookie: 'daynize_session=eyJmYWtlIjp0cnVlfQ.forged-signature' }
    })).json();
    assert.deepEqual(forged, { loggedIn: false, isAdmin: false, hasActiveSubscription: false });

    const { stateCookie: freshState, state } = await startLogin(base, 'kakao');
    const callback = await fetch(`${base}/api/auth/kakao/callback?code=abc&state=${state}`, {
        redirect: 'manual', headers: { Cookie: freshState }
    });
    const sessionCookie = sessionCookieOf(callback);
    currentTime += 31 * 24 * 60 * 60 * 1000;
    const expired = await (await fetch(`${base}/api/auth/me`, { headers: { Cookie: sessionCookie } })).json();
    assert.deepEqual(expired, { loggedIn: false, isAdmin: false, hasActiveSubscription: false });
});

test('return_to outside the allowed origins falls back to the default page', { timeout: 10000 }, async context => {
    const base = await withServer(context, { ...authOptions, authFetchImpl: mockOauthFetch() });
    const { stateCookie, state } = await startLogin(base, 'kakao', 'https://evil.example/phish');
    const callback = await fetch(`${base}/api/auth/kakao/callback?code=abc&state=${state}`, {
        redirect: 'manual',
        headers: { Cookie: stateCookie }
    });
    assert.equal(new URL(callback.headers.get('location')).origin, MAIN_ORIGIN);
});

test('auth endpoints report readiness and refuse to start when credentials are missing', { timeout: 10000 }, async context => {
    const base = await withServer(context, { ...authOptions, kakaoClientId: '', kakaoRedirectUri: '' });
    const config = await (await fetch(`${base}/api/auth/config`)).json();
    assert.deepEqual(config, { kakao: false, google: true });
    assert.equal((await fetch(`${base}/api/auth/kakao`, { redirect: 'manual' })).status, 503);
    assert.equal((await fetch(`${base}/api/auth/unknown`, { redirect: 'manual' })).status, 404);
});
