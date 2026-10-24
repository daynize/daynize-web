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
