import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../gemini-live-test/node_modules/playwright/index.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        const pathname = url.pathname === '/payment/success' || url.pathname === '/payment/success/'
            ? '/payment/success/index.html'
            : url.pathname === '/' ? '/index.html' : url.pathname;
        const file = path.resolve(root, `.${decodeURIComponent(pathname)}`);
        const relative = path.relative(root, file);
        if (relative.startsWith('..') || path.isAbsolute(relative)) return response.writeHead(403).end();
        const metadata = await stat(file);
        const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
        response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
        response.setHeader('Content-Length', metadata.size);
        response.writeHead(200);
        createReadStream(file).pipe(response);
    } catch { response.writeHead(404).end(); }
});

test('course enrollment form is clear and validates required details on desktop and mobile', { timeout: 60000 }, async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ headless: true });
    try {
        for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
            const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => {
                const readSession = (key, fallback) => {
                    try { return JSON.parse(sessionStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
                };
                const writeSession = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
                let orderSequence = Date.now();
                const orders = readSession('mock-orders', {});
                window.__paymentRequests = readSession('mock-payment-requests', []);
                window.__billingRequests = [];
                window.__cancelNextPayment = true;
                window.__throwNextPayment = false;
                window.PortOne = {
                    requestIssueBillingKey: async options => {
                        window.__billingRequests.push(options);
                        return { billingKey: 'billing-test' };
                    },
                    requestPayment: async options => {
                        window.__paymentRequests.push(options);
                        writeSession('mock-payment-requests', window.__paymentRequests);
                        if (window.__throwNextPayment) {
                            window.__throwNextPayment = false;
                            throw new Error('SDK failure');
                        }
                        if (window.__cancelNextPayment) return { code: 'USER_CANCEL', message: '결제가 취소되었습니다.' };
                        return { paymentId: options.paymentId };
                    }
                };
                const originalFetch = window.fetch.bind(window);
                window.fetch = async (input, init = {}) => {
                    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
                    if (url.origin !== 'http://127.0.0.1:8081') return originalFetch(input, init);
                    if (url.pathname === '/api/payment/config') {
                        return Response.json({ enabled: true, mode: 'test', amount: 19000, pgProvider: 'NHN_KCP', storeId: 'store-test', channelKey: 'channel-test' });
                    }
                    if (url.pathname === '/api/payment/orders') {
                        const buyer = JSON.parse(init.body);
                        orderSequence = Math.max(Date.now(), orderSequence + 1);
                        const orderId = `order_${orderSequence}`;
                        orders[orderId] = buyer;
                        writeSession('mock-orders', orders);
                        return Response.json({ orderId, paymentType: buyer.paymentType, amount: 19000, orderName: '데이나이즈 매일 영어 라이브 패스', currency: 'CURRENCY_KRW', payMethod: 'CARD', pgProvider: 'NHN_KCP', storeId: 'store-test', channelKey: buyer.paymentType === 'subscription' ? 'channel-billing-test' : 'channel-test' }, { status: 201 });
                    }
                    if (url.pathname === '/api/payment/billing/verify') {
                        const { issueId, billingKey } = JSON.parse(init.body);
                        if (!orders[issueId] || billingKey !== 'billing-test') return Response.json({ error: 'invalid billing authentication' }, { status: 409 });
                        return Response.json({ orderId: issueId, email: orders[issueId].email, status: 'BILLING_AUTHENTICATED' });
                    }
                    if (url.pathname === '/api/payment/verify') {
                        const { paymentId } = JSON.parse(init.body);
                        const buyer = orders[paymentId];
                        if (!buyer) return Response.json({ error: 'unknown order' }, { status: 401 });
                        return Response.json({ orderId: paymentId, amount: 19000, email: buyer.email, status: 'PAID' });
                    }
                    return Response.json({ error: 'not found' }, { status: 404 });
                };
            });
            await page.route('https://cdn.portone.io/**', route => route.abort());
            await page.goto(base);

            const form = page.locator('#registration-form');
            const submit = form.locator('[type="submit"]');
            assert.match(await form.locator('.product-summary').innerText(), /선택 중인 코스[\s\S]*데이나이즈 매일 영어 라이브 패스/);
            assert.equal(await form.locator('.product-summary-price').innerText(), '19,000원 (VAT 포함)');
            assert.doesNotMatch(await form.innerText(), /테스트|Test/i);
            const mainFooter = page.locator('.site-footer');
            assert.match(await mainFooter.locator('.business-info').evaluate(element => element.textContent), /데이나이즈[\s\S]*강성준[\s\S]*665-13-02896[\s\S]*070-4010-1147[\s\S]*contact@daynize\.co\.kr/);
            assert.equal(await mainFooter.locator('.footer-links [data-open-legal]').count(), 2);
            for (const dialogId of ['terms-dialog', 'privacy-dialog']) {
                const dialog = page.locator(`#${dialogId}`);
                assert.doesNotMatch(await dialog.evaluate(element => element.textContent), /테스트|Test/i);
            }
            assert.equal(await form.locator('select, #time').count(), 0);
            assert.equal(await form.locator('.legal-notice').count(), 0);
            assert.equal(await form.locator('input[name="email"][type="email"][required]').count(), 1);
            assert.equal(await submit.isDisabled(), true);
            assert.match(await form.locator('.security-note').innerText(), /안전한 결제 및 수강 안내 보장/);
            assert.equal(await form.locator('#form-validation-message').isVisible(), true);

            await form.locator('#name').fill('   ');
            await form.locator('#phone').fill('010-1234-5678');
            await form.locator('#email').fill('learner@example.com');
            await form.locator('#privacy-consent').check();
            await form.locator('#terms-consent').check();
            assert.equal(await submit.isDisabled(), true);

            await form.locator('#name').fill('김하늘');
            assert.equal(await submit.isDisabled(), false);
            await form.locator('#terms-consent').uncheck();
            assert.equal(await submit.isDisabled(), true);
            await form.locator('#terms-consent').check();
            await form.locator('#privacy-consent').uncheck();
            assert.equal(await submit.isDisabled(), true);
            await form.locator('#privacy-consent').check();
            await form.locator('#phone').fill('010-');
            assert.equal(await submit.isDisabled(), true);
            await form.locator('#phone').fill('010-1234-5678');
            assert.equal(await submit.isDisabled(), false);
            await form.locator('#email').fill('not-an-email');
            assert.equal(await submit.isDisabled(), true);
            await form.locator('#email').fill('learner@example.com');
            assert.equal(await submit.isDisabled(), false);
            assert.equal(await form.locator('#form-validation-message').isHidden(), true);

            await page.evaluate(() => { window.__throwNextPayment = true; });
            await submit.click();
            await page.waitForFunction(() => window.__paymentRequests.length === 1);
            await page.waitForFunction(() => document.querySelector('#form-message')?.textContent.includes('결제를 진행하지 못했습니다'));
            assert.equal(await page.evaluate(() => window.__paymentRequests.length), 1);
            assert.equal(await submit.isDisabled(), false);
            assert.deepEqual(errors, []);

            await submit.click();
            await page.waitForFunction(() => window.__paymentRequests.length === 2);
            assert.match(await page.locator('#form-message').innerText(), /결제가 취소되었습니다/);
            assert.equal(await form.locator('#name').inputValue(), '김하늘');
            assert.equal(await form.locator('#email').inputValue(), 'learner@example.com');
            assert.equal(await form.locator('#privacy-consent').isChecked(), true);

            await page.evaluate(() => sessionStorage.setItem('daynize.checkout.resume.v1', JSON.stringify({
                name: '김하늘', phone: '010-1234-5678', email: 'learner@example.com', privacyConsent: 'on', termsConsent: 'on'
            })));
            await page.goto(`${base}/payment/success?code=USER_CANCEL&message=cancelled&resume=1`);
            assert.equal(await page.locator('#title').innerText(), '결제를 완료하지 못했습니다');
            await page.locator('#return-link').click();
            await page.waitForFunction(() => document.querySelector('#name')?.value === '김하늘');
            assert.equal(await form.locator('#name').inputValue(), '김하늘');
            assert.equal(await form.locator('#email').inputValue(), 'learner@example.com');
            assert.equal(await form.locator('#terms-consent').isChecked(), true);

            await form.locator('[name="paymentType"][value="subscription"]').check();
            assert.equal(await submit.isDisabled(), true);
            assert.equal(await form.locator('#billing-consent-row').isVisible(), true);
            await form.locator('#billing-consent').check();
            await submit.click();
            await page.waitForFunction(() => document.querySelector('#form-message')?.textContent.includes('정기결제 카드 인증이 완료되었습니다'));
            const billingRequest = await page.evaluate(() => window.__billingRequests.at(-1));
            assert.equal(billingRequest.channelKey, 'channel-billing-test');
            assert.equal(billingRequest.billingKeyMethod, 'CARD');
            assert.equal(billingRequest.customer.customerId, billingRequest.issueId);
            assert.equal(billingRequest.offerPeriod.interval, '1m');
            assert.equal(billingRequest.displayAmount, 19000);
            assert.equal('paymentId' in billingRequest, false);
            assert.equal(new URL(billingRequest.redirectUrl).searchParams.get('type'), 'subscription');
            await page.goto(`${base}/payment/success?type=subscription&issueId=${billingRequest.issueId}&billingKey=billing-test`);
            await page.waitForFunction(() => document.querySelector('#title')?.textContent === '정기결제 카드 인증이 완료되었습니다');
            assert.equal(new URL(page.url()).searchParams.has('billingKey'), false);
            assert.match(await page.locator('#status').innerText(), /아직 요금이 청구되지/);
            await page.goto(base);
            await form.locator('#name').fill('김하늘');
            await form.locator('#phone').fill('010-1234-5678');
            await form.locator('#email').fill('learner@example.com');
            await form.locator('#privacy-consent').check();
            await form.locator('#terms-consent').check();

            await page.evaluate(() => { window.__cancelNextPayment = false; });
            await submit.click();
            await page.waitForURL(/\/payment\/success\?orderId=order_\d{13}&amount=19000&email=learner%40example\.com/);
            await page.locator('#title').waitFor();
            await page.waitForFunction(() => document.querySelector('#title')?.textContent === '수강 신청이 완료되었습니다');
            const paymentRequest = await page.evaluate(() => window.__paymentRequests.at(-1));
            assert.equal(paymentRequest.orderName, '데이나이즈 매일 영어 라이브 패스');
            assert.equal(paymentRequest.totalAmount, 19000);
            assert.equal(paymentRequest.payMethod, 'CARD');
            assert.equal(paymentRequest.customer.fullName, '김하늘');
            assert.equal(paymentRequest.customer.phoneNumber, '010-1234-5678');
            assert.equal(paymentRequest.customer.email, 'learner@example.com');
            assert.equal(new URL(paymentRequest.redirectUrl).pathname, '/payment/success');
            assert.equal(new URL(paymentRequest.redirectUrl).searchParams.get('resume'), '1');
            assert.match(await page.locator('#status').innerText(), /결제가 확인되었습니다/);
            assert.match(await page.locator('.business-info').innerText(), /데이나이즈[\s\S]*강성준[\s\S]*665-13-02896[\s\S]*070-4010-1147[\s\S]*contact@daynize\.co\.kr/);
            assert.equal(await page.locator('.footer-links a').count(), 2);
            assert.match(await page.locator('.footer-links a[href="/#terms-dialog"]').getAttribute('href'), /terms-dialog/);
            assert.match(await page.locator('.footer-links a[href="/#privacy-dialog"]').getAttribute('href'), /privacy-dialog/);
            assert.deepEqual(errors, []);
            await page.close();
        }

        const staleConfigPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        await staleConfigPage.addInitScript(() => {
            window.__orderRequests = 0;
            window.__paymentCalls = 0;
            window.PortOne = { requestPayment: async () => { window.__paymentCalls += 1; } };
            const originalFetch = window.fetch.bind(window);
            window.fetch = async (input, init = {}) => {
                const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
                if (url.origin === 'http://127.0.0.1:8081' && url.pathname === '/api/payment/config') {
                    return Response.json({ enabled: true, mode: 'test', amount: 49000, pgProvider: 'HTML5_INICIS', storeId: 'store-old', channelKey: 'channel-old' });
                }
                if (url.origin === 'http://127.0.0.1:8081' && url.pathname === '/api/payment/orders') {
                    window.__orderRequests += 1;
                    return Response.json({ orderId: 'old-order', amount: 49000, pgProvider: 'HTML5_INICIS' }, { status: 201 });
                }
                return originalFetch(input, init);
            };
        });
        await staleConfigPage.goto(base);
        const staleForm = staleConfigPage.locator('#registration-form');
        await staleForm.locator('#name').fill('김하늘');
        await staleForm.locator('#phone').fill('010-1234-5678');
        await staleForm.locator('#email').fill('learner@example.com');
        await staleForm.locator('#privacy-consent').check();
        await staleForm.locator('#terms-consent').check();
        assert.equal(await staleForm.locator('.product-summary-price').innerText(), '19,000원 (VAT 포함)');
        await staleForm.locator('[type="submit"]').click();
        await staleConfigPage.waitForFunction(() => document.querySelector('#form-message')?.textContent.includes('주문 정보와 KCP 결제 채널이 일치하지 않습니다'));
        assert.equal(await staleConfigPage.evaluate(() => window.__orderRequests), 1);
        assert.equal(await staleConfigPage.evaluate(() => window.__paymentCalls), 0);
        await staleConfigPage.close();

        const stuckPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const stuckLogs = [];
        stuckPage.on('console', message => stuckLogs.push(`${message.type()}: ${message.text()}`));
        await stuckPage.addInitScript(() => {
            window.PortOne = { requestIssueBillingKey: () => new Promise(() => { }) };
            const originalFetch = window.fetch.bind(window);
            window.fetch = async (input, init = {}) => {
                const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
                if (url.origin !== 'http://127.0.0.1:8081') return originalFetch(input, init);
                return Response.json({ orderId: 'order_1792721130439', paymentType: 'subscription', amount: 19000, orderName: '월 구독', currency: 'CURRENCY_KRW', payMethod: 'CARD', pgProvider: 'NHN_KCP', storeId: 'store-test', channelKey: 'channel-billing-test' }, { status: 201 });
            };
        });
        await stuckPage.clock.install();
        await stuckPage.goto(base);
        const stuckForm = stuckPage.locator('#registration-form');
        await stuckForm.locator('input[name="paymentType"][value="subscription"]').check();
        await stuckForm.locator('#name').fill('김하늘');
        await stuckForm.locator('#phone').fill('010-1234-5678');
        await stuckForm.locator('#email').fill('learner@example.com');
        await stuckForm.locator('#privacy-consent').check();
        await stuckForm.locator('#terms-consent').check();
        await stuckForm.locator('#billing-consent').check();
        await stuckForm.locator('[type="submit"]').click();
        await stuckPage.waitForFunction(() => document.querySelector('#form-message')?.textContent.includes('카드 등록창을 여는 중'));
        assert.equal(await stuckForm.locator('[type="submit"]').isDisabled(), true);
        await stuckPage.clock.fastForward(21000);
        await stuckPage.waitForFunction(() => document.querySelector('#form-message')?.textContent.includes('결제창이 보이지 않으면'));
        // A slow-but-open payment window must stay locked so a second order cannot replace the checkout cookie.
        assert.equal(await stuckForm.locator('[type="submit"]').isDisabled(), true);
        assert.ok(stuckLogs.some(line => line.startsWith('warning:') && line.includes('requestIssueBillingKey still pending')), stuckLogs.join('\n'));
        await stuckPage.close();
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
});