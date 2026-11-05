import { DateTime } from 'luxon';
import { DEFAULT_HOURS, isNight, STATUS_LABEL, statusAt } from '../../src/hours/status';

const at = (iso: string) => DateTime.fromISO(iso, { zone: 'Asia/Kolkata' });

describe('statusAt with default hours (AC11)', () => {
  test.each([
    ['2026-11-04T10:00', 'work'],
    ['2026-11-07T10:00', 'weekend'],
    ['2026-11-04T23:00', 'asleep'],
    ['2026-11-04T06:59', 'asleep'],
    ['2026-11-04T07:00', 'morning'],
    ['2026-11-04T18:00', 'evening'],
    ['2026-11-07T23:00', 'asleep'],
  ])('%s → %s', (iso, expected) => {
    expect(statusAt(at(iso), DEFAULT_HOURS)).toBe(expected);
  });
});

describe('statusAt with custom rules (AC11)', () => {
  test('earlier work hours', () => {
    const rule = { ...DEFAULT_HOURS, morning: { start: 420, end: 480 }, work: { start: 480, end: 1020 } };
    expect(statusAt(at('2026-11-04T08:30'), rule)).toBe('work');
  });
  test('Friday–Saturday weekend', () => {
    const rule = { ...DEFAULT_HOURS, weekend: [5, 6] };
    expect(statusAt(at('2026-11-06T10:00'), rule)).toBe('weekend');
    expect(statusAt(at('2026-11-08T10:00'), rule)).toBe('work');
  });
});

test('labels and night flag', () => {
  expect(STATUS_LABEL.work).toBe('Working hours');
  expect(STATUS_LABEL.asleep).toBe('Probably asleep');
  expect(isNight('asleep')).toBe(true);
  expect(isNight('evening')).toBe(true);
  expect(isNight('work')).toBe(false);
});
