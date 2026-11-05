import { DEFAULT_HOURS } from '../../src/hours/status';
import { reducer } from '../../src/state/reducer';
import { DEFAULT_STATE, effectiveHours, effectiveStyle, type AppState } from '../../src/state/types';

const withCities = (...ids: string[]): AppState => ({ ...DEFAULT_STATE, cities: ids.map((id) => ({ id })) });
const ids = (s: AppState) => s.cities.map((c) => c.id);

describe('reducer', () => {
  test('add appends; duplicate add is ignored (AC6)', () => {
    const s = reducer(withCities('a'), { type: 'add', id: 'b' });
    expect(ids(s)).toEqual(['a', 'b']);
    expect(reducer(s, { type: 'add', id: 'a' })).toBe(s);
  });
  test('merge appends only new ids, in order (AC6)', () => {
    expect(ids(reducer(withCities('b', 'c'), { type: 'merge', ids: ['a', 'b'] }))).toEqual(['b', 'c', 'a']);
  });
  test('remove drops the card and clears home if it was home', () => {
    const s = reducer({ ...withCities('a', 'b'), homeCityId: 'a' }, { type: 'remove', id: 'a' });
    expect(ids(s)).toEqual(['b']);
    expect(s.homeCityId).toBeUndefined();
  });
  test('move reorders', () => {
    expect(ids(reducer(withCities('a', 'b', 'c'), { type: 'move', from: 0, to: 2 }))).toEqual(['b', 'c', 'a']);
  });
  test('setHome sets the home city', () => {
    expect(reducer(withCities('a'), { type: 'setHome', id: 'a' }).homeCityId).toBe('a');
  });
  test('initHome adds the city first, sets home and marks initialised', () => {
    const s = reducer(withCities('b'), { type: 'initHome', id: 'x' });
    expect(ids(s)).toEqual(['x', 'b']);
    expect(s.homeCityId).toBe('x');
    expect(s.initialised).toBe(true);
  });
  test('initHome without a city only marks initialised', () => {
    const s = reducer(withCities('b'), { type: 'initHome' });
    expect(ids(s)).toEqual(['b']);
    expect(s.initialised).toBe(true);
  });
  test('setStyle overrides and clears; effectiveStyle prefers override (AC9)', () => {
    let s = reducer(withCities('a'), { type: 'setStyle', id: 'a', style: 'flip' });
    expect(effectiveStyle(s.cities[0], s.settings)).toBe('flip');
    s = reducer(s, { type: 'setStyle', id: 'a' });
    expect(s.cities[0].style).toBeUndefined();
    expect(effectiveStyle(s.cities[0], s.settings)).toBe('full');
  });
  test('setHours overrides; effectiveHours falls back to settings', () => {
    const custom = { ...DEFAULT_HOURS, weekend: [5, 6] };
    const s = reducer(withCities('a', 'b'), { type: 'setHours', id: 'a', hours: custom });
    expect(effectiveHours(s.cities[0], s.settings)).toEqual(custom);
    expect(effectiveHours(s.cities[1], s.settings)).toEqual(DEFAULT_HOURS);
  });
  test('settings patch merges', () => {
    const s = reducer(DEFAULT_STATE, { type: 'settings', patch: { theme: 'dark' } });
    expect(s.settings.theme).toBe('dark');
    expect(s.settings.defaultStyle).toBe('full');
  });
  test('reset returns defaults but stays initialised', () => {
    expect(reducer(withCities('a'), { type: 'reset' })).toEqual({ ...DEFAULT_STATE, initialised: true });
  });
});
