import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../gemini-live-test/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
try {
    for (const width of [1440, 1024, 901, 900, 768, 390]) {
        const page = await browser.newPage({
            viewport: { width, height: 1000 },
            reducedMotion: process.env.HERO_MOTION === '1' ? 'no-preference' : 'reduce',
        });
        if (process.env.HERO_LOCAL === '1') {
            const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
            await page.route('https://www.daynize.co.kr/?release=ac4c5fe1', route => route.fulfill({ contentType: 'text/html', body: html }));
            const artwork = await readFile(new URL('../IMAGE/hero-great-things-v2.jpg', import.meta.url));
            assert.ok(artwork.length < 500000);
            await page.route('https://www.daynize.co.kr/IMAGE/hero-great-things-v2.jpg', route => route.fulfill({ contentType: 'image/jpeg', body: artwork }));
        }
        await page.goto('https://www.daynize.co.kr/?release=ac4c5fe1');
        const image = page.locator('.hero-art img');
        await image.evaluate(element => element.decode());
        await page.evaluate(async () => {
            await document.fonts.ready;
            document.getAnimations().forEach(animation => {
                if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish();
            });
        });
        const info = await image.evaluate(element => {
            const css = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
                src: element.currentSrc, width: element.naturalWidth, height: element.naturalHeight,
                ratio: rect.width / rect.height, fit: css.objectFit, blend: css.mixBlendMode,
                shadow: css.boxShadow, transform: css.transform,
                opacity: css.opacity, display: css.display, visibility: css.visibility,
                renderedWidth: rect.width, renderedHeight: rect.height,
                left: rect.left, right: rect.right,
                parentOpacity: getComputedStyle(element.parentElement).opacity,
                background: getComputedStyle(element.parentElement).backgroundColor,
                mask: getComputedStyle(element.parentElement).maskImage,
                webkitMask: getComputedStyle(element.parentElement).webkitMaskImage,
            };
        });
        assert.ok(info.src.includes('/IMAGE/hero-great-things-v2.jpg'));
        assert.equal(info.width, 1264);
        assert.equal(info.height, 848);
        assert.ok(Math.abs(info.ratio - 2528 / 1696) < 0.001);
        assert.equal(info.fit, 'contain');
        assert.equal(info.blend, 'normal');
        assert.equal(info.opacity, '1');
        assert.equal(info.parentOpacity, '1');
        assert.equal(info.display, 'block');
        assert.equal(info.visibility, 'visible');
        assert.ok(info.renderedWidth > 250);
        assert.ok(info.renderedHeight > 150);
        assert.ok(info.left >= 0 && info.right <= width);
        assert.equal(info.shadow, 'none');
        assert.equal(info.transform, 'none');
        assert.equal(info.background, 'rgb(248, 247, 242)');
        assert.equal(info.mask, 'none');
        assert.equal(info.webkitMask, 'none');
        assert.equal(await page.locator('.hero-art .note,.hero-photo,.pin,.date-stamp').count(), 0);
        await page.locator('.hero').screenshot({ path: `/tmp/daynize-public-hero-${width}.png` });
        console.log(JSON.stringify({ result: 'PASS', viewport: width, ...info }));
        await page.close();
    }
} finally {
    await browser.close();
}