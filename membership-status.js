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

export function rememberMembershipEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return;
    try { localStorage.setItem('daynize_email', normalized); } catch { /* storage may be disabled */ }
}

// 로그인하지 않은(또는 서버 확인이 아직 안 끝난) 방문자에게 이전 방문자의 흔적이 남아 보이지
// 않도록, 서버가 "로그인 안 됨"을 확인해 준 시점에 호출해 로컬에 남은 이메일을 지운다.
export function forgetMembershipEmail() {
    try {
        localStorage.removeItem('daynize_email');
        localStorage.removeItem('email');
        localStorage.removeItem('daynize.membership.email.v1');
    } catch { /* storage may be disabled */ }
}

export function checkIsPaidUser(auth = {}) {
    const value = auth && typeof auth === 'object' ? auth : {};
    if (value.isAdmin === true || value.hasActiveSubscription === true
        || value.membershipStatus === 'PAID' || value.user?.membershipStatus === 'PAID'
        || value.preapproved === true || value.user?.preapproved === true) {
        return true;
    }
    // 사전승인 이메일 목록은 서버가 지금 이 세션이 "로그인됨"이라고 확인해 준 이메일에만 적용한다.
    // 로컬 스토리지에 남아있는 이메일만으로는(서버가 비로그인이라고 하거나, 아직 확인 전이면)
    // 절대 정회원으로 판정하지 않는다 — 다른 기기/새 방문자에게 이전 사용자의 회원 UI가
    // 잘못 보이는 걸 막기 위한 안전장치다.
    if (value.loggedIn !== true) return false;
    const candidateEmails = [value.email, value.user?.email].filter(Boolean).map(candidate => String(candidate).trim().toLowerCase());
    return candidateEmails.some(candidate => PREAPPROVED_EMAILS.has(candidate));
}
