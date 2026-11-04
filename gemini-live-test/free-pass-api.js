const { randomUUID } = require('node:crypto');
const { GUEST_COOKIE, setCookie, readCookie, readSession } = require('./session-cookie');

// 비회원 10분 무료 체험(Free Pass) API. auth-api/payment-api와 같은 모듈 패턴.
//   POST /api/free-pass/start       패스 조회/발급 + 남은 시간 (게스트 쿠키 발급)
//   GET  /api/free-pass/status      조회만 (새 패스 발급 없음)
//   POST /api/free-pass/migrate     로그인 직후 로컬 학습 데이터 업로드 (회원 전용)
//   GET  /api/free-pass/study-data  저장된 학습 데이터 (회원 전용)
// 쿠키를 지워도 (IP + fingerprint) 가 같으면 기존 패스를 재사용하고,
// 같은 IP 에서 하루 발급 수가 상한을 넘으면 그 IP 의 첫 패스로 판정해 무한 재유입을 막는다.

const DEFAULT_DURATION_MS = 10 * 60 * 1000;
const GUEST_COOKIE_TTL_S = 365 * 24 * 60 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_STUDY_KEYS = 32;
const STUDY_KEY_PATTERN = /^[\w.\-]{1,64}$/;
const FINGERPRINT_PATTERN = /^[a-f0-9]{8,64}$/i;

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

const userKeyOf = session => `${session.provider}:${session.id}`;

function createFreePassApi(options = {}) {
    const { store, codec } = options;
    if (!store || !codec) throw new Error('free-pass-api requires a store and a cookie codec.');
    const now = options.now ?? Date.now;
    const durationMs = options.durationMs ?? (Number(process.env.FREE_PASS_MS) || DEFAULT_DURATION_MS);
    const maxVoiceSessions = options.maxVoiceSessions ?? 3;
    const maxVoiceSessionMs = options.maxVoiceSessionMs ?? 5 * 60 * 1000;
    const maxPassesPerIpPerDay = options.maxPassesPerIpPerDay ?? 3;
    const maxStartsPerMinute = options.maxStartsPerMinute ?? 30;
    const trustProxyHeaders = options.trustProxyHeaders ?? (process.env.NODE_ENV === 'production' || Boolean(process.env.FLY_APP_NAME));
    const allowedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

    const loopbackHost = /^(localhost|127\.0\.0\.1|\[::1\]):\d+$/;
    const devOrigin = /^http:\/\/(localhost|127\.0\.0\.1):(5500|8081)$/;
    const isAllowedOrigin = (origin, request) => {
        if (typeof origin !== 'string') return false;
        if (allowedOrigins.includes(origin)) return true;
        const host = request.headers.host || '';
        return loopbackHost.test(host) && (origin === `http://${host}` || devOrigin.test(origin));
    };
    const corsHeaders = request => isAllowedOrigin(request.headers.origin, request) ? {
        'Access-Control-Allow-Origin': request.headers.origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin'
    } : {};

    // Fly 프록시 뒤에서는 remoteAddress 가 프록시 IP 라 Fly-Client-IP 를 우선한다.
    const clientIp = request => {
        if (trustProxyHeaders) {
            const fly = request.headers['fly-client-ip'];
            if (typeof fly === 'string' && fly) return fly.trim();
            const forwarded = request.headers['x-forwarded-for'];
            if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
        }
        return request.socket.remoteAddress || 'unknown';
    };

    const startHits = new Map();
    const startRateLimited = ip => {
        const current = now();
        const recent = (startHits.get(ip) || []).filter(at => current - at < 60_000);
        if (recent.length >= maxStartsPerMinute) return true;
        recent.push(current);
        startHits.set(ip, recent);
        if (startHits.size > 10_000) for (const [key, hits] of startHits) if (current - hits.at(-1) > 60_000) startHits.delete(key);
        return false;
    };

    const guestIdFrom = request => codec.unseal(readCookie(request, GUEST_COOKIE))?.gid ?? null;
    const guestCookie = (request, gid) => {
        const exp = Math.floor(now() / 1000) + GUEST_COOKIE_TTL_S;
        return setCookie(request, GUEST_COOKIE, codec.seal({ gid, exp }), GUEST_COOKIE_TTL_S);
    };

    // 패스 판정. create=false 면 신규 발급 없이 조회만 한다.
    function resolvePass(request, { fingerprint, create }) {
        const ip = clientIp(request);
        const gid = guestIdFrom(request);
        let pass = gid ? store.getPass(gid) : null;
        if (!pass && fingerprint) pass = store.findPassByIpAndFingerprint(ip, fingerprint);
        let limited = false;
        if (!pass) {
            const since = now() - DAY_MS;
            if (store.countPassesByIpSince(ip, since) >= maxPassesPerIpPerDay) {
                pass = store.oldestPassByIpSince(ip, since);
                limited = true;
            }
        }
        if (!pass && create) {
            const at = now();
            pass = store.createPass({ id: randomUUID(), ip, fingerprint: fingerprint ?? null, startedAt: at, createdAt: at });
        }
        return { pass, ip, limited, isNewCookie: Boolean(pass) && pass.id !== gid };
    }

    function describe(pass, limited = false) {
        if (!pass) return { status: 'new', remainingMs: durationMs, voice: { sessionsUsed: 0, maxSessions: maxVoiceSessions, maxSessionMs: maxVoiceSessionMs } };
        const remainingMs = Math.max(0, pass.started_at + durationMs - now());
        return {
            status: remainingMs > 0 ? 'active' : 'expired',
            remainingMs,
            startedAt: pass.started_at,
            ...(limited ? { reason: 'ip_limit' } : {}),
            voice: { sessionsUsed: pass.voice_sessions, maxSessions: maxVoiceSessions, maxSessionMs: maxVoiceSessionMs }
        };
    }

    const sanitizeFingerprint = raw => (typeof raw === 'string' && FINGERPRINT_PATTERN.test(raw) ? raw.toLowerCase() : null);

    // 음성 WebSocket 업그레이드 게이트. 회원은 무제한, 게스트는 패스 유효 + 세션 횟수 이내일 때만.
    function checkVoice(request) {
        if (readSession(request, codec)) return { ok: true, member: true };
        const { pass, limited } = resolvePass(request, { fingerprint: null, create: false });
        if (!pass) return { ok: false, status: 403, reason: 'free-pass-required' };
        const state = describe(pass, limited);
        if (state.status !== 'active') return { ok: false, status: 403, reason: 'free-pass-expired' };
        if (pass.voice_sessions >= maxVoiceSessions) return { ok: false, status: 429, reason: 'voice-limit' };
        store.recordVoiceSession(pass.id);
        return { ok: true, member: false, maxSessionMs: Math.min(maxVoiceSessionMs, state.remainingMs) };
    }

    // 로그인 콜백 훅: 회원 upsert + 현재 게스트 패스를 회원에 연결.
    function onLogin({ request, user }) {
        const userKey = `${user.provider}:${user.id}`;
        store.upsertUser({ userKey, provider: user.provider, providerId: user.id, name: user.name, email: user.email, at: now() });
        const gid = guestIdFrom(request);
        if (gid) store.linkPassToUser(gid, userKey);
    }

    async function handle(request, response, pathname) {
        if (!pathname.startsWith('/api/free-pass/')) return false;
        try {
            return await route(request, response, pathname);
        } catch (error) {
            const status = error.status ?? 500;
            if (status >= 500) console.error(`[free-pass] unexpected error on ${request.method} ${pathname}`, error);
            if (response.headersSent) response.destroy();
            else json(response, status, { error: status >= 500 ? '잠시 후 다시 시도해 주세요.' : error.message }, corsHeaders(request));
            return true;
        }
    }

    async function route(request, response, pathname) {
        const cors = corsHeaders(request);
        if (request.method === 'OPTIONS') {
            response.writeHead(Object.keys(cors).length ? 204 : 403, { ...cors, 'Cache-Control': 'no-store' }).end();
            return true;
        }
        const session = readSession(request, codec);

        if (pathname === '/api/free-pass/start' && request.method === 'POST') {
            if (startRateLimited(clientIp(request))) {
                request.resume();
                json(response, 429, { error: '요청이 너무 많습니다.' }, { ...cors, 'Retry-After': '60' });
                return true;
            }
            const body = await readJsonBody(request);
            if (session) {
                json(response, 200, { status: 'member' }, cors);
                return true;
            }
            const { pass, limited, isNewCookie } = resolvePass(request, { fingerprint: sanitizeFingerprint(body.fingerprint), create: true });
            json(response, 200, { ...describe(pass, limited), passId: pass.id }, isNewCookie ? { ...cors, 'Set-Cookie': guestCookie(request, pass.id) } : cors);
            return true;
        }

        if (pathname === '/api/free-pass/status' && request.method === 'GET') {
            if (session) {
                json(response, 200, { status: 'member' }, cors);
                return true;
            }
            const { pass, limited } = resolvePass(request, { fingerprint: null, create: false });
            json(response, 200, describe(pass, limited), cors);
            return true;
        }

        if (pathname === '/api/free-pass/migrate' && request.method === 'POST') {
            if (!session) {
                request.resume();
                json(response, 401, { error: '로그인이 필요합니다.' }, cors);
                return true;
            }
            const body = await readJsonBody(request);
            const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : null;
            if (!data) {
                json(response, 400, { error: 'data 객체가 필요합니다.' }, cors);
                return true;
            }
            const entries = Object.entries(data).filter(([key, value]) => STUDY_KEY_PATTERN.test(key) && value !== undefined);
            if (entries.length > MAX_STUDY_KEYS) {
                json(response, 400, { error: `학습 데이터 키는 최대 ${MAX_STUDY_KEYS}개까지 저장할 수 있습니다.` }, cors);
                return true;
            }
            const userKey = userKeyOf(session);
            store.upsertUser({ userKey, provider: session.provider, providerId: session.id, name: session.name, email: session.email, at: now() });
            const gid = guestIdFrom(request);
            if (gid) store.linkPassToUser(gid, userKey);
            const saved = store.saveStudyData(userKey, entries, now());
            console.info(`[free-pass] migrated ${saved} study keys for ${userKey}`);
            json(response, 200, { saved, keys: entries.map(([key]) => key) }, cors);
            return true;
        }

        if (pathname === '/api/free-pass/study-data' && request.method === 'GET') {
            if (!session) {
                json(response, 401, { error: '로그인이 필요합니다.' }, cors);
                return true;
            }
            json(response, 200, { data: store.getStudyData(userKeyOf(session)) }, cors);
            return true;
        }

        json(response, 404, { error: '무료 체험 API 경로를 찾을 수 없습니다.' }, cors);
        return true;
    }

    return { handle, checkVoice, onLogin, durationMs };
}

module.exports = { createFreePassApi };
