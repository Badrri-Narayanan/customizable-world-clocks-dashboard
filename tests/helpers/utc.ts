import { DateTime } from 'luxon';

export const utc = (iso: string): number => DateTime.fromISO(iso, { zone: 'utc' }).toMillis();
