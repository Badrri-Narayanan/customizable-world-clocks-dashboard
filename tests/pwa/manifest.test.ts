import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve(__dirname, '../../dist/manifest.webmanifest');

describe.skipIf(!existsSync(resolve(__dirname, '../../dist')))('built PWA manifest (AC15)', () => {
  const read = () => JSON.parse(readFileSync(manifestPath, 'utf8'));

  test('exists with install fields', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const m = read();
    // Relative URLs so the app works under a sub-path such as GitHub Pages' /<repo>/.
    expect(m).toMatchObject({ name: 'World Clock', short_name: 'Clocks', start_url: './', scope: './', display: 'standalone' });
    expect(m.theme_color).toMatch(/^#/);
    expect(m.background_color).toMatch(/^#/);
  });

  test('has 192, 512 and maskable icons that exist in dist', () => {
    const icons: { src: string; sizes: string; purpose?: string }[] = read().icons;
    expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(icons.some((i) => i.purpose?.includes('maskable'))).toBe(true);
    for (const i of icons) {
      expect(i.src.startsWith('/')).toBe(false);
      expect(existsSync(resolve(__dirname, '../../dist', i.src))).toBe(true);
    }
  });

  test('service worker precaches the city data chunk', () => {
    const sw = readFileSync(resolve(__dirname, '../../dist/sw.js'), 'utf8');
    expect(sw).toMatch(/cityMap-[\w-]+\.js/);
  });
});

describe.skipIf(!existsSync(resolve(__dirname, '../../dist')))('built index.html honours BASE_PATH', () => {
  test('asset, icon and manifest URLs carry the base path', () => {
    const html = readFileSync(resolve(__dirname, '../../dist/index.html'), 'utf8');
    const base = process.env.BASE_PATH ?? '/';
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) expect(m[1].startsWith(base)).toBe(true);
  });
});
