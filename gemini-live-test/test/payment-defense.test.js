const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// server.js destructures these from payment-mailer at require-time, so mutating the
// (cached) exports object's properties *before* server.js is first required makes
// server.js pick up these mocks instead of opening a real SMTP connection. This lets
// us verify the grace-period / retry / suspension email triggers fire at the right
// moments without sending anything over the network.
const mailer = require('../payment-mailer');
const sentEmails = [];
mailer.sendPaymentFailedEmail = async ({ to, name }) => { sentEmails.push({ type: 'FAILED_NOTICE', to, name }); return true; };
mailer.sendSubscriptionSuspendedEmail = async ({ to, name }) => { sentEmails.push({ type: 'SUSPENDED_NOTICE', to, name }); return true; };
mailer.sendPaymentCompletionEmail = async () => true;

const { createRelayServer } = require('../server');
const { createStore } = require('../store');

const STORE_ID = 'store-test';
const CHANNEL_KEY = 'channel-test';
const BILLING_CHANNEL_KEY = 'billing-channel-test';
const API_SECRET = 'secret-test-only';

function tempStore(context) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daynize-payment-defense-'));
    const store = createStore({ path: path.join(dir, 'daynize.sqlite') });
    context.after(() => { store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
    return store;
}

async function withServer(context, options = {}) {
    const relay = createRelayServer({ apiKey: 'gemini-test-key', ...options });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    return `http://127.0.0.1:${relay.server.address().port}`;
}

async function waitUntil(predicate, { timeoutMs = 2000, intervalMs = 20 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const result = predicate();
        if (result) return result;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error('waitUntil: condition never became true');
}

test('실패 웹훅 재검증 → PAST_DUE 전환(접근 유지) + 안내 메일, 중복 웹훅은 메일 재발송 안 함', { timeout: 10000 }, async context => {
    sentEmails.length = 0;
    const store = tempStore(context);
    store.grantActiveSubscription({ email: 'learner@example.com', source: 'subscription-payment', paymentId: 'order_1', at: Date.now() });
    store.updateBillingDetails({ email: 'learner@example.com', billingKey: 'billing-key-abc', cardLabel: '신한카드 1234', at: Date.now() });

    const base = await withServer(context, {
        store,
        disablePastDueScheduler: true,
        portoneStoreId: STORE_ID,
        portoneChannelKey: CHANNEL_KEY,
        portoneBillingChannelKey: BILLING_CHANNEL_KEY,
        portoneApiSecret: API_SECRET,
        portoneMode: 'test',
        paymentFetchImpl: async url => {
            assert.match(url, /^https:\/\/api\.portone\.io\/payments\/retry_fail_1$/);
            return new Response(JSON.stringify({
                id: 'retry_fail_1',
                status: 'FAILED',
                selectedChannel: { key: BILLING_CHANNEL_KEY, type: 'TEST' },
                customer: { email: 'learner@example.com' }
            }), { status: 200 });
        }
    });

    assert.equal(store.getEntitlement('learner@example.com').status, 'PAID');

    const postWebhook = body => fetch(`${base}/api/payment/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const first = await postWebhook({ type: 'Transaction.Failed', data: { paymentId: 'retry_fail_1' } });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { received: true, ignored: false });

    const entitlement = store.getEntitlement('learner@example.com');
    assert.equal(entitlement.status, 'PAST_DUE');
    assert.ok(entitlement.past_due_since > 0);
    // 핵심 정책: 유예 기간 동안은 권한을 박탈하지 않는다.
    assert.equal(store.hasActiveSubscription('learner@example.com'), true);
    assert.equal(store.getMembershipStatus('learner@example.com'), 'PAID');
    assert.equal(sentEmails.length, 1);
    assert.deepEqual(sentEmails[0], { type: 'FAILED_NOTICE', to: 'learner@example.com', name: '' });

    // 같은 실패가 중복으로 들어와도(재전송 등) 이미 PAST_DUE라 메일을 또 보내지 않는다.
    const second = await postWebhook({ type: 'Transaction.Failed', data: { paymentId: 'retry_fail_1' } });
    assert.equal(second.status, 200);
    assert.equal(sentEmails.length, 1);
});

test('실패 재검증이 구독 채널이 아니거나 FAILED가 아니면 PAST_DUE로 전환하지 않음', { timeout: 10000 }, async context => {
    sentEmails.length = 0;
    const store = tempStore(context);
    store.grantActiveSubscription({ email: 'learner@example.com', source: 'subscription-payment', paymentId: 'order_1', at: Date.now() });

    const base = await withServer(context, {
        store,
        disablePastDueScheduler: true,
        portoneStoreId: STORE_ID,
        portoneChannelKey: CHANNEL_KEY,
        portoneBillingChannelKey: BILLING_CHANNEL_KEY,
        portoneApiSecret: API_SECRET,
        portoneMode: 'test',
        // 단건결제 채널(일반 channelKey)에서 난 실패 — 정기결제 방어 로직의 대상이 아니다.
        paymentFetchImpl: async () => new Response(JSON.stringify({
            id: 'retry_fail_2', status: 'FAILED',
            selectedChannel: { key: CHANNEL_KEY, type: 'TEST' },
            customer: { email: 'learner@example.com' }
        }), { status: 200 })
    });

    const response = await fetch(`${base}/api/payment/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Transaction.Failed', data: { paymentId: 'retry_fail_2' } })
    });
    assert.equal(response.status, 200);
    assert.equal(store.getEntitlement('learner@example.com').status, 'PAID');
    assert.equal(sentEmails.length, 0);
});

test('자동 재결제 스케줄러: 1일차 재시도 성공 시 즉시 ACTIVE(PAID)로 복구', { timeout: 10000 }, async context => {
    sentEmails.length = 0;
    const store = tempStore(context);
    store.grantActiveSubscription({ email: 'learner@example.com', source: 'subscription-payment', paymentId: 'order_1', at: Date.now() });
    store.updateBillingDetails({ email: 'learner@example.com', billingKey: 'billing-key-abc', cardLabel: '신한카드 1234', at: Date.now() });
    // past_due_since를 실제로 1.5일 전으로 심어서(절대 과거 시각이므로 Date.now()를 흉내 낼 필요가 없다),
    // 스케줄러가 처음 스캔하는 순간 "1일 후 재시도" 슬롯이 바로 도달해 있게 한다.
    store.markPastDue({ email: 'learner@example.com', at: Date.now() - 1.5 * 24 * 60 * 60 * 1000 });

    let chargeCalls = 0;
    await withServer(context, {
        store,
        pastDueScanIntervalMs: 30,
        portoneStoreId: STORE_ID,
        portoneChannelKey: CHANNEL_KEY,
        portoneBillingChannelKey: BILLING_CHANNEL_KEY,
        portoneApiSecret: API_SECRET,
        portoneMode: 'test',
        paymentFetchImpl: async (url, request) => {
            assert.match(url, /^https:\/\/api\.portone\.io\/payments\/retry_learner_example_com_\d+\/billing-key$/);
            assert.equal(request.method, 'POST');
            chargeCalls += 1;
            return new Response(JSON.stringify({ status: 'PAID', paidAt: new Date().toISOString() }), { status: 200 });
        }
    });

    await waitUntil(() => store.getEntitlement('learner@example.com').status === 'PAID');
    assert.equal(chargeCalls, 1);
    const entitlement = store.getEntitlement('learner@example.com');
    assert.equal(entitlement.status, 'PAID');
    assert.equal(entitlement.has_active_subscription, 1);
    assert.equal(sentEmails.length, 0);
});

test('자동 재결제 스케줄러: 3일차 재시도까지 실패하면 구독 정지 + 정지 안내 메일', { timeout: 10000 }, async context => {
    sentEmails.length = 0;
    const store = tempStore(context);
    store.grantActiveSubscription({ email: 'learner@example.com', source: 'subscription-payment', paymentId: 'order_1', at: Date.now() });
    store.updateBillingDetails({ email: 'learner@example.com', billingKey: 'billing-key-abc', cardLabel: '신한카드 1234', at: Date.now() });
    store.markPastDue({ email: 'learner@example.com', at: Date.now() - 3.5 * 24 * 60 * 60 * 1000 });
    // 1일차 재시도는 이미 실패해서 끝났다고 가정(retry_count=1) → 다음 스캔은 3일차(마지막) 슬롯으로 판정된다.
    store.recordRetryAttempt('learner@example.com', Date.now() - 2.5 * 24 * 60 * 60 * 1000);

    let chargeCalls = 0;
    await withServer(context, {
        store,
        pastDueScanIntervalMs: 30,
        portoneStoreId: STORE_ID,
        portoneChannelKey: CHANNEL_KEY,
        portoneBillingChannelKey: BILLING_CHANNEL_KEY,
        portoneApiSecret: API_SECRET,
        portoneMode: 'test',
        paymentFetchImpl: async () => {
            chargeCalls += 1;
            return new Response(JSON.stringify({ status: 'FAILED' }), { status: 200 });
        }
    });

    await waitUntil(() => store.getEntitlement('learner@example.com').status === 'SUSPENDED');
    assert.equal(chargeCalls, 1);
    const entitlement = store.getEntitlement('learner@example.com');
    assert.equal(entitlement.has_active_subscription, 0);
    assert.equal(store.hasActiveSubscription('learner@example.com'), false);
    assert.equal(sentEmails.length, 1);
    assert.deepEqual(sentEmails[0], { type: 'SUSPENDED_NOTICE', to: 'learner@example.com', name: '' });
});

test('PAST_DUE 상태에서 카드 변경 시 즉시 미납분을 재청구해 ACTIVE로 복구', { timeout: 10000 }, async context => {
    sentEmails.length = 0;
    const store = tempStore(context);
    store.grantActiveSubscription({ email: 'learner@example.com', source: 'subscription-payment', paymentId: 'order_1', at: Date.now() });
    store.markPastDue({ email: 'learner@example.com', at: Date.now() });

    let capturedOrderId = null;
    const base = await withServer(context, {
        store,
        disablePastDueScheduler: true,
        portoneStoreId: STORE_ID,
        portoneChannelKey: CHANNEL_KEY,
        portoneBillingChannelKey: BILLING_CHANNEL_KEY,
        portoneApiSecret: API_SECRET,
        portoneMode: 'test',
        portonePgProvider: 'NHN_KCP',
        paymentFetchImpl: async (url, request) => {
            const parsed = new URL(url);
            if (parsed.pathname.startsWith('/billing-keys/')) {
                const billingKey = decodeURIComponent(parsed.pathname.split('/').at(-1));
                return new Response(JSON.stringify({
                    status: 'ISSUED',
                    billingKey,
                    storeId: STORE_ID,
                    issueId: capturedOrderId,
                    customer: { id: capturedOrderId },
                    channels: [{ key: BILLING_CHANNEL_KEY, pgProvider: 'KCP_V2', type: 'TEST' }],
                    methods: [{ type: 'BillingKeyPaymentMethodCard', card: { issuer: '신한카드', number: '1234' } }]
                }), { status: 200 });
            }
            if (parsed.pathname.endsWith('/billing-key') && request.method === 'POST') {
                return new Response(JSON.stringify({ status: 'PAID', paidAt: new Date().toISOString() }), { status: 200 });
            }
            throw new Error(`unexpected upstream call: ${url}`);
        }
    });

    const orderResponse = await fetch(`${base}/api/payment/orders`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: '김하늘', phone: '010-1234-5678', email: 'learner@example.com',
            privacyConsent: true, termsConsent: true, billingConsent: true, paymentType: 'subscription'
        })
    });
    assert.equal(orderResponse.status, 201);
    const order = await orderResponse.json();
    capturedOrderId = order.orderId;
    const cookie = orderResponse.headers.get('set-cookie')?.split(';', 1)[0];

    const verifyResponse = await fetch(`${base}/api/payment/billing/verify`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ issueId: order.orderId, billingKey: 'billing-key-new-card' })
    });
    assert.equal(verifyResponse.status, 200);
    const verified = await verifyResponse.json();
    assert.equal(verified.recovered, true);

    const entitlement = store.getEntitlement('learner@example.com');
    assert.equal(entitlement.status, 'PAID');
    assert.equal(entitlement.billing_key, 'billing-key-new-card');
    assert.equal(entitlement.card_label, '신한카드 1234');
});
