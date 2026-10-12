import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../gemini-live-test/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
try {
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
        if (process.env.HERO_LOCAL === '1') {
            const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
            await page.route('https://www.daynize.co.kr/?release=ac4c5fe1', route => route.fulfill({ contentType: 'text/html', body: html }));
        }
        await page.goto('https://www.daynize.co.kr/?release=ac4c5fe1');
        const image = page.locator('.hero-art img');
        await image.evaluate(element => element.decode());
        await page.evaluate(async () => {
            await document.fonts.ready;
            document.getAnimations().forEach(animation => animation.finish());
        });
        const info = await image.evaluate(element => {
            const css = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
                src: element.currentSrc, width: element.naturalWidth, height: element.naturalHeight,
                ratio: rect.width / rect.height, fit: css.objectFit, blend: css.mixBlendMode,
                shadow: css.boxShadow, transform: css.transform,
                background: getComputedStyle(element.parentElement).backgroundColor,
                mask: getComputedStyle(element.parentElement).maskImage,
                webkitMask: getComputedStyle(element.parentElement).webkitMaskImage,
            };
        });
        assert.ok(info.src.includes('great%20things%20take%20time.png'));
        assert.equal(info.width, 2528);
        assert.equal(info.height, 1696);
        assert.ok(Math.abs(info.ratio - 2528 / 1696) < 0.001);
        assert.equal(info.fit, 'contain');
        assert.equal(info.blend, 'multiply');
        assert.equal(info.shadow, 'none');
        assert.equal(info.transform, 'none');
        assert.equal(info.background, 'rgb(248, 247, 242)');
        assert.match(info.mask, /radial-gradient/);
        assert.match(info.webkitMask, /radial-gradient/);
        assert.equal(await page.locator('.hero-art .note,.hero-photo,.pin,.date-stamp').count(), 0);
        await page.locator('.hero').screenshot({ path: `/tmp/daynize-public-hero-${width}.png` });
        console.log(JSON.stringify({ result: 'PASS', viewport: width, ...info }));
        await page.close();
    }
} finally {
    await browser.close();
}