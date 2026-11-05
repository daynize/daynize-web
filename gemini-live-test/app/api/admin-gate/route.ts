import { createCookieCodec } from '../../../session-cookie.js';
import { ADMIN_COOKIE, ADMIN_TTL_S, authorizeAdminAttempt, createAdminToken, createAttemptLimiter } from '../../../admin-gate-api.js';

// Next.js App Router: POST /api/admin-gate
// 운영 릴레이(server.js)도 같은 authorizeAdminAttempt 로 ADMIN_GATE_SECRET 을 검증한다.
// 성공 시 daynize_admin_auth 쿠키(7일)와 본문 token 을 돌려준다. 클라이언트가 localStorage 에 저장한다.

const limiter = createAttemptLimiter(Date.now);

function clientIp(request: Request): string {
    const fly = request.headers.get('fly-client-ip');
    if (fly) return fly.trim();
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return 'unknown';
}

export async function POST(request: Request): Promise<Response> {
    let body: { password?: unknown } = {};
    try {
        const parsed = await request.json();
        body = parsed && typeof parsed === 'object' ? parsed as { password?: unknown } : {};
    } catch {
        body = {};
    }
    const result = authorizeAdminAttempt({
        password: body.password,
        secret: process.env.ADMIN_GATE_SECRET || '',
        ip: clientIp(request),
        limiter
    });
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
    if (!result.ok) {
        if (result.retryAfter) headers.set('Retry-After', result.retryAfter);
        return new Response(JSON.stringify(result.body), { status: result.status, headers });
    }
    const sessionSecret = process.env.AUTH_SESSION_SECRET || '';
    if (!sessionSecret) {
        return new Response(JSON.stringify({ ok: false, error: '세션 서명이 설정되지 않았습니다.' }), { status: 503, headers });
    }
    const token = createAdminToken(createCookieCodec({ secret: sessionSecret }));
    const secure = request.headers.get('x-forwarded-proto') === 'https';
    headers.append('Set-Cookie', `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${ADMIN_TTL_S}; SameSite=Lax${secure ? '; Secure' : ''}`);
    return new Response(JSON.stringify({ ok: true, token }), { status: 200, headers });
}
