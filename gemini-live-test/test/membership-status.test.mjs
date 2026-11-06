import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIsPaidUser } from '../../membership-status.js';

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
