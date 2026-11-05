// Renders public/icons/icon.svg to the PNG sizes the PWA manifest and iOS need.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '../public/icons');
const svg = readFileSync(resolve(dir, 'icon.svg'), 'utf8');
const outputs = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: resolve(dir, name), omitBackground: false });
}
await browser.close();
