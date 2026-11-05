const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createStore } = require('../store');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'grant-subscription.js');

test('grant-subscription CLI creates and updates a PAID entitlement by normalized email', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daynize-entitlement-'));
    const dbPath = path.join(tempDir, 'daynize.sqlite');
    try {
        const output = execFileSync(process.execPath, [SCRIPT, ' Learner@Example.com ', 'second@example.com', '--db', dbPath], { encoding: 'utf8' });
        assert.match(output, /\[SUCCESS\] learner@example\.com: hasActiveSubscription=1, status=PAID/);
        assert.match(output, /\[SUCCESS\] second@example\.com: hasActiveSubscription=1, status=PAID/);
        assert.match(output, /Summary: 2 succeeded, 0 failed/);

        const store = createStore({ path: dbPath });
        assert.equal(store.hasActiveSubscription('LEARNER@example.com'), true);
        assert.equal(store.hasActiveSubscription('second@example.com'), true);
        assert.deepEqual({ ...store.getEntitlement('learner@example.com') }, {
            email: 'learner@example.com',
            has_active_subscription: 1,
            status: 'PAID',
            source: 'manual-cli',
            payment_id: null,
            updated_at: store.getEntitlement('learner@example.com').updated_at
        });
        store.close();

        execFileSync(process.execPath, [SCRIPT, 'learner@example.com', '--db', dbPath], { encoding: 'utf8' });
        const updatedStore = createStore({ path: dbPath });
        assert.equal(updatedStore.hasActiveSubscription('learner@example.com'), true);
        updatedStore.close();
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('grant-subscription CLI reports invalid emails and continues processing', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daynize-entitlement-'));
    const dbPath = path.join(tempDir, 'daynize.sqlite');
    try {
        let error;
        try {
            execFileSync(process.execPath, [SCRIPT, 'bad-email', 'valid@example.com', '--db', dbPath], { encoding: 'utf8' });
        } catch (caught) {
            error = caught;
        }
        assert.equal(error.status, 1);
        assert.match(error.stderr, /\[FAIL\] bad-email: invalid email format/);
        assert.match(error.stdout, /\[SUCCESS\] valid@example\.com: hasActiveSubscription=1, status=PAID/);
        assert.match(error.stdout, /Summary: 1 succeeded, 1 failed/);

        const store = createStore({ path: dbPath });
        assert.equal(store.hasActiveSubscription('valid@example.com'), true);
        store.close();
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
