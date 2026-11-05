import { dayRelation, dstChange, dstNoticeText, offsetDiffLabel, toWallClockDate, zoned } from '../../src/time/zoned';
import { utc } from '../helpers/utc';

const fmt = (zone: string, iso: string) => zoned(zone, utc(iso)).toFormat('HH:mm ZZ');

describe('zoned (AC1 DST correctness)', () => {
  test('New York across 2026-11-01 fall-back', () => {
    expect(fmt('America/New_York', '2026-11-01T05:30')).toBe('01:30 -04:00');
    expect(fmt('America/New_York', '2026-11-01T06:30')).toBe('01:30 -05:00');
  });
  test('London across 2026-03-29 spring-forward', () => {
    expect(fmt('Europe/London', '2026-03-29T00:30')).toBe('00:30 +00:00');
    expect(fmt('Europe/London', '2026-03-29T01:30')).toBe('02:30 +01:00');
  });
  test('Sydney across 2026-10-04 spring-forward', () => {
    expect(fmt('Australia/Sydney', '2026-10-03T15:30')).toBe('01:30 +10:00');
    expect(fmt('Australia/Sydney', '2026-10-03T16:30')).toBe('03:30 +11:00');
  });
  test('planner +24h across New York DST change (Review Focus 4)', () => {
    expect(zoned('America/New_York', utc('2026-10-31T16:00') + 24 * 3600e3).toFormat('dd HH:mm ZZ')).toBe('01 11:00 -05:00');
  });
});

describe('offsetDiffLabel (AC2)', () => {
  const t = utc('2026-11-05T16:40');
  test.each([
    ['Asia/Kolkata', '+5h 30m'],
    ['Asia/Kathmandu', '+5h 45m'],
    ['America/New_York', '−5h'],
    ['Europe/London', 'Same time'],
  ])('%s → %s', (zone, label) => {
    expect(offsetDiffLabel('Europe/London', zone, t)).toBe(label);
  });
});

describe('dayRelation (AC3)', () => {
  const t = utc('2026-11-05T16:40');
  test('Sydney is tomorrow from London', () => {
    expect(dayRelation('Europe/London', 'Australia/Sydney', t)).toBe('tomorrow');
  });
  test('London is yesterday from Sydney', () => {
    expect(dayRelation('Australia/Sydney', 'Europe/London', t)).toBe('yesterday');
  });
  test('Berlin is same day', () => {
    expect(dayRelation('Europe/London', 'Europe/Berlin', t)).toBe('same');
  });
});

describe('dstChange (AC4)', () => {
  test('New York went back 4 days ago', () => {
    const c = dstChange('America/New_York', utc('2026-11-05T16:40'));
    expect(c).toEqual({ direction: 'back', days: 4, past: true });
    expect(dstNoticeText(c!)).toBe('Clocks went back 4 days ago');
  });
  test('outside the 7-day window → null', () => {
    expect(dstChange('America/New_York', utc('2026-11-09T12:00'))).toBeNull();
  });
  test('London goes forward in 3 days', () => {
    const c = dstChange('Europe/London', utc('2026-03-26T12:00'));
    expect(c).toEqual({ direction: 'forward', days: 3, past: false });
    expect(dstNoticeText(c!)).toBe('Clocks go forward in 3 days');
  });
  test('zone without DST → null', () => {
    expect(dstChange('Asia/Kolkata', utc('2026-11-05T16:40'))).toBeNull();
  });
  test('same-day change reads "today"', () => {
    expect(dstNoticeText({ direction: 'back', days: 0, past: false })).toBe('Clocks go back today');
  });
});

describe('toWallClockDate (AC10 helper)', () => {
  test('local fields equal the zone wall clock', () => {
    const d = toWallClockDate(zoned('Asia/Kolkata', utc('2026-11-05T04:40:30')));
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([10, 10, 30]);
  });
});
