import { expect, test } from '@playwright/test';
import { addCity, cardNames } from './helpers';

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });

test('everything the user sets survives a reload (AC7, AC14)', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('article', { name: 'London' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'London' }).getByText('You')).toBeVisible();

  await addCity(page, 'chennai', /Chennai, Tamil Nadu, India/);
  await addCity(page, 'sydney', /Sydney, New South Wales, Australia/);
  expect(await cardNames(page)).toEqual(['London', 'Chennai', 'Sydney']);

  // Keyboard reorder: move Sydney one place earlier.
  const live = page.locator('[aria-live="assertive"]');
  await page.getByRole('button', { name: 'Reorder Sydney' }).focus();
  await page.keyboard.press('Space');
  await expect(live).toHaveText('Picked up Sydney.');
  // dnd-kit attaches its arrow-key listener on the next tick after pick-up, so retry until it registers.
  await expect(async () => {
    await page.keyboard.press('ArrowLeft');
    await expect(live).toHaveText('Sydney moved to position 2 of 3.', { timeout: 300 });
  }).toPass({ timeout: 3000 });
  await page.keyboard.press('Space');
  await expect(live).toHaveText('Sydney dropped at position 2 of 3.');
  await expect.poll(() => cardNames(page)).toEqual(['London', 'Sydney', 'Chennai']);

  // Per-card style and custom hours.
  await page.getByRole('button', { name: 'Options for Chennai' }).click();
  await page.getByRole('button', { name: 'Retro LCD' }).click();
  await expect(page.getByRole('article', { name: 'Chennai' }).locator('.lcd')).toBeVisible();
  await page.getByRole('button', { name: 'Options for Sydney' }).click();
  await page.getByRole('button', { name: 'Set custom hours' }).click();
  await page.getByLabel('Working hours from').fill('08:00');
  await page.getByRole('button', { name: 'Save hours' }).click();
  await expect(page.getByRole('article', { name: 'Sydney' }).getByText('custom hours')).toBeVisible();

  // Global settings.
  await page.getByRole('button', { name: '12h' }).click();
  await page.getByRole('button', { name: /Theme: System/ }).click();
  await page.getByRole('button', { name: /Theme: Light/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect.poll(() => cardNames(page)).toEqual(['London', 'Sydney', 'Chennai']);
  await expect(page.getByRole('article', { name: 'Chennai' }).locator('.lcd')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Sydney' }).getByText('custom hours')).toBeVisible();
  await expect(page.getByRole('button', { name: '12h' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('article', { name: 'London' }).getByText('You')).toBeVisible();
});

test('pointer drag reorders cards', async ({ page }) => {
  await page.goto('./');
  await addCity(page, 'chennai', /Chennai, Tamil Nadu, India/);
  const from = await page.getByRole('button', { name: 'Reorder Chennai' }).boundingBox();
  const to = await page.getByRole('article', { name: 'London' }).boundingBox();
  await page.mouse.move(from!.x + 10, from!.y + 10);
  await page.mouse.down();
  await page.mouse.move(from!.x + 30, from!.y + 30, { steps: 5 });
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => cardNames(page)).toEqual(['Chennai', 'London']);
});
