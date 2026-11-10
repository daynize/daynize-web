#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const defaultPath = process.env.DAYNIZE_DB_PATH
    || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'daynize.sqlite') : path.join(__dirname, '..', 'gemini-live-test', '.data', 'daynize.sqlite'));
const args = process.argv.slice(2);
const dbArg = args.find(arg => arg === '--db' || arg.startsWith('--db='));
const dbPath = path.resolve(dbArg === '--db' ? args[args.indexOf('--db') + 1] : dbArg?.slice('--db='.length) || defaultPath);

if (!fs.existsSync(dbPath)) {
    console.error(`[FAIL] Database not found: ${dbPath}`);
    process.exitCode = 1;
} else {
    const db = new DatabaseSync(dbPath);
    try {
        console.log('[entitlements]', JSON.stringify(db.prepare('SELECT * FROM entitlements ORDER BY email').all(), null, 2));
        console.log('[email_links]', JSON.stringify(db.prepare('SELECT * FROM email_links ORDER BY receipt_email').all(), null, 2));
        console.log('[pending_memberships]', JSON.stringify(db.prepare('SELECT * FROM pending_memberships ORDER BY email').all(), null, 2));
    } finally {
        db.close();
    }
}
