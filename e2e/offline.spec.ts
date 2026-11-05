import { expect, test } from '@playwright/test';

test('works offline after the first visit (AC15)', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Reload once so the service worker controls the page.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const search = page.getByRole('combobox', { name: 'Add a city' });
  await search.fill('chennai');
  await page.getByRole('option', { name: /Chennai, Tamil Nadu, India/ }).click();
  await expect(page.getByRole('article', { name: 'Chennai' })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('article', { name: 'Chennai' })).toBeVisible();
  await search.fill('tokyo');
  await expect(page.getByRole('option', { name: /Tokyo/ }).first()).toBeVisible();
});
