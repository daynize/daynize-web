const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createRelayServer } = require('../server');

const authOptions = {
    kakaoClientId: 'kakao-client',
    kakaoClientSecret: 'kakao-secret',
    kakaoRedirectUri: 'https://api.daynize.co.kr/api/auth/kakao/callback',
    authSessionSecret: 'session-secret-for-tests'
};

async function withServer(context, options = {}) {
    const relay = createRelayServer({ apiKey: 'gemini-test-key', ...authOptions, ...options });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    return `http://127.0.0.1:${relay.server.address().port}`;
}

const sessionCookieOf = response => response.headers.getSetCookie()
    .find(line => line.startsWith('daynize_session='))?.split(';', 1)[0];

function mockKakaoFetch() {
    return async url => {
        if (url.startsWith('https://kauth.kakao.com/oauth/token')) return Response.json({ access_token: 'token-abc' });
        if (url.startsWith('https://kapi.kakao.com/v2/user/me')) {
            return Response.json({ id: 112233, kakao_account: { email: 'learner@example.com', profile: { nickname: '김하늘' } } });
        }
        return Response.json({ error: 'unexpected upstream' }, { status: 500 });
    };
}

// kakao OAuth 라운드트립으로 실제 로그인 세션 쿠키를 받아 온다 — 이 API는 그 쿠키로만
// 사용자를 식별하므로, 세션 없이는 테스트할 수 있는 게 없다.
async function loginAndGetCookie(base) {
    const authorize = await fetch(`${base}/api/auth/kakao`, { redirect: 'manual' });
    const stateCookie = authorize.headers.getSetCookie().find(line => line.startsWith('daynize_oauth_state='))?.split(';', 1)[0];
    const state = new URL(authorize.headers.get('location')).searchParams.get('state');
    const callback = await fetch(`${base}/api/auth/kakao/callback?code=abc123&state=${state}`, {
        redirect: 'manual',
        headers: { Cookie: stateCookie }
    });
    return sessionCookieOf(callback);
}

test('로그인 사용자가 강의를 재생하면 시청 기록이 남고 중복 재생은 한 번만 기록됨', { timeout: 10000 }, async context => {
    const base = await withServer(context, { authFetchImpl: mockKakaoFetch() });
    const cookie = await loginAndGetCookie(base);
    assert.ok(cookie);

    const view = await fetch(`${base}/api/lessons/basic-01/view`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(view.status, 200);
    assert.deepEqual(await view.json(), { recorded: true });

    // 같은 강의를 다시 재생해도 중복 기록되지 않는다(INSERT OR IGNORE).
    const viewAgain = await fetch(`${base}/api/lessons/basic-01/view`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(viewAgain.status, 200);

    const view2 = await fetch(`${base}/api/lessons/speak-03/view`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(view2.status, 200);

    const profile = await (await fetch(`${base}/api/auth/profile`, { headers: { Cookie: cookie } })).json();
    assert.deepEqual([...profile.watchedLessonIds].sort(), ['basic-01', 'speak-03']);
});

test('비로그인 상태로 재생해도 204로 조용히 처리되고(에러 없음) 기록은 남지 않음', { timeout: 10000 }, async context => {
    const base = await withServer(context, { authFetchImpl: mockKakaoFetch() });
    const response = await fetch(`${base}/api/lessons/basic-01/view`, { method: 'POST' });
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
});

test('유효하지 않은 강의 ID는 400, GET/다른 경로는 통과시키지 않음', { timeout: 10000 }, async context => {
    const base = await withServer(context, { authFetchImpl: mockKakaoFetch() });
    const cookie = await loginAndGetCookie(base);

    const badId = await fetch(`${base}/api/lessons/${encodeURIComponent('../etc')}/view`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(badId.status, 400);

    const wrongMethod = await fetch(`${base}/api/lessons/basic-01/view`, { method: 'GET', headers: { Cookie: cookie } });
    assert.equal(wrongMethod.status, 405);
});
