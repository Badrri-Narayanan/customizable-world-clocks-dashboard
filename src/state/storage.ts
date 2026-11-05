import type { HoursRule, Range } from '../hours/status';
import { DEFAULT_STATE, STYLE_IDS, type AppState, type CardEntry, type StyleId, type Theme } from './types';

export const STORAGE_KEY = 'worldclock';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMinute = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 1440;
const isRange = (v: unknown): v is Range => isObj(v) && isMinute(v.start) && isMinute(v.end);
const isStyle = (v: unknown): v is StyleId => STYLE_IDS.includes(v as StyleId);
const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark' || v === 'system';

function asHours(v: unknown): HoursRule | undefined {
  if (!isObj(v)) return undefined;
  const { morning, work, evening, asleep, weekend } = v;
  if (!isRange(morning) || !isRange(work) || !isRange(evening) || !isRange(asleep)) return undefined;
  if (!Array.isArray(weekend) || !weekend.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) return undefined;
  return { morning, work, evening, asleep, weekend };
}

function asCard(v: unknown): CardEntry | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id) return null;
  const card: CardEntry = { id: v.id };
  if (isStyle(v.style)) card.style = v.style;
  const hours = asHours(v.hours);
  if (hours) card.hours = hours;
  return card;
}

/** Validates (and in future, upgrades) persisted data. Returns null when unusable. */
export function migrate(raw: unknown): AppState | null {
  if (!isObj(raw) || raw.version !== 1 || !Array.isArray(raw.cities) || !isObj(raw.settings)) return null;
  const st = raw.settings;
  const state: AppState = {
    version: 1,
    cities: raw.cities.map(asCard).filter((c): c is CardEntry => c !== null),
    settings: {
      theme: isTheme(st.theme) ? st.theme : DEFAULT_STATE.settings.theme,
      defaultStyle: isStyle(st.defaultStyle) ? st.defaultStyle : DEFAULT_STATE.settings.defaultStyle,
      hours: asHours(st.hours) ?? DEFAULT_STATE.settings.hours,
    },
    initialised: raw.initialised === true,
  };
  if (typeof st.hour12 === 'boolean') state.settings.hour12 = st.hour12;
  if (typeof raw.homeCityId === 'string' && state.cities.some((c) => c.id === raw.homeCityId)) {
    state.homeCityId = raw.homeCityId;
  }
  return state;
}

const defaultStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function load(storage: Storage | undefined = defaultStorage()): AppState {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    if (!text) return DEFAULT_STATE;
    return migrate(JSON.parse(text)) ?? DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function save(state: AppState, storage: Storage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (e.g. private mode): keep working in memory.
  }
}
