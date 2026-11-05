import { chromium } from '@playwright/test';

const mode = process.argv[2] || 'banner';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', message => { if (['error', 'warning'].includes(message.type())) console.log(`[console.${message.type()}] ${message.text()}`); });
await page.goto('http://localhost:5500/index.html', { waitUntil: 'domcontentloaded' });

if (mode === 'banner') {
    const banner = page.locator('.free-pass-banner');
    await banner.waitFor({ timeout: 10000 });
    console.log('banner:', (await banner.innerText()).replace(/\s+/g, ' ').trim());
    console.log('firstVisit stored:', await page.evaluate(() => localStorage.getItem('daynize_first_visit')));
    console.log('guest cookie on api:', (await page.context().cookies('http://localhost:8081')).map(c => c.name));
    await page.screenshot({ path: '/tmp/free-pass-banner.png' });
    await page.click('.free-pass-cta');
    await page.locator('.free-pass-modal.open').waitFor();
    console.log('modal headline:', await page.locator('.free-pass-title').innerText());
    await page.screenshot({ path: '/tmp/free-pass-modal.png' });
    await page.keyboard.press('Escape');
    console.log('modal closed by Escape:', !(await page.locator('.free-pass-modal').evaluate(el => el.classList.contains('open'))));
    const kakaoHref = await page.evaluate(() => new Promise(resolve => {
        const original = Object.getOwnPropertyDescriptor(window, 'location');
        document.querySelector('.free-pass-kakao').addEventListener('click', () => setTimeout(() => resolve(location.href), 50), { once: true });
        document.querySelector('.free-pass-kakao').click();
    })).catch(() => 'navigated');
    console.log('kakao click ->', kakaoHref);
} else {
    await page.waitForURL(/landing\/\?expired=1/, { timeout: 20000 });
    console.log('redirected to:', page.url());
    await page.locator('#signup-modal.open').waitFor();
    console.log('landing modal:', await page.locator('#signup-modal h3').innerText(), '/', await page.locator('#signup-modal .modal-card > p').innerText());
    await page.screenshot({ path: '/tmp/free-pass-expired.png' });
}
await browser.close();
