import { DEFAULT_HOURS } from '../../src/hours/status';
import { load, save, STORAGE_KEY } from '../../src/state/storage';
import { DEFAULT_STATE, type AppState } from '../../src/state/types';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

test('save then load round-trips the full state (AC7)', () => {
  const mem = memoryStorage();
  const state: AppState = {
    version: 1,
    initialised: true,
    homeCityId: 'b',
    cities: [{ id: 'b' }, { id: 'a', style: 'lcd' }, { id: 'c', hours: { ...DEFAULT_HOURS, weekend: [5, 6] } }],
    settings: { hour12: false, theme: 'dark', defaultStyle: 'minimal', hours: { ...DEFAULT_HOURS, work: { start: 480, end: 1020 } } },
  };
  save(state, mem);
  expect(load(mem)).toEqual(state);
});

describe('load falls back to defaults on bad data (AC8)', () => {
  test.each([
    ['not json', '{not json'],
    ['unknown version', JSON.stringify({ version: 99 })],
    ['wrong shape', JSON.stringify({ version: 1, cities: 'x' })],
  ])('%s', (_, raw) => {
    const mem = memoryStorage();
    mem.setItem(STORAGE_KEY, raw);
    expect(load(mem)).toEqual(DEFAULT_STATE);
  });
  test('empty storage', () => {
    expect(load(memoryStorage())).toEqual(DEFAULT_STATE);
  });
  test('unknown style ids are dropped', () => {
    const mem = memoryStorage();
    mem.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_STATE, cities: [{ id: 'a', style: 'neon' }] }));
    expect(load(mem).cities).toEqual([{ id: 'a' }]);
  });
});

test('throwing storage never crashes (Review Focus 5)', () => {
  const broken = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  } as unknown as Storage;
  expect(load(broken)).toEqual(DEFAULT_STATE);
  expect(() => save(DEFAULT_STATE, broken)).not.toThrow();
});
