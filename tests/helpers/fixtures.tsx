import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { City } from '../../src/cities/types';
import { AppStateProvider } from '../../src/state/AppStateProvider';
import { STORAGE_KEY } from '../../src/state/storage';
import { DEFAULT_STATE, type AppState } from '../../src/state/types';
import { TimeProvider } from '../../src/time/TimeProvider';

const city = (id: string, name: string, province: string, country: string, zone: string, pop: number): City => ({
  id,
  name,
  province,
  country,
  iso2: id.slice(-2).toUpperCase(),
  zone,
  pop,
});

export const LONDON = city('london-westminster-gb', 'London', 'Westminster', 'United Kingdom', 'Europe/London', 8e6);
export const NEW_YORK = city('new-york-new-york-us', 'New York', 'New York', 'United States of America', 'America/New_York', 1.9e7);
export const SYDNEY = city('sydney-new-south-wales-au', 'Sydney', 'New South Wales', 'Australia', 'Australia/Sydney', 4.6e6);
export const CHENNAI = city('chennai-tamil-nadu-in', 'Chennai', 'Tamil Nadu', 'India', 'Asia/Kolkata', 5.7e6);
export const FIXTURE_CITIES = [LONDON, NEW_YORK, SYDNEY, CHENNAI];

/** Thursday 2026-11-05 16:40 in London. */
export const NOW = Date.UTC(2026, 10, 5, 16, 40, 0);

export function seedState(patch: Partial<AppState>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_STATE, initialised: true, ...patch }));
}

export function renderWithProviders(ui: ReactNode) {
  return render(
    <AppStateProvider>
      <TimeProvider>{ui}</TimeProvider>
    </AppStateProvider>,
  );
}
