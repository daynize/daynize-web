#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { createStore } = require('../gemini-live-test/store');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_DB_PATH = path.join(__dirname, '..', 'gemini-live-test', '.data', 'daynize.sqlite');

function usage() {
    console.error('Usage: node scripts/grant-subscription.js user@email.com [--db /path/to/daynize.sqlite]');
    console.error('DB path: --db > DAYNIZE_DB_PATH > DATA_DIR/daynize.sqlite > gemini-live-test/.data/daynize.sqlite');
}

function parseArgs(args) {
    let email = null;
    let dbPath = null;
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--db') {
            dbPath = args[++index];
        } else if (arg.startsWith('--db=')) {
            dbPath = arg.slice('--db='.length);
        } else if (!email) {
            email = arg;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }
    return { email, dbPath };
}

function resolveDbPath(explicitPath) {
    const configuredPath = explicitPath || process.env.DAYNIZE_DB_PATH
        || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'daynize.sqlite') : DEFAULT_DB_PATH);
    return path.resolve(configuredPath);
}

function main() {
    const { email: inputEmail, dbPath: explicitDbPath } = parseArgs(process.argv.slice(2));
    const email = String(inputEmail || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
        usage();
        throw new Error('A valid email address is required.');
    }

    const dbPath = resolveDbPath(explicitDbPath);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const store = createStore({ path: dbPath });
    try {
        store.grantActiveSubscription({ email, source: 'manual-cli', at: Date.now() });
        const entitlement = store.getEntitlement(email);
        console.log(`Granted PAID subscription to ${email}`);
        console.log(`Database: ${dbPath}`);
        console.log(`hasActiveSubscription: ${store.hasActiveSubscription(email)}`);
        console.log(`status: ${entitlement.status}`);
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
