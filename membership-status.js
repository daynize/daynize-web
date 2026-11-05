// DAYNIZE의 정회원 UI 판정 단일 진입점입니다.
// 이 값은 UI를 숨기는 편의 로직일 뿐이며, 실제 권한 검증은 서버가 담당합니다.
const DEFAULT_PREAPPROVED_EMAILS = ['imglee69@naver.com', 'lyh071914@naver.com'];

const configuredEmails = globalThis.__DAYNIZE_PREAPPROVED_EMAILS;
const normalizedEmails = (configuredEmails || DEFAULT_PREAPPROVED_EMAILS)
    .map(email => String(email).trim().toLowerCase())
    .filter(Boolean);

export const PREAPPROVED_EMAILS = new Set(normalizedEmails);

export function getStoredMembershipEmail() {
    try {
        return localStorage.getItem('daynize_email') || localStorage.getItem('email') || '';
    } catch {
        return '';
    }
}

function getStoredEmails() {
    try {
        return [
            localStorage.getItem('daynize_email'),
            localStorage.getItem('email'),
            localStorage.getItem('daynize.membership.email.v1')
        ].filter(Boolean).map(email => String(email).trim().toLowerCase());
    } catch {
        return [];
    }
}

export function rememberMembershipEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return;
    try { localStorage.setItem('daynize_email', normalized); } catch { /* storage may be disabled */ }
}

export function checkIsPaidUser(auth = {}, email = getStoredMembershipEmail()) {
    const value = auth && typeof auth === 'object' ? auth : {};
    const candidateEmails = [email, value.email, value.user?.email, ...getStoredEmails()]
        .filter(Boolean)
        .map(candidate => String(candidate).trim().toLowerCase());
    return value.isAdmin === true
        || value.hasActiveSubscription === true
        || value.membershipStatus === 'PAID'
        || value.user?.membershipStatus === 'PAID'
        || value.preapproved === true
        || value.user?.preapproved === true
        || candidateEmails.some(candidate => PREAPPROVED_EMAILS.has(candidate));
}
