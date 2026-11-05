import { expect, type Page } from '@playwright/test';

export const cardNames = (page: Page) => page.getByRole('article').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));

export async function addCity(page: Page, query: string, option: RegExp) {
  await page.getByRole('combobox', { name: 'Add a city' }).fill(query);
  await page.getByRole('option', { name: option }).first().click();
  await expect(page.getByRole('article', { name: query.replace(/^\w/, (c) => c.toUpperCase()) })).toBeVisible();
}

export const seed = (page: Page, ids: string[]) =>
  page.addInitScript((cities) => {
    if (localStorage.getItem('worldclock')) return;
    localStorage.setItem(
      'worldclock',
      JSON.stringify({
        version: 1,
        initialised: true,
        homeCityId: cities[0],
        cities: cities.map((id: string) => ({ id })),
        settings: {
          theme: 'system',
          defaultStyle: 'full',
          hours: {
            morning: { start: 420, end: 540 },
            work: { start: 540, end: 1080 },
            evening: { start: 1080, end: 1320 },
            asleep: { start: 1320, end: 420 },
            weekend: [6, 7],
          },
        },
      }),
    );
  }, ids);
