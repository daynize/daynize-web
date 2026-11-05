#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('../gemini-live-test/store');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_DB_PATH = path.join(__dirname, '..', 'gemini-live-test', '.data', 'daynize.sqlite');

function usage() {
    console.error('Usage: node scripts/grant-subscription.js user1@email.com user2@email.com ... [--db /path/to/daynize.sqlite]');
    console.error('DB path: --db > DAYNIZE_DB_PATH > DATA_DIR/daynize.sqlite > gemini-live-test/.data/daynize.sqlite');
}

function parseArgs(args) {
    const emails = [];
    let dbPath = null;
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--db') {
            dbPath = args[++index];
            if (!dbPath) throw new Error('--db requires a database path.');
        } else if (arg.startsWith('--db=')) {
            dbPath = arg.slice('--db='.length);
            if (!dbPath) throw new Error('--db requires a database path.');
        } else {
            emails.push(arg);
        }
    }
    return { emails, dbPath };
}

function resolveDbPath(explicitPath) {
    const configuredPath = explicitPath || process.env.DAYNIZE_DB_PATH
        || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'daynize.sqlite') : DEFAULT_DB_PATH);
    return path.resolve(configuredPath);
}

function main() {
    const { emails: inputEmails, dbPath: explicitDbPath } = parseArgs(process.argv.slice(2));
    if (!inputEmails.length) {
        usage();
        throw new Error('At least one email address is required.');
    }

    const dbPath = resolveDbPath(explicitDbPath);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const store = createStore({ path: dbPath });
    const results = [];
    try {
        for (const inputEmail of inputEmails) {
            const email = String(inputEmail || '').trim().toLowerCase();
            if (!EMAIL_PATTERN.test(email)) {
                results.push({ email: inputEmail, success: false, reason: 'invalid email format' });
                console.error(`[FAIL] ${inputEmail}: invalid email format`);
                continue;
            }

            try {
                store.grantActiveSubscription({ email, source: 'manual-cli', at: Date.now() });
                const entitlement = store.getEntitlement(email);
                const success = store.hasActiveSubscription(email) && entitlement?.status === 'PAID';
                results.push({ email, success, reason: success ? null : 'entitlement verification failed' });
                if (success) {
                    console.log(`[SUCCESS] ${email}: hasActiveSubscription=1, status=${entitlement.status}`);
                } else {
                    console.error(`[FAIL] ${email}: entitlement verification failed`);
                }
            } catch (error) {
                results.push({ email, success: false, reason: error.message });
                console.error(`[FAIL] ${email}: ${error.message}`);
            }
        }

        const succeeded = results.filter(result => result.success).length;
        const failed = results.length - succeeded;
        console.log(`Summary: ${succeeded} succeeded, ${failed} failed`);
        console.log(`Database: ${dbPath}`);
        if (failed) process.exitCode = 1;
    } finally {
        store.close();
    }
}

try {
    main();
} catch (error) {
    console.error(`Subscription grant failed: ${error.message}`);
    process.exitCode = 1;
}
