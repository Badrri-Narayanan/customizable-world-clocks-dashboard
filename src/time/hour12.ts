/** Explicit setting wins; otherwise follow the browser locale's clock convention. */
export function resolveHour12(setting?: boolean): boolean {
  if (typeof setting === 'boolean') return setting;
  const cycle = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12';
}
