const { randomBytes } = require('node:crypto');

const PRODUCT_NAME = '데이나이즈 매일 영어 라이브 패스';
const DEFAULT_AMOUNT = 49000;
const SESSION_COOKIE = 'daynize_checkout';
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_BODY_BYTES = 8192;

function normalizePhone(value) {
    const digits = value.replace(/\D/g, '');
    return digits.startsWith('82') ? `0${digits.slice(2)}` : digits;
}

function json(response, status, value, headers = {}) {
    response.writeHead(status, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        ...headers
    });
    response.end(JSON.stringify(value));
}

async function readJson(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw Object.assign(new Error('Invalid JSON body.'), { status: 400 });
    }
}

function createPaymentApi(options = {}) {
    const storeId = options.storeId ?? process.env.PORTONE_STORE_ID ?? '';
    const channelKey = options.channelKey ?? process.env.PORTONE_CHANNEL_KEY ?? '';
    const apiSecret = options.apiSecret ?? process.env.PORTONE_API_SECRET ?? '';
    const mode = options.mode ?? process.env.PORTONE_MODE ?? '';
    const pgProvider = options.pgProvider ?? process.env.PORTONE_PG_PROVIDER ?? 'HTML5_INICIS';
    const amount = Number(options.amount ?? process.env.PORTONE_AMOUNT ?? DEFAULT_AMOUNT);
    const allowedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const now = options.now ?? Date.now;
    const orders = new Map();
    let lastOrderTimestamp = 0;

    if (!['HTML5_INICIS', 'NHN_KCP'].includes(pgProvider)) throw new Error('PORTONE_PG_PROVIDER must be HTML5_INICIS or NHN_KCP.');
    if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('PORTONE_AMOUNT must be a positive integer.');

    const ready = () => mode === 'test' && Boolean(storeId.trim() && channelKey.trim() && apiSecret.trim());
    const allowedOrigin = (origin, request) => {
        if (typeof origin !== 'string') return false;
        if (allowedOrigins.includes(origin)) return true;
        const host = request.headers.host || '';
        return /^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host) && origin === `http://${host}`;
    };
    const cookieOptions = request => `HttpOnly; Path=/api/payment; Max-Age=${SESSION_TTL_MS / 1000}; SameSite=Lax${request.socket.encrypted || request.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;
    const cookieToken = request => (request.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    const cleanup = () => {
        const timestamp = now();
        for (const [id, order] of orders) if (order.expiresAt <= timestamp) orders.delete(id);
    };

    async function handle(request, response, pathname) {
        if (!pathname.startsWith('/api/payment/')) return false;
        const origin = request.headers.origin;
        const isAllowed = allowedOrigin(origin, request);
        const cors = isAllowed ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '600',
            Vary: 'Origin'
        } : {};

        if (request.method === 'OPTIONS') {
            response.writeHead(isAllowed ? 204 : 403, { ...cors, 'Cache-Control': 'no-store' }).end();
            return true;
        }
        if (!isAllowed) {
            json(response, 403, { error: '요청한 페이지에서 결제에 접근할 수 없습니다.' });
            return true;
        }
        if (pathname === '/api/payment/config' && request.method === 'GET') {
            json(response, 200, {
                enabled: ready(),
                mode: 'test',
                productName: PRODUCT_NAME,
                amount,
                pgProvider,
                ...(ready() ? { storeId, channelKey } : {})
            }, cors);
            return true;
        }
        if (!['/api/payment/orders', '/api/payment/verify'].includes(pathname)) {
            json(response, 404, { error: '결제 API 경로를 찾을 수 없습니다.' }, cors);
            return true;
        }
        if (request.method !== 'POST') {
            json(response, 405, { error: '지원하지 않는 요청입니다.' }, { ...cors, Allow: 'POST, OPTIONS' });
            return true;
        }
        if (!ready()) {
            json(response, 503, { error: 'PortOne 테스트 결제 설정이 완료되지 않았습니다.' }, cors);
            return true;
        }
        if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
            json(response, 415, { error: 'JSON 요청만 허용됩니다.' }, cors);
            request.resume();
            return true;
        }

        let body;
        try {
            body = await readJson(request);
        } catch (error) {
            json(response, error.status || 400, { error: error.status === 413 ? '요청 정보가 너무 큽니다.' : '요청 정보를 확인해 주세요.' }, cors);
            return true;
        }

        cleanup();
        if (pathname === '/api/payment/orders') {
            const name = typeof body.name === 'string' ? body.name.trim() : '';
            const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
            const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
            const digits = phone.replace(/\D/g, '');
            if (!body.privacyConsent || !body.termsConsent || !name || name.length > 80 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || digits.length < 9 || digits.length > 15) {
                json(response, 400, { error: '성함, 연락처, 이메일과 필수 약관 동의를 확인해 주세요.' }, cors);
                return true;
            }
            const timestamp = Math.max(now(), lastOrderTimestamp + 1);
            lastOrderTimestamp = timestamp;
            const orderId = `order_${timestamp}`;
            const token = randomBytes(32).toString('base64url');
            orders.set(orderId, {
                name,
                email,
                phone,
                status: 'PENDING',
                expiresAt: timestamp + SESSION_TTL_MS
            });
            json(response, 201, {
                orderId,
                orderName: PRODUCT_NAME,
                amount,
                currency: 'CURRENCY_KRW',
                payMethod: 'CARD',
                pgProvider,
                storeId,
                channelKey
            }, { ...cors, 'Set-Cookie': `${SESSION_COOKIE}=${token}; ${cookieOptions(request)}` });
            orders.get(orderId).sessionToken = token;
            return true;
        }

        const orderId = typeof body.paymentId === 'string' ? body.paymentId : '';
        const order = orders.get(orderId);
        const token = cookieToken(request);
        if (!/^order_\d{13}$/.test(orderId) || !order || !token || token !== order.sessionToken) {
            json(response, 401, { error: '결제 세션이 만료되었습니다. 신청 정보를 다시 입력해 주세요.' }, cors);
            return true;
        }
        if (order.status === 'PAID') {
            json(response, 200, { orderId, amount, email: order.email, status: 'PAID' }, cors);
            return true;
        }

        try {
            const upstream = await fetchImpl(`https://api.portone.io/payments/${encodeURIComponent(orderId)}`, {
                headers: { Authorization: `PortOne ${apiSecret}` },
                signal: AbortSignal.timeout(10000)
            });
            if (!upstream.ok) {
                json(response, 402, { error: '결제가 확인되지 않았습니다. 결제창에서 다시 시도해 주세요.' }, cors);
                return true;
            }
            const payment = await upstream.json();
            const selectedChannel = payment.selectedChannel ?? payment.channel;
            const customer = payment.customer || {};
            const paymentMethodType = payment.paymentMethod?.type ?? payment.method?.type;
            const matchingCustomer = (!customer.email || customer.email.trim().toLowerCase() === order.email) &&
                (!customer.fullName || customer.fullName.trim() === order.name) &&
                (!customer.phoneNumber || normalizePhone(customer.phoneNumber) === normalizePhone(order.phone));
            if (payment.id !== orderId || payment.status !== 'PAID' || payment.amount?.total !== amount ||
                payment.currency !== 'KRW' || payment.orderName !== PRODUCT_NAME ||
                selectedChannel?.type !== 'TEST' ||
                (paymentMethodType && paymentMethodType !== 'CARD') || !matchingCustomer) {
                json(response, 409, { error: '결제 정보가 신청 내용과 일치하지 않아 완료할 수 없습니다. 고객센터에 문의해 주세요.' }, cors);
                return true;
            }
            order.status = 'PAID';
            json(response, 200, { orderId, amount, email: order.email, status: 'PAID' }, cors);
        } catch {
            json(response, 502, { error: '결제 확인에 실패했습니다. 잠시 후 다시 확인해 주세요.' }, cors);
        }
        return true;
    }

    return { handle };
}

module.exports = { createPaymentApi };