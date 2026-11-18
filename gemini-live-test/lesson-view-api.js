// 미시청 강의 'N' 배지용 시청 기록 API. 다른 *-api.js와 같은 모듈 패턴:
// createLessonViewApi(options) -> { handle(request, response, pathname) }.
//   POST /api/lessons/:lessonId/view — 로그인한 사용자가 강의를 재생 시작할 때 호출된다.
// 비로그인 상태는 "기록할 게 없을 뿐"이라 에러가 아니라 204로 조용히 받아 준다 — 게스트도
// 평소처럼 강의를 재생할 수 있어야 하고, 프론트엔드가 로그인 여부를 먼저 확인할 필요도 없다.

const MAX_LESSON_ID_LENGTH = 80;
const LESSON_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

function json(response, status, value, headers = {}) {
    response.writeHead(status, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        ...headers
    });
    response.end(JSON.stringify(value));
}

function createLessonViewApi(options = {}) {
    const allowedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const getSession = options.getSession ?? (() => null);
    const onView = options.onView ?? (() => {});
    const now = options.now ?? Date.now;

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

    async function handle(request, response, pathname) {
        const match = /^\/api\/lessons\/([^/]+)\/view$/.exec(pathname);
        if (!match) return false;
        const cors = corsHeaders(request);
        try {
            if (request.method === 'OPTIONS') {
                response.writeHead(Object.keys(cors).length ? 204 : 403, { ...cors, 'Cache-Control': 'no-store' }).end();
                return true;
            }
            if (request.method !== 'POST') {
                json(response, 405, { error: 'POST만 지원합니다.' }, { ...cors, Allow: 'POST, OPTIONS' });
                return true;
            }
            request.resume(); // 바디를 쓰지 않는다 — lessonId는 경로 파라미터로만 받는다.
            const lessonId = decodeURIComponent(match[1]);
            if (!LESSON_ID_PATTERN.test(lessonId) || lessonId.length > MAX_LESSON_ID_LENGTH) {
                json(response, 400, { error: '유효하지 않은 강의 ID입니다.' }, cors);
                return true;
            }
            const session = getSession(request);
            if (!session) {
                // 비로그인 사용자의 시청 기록은 남길 곳이 없을 뿐, 재생 자체를 막을 이유는 아니다.
                // 204는 바디가 없어야 하므로 json() 대신 직접 헤더만 쓴다.
                response.writeHead(204, { ...cors, 'Cache-Control': 'no-store' }).end();
                return true;
            }
            const userKey = `${session.provider}:${session.id}`;
            await onView({ userKey, lessonId, at: now() });
            json(response, 200, { recorded: true }, cors);
            return true;
        } catch (error) {
            console.error(`[lesson-view] unexpected error on ${request.method} ${pathname}`, error);
            if (response.headersSent) response.destroy();
            else json(response, 500, { error: '시청 기록 저장에 실패했습니다.' }, cors);
            return true;
        }
    }

    return { handle };
}

module.exports = { createLessonViewApi };
