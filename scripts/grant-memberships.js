#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'gemini-live-test', '.data', 'daynize.sqlite');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveArgs(args) {
    let dbPath = process.env.DAYNIZE_DB_PATH
        || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'daynize.sqlite') : DEFAULT_DB_PATH);
    const emails = [];
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--db') dbPath = args[++index];
        else if (arg.startsWith('--db=')) dbPath = arg.slice('--db='.length);
        else emails.push(arg.toLowerCase());
    }
    return { dbPath: path.resolve(dbPath), emails };
}

function main() {
    const { dbPath, emails } = resolveArgs(process.argv.slice(2));
    if (!emails.length) {
        console.error('Usage: node scripts/grant-memberships.js email1 email2 ... [--db /data/daynize.sqlite]');
        process.exitCode = 1;
        return;
    }
    if (!emails.every(email => EMAIL_PATTERN.test(email))) throw new Error('Invalid email address.');
    if (!fs.existsSync(dbPath)) {
        throw new Error(`Database not found: ${dbPath}. Set DAYNIZE_DB_PATH, DATA_DIR, or pass --db.`);
    }

    const db = new DatabaseSync(dbPath);
    try {
        const placeholders = emails.map(() => '?').join(', ');
        const findUsers = db.prepare(`SELECT user_key, name, email, membership_status FROM users WHERE lower(trim(email)) IN (${placeholders}) ORDER BY lower(trim(email))`);
        const users = findUsers.all(...emails);
        console.log('[PRECHECK] users:', JSON.stringify(users));
        const found = new Set(users.map(user => String(user.email).trim().toLowerCase()));
        const missing = emails.filter(email => !found.has(email));
        if (missing.length) throw new Error(`Aborted: user not found for ${missing.join(', ')}. No rows were changed.`);

        const now = Date.now();
        db.exec('BEGIN IMMEDIATE');
        try {
            const upsertEntitlement = db.prepare(`INSERT INTO entitlements (email, has_active_subscription, status, source, payment_id, updated_at)
                VALUES (?, 1, 'PAID', 'manual-cli', NULL, ?)
                ON CONFLICT(email) DO UPDATE SET has_active_subscription = 1, status = 'PAID', source = excluded.source, updated_at = excluded.updated_at`);
            const updateUser = db.prepare("UPDATE users SET membership_status = 'PAID' WHERE lower(trim(email)) = ?");
            for (const email of emails) {
                upsertEntitlement.run(email, now);
                updateUser.run(email);
            }
            db.exec('COMMIT');
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }

        const verifyEntitlements = db.prepare(`SELECT email, has_active_subscription, status, source, payment_id, updated_at
            FROM entitlements WHERE email IN (${placeholders}) ORDER BY email`);
        const verifyUsers = db.prepare(`SELECT user_key, name, email, membership_status
            FROM users WHERE lower(trim(email)) IN (${placeholders}) ORDER BY lower(trim(email))`);
        console.log('[VERIFY] entitlements:', JSON.stringify(verifyEntitlements.all(...emails)));
        console.log('[VERIFY] users:', JSON.stringify(verifyUsers.all(...emails)));
        console.log(`[SUCCESS] ${emails.length} account(s) updated in ${dbPath}`);
    } finally {
        db.close();
    }
}

try {
    main();
} catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = 1;
}
