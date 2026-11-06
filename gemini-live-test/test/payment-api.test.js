const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createRelayServer } = require('../server');

const buyer = {
    name: '김하늘',
    phone: '010-1234-5678',
    email: 'learner@example.com',
    privacyConsent: true,
    termsConsent: true
};

async function withServer(context, options = {}) {
    const relay = createRelayServer({ apiKey: 'gemini-test-key', ...options });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    return `http://127.0.0.1:${relay.server.address().port}`;
}

async function createOrder(base, body = buyer) {
    const response = await fetch(`${base}/api/payment/orders`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return {
        response,
        body: await response.json(),
        cookie: response.headers.get('set-cookie')?.split(';', 1)[0]
    };
}

test('PortOne test config creates a guest session and verifies a paid order once', { timeout: 10000 }, async context => {
    let verificationCount = 0;
    const base = await withServer(context, {
        portoneStoreId: 'store-test',
        portoneChannelKey: 'channel-test',
        portoneApiSecret: 'secret-test-only',
        portoneMode: 'test',
        portonePgProvider: 'NHN_KCP',
        amount: 49000,
        paymentFetchImpl: async (url, request) => {
            verificationCount += 1;
            assert.match(url, /\/payments\/order_\d{13}$/);
            assert.equal(request.headers.Authorization, 'PortOne secret-test-only');
            const orderId = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
            return new Response(JSON.stringify({
                id: orderId,
                status: 'PAID',
                amount: { total: 19000 },
                currency: 'KRW',
                orderName: '데이나이즈 매일 영어 라이브 패스',
                selectedChannel: { type: 'TEST' },
                paymentMethod: { type: 'CARD' },
                customer: { email: buyer.email, fullName: buyer.name, phoneNumber: buyer.phone }
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
    });

    const configResponse = await fetch(`${base}/api/payment/config`, { headers: { Origin: new URL(base).origin } });
    const config = await configResponse.json();
    assert.equal(config.enabled, true);
    assert.equal(config.amount, 19000);
    assert.equal(config.pgProvider, 'NHN_KCP');
    assert.equal('apiSecret' in config, false);

    const created = await createOrder(base);
    assert.equal(created.response.status, 201);
    assert.match(created.body.orderId, /^order_\d{13}$/);
    assert.equal(created.body.payMethod, 'CARD');
    assert.equal(created.body.channelKey, 'channel-test');
    assert.match(created.cookie, /^daynize_checkout=/);

    const verify = () => fetch(`${base}/api/payment/verify`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: created.cookie },
        body: JSON.stringify({ paymentId: created.body.orderId })
    });
    const first = await verify();
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), {
        success: true,
        orderId: created.body.orderId,
        amount: 19000,
        email: buyer.email,
        status: 'PAID'
    });
    const repeated = await verify();
    assert.equal(repeated.status, 200);
    assert.equal(verificationCount, 1);
});

test('PortOne endpoint rejects missing consent, wrong amount, foreign origins and missing sessions', { timeout: 10000 }, async context => {
    let includeTestChannel = true;
    const base = await withServer(context, {
        portoneStoreId: 'store-test',
        portoneChannelKey: 'channel-test',
        portoneApiSecret: 'secret-test-only',
        portoneMode: 'test',
        paymentFetchImpl: async url => new Response(JSON.stringify({
            id: decodeURIComponent(new URL(url).pathname.split('/').at(-1)),
            status: 'PAID',
            amount: { total: 1 },
            currency: 'KRW',
            orderName: '데이나이즈 매일 영어 라이브 패스',
            ...(includeTestChannel ? { selectedChannel: { type: 'TEST' } } : {}),
            paymentMethod: { type: 'CARD' }
        }), { status: 200 })
    });

    const invalid = await createOrder(base, { ...buyer, termsConsent: false });
    assert.equal(invalid.response.status, 400);
    const created = await createOrder(base);
    const verifyUrl = `${base}/api/payment/verify`;
    const body = JSON.stringify({ paymentId: created.body.orderId });
    const withoutSession = await fetch(verifyUrl, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' },
        body
    });
    assert.equal(withoutSession.status, 401);

    const wrongAmount = await fetch(verifyUrl, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: created.cookie },
        body
    });
    assert.equal(wrongAmount.status, 409);

    const noChannelOrder = await createOrder(base);
    includeTestChannel = false;
    const noTestChannel = await fetch(verifyUrl, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: noChannelOrder.cookie },
        body: JSON.stringify({ paymentId: noChannelOrder.body.orderId })
    });
    assert.equal(noTestChannel.status, 409);

    const foreign = await fetch(`${base}/api/payment/config`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(foreign.status, 403);

    for (const origin of ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:8081']) {
        const preflight = await fetch(`${base}/api/payment/orders`, {
            method: 'OPTIONS',
            headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' }
        });
        assert.equal(preflight.status, 204, origin);
        assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
        assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    }
    const otherPort = await fetch(`${base}/api/payment/config`, { headers: { Origin: 'http://127.0.0.1:9999' } });
    assert.equal(otherPort.status, 403);
});

test('live NHN KCP checkout verifies only the configured live channel at the fixed price', { timeout: 10000 }, async context => {
    let channelType = 'LIVE';
    const base = await withServer(context, {
        portoneStoreId: 'store-live',
        portoneChannelKey: 'channel-live',
        portoneApiSecret: 'secret-live-only',
        portoneMode: 'live',
        portonePgProvider: 'NHN_KCP',
        paymentFetchImpl: async url => new Response(JSON.stringify({
            id: decodeURIComponent(new URL(url).pathname.split('/').at(-1)),
            status: 'PAID',
            amount: { total: 19000 },
            currency: 'KRW',
            orderName: '데이나이즈 매일 영어 라이브 패스',
            selectedChannel: { type: channelType },
            paymentMethod: { type: 'CARD' }
        }), { status: 200 })
    });
    const config = await (await fetch(`${base}/api/payment/config`, { headers: { Origin: new URL(base).origin } })).json();
    assert.equal(config.enabled, true);
    assert.equal(config.mode, 'live');
    assert.equal(config.pgProvider, 'NHN_KCP');
    assert.equal(config.amount, 19000);

    const created = await createOrder(base);
    assert.equal(created.response.status, 201);
    assert.equal(created.body.amount, 19000);
    const verify = () => fetch(`${base}/api/payment/verify`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: created.cookie },
        body: JSON.stringify({ paymentId: created.body.orderId })
    });
    assert.equal((await verify()).status, 200);

    const sandboxOrder = await createOrder(base);
    channelType = 'TEST';
    assert.equal((await fetch(`${base}/api/payment/verify`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: sandboxOrder.cookie },
        body: JSON.stringify({ paymentId: sandboxOrder.body.orderId })
    })).status, 409);
});

test('verify reports 402 with the PortOne status when the payment is not completed, then succeeds once paid', { timeout: 10000 }, async context => {
    let portoneStatus = 'READY';
    const base = await withServer(context, {
        portoneStoreId: 'store-test',
        portoneChannelKey: 'channel-test',
        portoneApiSecret: 'secret-test-only',
        portoneMode: 'test',
        paymentFetchImpl: async url => Response.json({
            id: decodeURIComponent(new URL(url).pathname.split('/').at(-1)),
            status: portoneStatus,
            amount: { total: 19000 },
            currency: 'KRW',
            orderName: '데이나이즈 매일 영어 라이브 패스',
            selectedChannel: { type: 'TEST' },
            paymentMethod: { type: 'CARD' },
            customer: { email: buyer.email, fullName: buyer.name, phoneNumber: buyer.phone }
        })
    });
    const created = await createOrder(base);
    const verify = () => fetch(`${base}/api/payment/verify`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: created.cookie },
        body: JSON.stringify({ paymentId: created.body.orderId })
    });
    const notPaid = await verify();
    assert.equal(notPaid.status, 402);
    assert.equal((await notPaid.json()).status, 'READY');
    portoneStatus = 'PAID';
    const paid = await verify();
    assert.equal(paid.status, 200);
    const result = await paid.json();
    assert.equal(result.success, true);
    assert.equal(result.status, 'PAID');
});

test('PortOne checkout reports configuration errors without a preparation placeholder', { timeout: 10000 }, async context => {
    const base = await withServer(context, { portoneStoreId: '', portoneChannelKey: '', portoneBillingChannelKey: '', portoneApiSecret: '', portoneMode: '' });
    const config = await fetch(`${base}/api/payment/config`, { headers: { Origin: new URL(base).origin } });
    assert.deepEqual(await config.json(), {
        enabled: false,
        mode: 'test',
        productName: '데이나이즈 매일 영어 라이브 패스',
        amount: 19000,
        billingEnabled: false,
        pgProvider: 'NHN_KCP'
    });
    const order = await createOrder(base);
    assert.equal(order.response.status, 503);
    assert.equal(order.body.code, 'PAYMENT_CONFIGURATION_ERROR');
    assert.doesNotMatch(order.body.error, /준비되지/);
});

test('payment and subscription orders use distinct KCP channels', async context => {
    const base = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-payment', portoneBillingChannelKey: '',
        portoneApiSecret: 'secret-test-only', portoneMode: 'test'
    });
    const payment = await createOrder(base);
    assert.equal(payment.body.paymentType, 'payment');
    assert.equal(payment.body.channelKey, 'channel-payment');
    const subscription = await createOrder(base, { ...buyer, paymentType: 'subscription' });
    assert.equal(subscription.response.status, 503);
    assert.equal(subscription.body.code, 'PAYMENT_CONFIGURATION_ERROR');
    assert.equal((await createOrder(base, { ...buyer, paymentType: 'invalid' })).response.status, 400);
});

test('billing authentication verifies issued key, order, customer and dedicated KCP channel', async context => {
    let channelKey = 'channel-billing';
    let channelPgProvider = 'NHN_KCP';
    let issueId;
    const base = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-payment', portoneBillingChannelKey: 'channel-billing',
        portoneApiSecret: 'secret-test-only', portoneMode: 'test',
        paymentFetchImpl: async url => {
            assert.match(url, /\/billing-keys\/billing-test\?storeId=store-test$/);
            return Response.json({
                status: 'ISSUED', billingKey: 'billing-test', storeId: 'store-test', issueId,
                customer: { id: issueId }, channels: [{ key: channelKey, type: 'TEST', pgProvider: channelPgProvider }]
            });
        }
    });
    assert.equal((await createOrder(base, { ...buyer, paymentType: 'subscription' })).response.status, 400);
    const created = await createOrder(base, { ...buyer, paymentType: 'subscription', billingConsent: true });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.channelKey, 'channel-billing');
    issueId = created.body.orderId;
    const verify = cookie => fetch(`${base}/api/payment/billing/verify`, {
        method: 'POST', headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ issueId, billingKey: 'billing-test' })
    });
    assert.equal((await verify()).status, 401);
    channelKey = 'channel-payment';
    assert.equal((await verify(created.cookie)).status, 409);
    channelKey = 'channel-billing';
    channelPgProvider = 'KCP_V2';
    const verified = await verify(created.cookie);
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).status, 'BILLING_AUTHENTICATED');
});
test('misconfiguration returns JSON errors instead of crashing the relay', async context => {
    const originalError = console.error;
    console.error = () => { };
    context.after(() => { console.error = originalError; });
    const badProvider = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-payment', portoneApiSecret: 'secret-test-only',
        portoneMode: 'test', portonePgProvider: 'NOT_A_PG'
    });
    const rejected = await createOrder(badProvider);
    assert.equal(rejected.response.status, 503);
    assert.equal(rejected.body.code, 'PAYMENT_CONFIGURATION_ERROR');
    assert.deepEqual(rejected.body.missing, ['PORTONE_PG_PROVIDER']);

    let broken = false;
    const failing = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-payment', portoneApiSecret: 'secret-test-only',
        portoneMode: 'test', paymentNow: () => { if (broken) throw new Error('boom'); return Date.now(); }
    });
    broken = true;
    const crashed = await createOrder(failing);
    assert.equal(crashed.response.status, 500);
    assert.equal(crashed.body.code, 'PAYMENT_INTERNAL_ERROR');
    assert.equal(crashed.response.headers.get('access-control-allow-origin'), new URL(failing).origin);
    broken = false;
    assert.equal((await createOrder(failing)).response.status, 201);
});

// 로그인한 사용자가 폼에 다른 이메일을 입력해도, 결제 엔티티는 세션 이메일로 귀속돼야
// hasActiveSubscription(session.email) 조회가 어긋나지 않는다 (카카오 이메일 미동의 fallback 포함).
test('a logged-in google buyer\'s order email is forced to the session email', { timeout: 10000 }, async context => {
    const base = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-test', portoneApiSecret: 'secret-test-only', portoneMode: 'test',
        googleClientId: 'google-client', googleClientSecret: 'google-secret', googleRedirectUri: 'https://api.daynize.co.kr/api/auth/google/callback',
        authSessionSecret: 'session-secret-for-tests',
        authFetchImpl: async url => {
            if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'token-google' });
            if (url.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) return Response.json({ sub: 'google-7', email: 'learner@example.com', name: '김하늘' });
            return Response.json({ error: 'unexpected upstream' }, { status: 500 });
        }
    });
    const authorizeResponse = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
    const state = new URL(authorizeResponse.headers.get('location')).searchParams.get('state');
    const stateCookie = authorizeResponse.headers.getSetCookie().find(line => line.startsWith('daynize_oauth_state='))?.split(';', 1)[0];
    const callback = await fetch(`${base}/api/auth/google/callback?code=abc&state=${state}`, { redirect: 'manual', headers: { Cookie: stateCookie } });
    const sessionCookie = callback.headers.getSetCookie().find(line => line.startsWith('daynize_session='))?.split(';', 1)[0];

    const response = await fetch(`${base}/api/payment/orders`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ ...buyer, email: 'someone-else@example.com' }) // 세션 이메일과 다른 값을 폼에 넣어도
    });
    const created = await response.json();
    assert.equal(response.status, 201);
    assert.equal(created.email, 'learner@example.com');
});

// 카카오 이메일 미동의 세션(합성 식별자)은 폼 이메일을 그대로 영수증으로 쓰고,
// 결제가 완료되면 그 영수증 이메일과 로그인 세션을 서버가 연결해 세션 쪽 권한도 함께 PAID로 전환해야 한다.
test('a no-consent kakao session keeps the typed receipt email, and paying unlocks the session itself', { timeout: 10000 }, async context => {
    let verifiedPaymentId;
    const base = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-test', portoneApiSecret: 'secret-test-only', portoneMode: 'test', portonePgProvider: 'NHN_KCP',
        kakaoClientId: 'kakao-client', kakaoClientSecret: 'kakao-secret', kakaoRedirectUri: 'https://api.daynize.co.kr/api/auth/kakao/callback',
        authSessionSecret: 'session-secret-for-tests',
        authFetchImpl: async (url, request = {}) => {
            if (url.startsWith('https://kauth.kakao.com/oauth/token')) return Response.json({ access_token: 'token-no-email' });
            if (url.startsWith('https://kapi.kakao.com/v2/user/me')) {
                assert.equal(request.headers.Authorization, 'Bearer token-no-email');
                return Response.json({ id: 998877, properties: { nickname: '카카오사용자' }, kakao_account: {} });
            }
            return Response.json({ error: 'unexpected upstream' }, { status: 500 });
        },
        paymentFetchImpl: async (url, request = {}) => {
            verifiedPaymentId = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
            assert.equal(request.headers.Authorization, 'PortOne secret-test-only');
            return Response.json({
                id: verifiedPaymentId, status: 'PAID', amount: { total: 19000 }, currency: 'KRW',
                orderName: '데이나이즈 매일 영어 라이브 패스', selectedChannel: { type: 'TEST' }, paymentMethod: { type: 'CARD' },
                customer: { email: buyer.email, fullName: buyer.name, phoneNumber: buyer.phone }
            });
        }
    });

    const authorizeResponse = await fetch(`${base}/api/auth/kakao`, { redirect: 'manual' });
    const state = new URL(authorizeResponse.headers.get('location')).searchParams.get('state');
    const stateCookie = authorizeResponse.headers.getSetCookie().find(line => line.startsWith('daynize_oauth_state='))?.split(';', 1)[0];
    const callback = await fetch(`${base}/api/auth/kakao/callback?code=no-email&state=${state}`, {
        redirect: 'manual', headers: { Cookie: stateCookie }
    });
    const sessionCookie = callback.headers.getSetCookie().find(line => line.startsWith('daynize_session='))?.split(';', 1)[0];
    assert.ok(sessionCookie);

    const beforePay = await (await fetch(`${base}/api/auth/me`, { headers: { Cookie: sessionCookie } })).json();
    assert.equal(beforePay.hasActiveSubscription, false);

    const orderResponse = await fetch(`${base}/api/payment/orders`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify(buyer) // buyer.email = 'learner@example.com', 세션 이메일(kakao_998877@kakao.daynize)과 다르다
    });
    const created = await orderResponse.json();
    assert.equal(orderResponse.status, 201);
    assert.equal(created.email, buyer.email); // 폼 이메일을 그대로 영수증으로 쓴다 (잠그지 않음)

    const checkoutCookie = orderResponse.headers.getSetCookie().find(line => line.startsWith('daynize_checkout='))?.split(';', 1)[0];
    const verify = await fetch(`${base}/api/payment/verify`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: `${sessionCookie}; ${checkoutCookie}` },
        body: JSON.stringify({ paymentId: created.orderId })
    });
    assert.equal(verify.status, 200);
    assert.equal(verifiedPaymentId, created.orderId);

    // 결제는 learner@example.com으로 됐지만, 로그인 세션(kakao_998877@kakao.daynize) 쪽도 PAID여야 한다.
    const afterPay = await (await fetch(`${base}/api/auth/me`, { headers: { Cookie: sessionCookie } })).json();
    assert.equal(afterPay.hasActiveSubscription, true);
    assert.equal(afterPay.user.membershipStatus, 'PAID');
    assert.equal(afterPay.user.email, 'kakao_998877@kakao.daynize');
});

// PortOne 승인 직후 조회 API가 짧게 404/5xx를 돌려주는 전파 지연이 실제 결제 성공을
// "결제가 확인되지 않았습니다" 오류로 오판하지 않아야 한다.
test('a transient PortOne lookup failure right after approval is retried, not treated as unpaid', { timeout: 10000 }, async context => {
    let calls = 0;
    const base = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-test', portoneApiSecret: 'secret-test-only',
        portoneMode: 'test', portonePgProvider: 'NHN_KCP',
        paymentFetchImpl: async (url, request) => {
            calls += 1;
            const orderId = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
            if (calls === 1) return new Response('Not Found', { status: 404 });
            return Response.json({
                id: orderId, status: 'PAID', amount: { total: 19000 }, currency: 'KRW',
                orderName: '데이나이즈 매일 영어 라이브 패스', selectedChannel: { type: 'TEST' }, paymentMethod: { type: 'CARD' },
                customer: { email: buyer.email, fullName: buyer.name, phoneNumber: buyer.phone }
            });
        }
    });
    const created = await createOrder(base);
    assert.equal(created.response.status, 201);
    const verify = await fetch(`${base}/api/payment/verify`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: created.cookie },
        body: JSON.stringify({ paymentId: created.body.orderId })
    });
    assert.equal(verify.status, 200);
    assert.equal((await verify.json()).status, 'PAID');
    assert.equal(calls, 2);
});

async function loginGoogle(base) {
    const authorizeResponse = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
    const state = new URL(authorizeResponse.headers.get('location')).searchParams.get('state');
    const stateCookie = authorizeResponse.headers.getSetCookie().find(line => line.startsWith('daynize_oauth_state='))?.split(';', 1)[0];
    const callback = await fetch(`${base}/api/auth/google/callback?code=abc&state=${state}`, { redirect: 'manual', headers: { Cookie: stateCookie } });
    return callback.headers.getSetCookie().find(line => line.startsWith('daynize_session='))?.split(';', 1)[0];
}

// /api/auth/profile가 단건 결제는 "결제일+30일"을 만료 예정일로, 정기 결제는 다음 청구 예정일로
// 계산해서 돌려줘야 프로필 UI의 "단건/정기 구분 + 다음 결제일" 표시가 맞게 나온다.
test('profile reports SINGLE payment type with a +30 day expiry after a one-time payment', { timeout: 10000 }, async context => {
    const base = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-test', portoneApiSecret: 'secret-test-only', portoneMode: 'test', portonePgProvider: 'NHN_KCP',
        googleClientId: 'google-client', googleClientSecret: 'google-secret', googleRedirectUri: 'https://api.daynize.co.kr/api/auth/google/callback',
        authSessionSecret: 'session-secret-for-tests',
        authFetchImpl: async url => {
            if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'token-google' });
            if (url.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) return Response.json({ sub: 'google-7', email: 'learner@example.com', name: '김하늘' });
            return Response.json({ error: 'unexpected upstream' }, { status: 500 });
        },
        paymentFetchImpl: async url => {
            const orderId = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
            return Response.json({
                id: orderId, status: 'PAID', amount: { total: 19000 }, currency: 'KRW',
                orderName: '데이나이즈 매일 영어 라이브 패스', selectedChannel: { type: 'TEST', key: 'channel-test' }, paymentMethod: { type: 'CARD' },
                customer: { email: 'learner@example.com', fullName: buyer.name, phoneNumber: buyer.phone }
            });
        }
    });
    const sessionCookie = await loginGoogle(base);
    const order = await fetch(`${base}/api/payment/orders`, {
        method: 'POST', headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify(buyer)
    });
    const created = await order.json();
    const checkoutCookie = order.headers.getSetCookie().find(line => line.startsWith('daynize_checkout='))?.split(';', 1)[0];
    const beforePay = Date.now();
    await fetch(`${base}/api/payment/verify`, {
        method: 'POST', headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: `${sessionCookie}; ${checkoutCookie}` },
        body: JSON.stringify({ paymentId: created.orderId })
    });

    const profile = await (await fetch(`${base}/api/auth/profile`, { headers: { Cookie: sessionCookie } })).json();
    assert.equal(profile.paymentType, 'SINGLE');
    const expectedExpiry = beforePay + 30 * 24 * 60 * 60 * 1000;
    assert.ok(Math.abs(new Date(profile.nextBillingDate).getTime() - expectedExpiry) < 10000, `expiry ${profile.nextBillingDate} should be ~30 days from payment`);
});

// 빌링키(정기결제) 채널로 들어온 웹훅은 paymentType을 'subscription'으로 구분해야
// 프로필이 "정기 구독 중"으로, next_billing_date도 갱신 기준으로 표시된다.
test('a webhook charge on the billing channel is classified as SUBSCRIPTION, not a one-time payment', { timeout: 10000 }, async context => {
    const base = await withServer(context, {
        portoneStoreId: 'store-test', portoneChannelKey: 'channel-single', portoneBillingChannelKey: 'channel-billing',
        portoneApiSecret: 'secret-test-only', portoneMode: 'test', portonePgProvider: 'NHN_KCP',
        googleClientId: 'google-client', googleClientSecret: 'google-secret', googleRedirectUri: 'https://api.daynize.co.kr/api/auth/google/callback',
        authSessionSecret: 'session-secret-for-tests',
        authFetchImpl: async url => {
            if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'token-google' });
            if (url.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) return Response.json({ sub: 'google-9', email: 'subscriber@example.com', name: '구독자' });
            return Response.json({ error: 'unexpected upstream' }, { status: 500 });
        },
        paymentFetchImpl: async () => Response.json({
            id: 'sub-charge-001', status: 'PAID', amount: { total: 19000 }, currency: 'KRW',
            orderName: '데이나이즈 매일 영어 라이브 패스', selectedChannel: { type: 'TEST', key: 'channel-billing' }, paymentMethod: { type: 'CARD' },
            customer: { email: 'subscriber@example.com', fullName: '구독자' }, paidAt: new Date().toISOString()
        })
    });
    const sessionCookie = await loginGoogle(base);

    const webhook = await fetch(`${base}/api/payment/webhook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Transaction.Paid', data: { paymentId: 'sub-charge-001' } })
    });
    assert.equal(webhook.status, 200);

    const profile = await (await fetch(`${base}/api/auth/profile`, { headers: { Cookie: sessionCookie } })).json();
    assert.equal(profile.paymentType, 'SUBSCRIPTION');
});
