import { cityId, cityLabel, findHomeCity, loadCities, searchCities, toCities } from '../../src/cities/cities';
import type { City } from '../../src/cities/types';

let all: City[];
beforeAll(async () => {
  all = await loadCities();
});

describe('cityId', () => {
  test('slug of city, province and lowercase iso2', () => {
    expect(cityId({ city_ascii: 'Chennai', province: 'Tamil Nadu', iso2: 'IN' })).toBe('chennai-tamil-nadu-in');
    expect(cityId({ city_ascii: "St. John's", province: 'Newfoundland and Labrador', iso2: 'CA' })).toBe(
      'st-john-s-newfoundland-and-labrador-ca',
    );
  });
  test('falls back to iso3 when iso2 is not a string (Kosovo has iso2 -99)', () => {
    expect(cityId({ city_ascii: 'Pristina', province: 'Pristina', iso2: -99 as unknown as string, iso3: 'KOS' })).toBe(
      'pristina-pristina-kos',
    );
  });
  test('ids are unique across the dataset', () => {
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
  });
});

test('toCities drops entries without a timezone', () => {
  const raw = [
    { city: 'A', city_ascii: 'A', province: 'P', country: 'X', iso2: 'XX', timezone: '', pop: 1 },
    { city: 'B', city_ascii: 'B', province: 'P', country: 'X', iso2: 'XX', timezone: 'Europe/London', pop: 1 },
  ];
  expect(toCities(raw).map((c) => c.name)).toEqual(['B']);
});

describe('searchCities (AC5)', () => {
  test('"chen" finds Chennai, India near the top', () => {
    const top = searchCities(all, 'chen').slice(0, 5);
    expect(top.some((c) => c.name === 'Chennai' && c.country === 'India')).toBe(true);
  });
  test('accent-insensitive: "são" and "sao" both find Sao Paulo, Brazil', () => {
    for (const q of ['são', 'sao']) {
      expect(searchCities(all, q).some((c) => c.name === 'Sao Paulo' && c.country === 'Brazil')).toBe(true);
    }
  });
  test('blank query returns nothing', () => {
    expect(searchCities(all, '')).toEqual([]);
    expect(searchCities(all, '   ')).toEqual([]);
  });
  test('at most 20 results', () => {
    expect(searchCities(all, 'a').length).toBeLessThanOrEqual(20);
  });
  test('same-named cities are distinguishable, biggest first (Review Focus 1)', () => {
    const londons = searchCities(all, 'london').filter((c) => c.name === 'London');
    expect(londons.length).toBeGreaterThanOrEqual(3);
    expect(new Set(londons.map((c) => c.id)).size).toBe(londons.length);
    expect(new Set(londons.map(cityLabel)).size).toBe(londons.length);
    expect(londons[0].country).toBe('United Kingdom');
  });
});

describe('findHomeCity (AC14)', () => {
  test('Asia/Kolkata → an Indian city in that zone', () => {
    const c = findHomeCity(all, 'Asia/Kolkata');
    expect(c?.country).toBe('India');
    expect(c?.zone).toBe('Asia/Kolkata');
  });
  test('Europe/London → London', () => {
    expect(findHomeCity(all, 'Europe/London')?.name).toBe('London');
  });
  test('unknown zone → undefined', () => {
    expect(findHomeCity(all, 'Mars/Olympus')).toBeUndefined();
  });
});

test('cityLabel omits empty or duplicate province', () => {
  const base = { id: 'x', iso2: 'SG', zone: 'Asia/Singapore', pop: 1 };
  expect(cityLabel({ ...base, name: 'Singapore', province: 'Singapore', country: 'Singapore' })).toBe('Singapore, Singapore');
  expect(cityLabel({ ...base, name: 'Chennai', province: 'Tamil Nadu', country: 'India' })).toBe('Chennai, Tamil Nadu, India');
  expect(cityLabel({ ...base, name: 'X', province: '', country: 'Y' })).toBe('X, Y');
});
