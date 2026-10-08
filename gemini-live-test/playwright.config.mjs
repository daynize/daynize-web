import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './browser-tests',
    timeout: 20000,
    workers: 1,
    use: { baseURL: 'http://127.0.0.1:8091', browserName: 'chromium', headless: true },
    webServer: { command: 'node browser-tests/server.cjs', url: 'http://127.0.0.1:8091', reuseExistingServer: false },
    reporter: 'list'
});