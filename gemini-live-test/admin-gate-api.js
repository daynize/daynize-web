const { createHmac, timingSafeEqual } = require('node:crypto');
const { setCookie, readCookie } = require('./session-cookie');

// 관리자 게이트. 암호는 ADMIN_GATE_SECRET 과만 비교하고, 성공 시 서명 토큰을 발급한다.
//   POST /api/admin-gate   { password } → { ok, token } + Set-Cookie daynize_admin_auth (7일)
// 토큰은 암호 자체가 아니다. AUTH_SESSION_SECRET 으로 서명한 { role: 'admin', exp } 이다.

const ADMIN_COOKIE = 'daynize_admin_auth';
const ADMIN_TTL_S = 7 * 24 * 60 * 60;
const MAX_BODY_BYTES = 4 * 1024;
const MAX_PASSWORD_LENGTH = 200;
const MAX_FAILURES = 8;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;

function passwordsMatch(given, expected) {
    const digest = value => createHmac('sha256', 'daynize-admin-gate').update(String(value)).digest();
    const left = digest(given);
    const right = digest(expected);
    return timingSafeEqual(left, right);
}

function createAdminToken(codec, now = Date.now) {
    const exp = Math.floor(now() / 1000) + ADMIN_TTL_S;
    return codec.seal({ role: 'admin', exp });
}

function readAdminSession(request, codec, now = Date.now) {
    const value = codec.unseal(readCookie(request, ADMIN_COOKIE));
    // createCookieCodec also checks exp, but keep the authorization invariant here
    // so custom codecs/tests cannot accidentally turn an old admin cookie into a
    // permanent bypass.
    return value?.role === 'admin' && Number(value.exp) > Math.floor(now() / 1000) ? value : null;
}

function createAttemptLimiter(now) {
    const failures = new Map();
    const recent = ip => {
        const current = now();
        const hits = (failures.get(ip) || []).filter(at => current - at < FAILURE_WINDOW_MS);
        if (hits.length) failures.set(ip, hits);
        else failures.delete(ip);
        return hits;
    };
    return {
        limited: ip => recent(ip).length >= MAX_FAILURES,
        noteFailure: ip => {
            const hits = recent(ip);
            hits.push(now());
            failures.set(ip, hits);
        },
        clear: ip => failures.delete(ip)
    };
}

// Next route 와 Node 핸들러가 같은 판정을 쓰도록 분리한다.
function authorizeAdminAttempt({ password, secret, ip = 'unknown', limiter }) {
    if (limiter?.limited(ip)) {
        return { ok: false, status: 429, body: { ok: false, error: '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, retryAfter: '60' };
    }
    if (!secret) return { ok: false, status: 503, body: { ok: false, error: '관리자 게이트가 설정되지 않았습니다.' } };
    if (typeof password !== 'string' || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
        return { ok: false, status: 400, body: { ok: false, error: '암호를 입력해 주세요.' } };
    }
    if (!passwordsMatch(password, secret)) {
        limiter?.noteFailure(ip);
        return { ok: false, status: 401, body: { ok: false, error: '암호가 올바르지 않습니다.' } };
    }
    limiter?.clear(ip);
    return { ok: true, status: 200 };
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

async function readJsonBody(request) {
    const chunks = [];
    let total = 0;
    for await (const chunk of request) {
        total += chunk.length;
        if (total > MAX_BODY_BYTES) throw Object.assign(new Error('Body too large'), { status: 413 });
        chunks.push(chunk);
    }
    if (!total) return {};
    try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        throw Object.assign(new Error('Invalid JSON'), { status: 400 });
    }
}

function createAdminGateApi(options = {}) {
    const codec = options.codec;
    if (!codec) throw new Error('admin-gate-api requires a cookie codec.');
    const secret = options.secret !== undefined ? options.secret : (process.env.ADMIN_GATE_SECRET || '');
    const now = options.now ?? Date.now;
    const trustProxyHeaders = options.trustProxyHeaders ?? (process.env.NODE_ENV === 'production' || Boolean(process.env.FLY_APP_NAME));
    const allowedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const limiter = options.limiter ?? createAttemptLimiter(now);

    const loopbackHost = /^(localhost|127\.0\.0\.1|\[::1\]):\d+$/;
    const devOrigin = /^http:\/\/(localhost|127\.0\.0\.1):(5500|8081|8080|3000)$/;
    const isAllowedOrigin = (origin, request) => {
        if (typeof origin !== 'string') return false;
        if (allowedOrigins.includes(origin)) return true;
        const host = request.headers.host || '';
        return loopbackHost.test(host) && (origin === `http://${host}` || devOrigin.test(origin));
    };
    const corsHeaders = request => isAllowedOrigin(request.headers.origin, request) ? {
        'Access-Control-Allow-Origin': request.headers.origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin'
    } : {};

    const clientIp = request => {
        if (trustProxyHeaders) {
            const fly = request.headers['fly-client-ip'];
            if (typeof fly === 'string' && fly) return fly.trim();
            const forwarded = request.headers['x-forwarded-for'];
            if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
        }
        return request.socket.remoteAddress || 'unknown';
    };

    function isAdmin(request) {
        return Boolean(readAdminSession(request, codec, now));
    }

    async function handle(request, response, pathname) {
        if (pathname !== '/api/admin-gate' && pathname !== '/api/admin-gate/verify') return false;
        const cors = corsHeaders(request);
        try {
            if (request.method === 'OPTIONS') {
                response.writeHead(Object.keys(cors).length ? 204 : 403, { ...cors, 'Cache-Control': 'no-store' }).end();
                return true;
            }
            if (request.method !== 'POST') {
                json(response, 405, { ok: false, error: 'POST 만 지원합니다.' }, { ...cors, Allow: 'POST, OPTIONS' });
                return true;
            }
            const body = await readJsonBody(request);
            const result = authorizeAdminAttempt({ password: body.password, secret, ip: clientIp(request), limiter });
            if (!result.ok) {
                const extra = result.retryAfter ? { ...cors, 'Retry-After': result.retryAfter } : cors;
                json(response, result.status, result.body, extra);
                return true;
            }
            const token = createAdminToken(codec, now);
            json(response, 200, { ok: true, token }, { ...cors, 'Set-Cookie': setCookie(request, ADMIN_COOKIE, token, ADMIN_TTL_S) });
            return true;
        } catch (error) {
            const status = error.status ?? 500;
            if (status >= 500) console.error('[admin-gate] unexpected error', error);
            if (response.headersSent) response.destroy();
            else json(response, status, { ok: false, error: status >= 500 ? '잠시 후 다시 시도해 주세요.' : error.message }, cors);
            return true;
        }
    }

    return { handle, isAdmin, secretConfigured: Boolean(secret) };
}

module.exports = {
    ADMIN_COOKIE,
    ADMIN_TTL_S,
    passwordsMatch,
    createAdminToken,
    readAdminSession,
    createAttemptLimiter,
    authorizeAdminAttempt,
    createAdminGateApi
};
