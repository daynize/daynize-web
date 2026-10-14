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
        response.setHeader('Content-Type', path.extname(file) === '.html' ? 'text/html' : 'application/octet-stream');
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
            const page = await browser.newPage({ viewport });
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
                window.__cancelNextPayment = true;
                window.PortOne = {
                    requestPayment: async options => {
                        window.__paymentRequests.push(options);
                        writeSession('mock-payment-requests', window.__paymentRequests);
                        if (window.__cancelNextPayment) return { code: 'USER_CANCEL', message: '결제가 취소되었습니다.' };
                        return { paymentId: options.paymentId };
                    }
                };
                const originalFetch = window.fetch.bind(window);
                window.fetch = async (input, init = {}) => {
                    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
                    if (url.origin !== 'https://api.daynize.co.kr') return originalFetch(input, init);
                    if (url.pathname === '/api/payment/config') {
                        return Response.json({ enabled: true, mode: 'test', amount: 49000, pgProvider: 'HTML5_INICIS', storeId: 'store-test', channelKey: 'channel-test' });
                    }
                    if (url.pathname === '/api/payment/orders') {
                        const buyer = JSON.parse(init.body);
                        orderSequence = Math.max(Date.now(), orderSequence + 1);
                        const orderId = `order_${orderSequence}`;
                        orders[orderId] = buyer;
                        writeSession('mock-orders', orders);
                        return Response.json({ orderId, amount: 49000, orderName: '데이나이즈 매일 영어 라이브 패스', currency: 'CURRENCY_KRW', payMethod: 'CARD', storeId: 'store-test', channelKey: 'channel-test' }, { status: 201 });
                    }
                    if (url.pathname === '/api/payment/verify') {
                        const { paymentId } = JSON.parse(init.body);
                        const buyer = orders[paymentId];
                        if (!buyer) return Response.json({ error: 'unknown order' }, { status: 401 });
                        return Response.json({ orderId: paymentId, amount: 49000, email: buyer.email, status: 'PAID' });
                    }
                    return Response.json({ error: 'not found' }, { status: 404 });
                };
            });
            await page.route('https://cdn.portone.io/**', route => route.abort());
            await page.goto(base);

            const form = page.locator('#registration-form');
            const submit = form.locator('[type="submit"]');
            assert.match(await form.locator('.product-summary').innerText(), /선택 중인 코스[\s\S]*데이나이즈 매일 영어 라이브 패스/);
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

            await submit.click();
            await page.waitForFunction(() => window.__paymentRequests.length === 1);
            assert.equal(await page.evaluate(() => window.__paymentRequests.length), 1, await page.locator('#form-message').innerText());
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

            await page.evaluate(() => { window.__cancelNextPayment = false; });
            await submit.click();
            await page.waitForURL(/\/payment\/success\?orderId=order_\d{13}&amount=49000&email=learner%40example\.com/);
            await page.locator('#title').waitFor();
            await page.waitForFunction(() => document.querySelector('#title')?.textContent === '수강 신청이 완료되었습니다');
            const paymentRequest = await page.evaluate(() => window.__paymentRequests.at(-1));
            assert.equal(paymentRequest.orderName, '데이나이즈 매일 영어 라이브 패스');
            assert.equal(paymentRequest.totalAmount, 49000);
            assert.equal(paymentRequest.payMethod, 'CARD');
            assert.equal(paymentRequest.customer.fullName, '김하늘');
            assert.equal(paymentRequest.customer.phoneNumber, '010-1234-5678');
            assert.equal(paymentRequest.customer.email, 'learner@example.com');
            assert.equal(new URL(paymentRequest.redirectUrl).pathname, '/payment/success');
            assert.equal(new URL(paymentRequest.redirectUrl).searchParams.get('resume'), '1');
            assert.match(await page.locator('#status').innerText(), /실제 청구는 발생하지 않았습니다/);
            assert.deepEqual(errors, []);
            await page.close();
        }
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
});