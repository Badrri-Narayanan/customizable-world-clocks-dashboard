import type { HoursRule } from '../hours/status';
import { DEFAULT_STATE, type AppState, type CardEntry, type Settings, type StyleId } from './types';

export type Action =
  | { type: 'add'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'move'; from: number; to: number }
  | { type: 'setStyle'; id: string; style?: StyleId }
  | { type: 'setHours'; id: string; hours?: HoursRule }
  | { type: 'setHome'; id?: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'merge'; ids: string[] }
  | { type: 'initHome'; id?: string }
  | { type: 'reset' };

const updateCard = (s: AppState, id: string, patch: Partial<CardEntry>): AppState => ({
  ...s,
  cities: s.cities.map((c) => {
    if (c.id !== id) return c;
    const next: CardEntry = { ...c, ...patch };
    for (const k of Object.keys(patch) as (keyof CardEntry)[]) if (next[k] === undefined) delete next[k];
    return next;
  }),
});

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'add':
      return s.cities.some((c) => c.id === a.id) ? s : { ...s, cities: [...s.cities, { id: a.id }] };
    case 'merge': {
      const have = new Set(s.cities.map((c) => c.id));
      const fresh = [...new Set(a.ids)].filter((id) => !have.has(id));
      return fresh.length ? { ...s, cities: [...s.cities, ...fresh.map((id) => ({ id }))] } : s;
    }
    case 'remove':
      return {
        ...s,
        cities: s.cities.filter((c) => c.id !== a.id),
        homeCityId: s.homeCityId === a.id ? undefined : s.homeCityId,
      };
    case 'move': {
      const cities = [...s.cities];
      const [moved] = cities.splice(a.from, 1);
      if (!moved) return s;
      cities.splice(a.to, 0, moved);
      return { ...s, cities };
    }
    case 'setStyle':
      return updateCard(s, a.id, { style: a.style });
    case 'setHours':
      return updateCard(s, a.id, { hours: a.hours });
    case 'setHome':
      return { ...s, homeCityId: a.id };
    case 'settings':
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'initHome': {
      if (!a.id) return { ...s, initialised: true };
      const rest = s.cities.filter((c) => c.id !== a.id);
      return { ...s, cities: [{ id: a.id }, ...rest], homeCityId: a.id, initialised: true };
    }
    case 'reset':
      return { ...DEFAULT_STATE, initialised: true };
  }
}
