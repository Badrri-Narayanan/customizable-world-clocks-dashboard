import { DEFAULT_HOURS, type HoursRule } from '../hours/status';

export const STYLE_IDS = ['full', 'classic', 'minimal', 'digital', 'flip', 'lcd'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const STYLE_LABEL: Record<StyleId, string> = {
  full: 'Full numbers',
  classic: 'Classic',
  minimal: 'Minimal',
  digital: 'Modern digital',
  flip: 'Flip',
  lcd: 'Retro LCD',
};

export type Theme = 'light' | 'dark' | 'system';
export type CardEntry = { id: string; style?: StyleId; hours?: HoursRule };
export type Settings = { hour12?: boolean; theme: Theme; defaultStyle: StyleId; hours: HoursRule };
export type AppState = {
  version: 1;
  cities: CardEntry[];
  homeCityId?: string;
  settings: Settings;
  /** Home-city detection has already run once. */
  initialised: boolean;
};

export const DEFAULT_STATE: AppState = {
  version: 1,
  cities: [],
  settings: { theme: 'system', defaultStyle: 'full', hours: DEFAULT_HOURS },
  initialised: false,
};

export const effectiveStyle = (entry: CardEntry, s: Settings): StyleId => entry.style ?? s.defaultStyle;
export const effectiveHours = (entry: CardEntry, s: Settings): HoursRule => entry.hours ?? s.hours;
