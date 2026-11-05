import { DateTime } from 'luxon';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export type DstChange = { direction: 'forward' | 'back'; days: number; past: boolean };
export type DayRelation = 'same' | 'tomorrow' | 'yesterday';

export function zoned(zone: string, instant: number): DateTime {
  return DateTime.fromMillis(instant, { zone });
}

/**
 * A local Date whose hour/minute/second equal `dt`'s, for libraries that read local fields (react-clock).
 * Anchored to a fixed date rather than dt's own date: if dt's wall time fell inside the *browser's* DST gap
 * on that date, the engine would shift the hour. Only the time-of-day fields are meaningful.
 */
export function toWallClockDate(dt: DateTime): Date {
  for (let day = 1; day <= 7; day++) {
    const d = new Date(2001, 0, day, dt.hour, dt.minute, dt.second, dt.millisecond);
    if (d.getHours() === dt.hour && d.getMinutes() === dt.minute) return d;
  }
  return new Date(2001, 0, 1, dt.hour, dt.minute, dt.second, dt.millisecond);
}

export function offsetDiffLabel(home: string, zone: string, instant: number): string {
  const diff = zoned(zone, instant).offset - zoned(home, instant).offset;
  if (diff === 0) return 'Same time';
  const sign = diff > 0 ? '+' : '−';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m ? ` ${m}m` : ''}`;
}

export function dayRelation(home: string, zone: string, instant: number): DayRelation {
  const a = zoned(home, instant);
  const b = zoned(zone, instant);
  const days = DateTime.utc(b.year, b.month, b.day).diff(DateTime.utc(a.year, a.month, a.day), 'days').days;
  if (days > 0) return 'tomorrow';
  if (days < 0) return 'yesterday';
  return 'same';
}

type Transition = { at: number; delta: number } | null;
const transitionCache = new Map<string, Transition>();
const offsetAt = (zone: string, t: number) => zoned(zone, t).offset;

/** Finds the instant (to the minute) between lo and hi where the zone's offset changes. */
function bisect(zone: string, lo: number, hi: number): Transition {
  const before = offsetAt(zone, lo);
  const after = offsetAt(zone, hi);
  while (hi - lo > 60_000) {
    const mid = Math.floor((lo + hi) / 2);
    if (offsetAt(zone, mid) === before) lo = mid;
    else hi = mid;
  }
  return { at: hi, delta: after - before };
}

/** Nearest offset change within ±windowDays, cached per zone and hour so per-second ticks stay cheap. */
function nearestTransition(zone: string, instant: number, windowMs: number): Transition {
  const key = `${zone}|${windowMs}|${Math.floor(instant / HOUR_MS)}`;
  if (transitionCache.has(key)) return transitionCache.get(key)!;
  const lo = instant - windowMs;
  const hi = instant + windowMs;
  const [oLo, oNow, oHi] = [offsetAt(zone, lo), offsetAt(zone, instant), offsetAt(zone, hi)];
  let found: Transition = null;
  if (oLo !== oNow || oNow !== oHi) {
    const past = oLo !== oNow ? bisect(zone, lo, instant) : null;
    const future = oNow !== oHi ? bisect(zone, instant, hi) : null;
    found =
      past && future ? (instant - past.at <= future.at - instant ? past : future) : (past ?? future);
  }
  if (transitionCache.size > 1000) transitionCache.clear();
  transitionCache.set(key, found);
  return found;
}

export function dstChange(zone: string, instant: number, windowDays = 7): DstChange | null {
  const t = nearestTransition(zone, instant, windowDays * DAY_MS);
  if (!t) return null;
  const today = zoned(zone, instant).startOf('day');
  const changeDay = zoned(zone, t.at).startOf('day');
  return {
    direction: t.delta > 0 ? 'forward' : 'back',
    days: Math.abs(Math.round(changeDay.diff(today, 'days').days)),
    past: t.at <= instant,
  };
}

export function dstNoticeText(c: DstChange): string {
  if (c.days === 0) return c.past ? `Clocks went ${c.direction} today` : `Clocks go ${c.direction} today`;
  const unit = c.days === 1 ? 'day' : 'days';
  return c.past ? `Clocks went ${c.direction} ${c.days} ${unit} ago` : `Clocks go ${c.direction} in ${c.days} ${unit}`;
}
