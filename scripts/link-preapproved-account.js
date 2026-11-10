#!/usr/bin/env node

// 사전승인 이메일(네이버, 예: imglee69@naver.com)과 실제 로그인에 쓰는 카카오/구글 계정
// 이메일이 다를 때, 두 이메일을 연결해서 카카오/구글 로그인 세션도 정회원으로 인식되게 한다.
// payment-api.js가 영수증 이메일과 로그인 세션 이메일이 다른 결제를 연결할 때 쓰는 것과
// 동일한 store.linkEmails + grantActiveSubscription 경로를 재사용한다 (server.js:88-97 참고).

const fs = require('node:fs');
const path = require('node:path');
const storeModulePath = fs.existsSync(path.join(__dirname, '..', 'gemini-live-test', 'store.js'))
    ? path.join(__dirname, '..', 'gemini-live-test', 'store.js')
    : path.join(__dirname, '..', 'store.js');
const { createStore } = require(storeModulePath);

const defaultPath = process.env.DAYNIZE_DB_PATH
    || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'daynize.sqlite') : path.join(__dirname, '..', 'gemini-live-test', '.data', 'daynize.sqlite'));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const args = process.argv.slice(2);
let dbPath = defaultPath;
const positional = [];
for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--db') dbPath = args[++index];
    else if (args[index].startsWith('--db=')) dbPath = args[index].slice('--db='.length);
    else positional.push(args[index].trim().toLowerCase());
}
const [preapprovedEmail, actualLoginEmail] = positional;

if (!preapprovedEmail || !actualLoginEmail || !EMAIL_PATTERN.test(preapprovedEmail) || !EMAIL_PATTERN.test(actualLoginEmail)) {
    console.error('Usage: node scripts/link-preapproved-account.js <preapproved-email> <actual-kakao-or-google-login-email> [--db /data/daynize.sqlite]');
    process.exitCode = 1;
} else if (!fs.existsSync(path.resolve(dbPath))) {
    console.error(`[FAIL] Database not found: ${path.resolve(dbPath)}`);
    process.exitCode = 1;
} else if (preapprovedEmail === actualLoginEmail) {
    console.error('[FAIL] The two emails are identical; nothing to link.');
    process.exitCode = 1;
} else {
    const store = createStore({ path: path.resolve(dbPath) });
    try {
        const linked = store.linkEmails({ receiptEmail: preapprovedEmail, sessionEmail: actualLoginEmail, at: Date.now() });
        if (!linked) throw new Error('linkEmails rejected the pair.');
        store.grantActiveSubscription({ email: preapprovedEmail, source: 'manual-cli-link', at: Date.now() });
        console.log(`[LINKED] ${preapprovedEmail} <-> ${actualLoginEmail}`);
        console.log('[ENTITLEMENT]', JSON.stringify(store.getEntitlement(preapprovedEmail)));
        console.log('[ENTITLEMENT]', JSON.stringify(store.getEntitlement(actualLoginEmail)));
        console.log(`[INFO] ${actualLoginEmail} now has an active entitlement directly, so logging in with that account shows PAID immediately.`);
    } catch (error) {
        console.error(`[FAIL] ${error.message}`);
        process.exitCode = 1;
    } finally {
        store.close();
    }
}
