import { expect, test } from '@playwright/test';
import { seed } from './helpers';

test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

const SIX = [
  'london-westminster-gb',
  'new-york-new-york-us',
  'chennai-tamil-nadu-in',
  'sydney-new-south-wales-au',
  'berlin-berlin-de',
  'tokyo-tokyo-jp',
];

test.beforeEach(async ({ page }) => {
  await seed(page, SIX);
  await page.goto('./');
  await expect(page.getByRole('article')).toHaveCount(6);
});

test('no horizontal scroll at 360px (AC16)', async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('every visible control is at least 44×44 (AC16)', async ({ page }) => {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, [role=combobox], select, input[type=range]')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ el, r }) => `${el.getAttribute('aria-label') ?? el.textContent} ${Math.round(r.width)}x${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

test('planner slider can be dragged by touch', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Meeting planner' });
  const box = (await slider.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height / 2);
  await expect(page.getByText(/Previewing/)).toBeVisible();
  expect(Number(await slider.inputValue())).toBeGreaterThan(600);
});
