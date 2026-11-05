import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve(__dirname, '../../dist/manifest.webmanifest');

describe.skipIf(!existsSync(resolve(__dirname, '../../dist')))('built PWA manifest (AC15)', () => {
  const read = () => JSON.parse(readFileSync(manifestPath, 'utf8'));

  test('exists with install fields', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const m = read();
    expect(m).toMatchObject({ name: 'World Clock', short_name: 'Clocks', start_url: '/', display: 'standalone' });
    expect(m.theme_color).toMatch(/^#/);
    expect(m.background_color).toMatch(/^#/);
  });

  test('has 192, 512 and maskable icons that exist in dist', () => {
    const icons: { src: string; sizes: string; purpose?: string }[] = read().icons;
    expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(icons.some((i) => i.purpose?.includes('maskable'))).toBe(true);
    for (const i of icons) expect(existsSync(resolve(__dirname, '../../dist', i.src.replace(/^\//, '')))).toBe(true);
  });

  test('service worker precaches the city data chunk', () => {
    const sw = readFileSync(resolve(__dirname, '../../dist/sw.js'), 'utf8');
    expect(sw).toMatch(/cityMap-[\w-]+\.js/);
  });
});
