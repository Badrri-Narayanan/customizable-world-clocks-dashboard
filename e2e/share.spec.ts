import { expect, test } from '@playwright/test';
import { cardNames, seed } from './helpers';

test('opening a share link merges cities without duplicates (AC13)', async ({ browser }) => {
  // Sender builds the link through the UI.
  const sender = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const a = await sender.newPage();
  await seed(a, ['sydney-new-south-wales-au', 'chennai-tamil-nadu-in']);
  await a.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }));
  await a.goto('./');
  await a.getByRole('button', { name: 'Share' }).click();
  await expect(a.getByText('Link copied')).toBeVisible();
  const url = await a.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#/share?c=sydney-new-south-wales-au,chennai-tamil-nadu-in');

  // Receiver already has Chennai.
  const receiver = await browser.newContext();
  const b = await receiver.newPage();
  await seed(b, ['chennai-tamil-nadu-in']);
  await b.goto(url);
  await expect(b.getByText('Someone shared 2 cities with you')).toBeVisible();
  await b.getByRole('button', { name: 'Add to my dashboard' }).click();
  await expect.poll(() => cardNames(b)).toEqual(['Chennai', 'Sydney']);
  expect(new URL(b.url()).hash).toBe('');

  await b.goto(url);
  await b.getByRole('button', { name: 'Add to my dashboard' }).click();
  await expect.poll(() => cardNames(b)).toEqual(['Chennai', 'Sydney']);
  await sender.close();
  await receiver.close();
});
