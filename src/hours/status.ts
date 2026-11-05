import type { DateTime } from 'luxon';

/** Minutes from midnight; `end < start` wraps past midnight. */
export type Range = { start: number; end: number };
/** `weekend` uses Luxon weekdays: 1 = Monday … 7 = Sunday. */
export type HoursRule = { morning: Range; work: Range; evening: Range; asleep: Range; weekend: number[] };
export type Status = 'work' | 'morning' | 'evening' | 'asleep' | 'weekend';

export const DEFAULT_HOURS: HoursRule = {
  morning: { start: 420, end: 540 },
  work: { start: 540, end: 1080 },
  evening: { start: 1080, end: 1320 },
  asleep: { start: 1320, end: 420 },
  weekend: [6, 7],
};

export const STATUS_LABEL: Record<Status, string> = {
  work: 'Working hours',
  morning: 'Morning',
  evening: 'Evening',
  asleep: 'Probably asleep',
  weekend: 'Weekend',
};

export const inRange = (minute: number, r: Range): boolean =>
  r.start <= r.end ? minute >= r.start && minute < r.end : minute >= r.start || minute < r.end;

const ORDER = ['work', 'morning', 'evening', 'asleep'] as const;

/**
 * Named ranges are checked in precedence order (work, morning, evening, asleep) so a user's custom range wins
 * over the broader asleep range it overlaps. A minute in no range takes the range that starts next.
 */
export function statusAt(dt: DateTime, rule: HoursRule): Status {
  const minute = dt.hour * 60 + dt.minute;
  const hit = ORDER.find((k) => inRange(minute, rule[k])) ?? ORDER.reduce((best, k) =>
    (rule[k].start - minute + 1440) % 1440 < (rule[best].start - minute + 1440) % 1440 ? k : best,
  );
  return hit === 'work' && rule.weekend.includes(dt.weekday) ? 'weekend' : hit;
}

export const isNight = (s: Status): boolean => s === 'asleep' || s === 'evening';
