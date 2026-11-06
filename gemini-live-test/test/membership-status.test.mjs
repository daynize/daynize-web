import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIsPaidUser } from '../../membership-status.js';

// localStorage를 흉내 내는 최소한의 스텁. membership-status.js는 모듈 로드 시점에
// globalThis.localStorage를 직접 참조하므로, import보다 먼저 준비해 둬야 한다.
globalThis.localStorage = {
    store: new Map(),
    getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
    setItem(key, value) { this.store.set(key, String(value)); },
    removeItem(key) { this.store.delete(key); },
    clear() { this.store.clear(); }
};

// /api/auth/me 응답 모양을 그대로 흉내 내어 auth-paywall-guard.js가 쓰는
// checkIsPaidUser()가 FREE_USER/PAID_USER를 올바르게 구분하는지 검증한다.

test('logged-out guest is never paid', () => {
    assert.equal(checkIsPaidUser({ loggedIn: false, isAdmin: false, hasActiveSubscription: false }), false);
});

test('logged-in guest without subscription stays FREE_USER', () => {
    const auth = {
        loggedIn: true, isAdmin: false, hasActiveSubscription: false,
        user: { provider: 'kakao', id: '1', email: 'learner@example.com', membershipStatus: 'GUEST' }
    };
    assert.equal(checkIsPaidUser(auth), false);
});

test('hasActiveSubscription true marks PAID_USER', () => {
    const auth = {
        loggedIn: true, isAdmin: false, hasActiveSubscription: true,
        user: { provider: 'kakao', id: '1', email: 'payer@example.com', membershipStatus: 'PAID' }
    };
    assert.equal(checkIsPaidUser(auth), true);
});

test('nested user.membershipStatus PAID is sufficient on its own', () => {
    const auth = { loggedIn: true, hasActiveSubscription: false, user: { membershipStatus: 'PAID' } };
    assert.equal(checkIsPaidUser(auth), true);
});

test('admin flag counts as paid regardless of subscription state', () => {
    const auth = { loggedIn: true, isAdmin: true, hasActiveSubscription: false, user: { membershipStatus: 'GUEST' } };
    assert.equal(checkIsPaidUser(auth), true);
});

test('preapproved email list grants paid access even without a subscription', () => {
    const auth = { loggedIn: true, hasActiveSubscription: false, user: { email: 'imglee69@naver.com', membershipStatus: 'GUEST' } };
    assert.equal(checkIsPaidUser(auth), true);
});

// 새 기기/다른 방문자가 이전 사용자가 남긴 localStorage 흔적 때문에 미확인 상태에서
// 정회원 UI를 보게 되는 걸 막는 회귀 테스트.
test('a stale preapproved email left in localStorage never grants paid access on its own', () => {
    globalThis.localStorage.setItem('daynize_email', 'imglee69@naver.com');
    try {
        assert.equal(checkIsPaidUser(undefined), false, 'no auth data at all (still loading) must stay FREE_USER');
        assert.equal(checkIsPaidUser({}), false, 'empty auth object must stay FREE_USER');
        assert.equal(checkIsPaidUser({ loggedIn: false }), false, 'server-confirmed logged-out must stay FREE_USER even with the preapproved email in localStorage');
    } finally {
        globalThis.localStorage.clear();
    }
});

test('preapproved email only counts when the server itself reports that email for a logged-in session', () => {
    // 로컬에 저장된 이메일과 세션이 실제로 보고하는 이메일이 다르면(다른 사람이 쓰던 기기 등),
    // 세션이 확인해 준 이메일만 본다.
    globalThis.localStorage.setItem('daynize_email', 'imglee69@naver.com');
    try {
        const auth = { loggedIn: true, hasActiveSubscription: false, user: { email: 'someone-else@example.com', membershipStatus: 'GUEST' } };
        assert.equal(checkIsPaidUser(auth), false);
    } finally {
        globalThis.localStorage.clear();
    }
});
