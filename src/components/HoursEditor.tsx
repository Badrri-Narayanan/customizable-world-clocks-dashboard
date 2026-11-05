import { useState, type FormEvent } from 'react';
import type { HoursRule, Range } from '../hours/status';

const RANGES: { key: Exclude<keyof HoursRule, 'weekend'>; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'work', label: 'Working hours' },
  { key: 'evening', label: 'Evening' },
  { key: 'asleep', label: 'Probably asleep' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const toMinutes = (t: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!match) return null;
  const m = Number(match[1]) * 60 + Number(match[2]);
  return m >= 0 && m < 1440 ? m : null;
};

type Props = { value: HoursRule; onSave(r: HoursRule): void; onReset?(): void; onCancel?(): void };

export function HoursEditor({ value, onSave, onReset, onCancel }: Props) {
  const [draft, setDraft] = useState(() => ({
    times: Object.fromEntries(RANGES.map(({ key }) => [key, { start: toTime(value[key].start), end: toTime(value[key].end) }])) as Record<
      string,
      { start: string; end: string }
    >,
    weekend: value.weekend,
  }));
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rule = { weekend: [...draft.weekend].sort() } as HoursRule;
    for (const { key, label } of RANGES) {
      const start = toMinutes(draft.times[key].start);
      const end = toMinutes(draft.times[key].end);
      if (start === null || end === null) return setError(`Check the times for ${label}.`);
      rule[key] = { start, end } satisfies Range;
    }
    onSave(rule);
  };

  const setTime = (key: string, edge: 'start' | 'end', v: string) =>
    setDraft((d) => ({ ...d, times: { ...d.times, [key]: { ...d.times[key], [edge]: v } } }));
  const toggleDay = (day: number) =>
    setDraft((d) => ({ ...d, weekend: d.weekend.includes(day) ? d.weekend.filter((x) => x !== day) : [...d.weekend, day] }));

  return (
    <form className="hours-editor" onSubmit={submit}>
      {RANGES.map(({ key, label }) => (
        <fieldset key={key} className="hours-editor__row">
          <legend>{label}</legend>
          <label>
            <span className="sr-only">{label} from</span>
            <input type="time" aria-label={`${label} from`} value={draft.times[key].start} onChange={(e) => setTime(key, 'start', e.target.value)} />
          </label>
          <span aria-hidden="true">–</span>
          <label>
            <span className="sr-only">{label} to</span>
            <input type="time" aria-label={`${label} to`} value={draft.times[key].end} onChange={(e) => setTime(key, 'end', e.target.value)} />
          </label>
        </fieldset>
      ))}
      <fieldset className="hours-editor__days">
        <legend>Weekend days</legend>
        {DAYS.map((d, i) => (
          <label key={d} className="chip">
            <input type="checkbox" checked={draft.weekend.includes(i + 1)} onChange={() => toggleDay(i + 1)} />
            {d}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="hours-editor__error">{error}</p>}
      <div className="hours-editor__actions">
        {onReset && (
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            Reset to defaults
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--primary">
          Save hours
        </button>
      </div>
    </form>
  );
}
