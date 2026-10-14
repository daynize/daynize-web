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
        paymentFetchImpl: async (url, request) => {
            verificationCount += 1;
            assert.match(url, /\/payments\/order_\d{13}$/);
            assert.equal(request.headers.Authorization, 'PortOne secret-test-only');
            const orderId = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
            return new Response(JSON.stringify({
                id: orderId,
                status: 'PAID',
                amount: { total: 49000 },
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
    assert.equal(config.pgProvider, 'NHN_KCP');
    assert.equal(config.amount, 49000);
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
        amount: 49000,
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
});

test('PortOne checkout remains disabled until test credentials and mode are configured', { timeout: 10000 }, async context => {
    const base = await withServer(context);
    const config = await fetch(`${base}/api/payment/config`, { headers: { Origin: new URL(base).origin } });
    assert.deepEqual(await config.json(), {
        enabled: false,
        mode: 'test',
        productName: '데이나이즈 매일 영어 라이브 패스',
        amount: 49000,
        pgProvider: 'HTML5_INICIS'
    });
    const order = await createOrder(base);
    assert.equal(order.response.status, 503);
});