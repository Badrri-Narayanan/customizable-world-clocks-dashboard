import type { City, CityMappingEntry } from './types';

const stripAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const normalise = (s: string): string => stripAccents(s).toLowerCase().trim();
const slug = (s: string): string =>
  normalise(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const countryCode = (raw: Pick<CityMappingEntry, 'iso2' | 'iso3'>): string =>
  typeof raw.iso2 === 'string' ? raw.iso2 : String(raw.iso3 ?? '');

export function cityId(raw: Pick<CityMappingEntry, 'city_ascii' | 'province' | 'iso2' | 'iso3'>): string {
  return [slug(raw.city_ascii), slug(raw.province ?? ''), countryCode(raw).toLowerCase()].filter(Boolean).join('-');
}

export function toCities(raw: CityMappingEntry[]): City[] {
  return raw
    .filter((r) => r.timezone)
    .map((r) => ({
      id: cityId(r),
      name: r.city_ascii,
      province: r.province ?? '',
      country: r.country,
      iso2: countryCode(r),
      zone: r.timezone,
      pop: r.pop ?? 0,
    }));
}

let cached: Promise<City[]> | null = null;
export function loadCities(): Promise<City[]> {
  cached ??= import('city-timezones/data/cityMap.json').then((m) => toCities(m.default as CityMappingEntry[]));
  return cached;
}

export function cityLabel(c: City): string {
  const parts = [c.name];
  if (c.province && c.province !== c.name) parts.push(c.province);
  parts.push(c.country);
  return parts.join(', ');
}

type Indexed = { city: City; name: string; rest: string };
const indexCache = new WeakMap<City[], Indexed[]>();
function indexOf(cities: City[]): Indexed[] {
  let idx = indexCache.get(cities);
  if (!idx) {
    idx = cities.map((city) => ({ city, name: normalise(city.name), rest: normalise(`${city.province} ${city.country}`) }));
    indexCache.set(cities, idx);
  }
  return idx;
}

export function searchCities(cities: City[], query: string, limit = 20): City[] {
  const q = normalise(query);
  if (!q) return [];
  const scored: { city: City; rank: number }[] = [];
  for (const { city, name, rest } of indexOf(cities)) {
    let rank: number;
    if (name === q) rank = 0;
    else if (name.startsWith(q)) rank = 1;
    else if (name.includes(q)) rank = 2;
    else if (rest.includes(q)) rank = 3;
    else continue;
    scored.push({ city, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || b.city.pop - a.city.pop);
  return scored.slice(0, limit).map((s) => s.city);
}

export function findHomeCity(cities: City[], zone: string): City | undefined {
  const inZone = cities.filter((c) => c.zone === zone);
  if (!inZone.length) return undefined;
  const named = normalise((zone.split('/').pop() ?? '').replace(/_/g, ' '));
  const byPop = [...inZone].sort((a, b) => b.pop - a.pop);
  return byPop.find((c) => normalise(c.name) === named) ?? byPop[0];
}
