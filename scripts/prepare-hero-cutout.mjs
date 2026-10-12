import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../gemini-live-test/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    const result = await page.evaluate(async base64 => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const { width, height, data } = pixels;
        const luminance = index => (data[index * 4] + data[index * 4 + 1] + data[index * 4 + 2]) / 3;
        const difference = index => {
            const channels = [0, 1, 2].map(channel => data[index * 4 + channel]);
            return luminance(index) >= 194 && Math.max(...channels) - Math.min(...channels) <= 10 ? 0 : 255;
        };
        const removed = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let tail = 0;
        const visit = index => {
            if (index < 0 || index >= removed.length || removed[index] || difference(index) > 28) return;
            removed[index] = 1;
            queue[tail++] = index;
        };
        for (let column = 0; column < width; column++) {
            visit(column);
            visit((height - 1) * width + column);
        }
        for (let row = 0; row < height; row++) {
            visit(row * width);
            visit(row * width + width - 1);
        }
        for (let head = 0; head < tail; head++) {
            const index = queue[head];
            if (index % width > 0) visit(index - 1);
            if (index % width < width - 1) visit(index + 1);
            visit(index - width);
            visit(index + width);
        }
        let transparent = 0;
        for (let index = 0; index < removed.length; index++) {
            if (removed[index]) {
                data[index * 4 + 3] = 0;
                transparent++;
            }
        }
        context.putImageData(pixels, 0, 0);
        const output = document.createElement('canvas');
        output.width = 1200;
        output.height = 896;
        output.getContext('2d').drawImage(canvas, 0, 0, output.width, output.height);
        return {
            png: output.toDataURL('image/png').split(',')[1],
            webp: output.toDataURL('image/webp', 0.92).split(',')[1],
            transparent, total: width * height,
        };
    }, (await readFile(new URL('../great things take time.png', import.meta.url))).toString('base64'));
    assert.ok(result.transparent > result.total * 0.15);
    const bytes = Buffer.from(result.png, 'base64');
    await writeFile(new URL('../IMAGE/hero-great-things-cutout-v3.png', import.meta.url), bytes);
    const webp = Buffer.from(result.webp, 'base64');
    await writeFile(new URL('../IMAGE/hero-great-things-cutout-v3.webp', import.meta.url), webp);
    console.log(JSON.stringify({ pngBytes: bytes.length, webpBytes: webp.length, transparentFraction: result.transparent / result.total }));
} finally {
    await browser.close();
}