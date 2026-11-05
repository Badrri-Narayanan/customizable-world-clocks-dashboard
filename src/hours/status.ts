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

export function statusAt(dt: DateTime, rule: HoursRule): Status {
  const minute = dt.hour * 60 + dt.minute;
  if (inRange(minute, rule.asleep)) return 'asleep';
  if (inRange(minute, rule.evening)) return 'evening';
  if (inRange(minute, rule.work)) return rule.weekend.includes(dt.weekday) ? 'weekend' : 'work';
  return 'morning';
}

export const isNight = (s: Status): boolean => s === 'asleep' || s === 'evening';
