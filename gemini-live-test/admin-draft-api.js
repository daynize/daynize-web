// 주간 학습 콘텐츠 자동 생성 봇(AI Draft Bot). 관리자가 주제를 넣으면 Gemini로 그 주의
// 학습 문장 초안 5개를 구조화된 JSON으로 받아온다 — 여기서는 "초안 생성"까지만 하고,
// 그 초안을 실제 커리큘럼에 반영(검토/승인/DB 반영)하는 단계는 이후 별도로 붙인다.
//   POST /api/admin/generate-draft   { topic } → { week_title, items: [...] }
// 인증은 admin-gate-api.js가 발급한 관리자 세션(daynize_admin_auth 쿠키) 그대로 재사용한다 —
// 새 비밀값/쿠키를 따로 만들지 않는다.

const MAX_BODY_BYTES = 2 * 1024;
const MAX_TOPIC_LENGTH = 120;
const ITEM_COUNT = 5;
const REQUEST_TIMEOUT_MS = 45_000;

const ITEM_FIELDS = ['id', 'english_sentence', 'korean_meaning', 'root_verb', 'grammar_point', 'story_context'];

// '데이나이즈'의 핵심 교육 철학을 전부 시스템 프롬프트에 녹인다 — 뿌리동사, 5형식, 한국어
// 어순 시프팅 해설, 성인 직장인 학습자를 향한 감성적 톤. 모델이 임의로 형식을 바꾸지 않도록
// JSON 스키마(response_schema)도 같이 강제한다.
const SYSTEM_INSTRUCTION = `당신은 성인 직장인을 위한 영어 학습 서비스 '데이나이즈(Daynize)'의 콘텐츠 디렉터입니다.
데이나이즈의 교육 철학을 모든 문장에 반드시 녹여내세요:

1. 성인 감성: 학생이 아니라 하루하루를 버티며 일하는 성인 직장인이 공감할 수 있는 장면(업무, 퇴근길, 사람 관계, 자기 다짐 등)에서 나온 문장이어야 합니다. 가볍거나 유치한 예문은 피하세요.
2. 뿌리동사 중심 학습: take, get, make, have, go, come, put, keep 같은 소수의 핵심 '뿌리동사'가 전치사/구조와 결합해 얼마나 폭넓은 의미를 만드는지 보여주는 문장을 우선합니다. 각 문항마다 그 문장의 핵심 뿌리동사를 명시하세요.
3. 5형식 문법 해설: 모든 문장을 영어의 5형식(1형식 주어+동사, 2형식 주어+동사+보어, 3형식 주어+동사+목적어, 4형식 주어+동사+간접목적어+직접목적어, 5형식 주어+동사+목적어+목적격보어) 중 하나로 짚어 설명하세요.
4. 한국어 어순 시프팅 해설: 한국어는 '주어-목적어-동사' 순서로 끝에 가야 뜻이 완성되지만, 영어는 '주어-동사-목적어' 순서로 동사가 먼저 나와 의미가 빨리 드러납니다. 각 문항의 grammar_point에는 반드시 이 어순 차이를 그 문장 기준으로 짚어주는 한두 문장을 포함하세요(번역이 아니라 '영어식 사고 순서'를 체득시키는 설명).

반드시 유효한 JSON만 출력하고, 그 외의 말은 한 글자도 덧붙이지 마세요.`;

const RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        week_title: { type: 'STRING' },
        items: {
            type: 'ARRAY',
            minItems: ITEM_COUNT,
            maxItems: ITEM_COUNT,
            items: {
                type: 'OBJECT',
                properties: {
                    id: { type: 'INTEGER' },
                    english_sentence: { type: 'STRING' },
                    korean_meaning: { type: 'STRING' },
                    root_verb: { type: 'STRING' },
                    grammar_point: { type: 'STRING' },
                    story_context: { type: 'STRING' }
                },
                required: ITEM_FIELDS,
                propertyOrdering: ITEM_FIELDS
            }
        }
    },
    required: ['week_title', 'items'],
    propertyOrdering: ['week_title', 'items']
};

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

// Gemini가 response_schema를 지키더라도, 업스트림 응답 자체를 맹목적으로 신뢰하지 않고
// 프론트/DB에 적재하기 전 서버에서 한 번 더 모양을 검증한다.
function validateDraft(value) {
    if (!value || typeof value !== 'object') return '응답이 객체가 아닙니다.';
    if (typeof value.week_title !== 'string' || !value.week_title.trim()) return 'week_title이 없습니다.';
    if (!Array.isArray(value.items) || value.items.length !== ITEM_COUNT) return `items가 ${ITEM_COUNT}개가 아닙니다.`;
    for (const [index, item] of value.items.entries()) {
        if (!item || typeof item !== 'object') return `items[${index}]가 객체가 아닙니다.`;
        for (const field of ITEM_FIELDS) {
            if (field === 'id') {
                if (!Number.isInteger(item.id)) return `items[${index}].id가 정수가 아닙니다.`;
                continue;
            }
            if (typeof item[field] !== 'string' || !item[field].trim()) return `items[${index}].${field}가 없습니다.`;
        }
    }
    return null;
}

function createAdminDraftApi(options = {}) {
    const isAdmin = options.isAdmin ?? (() => false);
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    const rawModel = options.model ?? process.env.GEMINI_ADMIN_MODEL ?? 'gemini-3.8-flash';
    if (typeof rawModel !== 'string' || !/^(models\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(rawModel)) {
        throw new TypeError('GEMINI_ADMIN_MODEL must be a model ID with at most one models/ prefix.');
    }
    const model = rawModel.startsWith('models/') ? rawModel.slice(7) : rawModel;
    const allowedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;

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
        if (pathname !== '/api/admin/generate-draft') return false;
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
            if (!isAdmin(request)) {
                json(response, 401, { error: '관리자 인증이 필요합니다.' }, cors);
                return true;
            }
            const body = await readJsonBody(request);
            const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
            if (!topic || topic.length > MAX_TOPIC_LENGTH) {
                json(response, 400, { error: `주제(topic)를 1~${MAX_TOPIC_LENGTH}자 사이로 입력해 주세요.` }, cors);
                return true;
            }
            if (!apiKey?.trim()) {
                console.error('[admin-draft] GEMINI_API_KEY is not configured');
                json(response, 503, { error: '콘텐츠 생성 서비스를 사용할 수 없습니다.' }, cors);
                return true;
            }

            let upstream;
            try {
                upstream = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                        contents: [{
                            role: 'user',
                            parts: [{ text: `이번 주 학습 주제: "${topic}"\n이 주제에 맞는 학습 문장 초안 ${ITEM_COUNT}개를 만들어 주세요.` }]
                        }],
                        generationConfig: {
                            temperature: 0.8,
                            responseMimeType: 'application/json',
                            responseSchema: RESPONSE_SCHEMA
                        }
                    }),
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
                });
            } catch (error) {
                console.error('[admin-draft] upstream request failed', error);
                json(response, 502, { error: '콘텐츠 생성 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, cors);
                return true;
            }
            if (!upstream.ok) {
                const errorBody = await upstream.text().catch(() => '');
                console.error(`[admin-draft] Gemini responded ${upstream.status}: ${errorBody}`);
                json(response, 502, { error: '콘텐츠 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, cors);
                return true;
            }
            const payload = await upstream.json();
            const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
            let draft;
            try {
                draft = JSON.parse(text);
            } catch (error) {
                console.error('[admin-draft] Gemini output was not valid JSON', { text, error });
                json(response, 502, { error: 'AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.' }, cors);
                return true;
            }
            const validationError = validateDraft(draft);
            if (validationError) {
                console.error(`[admin-draft] Gemini output failed validation: ${validationError}`, draft);
                json(response, 502, { error: 'AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.' }, cors);
                return true;
            }
            json(response, 200, draft, cors);
            return true;
        } catch (error) {
            const status = error.status ?? 500;
            if (status >= 500) console.error('[admin-draft] unexpected error', error);
            if (response.headersSent) response.destroy();
            else json(response, status, { error: status >= 500 ? '잠시 후 다시 시도해 주세요.' : error.message }, cors);
            return true;
        }
    }

    return { handle };
}

module.exports = { createAdminDraftApi, validateDraft, SYSTEM_INSTRUCTION, RESPONSE_SCHEMA };
