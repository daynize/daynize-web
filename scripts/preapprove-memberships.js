#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
// Local checkout: ../gemini-live-test/store.js
// Production image: COPY gemini-live-test/ ./ makes it /app/store.js.
const storeModulePath = fs.existsSync(path.join(__dirname, '..', 'gemini-live-test', 'store.js'))
    ? path.join(__dirname, '..', 'gemini-live-test', 'store.js')
    : path.join(__dirname, '..', 'store.js');
const { createStore } = require(storeModulePath);

const defaultPath = process.env.DAYNIZE_DB_PATH
    || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'daynize.sqlite') : path.join(__dirname, '..', 'gemini-live-test', '.data', 'daynize.sqlite'));
const args = process.argv.slice(2);
let dbPath = defaultPath;
const emails = [];
for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--db') dbPath = args[++index];
    else if (args[index].startsWith('--db=')) dbPath = args[index].slice('--db='.length);
    else emails.push(args[index].trim().toLowerCase());
}

if (!emails.length || emails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    console.error('Usage: node scripts/preapprove-memberships.js email1 email2 ... [--db /data/daynize.sqlite]');
    process.exitCode = 1;
} else if (!fs.existsSync(dbPath)) {
    console.error(`[FAIL] Database not found: ${path.resolve(dbPath)}`);
    process.exitCode = 1;
} else {
    const store = createStore({ path: path.resolve(dbPath) });
    try {
        for (const email of emails) {
            store.preapproveMembership({ email, source: 'manual-preapproval', at: Date.now() });
            console.log(`[PREAPPROVED] ${email}`);
        }
        console.log('[INFO] When each email logs in, it will be converted to PAID automatically.');
    } finally {
        store.close();
    }
}
