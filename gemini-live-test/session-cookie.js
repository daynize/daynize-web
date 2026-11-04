const { createHmac, timingSafeEqual } = require('node:crypto');

// HMAC 서명 쿠키 코덱. auth-api(로그인 세션)와 free-pass-api(게스트 패스)가 같은 시크릿을 공유한다.

const SESSION_COOKIE = 'daynize_session';
const GUEST_COOKIE = 'daynize_guest';

const b64url = value => Buffer.from(value).toString('base64url');

function createCookieCodec({ secret, now = Date.now }) {
    if (!secret) throw new Error('A cookie signing secret is required.');
    const sign = payload => createHmac('sha256', secret).update(payload).digest('base64url');
    const seal = value => {
        const payload = b64url(JSON.stringify(value));
        return `${payload}.${sign(payload)}`;
    };
    const unseal = token => {
        const [payload, signature] = String(token || '').split('.');
        if (!payload || !signature) return null;
        const expected = sign(payload);
        const given = Buffer.from(signature);
        if (given.length !== Buffer.from(expected).length || !timingSafeEqual(given, Buffer.from(expected))) return null;
        try {
            const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            return Number(value.exp) > Math.floor(now() / 1000) ? value : null;
        } catch {
            return null;
        }
    };
    return { seal, unseal };
}

const isSecure = request => Boolean(request.socket.encrypted) || request.headers['x-forwarded-proto'] === 'https';

const setCookie = (request, name, value, maxAge, path = '/') =>
    `${name}=${value}; HttpOnly; Path=${path}; Max-Age=${maxAge}; SameSite=Lax${isSecure(request) ? '; Secure' : ''}`;

const readCookie = (request, name) => (request.headers.cookie || '')
    .split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);

const readSession = (request, codec) => codec.unseal(readCookie(request, SESSION_COOKIE));

module.exports = { SESSION_COOKIE, GUEST_COOKIE, b64url, createCookieCodec, isSecure, setCookie, readCookie, readSession };
