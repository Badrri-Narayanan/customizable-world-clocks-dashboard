import { DateTime } from 'luxon';
import { findHomeCity, loadCities } from '../../src/cities/cities';
import { DEFAULT_HOURS, statusAt } from '../../src/hours/status';
import { dstChange, toWallClockDate } from '../../src/time/zoned';
import { utc } from '../helpers/utc';

describe('#1 toWallClockDate inside the browser zone DST gap', () => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });
  test('London 02:30 on 2026-03-08 keeps hour 2 when the browser is in New York', () => {
    process.env.TZ = 'America/New_York';
    const d = toWallClockDate(DateTime.fromISO('2026-03-08T02:30:15', { zone: 'Europe/London' }));
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([2, 30, 15]);
  });
  test('New York 01:30 on 2026-03-29 keeps hour 1 when the browser is in London', () => {
    process.env.TZ = 'Europe/London';
    const d = toWallClockDate(DateTime.fromISO('2026-03-29T01:30', { zone: 'America/New_York' }));
    expect(d.getHours()).toBe(1);
  });
});

describe('#2 home detection with legacy zone aliases (Chromium reports Asia/Calcutta)', () => {
  test.each([
    ['Asia/Calcutta', 'India'],
    ['Europe/Kiev', 'Ukraine'],
    ['Asia/Saigon', 'Vietnam'],
  ])('%s → a city in %s', async (zone, country) => {
    expect(findHomeCity(await loadCities(), zone)?.country).toBe(country);
  });
});

describe('#3 gaps and overlaps between hour ranges', () => {
  const at = (iso: string) => DateTime.fromISO(iso, { zone: 'Europe/Berlin' });
  test('a gap after work reads as the upcoming range (evening), not morning', () => {
    const rule = { ...DEFAULT_HOURS, work: { start: 540, end: 1020 } };
    expect(statusAt(at('2026-11-04T17:30'), rule)).toBe('evening');
  });
  test('an earlier custom morning wins over the asleep range it overlaps', () => {
    const rule = { ...DEFAULT_HOURS, morning: { start: 360, end: 540 } };
    expect(statusAt(at('2026-11-04T06:30'), rule)).toBe('morning');
  });
});

describe('#4 dstChange cost', () => {
  test('a zone without DST needs only a handful of lookups', () => {
    const spy = vi.spyOn(DateTime, 'fromMillis');
    dstChange('Asia/Kolkata', utc('2026-11-05T16:40'));
    expect(spy.mock.calls.length).toBeLessThanOrEqual(5);
    spy.mockRestore();
  });
  test('repeated calls within the same hour reuse the result', () => {
    dstChange('America/New_York', utc('2026-11-05T16:40'));
    const spy = vi.spyOn(DateTime, 'fromMillis');
    dstChange('America/New_York', utc('2026-11-05T16:41'));
    expect(spy.mock.calls.length).toBeLessThanOrEqual(5);
    spy.mockRestore();
  });
});

describe('#5 DST notice days follow the calendar in the city', () => {
  test('15:00 the day before an overnight change is "in 1 day", not "today"', () => {
    expect(dstChange('Europe/London', utc('2026-10-24T14:00'))).toEqual({ direction: 'back', days: 1, past: false });
  });
  test('late on the day of the change counts as today', () => {
    expect(dstChange('Europe/London', utc('2026-10-25T22:00'))).toEqual({ direction: 'back', days: 0, past: true });
  });
});
