const { DatabaseSync } = require('node:sqlite');

// 게스트 패스 / 회원 / 학습 데이터 저장소. Node 22 내장 SQLite라 의존성이 없다.
// DATA_DIR(플라이 볼륨)이 없으면 ':memory:'로 떠서 재시작 시 초기화된다.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS guest_passes (
    id TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    fingerprint TEXT,
    started_at INTEGER NOT NULL,
    voice_sessions INTEGER NOT NULL DEFAULT 0,
    user_key TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS guest_passes_ip ON guest_passes (ip, created_at);
CREATE INDEX IF NOT EXISTS guest_passes_fp ON guest_passes (fingerprint, ip);
CREATE TABLE IF NOT EXISTS users (
    user_key TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    name TEXT,
    email TEXT,
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
    updated_at INTEGER NOT NULL
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

    const statements = {
        passById: db.prepare('SELECT * FROM guest_passes WHERE id = ?'),
        passByIpAndFingerprint: db.prepare('SELECT * FROM guest_passes WHERE ip = ? AND fingerprint = ? ORDER BY created_at ASC LIMIT 1'),
        oldestPassByIpSince: db.prepare('SELECT * FROM guest_passes WHERE ip = ? AND created_at >= ? ORDER BY created_at ASC LIMIT 1'),
        countPassesByIpSince: db.prepare('SELECT COUNT(*) AS count FROM guest_passes WHERE ip = ? AND created_at >= ?'),
        insertPass: db.prepare('INSERT INTO guest_passes (id, ip, fingerprint, started_at, voice_sessions, user_key, created_at) VALUES (?, ?, ?, ?, 0, NULL, ?)'),
        bumpVoice: db.prepare('UPDATE guest_passes SET voice_sessions = voice_sessions + 1 WHERE id = ?'),
        linkPass: db.prepare('UPDATE guest_passes SET user_key = ? WHERE id = ? AND user_key IS NULL'),
        upsertUser: db.prepare(`INSERT INTO users (user_key, provider, provider_id, name, email, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_key) DO UPDATE SET name = excluded.name, email = excluded.email, last_login_at = excluded.last_login_at`),
        userByKey: db.prepare('SELECT * FROM users WHERE user_key = ?'),
        upsertStudy: db.prepare(`INSERT INTO study_data (user_key, key, value, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_key, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`),
        studyByUser: db.prepare('SELECT key, value, updated_at FROM study_data WHERE user_key = ?'),
        upsertEntitlement: db.prepare(`INSERT INTO entitlements (email, has_active_subscription, status, source, payment_id, updated_at)
            VALUES (?, 1, 'PAID', ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET has_active_subscription = 1, status = 'PAID', source = excluded.source, payment_id = excluded.payment_id, updated_at = excluded.updated_at`),
        entitlementByEmail: db.prepare('SELECT email, has_active_subscription, status, source, payment_id, updated_at FROM entitlements WHERE email = ?')
    };

    return {
        getPass: id => statements.passById.get(id) ?? null,
        findPassByIpAndFingerprint: (ip, fingerprint) => statements.passByIpAndFingerprint.get(ip, fingerprint) ?? null,
        oldestPassByIpSince: (ip, since) => statements.oldestPassByIpSince.get(ip, since) ?? null,
        countPassesByIpSince: (ip, since) => Number(statements.countPassesByIpSince.get(ip, since).count),
        createPass: ({ id, ip, fingerprint, startedAt, createdAt }) => {
            statements.insertPass.run(id, ip, fingerprint ?? null, startedAt, createdAt);
            return statements.passById.get(id);
        },
        recordVoiceSession: id => statements.bumpVoice.run(id),
        linkPassToUser: (id, userKey) => statements.linkPass.run(userKey, id),
        upsertUser: ({ userKey, provider, providerId, name, email, at }) => {
            statements.upsertUser.run(userKey, provider, providerId, name ?? '', email ?? '', at, at);
            return statements.userByKey.get(userKey);
        },
        getUser: userKey => statements.userByKey.get(userKey) ?? null,
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
        grantActiveSubscription: ({ email, source = 'payment', paymentId = null, at = Date.now() }) => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return false;
            statements.upsertEntitlement.run(normalized, source, paymentId, at);
            return true;
        },
        hasActiveSubscription: email => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return false;
            const entitlement = statements.entitlementByEmail.get(normalized);
            return Number(entitlement?.has_active_subscription || 0) === 1 && (!entitlement.status || entitlement.status === 'PAID');
        },
        getEntitlement: email => {
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return null;
            return statements.entitlementByEmail.get(normalized) ?? null;
        },
        close: () => db.close()
    };
}

module.exports = { createStore };
