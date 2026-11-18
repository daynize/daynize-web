const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createRelayServer } = require('../server');
const { validateDraft } = require('../admin-draft-api');

async function withServer(context, options = {}) {
    const relay = createRelayServer({ apiKey: 'gemini-test-key', adminGateSecret: 'test-admin-secret', ...options });
    relay.server.listen(0, '127.0.0.1');
    await once(relay.server, 'listening');
    context.after(() => relay.close());
    return `http://127.0.0.1:${relay.server.address().port}`;
}

async function loginAsAdmin(base) {
    const response = await fetch(`${base}/api/admin-gate`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test-admin-secret' })
    });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';', 1)[0];
}

const sampleDraft = {
    week_title: '직장인의 위로',
    items: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        english_sentence: `Sentence ${i + 1}`,
        korean_meaning: `문장 ${i + 1}`,
        root_verb: 'take',
        grammar_point: '3형식. 한국어는 동사가 끝에 오지만 영어는 동사가 목적어보다 먼저 와 의미가 빨리 드러난다.',
        story_context: '퇴근 후의 다짐'
    }))
};

test('an unauthenticated caller cannot generate a draft', async context => {
    const base = await withServer(context);
    const response = await fetch(`${base}/api/admin/generate-draft`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: '일상 속 깨달음' })
    });
    assert.equal(response.status, 401);
});

test('an admin gets a validated 5-item draft back from Gemini', async context => {
    let requestedBody;
    const base = await withServer(context, {
        adminDraftFetchImpl: async (url, request) => {
            requestedBody = JSON.parse(request.body);
            assert.match(url, /\/models\/gemini-3\.8-flash:generateContent\?key=gemini-test-key$/);
            return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(sampleDraft) }] } }] });
        }
    });
    const cookie = await loginAsAdmin(base);
    const response = await fetch(`${base}/api/admin/generate-draft`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ topic: '직장인의 위로' })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, sampleDraft);
    assert.equal(requestedBody.systemInstruction.parts[0].text.includes('뿌리동사'), true);
    assert.equal(requestedBody.generationConfig.responseMimeType, 'application/json');
    assert.equal(requestedBody.contents[0].parts[0].text.includes('직장인의 위로'), true);
});

test('a missing topic is rejected before calling Gemini', async context => {
    let called = false;
    const base = await withServer(context, {
        adminDraftFetchImpl: async () => { called = true; return Response.json({}); }
    });
    const cookie = await loginAsAdmin(base);
    const response = await fetch(`${base}/api/admin/generate-draft`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ topic: '' })
    });
    assert.equal(response.status, 400);
    assert.equal(called, false);
});

test('a malformed upstream JSON payload is rejected, not forwarded to the client', async context => {
    const base = await withServer(context, {
        adminDraftFetchImpl: async () => Response.json({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] })
    });
    const cookie = await loginAsAdmin(base);
    const response = await fetch(`${base}/api/admin/generate-draft`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ topic: '일상 속 깨달음' })
    });
    assert.equal(response.status, 502);
});

test('an upstream draft with the wrong item count is rejected, not forwarded to the client', async context => {
    const base = await withServer(context, {
        adminDraftFetchImpl: async () => Response.json({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ week_title: 'x', items: sampleDraft.items.slice(0, 2) }) }] } }]
        })
    });
    const cookie = await loginAsAdmin(base);
    const response = await fetch(`${base}/api/admin/generate-draft`, {
        method: 'POST',
        headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ topic: '일상 속 깨달음' })
    });
    assert.equal(response.status, 502);
});

test('validateDraft accepts a well-formed draft and rejects a missing field', () => {
    assert.equal(validateDraft(sampleDraft), null);
    const broken = JSON.parse(JSON.stringify(sampleDraft));
    delete broken.items[0].root_verb;
    assert.match(validateDraft(broken), /root_verb/);
});
