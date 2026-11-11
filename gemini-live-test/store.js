const { DatabaseSync } = require('node:sqlite');

// 회원 / 학습 데이터 저장소. Node 22 내장 SQLite라 의존성이 없다.
// DATA_DIR(플라이 볼륨)이 없으면 ':memory:'로 떠서 재시작 시 초기화된다.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    user_key TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    name TEXT,
    email TEXT,
    membership_status TEXT NOT NULL DEFAULT 'GUEST',
    created_at INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS study_data (
    user_key TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_key, key)
);
CREATE TABLE IF NOT EXISTS entitlements (
    email TEXT PRIMARY KEY,
    has_active_subscription INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PAID',
    source TEXT NOT NULL,
    payment_id TEXT,
    next_billing_date TEXT,
    payment_method TEXT,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pending_memberships (
    email TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    applied_at INTEGER
);
CREATE TABLE IF NOT EXISTS payment_notifications (
    payment_id TEXT PRIMARY KEY,
    sent_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS email_links (
    receipt_email TEXT PRIMARY KEY,
    session_email TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
`;

function createStore({ path = ':memory:' } = {}) {
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;');
    db.exec(SCHEMA);
    // Older relay databases predate the explicit entitlement status column.
    // Keep them readable while making manual and payment grants auditable as PAID.
    const entitlementColumns = new Set(db.prepare('PRAGMA table_info(entitlements)').all().map(column => column.name));
    if (!entitlementColumns.has('status')) {
        db.exec("ALTER TABLE entitlements ADD COLUMN status TEXT NOT NULL DEFAULT 'PAID'");
    }
    if (!entitlementColumns.has('next_billing_date')) db.exec('ALTER TABLE entitlements ADD COLUMN next_billing_date TEXT');
    if (!entitlementColumns.has('payment_method')) db.exec('ALTER TABLE entitlements ADD COLUMN payment_method TEXT');
    const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map(column => column.name));
    if (!userColumns.has('membership_status')) {
        db.exec("ALTER TABLE users ADD COLUMN membership_status TEXT NOT NULL DEFAULT 'GUEST'");
    }

    const statements = {
        upsertUser: db.prepare(`INSERT INTO users (user_key, provider, provider_id, name, email, membership_status, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, COALESCE((SELECT status FROM entitlements WHERE email = ? AND has_active_subscription = 1), 'GUEST'), ?, ?)
            ON CONFLICT(user_key) DO UPDATE SET name = excluded.name, email = excluded.email,
                membership_status = CASE WHEN users.membership_status = 'PAID' THEN 'PAID' ELSE excluded.membership_status END,
                last_login_at = excluded.last_login_at`),
        userByKey: db.prepare('SELECT * FROM users WHERE user_key = ?'),
        upsertStudy: db.prepare(`INSERT INTO study_data (user_key, key, value, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_key, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`),
        studyByUser: db.prepare('SELECT key, value, updated_at FROM study_data WHERE user_key = ?'),
        deleteStudyByUser: db.prepare('DELETE FROM study_data WHERE user_key = ?'),
        updatePaymentMethod: db.prepare('UPDATE entitlements SET payment_method = ?, updated_at = ? WHERE email = ?'),
        upsertEntitlement: db.prepare(`INSERT INTO entitlements (email, has_active_subscription, status, source, payment_id, next_billing_date, payment_method, updated_at)
            VALUES (?, 1, 'PAID', ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET has_active_subscription = 1, status = 'PAID', source = excluded.source, payment_id = excluded.payment_id,
                next_billing_date = COALESCE(excluded.next_billing_date, entitlements.next_billing_date),
                payment_method = COALESCE(excluded.payment_method, entitlements.payment_method), updated_at = excluded.updated_at`),
        entitlementByEmail: db.prepare('SELECT email, has_active_subscription, status, source, payment_id, next_billing_date, payment_method, updated_at FROM entitlements WHERE email = ?'),
        studyProgressByUser: db.prepare('SELECT key, value, updated_at FROM study_data WHERE user_key = ? ORDER BY updated_at DESC'),
        markUsersPaid: db.prepare("UPDATE users SET membership_status = 'PAID' WHERE lower(trim(email)) = ?"),
        pendingByEmail: db.prepare('SELECT email, source, created_at, applied_at FROM pending_memberships WHERE email = ? AND applied_at IS NULL'),
        insertPending: db.prepare(`INSERT INTO pending_memberships (email, source, created_at, applied_at) VALUES (?, ?, ?, NULL)
            ON CONFLICT(email) DO UPDATE SET source = excluded.source, created_at = excluded.created_at, applied_at = NULL`),
        markPendingApplied: db.prepare('UPDATE pending_memberships SET applied_at = ? WHERE email = ? AND applied_at IS NULL')
        ,notificationByPayment: db.prepare('SELECT payment_id FROM payment_notifications WHERE payment_id = ?'),
        recordNotification: db.prepare('INSERT OR IGNORE INTO payment_notifications (payment_id, sent_at) VALUES (?, ?)'),
        upsertEmailLink: db.prepare(`INSERT INTO email_links (receipt_email, session_email, created_at) VALUES (?, ?, ?)
            ON CONFLICT(receipt_email) DO UPDATE SET session_email = excluded.session_email, created_at = excluded.created_at`),
        emailLinkByReceipt: db.prepare('SELECT session_email FROM email_links WHERE receipt_email = ?')
    };

    return {
        upsertUser: ({ userKey, provider, providerId, name, email, at }) => {
            const normalizedEmail = String(email ?? '').trim().toLowerCase();
            statements.upsertUser.run(userKey, provider, providerId, name ?? '', normalizedEmail, normalizedEmail, at, at);
            return statements.userByKey.get(userKey);
        },
        getUser: userKey => statements.userByKey.get(userKey) ?? null,
        getStudyProgress: userKey => statements.studyProgressByUser.all(userKey),
        saveStudyData: (userKey, entries, at) => {
            db.exec('BEGIN');
            try {
                for (const [key, value] of entries) statements.upsertStudy.run(userKey, key, JSON.stringify(value), at);
                db.exec('COMMIT');
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
            return entries.length;
        },
        getStudyData: userKey => Object.fromEntries(statements.studyByUser.all(userKey).map(row => [row.key, JSON.parse(row.value)])),
        // '학습 기록 초기화' 버튼: 해당 유저의 모든 진도(주간 영어/오늘의 회화/5대 커리큘럼)를 한 번에 지운다.
        resetStudyProgress: userKey => { statements.deleteStudyByUser.run(userKey); return true; },
        // 프로필 모달의 '이용권 관리'/'변경'에서 기존 회원이 카드를 재등록(billing key 재발급)했을 때
        // 결제 수단만 갱신한다 — 이미 결제된 회원에 한해서만 호출되므로 엔티틀먼트 row가 없으면 없는 대로 둔다.
        updatePaymentMethod: (email, paymentMethod, at = Date.now()) => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized || !paymentMethod) return false;
            return statements.updatePaymentMethod.run(paymentMethod, at, normalized).changes > 0;
        },
        grantActiveSubscription: ({ email, source = 'payment', paymentId = null, nextBillingDate = null, paymentMethod = null, at = Date.now() }) => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return false;
            db.exec('BEGIN');
            try {
                statements.upsertEntitlement.run(normalized, source, paymentId, nextBillingDate, paymentMethod, at);
                statements.markUsersPaid.run(normalized);
                // 영수증 이메일과 로그인 세션 이메일이 달랐던 결제(카카오 이메일 미동의 등)는
                // 주문 시점에 남겨둔 연결 정보를 따라가 로그인 세션 쪽 계정도 함께 PAID로 전환한다.
                // 정기결제 갱신(webhook)에도 동일하게 적용되도록 매 결제마다 이 조회를 반복한다.
                const link = statements.emailLinkByReceipt.get(normalized);
                if (link?.session_email && link.session_email !== normalized) {
                    statements.upsertEntitlement.run(link.session_email, source, paymentId, nextBillingDate, paymentMethod, at);
                    statements.markUsersPaid.run(link.session_email);
                }
                db.exec('COMMIT');
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
            return true;
        },
        linkEmails: ({ receiptEmail, sessionEmail, at = Date.now() }) => {
            const receipt = String(receiptEmail || '').trim().toLowerCase();
            const session = String(sessionEmail || '').trim().toLowerCase();
            if (!receipt || !session || receipt === session) return false;
            statements.upsertEmailLink.run(receipt, session, at);
            return true;
        },
        preapproveMembership: ({ email, source = 'manual-preapproval', at = Date.now() }) => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return false;
            statements.insertPending.run(normalized, source, at);
            return true;
        },
        applyPendingMembership: ({ email, at = Date.now() }) => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized || !statements.pendingByEmail.get(normalized)) return false;
            db.exec('BEGIN');
            try {
                statements.upsertEntitlement.run(normalized, 'pending-preapproval', null, null, null, at);
                statements.markUsersPaid.run(normalized);
                statements.markPendingApplied.run(at, normalized);
                db.exec('COMMIT');
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
            return true;
        },
        hasActiveSubscription: email => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return false;
            const entitlement = statements.entitlementByEmail.get(normalized);
            return Number(entitlement?.has_active_subscription || 0) === 1 && (!entitlement.status || entitlement.status === 'PAID');
        },
        getMembershipStatus: email => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return 'GUEST';
            const entitlement = statements.entitlementByEmail.get(normalized);
            return Number(entitlement?.has_active_subscription || 0) === 1 && (!entitlement.status || entitlement.status === 'PAID') ? 'PAID' : 'GUEST';
        },
        getEntitlement: email => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return null;
            return statements.entitlementByEmail.get(normalized) ?? null;
        },
        hasPaymentNotification: paymentId => Boolean(paymentId && statements.notificationByPayment.get(String(paymentId))),
        recordPaymentNotification: (paymentId, at = Date.now()) => {
            if (!paymentId) return false;
            return statements.recordNotification.run(String(paymentId), at).changes === 1;
        },
        close: () => db.close()
    };
}

module.exports = { createStore };
