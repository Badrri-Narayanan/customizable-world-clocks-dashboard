import type { City } from '../cities/types';
import { useAppState } from '../state/AppStateProvider';
import { STYLE_IDS, STYLE_LABEL, type StyleId, type Theme } from '../state/types';
import { CitySearch } from './CitySearch';

const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const THEME_ICON: Record<Theme, string> = { system: '◐', light: '☀︎', dark: '☾' };

type Props = { cities: City[] | null; hour12: boolean; onShare(): void; onOpenSettings(): void };

export function TopBar({ cities, hour12, onShare, onOpenSettings }: Props) {
  const { state, dispatch } = useAppState();
  const { theme, defaultStyle } = state.settings;
  const added = new Set(state.cities.map((c) => c.id));

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden="true">
          🕰️
        </span>
        <h1>World Clock</h1>
      </div>
      <div className="topbar__search">
        <CitySearch cities={cities} addedIds={added} hour12={hour12} onAdd={(id) => dispatch({ type: 'add', id })} />
      </div>
      <div className="topbar__controls">
        <label className="select">
          <span className="sr-only">Default clock style</span>
          <select
            aria-label="Default clock style"
            value={defaultStyle}
            onChange={(e) => dispatch({ type: 'settings', patch: { defaultStyle: e.target.value as StyleId } })}
          >
            {STYLE_IDS.map((s) => (
              <option key={s} value={s}>
                {STYLE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="Clock format">
          <button type="button" aria-pressed={hour12} onClick={() => dispatch({ type: 'settings', patch: { hour12: true } })}>
            12h
          </button>
          <button type="button" aria-pressed={!hour12} onClick={() => dispatch({ type: 'settings', patch: { hour12: false } })}>
            24h
          </button>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Theme: ${THEME_LABEL[theme]} (switch to ${THEME_LABEL[NEXT_THEME[theme]]})`}
          title={`Theme: ${THEME_LABEL[theme]}`}
          onClick={() => dispatch({ type: 'settings', patch: { theme: NEXT_THEME[theme] } })}
        >
          {THEME_ICON[theme]}
        </button>
        <button type="button" className="icon-btn" aria-label="Share" title="Share" onClick={onShare} disabled={!state.cities.length}>
          🔗
        </button>
        <button type="button" className="icon-btn" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
          ⚙︎
        </button>
      </div>
    </header>
  );
}
