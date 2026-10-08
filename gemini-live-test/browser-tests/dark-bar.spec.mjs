import { test, expect } from '@playwright/test';

for (const width of [1280, 375]) {
    test(`strict dark Spotlight design preview at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(() => {
            window.previewRequests = 0;
            navigator.mediaDevices.getUserMedia = async () => { window.previewRequests++; throw new Error('Unexpected mic'); };
            window.WebSocket = class { constructor() { window.previewRequests++; throw new Error('Unexpected API'); } };
        });
        await page.goto('/?preview=design');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
        const geometry = await dialog.boundingBox();
        expect(geometry.height).toBe(84);
        expect(geometry.width).toBe(Math.min(720, width * 0.9));
        const tray = await page.locator('.icon-tray').boundingBox();
        expect(geometry.x + geometry.width - tray.x - tray.width).toBeGreaterThanOrEqual(width > 540 ? 40 : 24);
        await expect(dialog).toHaveCSS('display', 'flex');
        await expect(dialog).toHaveCSS('background-color', 'rgba(30, 32, 34, 0.88)');
        await expect(page.locator('.icon-tray')).toHaveCSS('flex-direction', 'row');
        await expect(page.locator('.identity')).toHaveCSS('display', 'block');
        expect(await page.evaluate(() => window.previewRequests)).toBe(0);
        await page.waitForFunction(() => [...document.querySelector('daynize-voice-tutor').shadowRoot.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
        await page.screenshot({ path: `test-results/dark-preview-${width}.png` });
        await page.getByRole('button', { name: '대화 자막', exact: true }).click();
        await expect(page.getByText('음성이 인식되면 자막이 표시됩니다.')).toBeVisible();
        expect((await dialog.boundingBox()).height).toBe(84);
        await page.getByRole('button', { name: '환경설정', exact: true }).click();
        await expect(page.getByRole('combobox')).toBeVisible();
        await expect(page.getByText('음성이 인식되면 자막이 표시됩니다.')).not.toBeVisible();
        expect((await dialog.boundingBox()).height).toBe(84);
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
    });
}