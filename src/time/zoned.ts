import { DateTime } from 'luxon';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export type DstChange = { direction: 'forward' | 'back'; days: number; past: boolean };
export type DayRelation = 'same' | 'tomorrow' | 'yesterday';

export function zoned(zone: string, instant: number): DateTime {
  return DateTime.fromMillis(instant, { zone });
}

/** A local Date whose wall-clock fields equal `dt`'s, for libraries that read local fields (react-clock). */
export function toWallClockDate(dt: DateTime): Date {
  return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond);
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

export function dstChange(zone: string, instant: number, windowDays = 7): DstChange | null {
  const windowMs = windowDays * DAY_MS;
  let nearest: { at: number; delta: number } | null = null;
  let prevOffset = zoned(zone, instant - windowMs).offset;
  for (let t = instant - windowMs + HOUR_MS; t <= instant + windowMs; t += HOUR_MS) {
    const offset = zoned(zone, t).offset;
    if (offset !== prevOffset && (!nearest || Math.abs(t - instant) < Math.abs(nearest.at - instant))) {
      nearest = { at: t, delta: offset - prevOffset };
    }
    prevOffset = offset;
  }
  if (!nearest) return null;
  return {
    direction: nearest.delta > 0 ? 'forward' : 'back',
    days: Math.round(Math.abs(nearest.at - instant) / DAY_MS),
    past: nearest.at <= instant,
  };
}

export function dstNoticeText(c: DstChange): string {
  if (c.days === 0) return `Clocks go ${c.direction} today`;
  const unit = c.days === 1 ? 'day' : 'days';
  return c.past ? `Clocks went ${c.direction} ${c.days} ${unit} ago` : `Clocks go ${c.direction} in ${c.days} ${unit}`;
}
