const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createRelayServer } = require('../server');

const MAIN_ORIGIN = 'https://www.daynize.co.kr';
const TEN_MINUTES = 10 * 60 * 1000;

function clock(start = Date.parse('2026-11-04T00:00:00Z')) {
    let current = start;
    const now = () => current;
    now.advance = ms => { current += ms; };
    return now;
}

const authOptions = {
    kakaoClientId: 'kakao-client',
    kakaoClientSecret: 'kakao-secret',
    kakaoRedirectUri: 'https://api.daynize.co.kr/api/auth/kakao/callback',
    googleClientId: 'google-client',
    googleRedirectUri: 'https://api.daynize.co.kr/api/auth/google/callback',
    authSessionSecret: 'session-secret-for-tests',
    allowedOrigins: [MAIN_ORIGIN],
    trustProxyHeaders: true
};

async function withServer(context, options = {}) {
    const relay = createRelayServer({ apiKey: 'gemini-test-key', ...authOptions, ...options });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    return `http://127.0.0.1:${relay.server.address().port}`;
}

const guestCookieOf = response => response.headers.getSetCookie()
    .find(line => line.startsWith('daynize_guest='))?.split(';', 1)[0];
const sessionCookieOf = response => response.headers.getSetCookie()
    .find(line => line.startsWith('daynize_session='))?.split(';', 1)[0];

async function start(base, { ip = '203.0.113.10', fingerprint, cookie, origin = MAIN_ORIGIN } = {}) {
    const response = await fetch(`${base}/api/free-pass/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Origin: origin,
            'Fly-Client-IP': ip,
            ...(cookie ? { Cookie: cookie } : {})
        },
        body: JSON.stringify(fingerprint ? { fingerprint } : {})
    });
    return { response, body: await response.json(), guestCookie: guestCookieOf(response) };
}

test('admin gate issues a seven-day auth cookie and bypasses guest limits', { timeout: 10000 }, async context => {
    const now = clock();
    const base = await withServer(context, { authNow: now, adminGateSecret: 'admin-secret' });

    const invalid = await fetch(`${base}/api/admin-gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: MAIN_ORIGIN },
        body: JSON.stringify({ password: 'wrong' })
    });
    assert.equal(invalid.status, 401);
    assert.equal(invalid.headers.get('set-cookie'), null);

    const verified = await fetch(`${base}/api/admin-gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: MAIN_ORIGIN },
        body: JSON.stringify({ password: 'admin-secret' })
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.headers.get('access-control-allow-credentials'), 'true');
    const adminCookie = verified.headers.getSetCookie().find(line => line.startsWith('daynize_admin_auth='));
    assert.match(adminCookie, /Max-Age=604800/);
    assert.match(adminCookie, /HttpOnly/);
    const token = (await verified.json()).token;
    assert.match(token, /^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/);

    const pass = await start(base, { cookie: adminCookie.split(';', 1)[0] });
    assert.deepEqual(pass.body, { status: 'member', admin: true });

    const status = await (await fetch(`${base}/api/free-pass/status`, {
        headers: { Cookie: adminCookie.split(';', 1)[0] }
    })).json();
    assert.deepEqual(status, { status: 'member', admin: true });
});

function mockOauthFetch() {
    return async (url, request = {}) => {
        if (url.startsWith('https://kauth.kakao.com/oauth/token')) {
            return Response.json({ access_token: `token-${new URLSearchParams(request.body).get('code')}` });
        }
        if (url.startsWith('https://kapi.kakao.com/v2/user/me')) {
            return Response.json({ id: 112233, kakao_account: { email: 'learner@example.com', profile: { nickname: '김하늘' } } });
        }
        return Response.json({ error: 'unexpected upstream' }, { status: 500 });
    };
}

async function loginViaKakao(base, extraCookie) {
    const begin = await fetch(`${base}/api/auth/kakao?return_to=${encodeURIComponent(`${MAIN_ORIGIN}/?via=freepass`)}`, { redirect: 'manual' });
    const state = new URL(begin.headers.get('location')).searchParams.get('state');
    const stateCookie = begin.headers.getSetCookie().find(line => line.startsWith('daynize_oauth_state=')).split(';', 1)[0];
    const callback = await fetch(`${base}/api/auth/kakao/callback?code=abc&state=${state}`, {
        redirect: 'manual',
        headers: { Cookie: [stateCookie, extraCookie].filter(Boolean).join('; ') }
    });
    assert.equal(callback.status, 302);
    return sessionCookieOf(callback);
}

test('first visit issues a 10 minute pass with a guest cookie and CORS credentials', async context => {
    const now = clock();
    const base = await withServer(context, { authNow: now });

    const { response, body, guestCookie } = await start(base, { fingerprint: 'abcdef1234567890' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), MAIN_ORIGIN);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.equal(body.status, 'active');
    assert.equal(body.remainingMs, TEN_MINUTES);
    assert.deepEqual(body.voice, { sessionsUsed: 0, maxSessions: 3, maxSessionMs: 5 * 60 * 1000 });
    assert.match(guestCookie, /^daynize_guest=.+\..+$/);

    now.advance(4 * 60 * 1000);
    const again = await start(base, { cookie: guestCookie });
    assert.equal(again.body.status, 'active');
    assert.equal(again.body.remainingMs, 6 * 60 * 1000);
    assert.equal(again.body.passId, body.passId);
    assert.equal(again.guestCookie, undefined, 'existing cookie is not re-issued');

    now.advance(6 * 60 * 1000 + 1);
    const expired = await start(base, { cookie: guestCookie });
    assert.equal(expired.body.status, 'expired');
    assert.equal(expired.body.remainingMs, 0);
});

test('clearing cookies does not restart the clock when ip and fingerprint match', async context => {
    const now = clock();
    const base = await withServer(context, { authNow: now });
    const first = await start(base, { fingerprint: 'feedfacefeedface' });
    now.advance(TEN_MINUTES + 1);

    const noCookie = await start(base, { fingerprint: 'feedfacefeedface' });
    assert.equal(noCookie.body.status, 'expired');
    assert.equal(noCookie.body.passId, first.body.passId);

    const differentDevice = await start(base, { fingerprint: '0123456789abcdef' });
    assert.equal(differentDevice.body.status, 'active');
    assert.notEqual(differentDevice.body.passId, first.body.passId);
});

test('an ip that keeps minting passes is pinned to its first pass for the day', async context => {
    const now = clock();
    const base = await withServer(context, { authNow: now, freePassMaxPerIpPerDay: 2 });
    const first = await start(base, { fingerprint: 'aaaaaaaa11111111' });
    now.advance(TEN_MINUTES + 1);
    const second = await start(base, { fingerprint: 'bbbbbbbb22222222' });
    assert.equal(second.body.status, 'active');

    const third = await start(base, { fingerprint: 'cccccccc33333333' });
    assert.equal(third.body.status, 'expired');
    assert.equal(third.body.reason, 'ip_limit');
    assert.equal(third.body.passId, first.body.passId);

    const otherIp = await start(base, { ip: '198.51.100.7', fingerprint: 'cccccccc33333333' });
    assert.equal(otherIp.body.status, 'active');

    now.advance(24 * 60 * 60 * 1000);
    const nextDay = await start(base, { fingerprint: 'dddddddd44444444' });
    assert.equal(nextDay.body.status, 'active');
});

test('start endpoint is rate limited per ip and rejects unknown origins', async context => {
    const base = await withServer(context, { freePassMaxStartsPerMinute: 2 });
    await start(base);
    await start(base);
    const third = await start(base);
    assert.equal(third.response.status, 429);
    assert.equal(third.response.headers.get('retry-after'), '60');

    const foreign = await start(base, { ip: '192.0.2.1', origin: 'https://evil.example' });
    assert.equal(foreign.response.headers.get('access-control-allow-origin'), null);
    const preflight = await fetch(`${base}/api/free-pass/start`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
    assert.equal(preflight.status, 403);
});

test('voice gate allows three guest sessions capped at five minutes, members are unlimited', { timeout: 10000 }, async context => {
    const { WebSocket, WebSocketServer } = require('ws');
    const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await once(upstream, 'listening');
    context.after(() => new Promise(resolve => upstream.close(resolve)));
    const now = clock();
    const base = await withServer(context, {
        authNow: now, enforceVoiceLimits: true, authFetchImpl: mockOauthFetch(), upstreamUrl: `ws://127.0.0.1:${upstream.address().port}`
    });
    const { guestCookie } = await start(base);
    const upgrade = cookie => new Promise(resolve => {
        const socket = new WebSocket(`${base.replace('http:', 'ws:')}/ws/gemini-live`, { headers: { Cookie: cookie, 'Fly-Client-IP': '203.0.113.10' } });
        socket.on('open', () => { socket.close(); resolve({ status: 101 }); });
        socket.on('unexpected-response', (_request, response) => { response.resume(); resolve({ status: response.statusCode, reason: response.headers['x-free-pass'] }); });
        socket.on('error', () => resolve({ status: 'error' }));
    });

    const anonymous = await fetch(`${base}/api/free-pass/status`, { headers: { 'Fly-Client-IP': '203.0.113.99' } });
    assert.equal((await anonymous.json()).status, 'new');

    for (let attempt = 0; attempt < 3; attempt += 1) assert.equal((await upgrade(guestCookie)).status, 101, `guest session ${attempt + 1} opens`);
    assert.deepEqual(await upgrade(guestCookie), { status: 429, reason: 'voice-limit' });

    const status = await (await fetch(`${base}/api/free-pass/status`, { headers: { Cookie: guestCookie } })).json();
    assert.equal(status.voice.sessionsUsed, 3);

    const strangerAttempt = await upgrade('daynize_guest=forged.cookie');
    assert.deepEqual(strangerAttempt, { status: 403, reason: 'free-pass-required' });

    now.advance(TEN_MINUTES + 1);
    assert.deepEqual(await upgrade(guestCookie), { status: 403, reason: 'free-pass-expired' });

    const sessionCookie = await loginViaKakao(base);
    for (let attempt = 0; attempt < 4; attempt += 1) assert.equal((await upgrade(sessionCookie)).status, 101, 'members are not gated');
});

test('social login links the guest pass and migrates local study data', async context => {
    const now = clock();
    const base = await withServer(context, { authNow: now, authFetchImpl: mockOauthFetch() });
    const { guestCookie } = await start(base, { fingerprint: 'abcdefabcdef1234' });

    const sessionCookie = await loginViaKakao(base, guestCookie);
    assert.ok(sessionCookie);

    const asMember = await start(base, { cookie: `${guestCookie}; ${sessionCookie}` });
    assert.deepEqual(asMember.body, { status: 'member' });

    const unauthorized = await fetch(`${base}/api/free-pass/migrate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: {} })
    });
    assert.equal(unauthorized.status, 401);

    const payload = {
        'daynize.pop.completed.v1': ['verb-take', 'verb-get'],
        daynize_recent_lesson: { id: 'course-24', progress: 0.4 },
        'daynize.notes.v1': [{ id: 1, text: 'in = 24시간보다 긴 시간' }],
        'bad key!': 'ignored'
    };
    const migrate = await fetch(`${base}/api/free-pass/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: MAIN_ORIGIN, Cookie: `${guestCookie}; ${sessionCookie}` },
        body: JSON.stringify({ data: payload })
    });
    assert.equal(migrate.status, 200);
    const result = await migrate.json();
    assert.equal(result.saved, 3);
    assert.deepEqual(result.keys.sort(), ['daynize.notes.v1', 'daynize.pop.completed.v1', 'daynize_recent_lesson']);

    const stored = await (await fetch(`${base}/api/free-pass/study-data`, { headers: { Cookie: sessionCookie } })).json();
    assert.deepEqual(stored.data['daynize.pop.completed.v1'], ['verb-take', 'verb-get']);
    assert.deepEqual(stored.data.daynize_recent_lesson, { id: 'course-24', progress: 0.4 });
    assert.equal(stored.data['bad key!'], undefined);

    const update = await fetch(`${base}/api/free-pass/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ data: { daynize_recent_lesson: { id: 'course-25', progress: 0.1 } } })
    });
    assert.equal((await update.json()).saved, 1);
    const updated = await (await fetch(`${base}/api/free-pass/study-data`, { headers: { Cookie: sessionCookie } })).json();
    assert.equal(updated.data.daynize_recent_lesson.id, 'course-25');
    assert.deepEqual(updated.data['daynize.pop.completed.v1'], ['verb-take', 'verb-get']);
});

test('sqlite store persists across server restarts when a data dir is set', async context => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daynize-free-pass-'));
    context.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
    const now = clock();

    const relayA = createRelayServer({ apiKey: 'k', ...authOptions, authNow: now, dataDir });
    relayA.server.listen(0, '127.0.0.1');
    await once(relayA.server, 'listening');
    const baseA = `http://127.0.0.1:${relayA.server.address().port}`;
    const first = await start(baseA, { fingerprint: 'persist0persist0' });
    await relayA.close();

    now.advance(TEN_MINUTES + 1);
    const baseB = await withServer(context, { authNow: now, dataDir });
    const afterRestart = await start(baseB, { cookie: first.guestCookie });
    assert.equal(afterRestart.body.status, 'expired');
    assert.equal(afterRestart.body.passId, first.body.passId);
});
