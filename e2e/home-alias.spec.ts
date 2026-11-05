import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'Asia/Kolkata' });

test('first visit in India picks an Indian home city in Chromium (review #2)', async ({ page }) => {
  await page.goto('/');
  const home = page.getByRole('article').filter({ hasText: 'You' });
  await expect(home).toHaveCount(1);
  await expect(home).toContainText('India');
});
