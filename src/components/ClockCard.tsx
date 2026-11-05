import { useCallback, useState, type HTMLAttributes } from 'react';
import type { City } from '../cities/types';
import { ClockFace } from '../faces/ClockFace';
import { isNight, STATUS_LABEL, statusAt } from '../hours/status';
import { useAppState } from '../state/AppStateProvider';
import { effectiveHours, effectiveStyle, type CardEntry } from '../state/types';
import { resolveHour12 } from '../time/hour12';
import { useTime } from '../time/TimeProvider';
import { dayRelation, dstChange, dstNoticeText, offsetDiffLabel, zoned } from '../time/zoned';
import { CardMenu } from './CardMenu';

type Props = {
  city: City;
  entry: CardEntry;
  homeZone: string;
  isHome: boolean;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
};

const RELATION_LABEL = { tomorrow: 'Tomorrow', yesterday: 'Yesterday', same: '' } as const;

export function ClockCard({ city, entry, homeZone, isHome, dragHandleProps }: Props) {
  const { state, dispatch } = useAppState();
  const { instant } = useTime();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const hour12 = resolveHour12(state.settings.hour12);
  const dt = zoned(city.zone, instant);
  const status = statusAt(dt, effectiveHours(entry, state.settings));
  const offset = offsetDiffLabel(homeZone, city.zone, instant);
  const relation = dayRelation(homeZone, city.zone, instant);
  const dst = dstChange(city.zone, instant);
  const timeText = dt.toFormat(hour12 ? 'h:mm a' : 'HH:mm');
  const place = [city.province !== city.name ? city.province : '', city.country].filter(Boolean).join(', ');

  return (
    <article className={`card${isNight(status) ? ' card--night' : ''}`} aria-label={city.name}>
      <div className="card__top">
        {dragHandleProps ? (
          <button type="button" className="icon-btn card__drag" aria-label={`Reorder ${city.name}`} {...dragHandleProps}>
            ⠿
          </button>
        ) : (
          <span />
        )}
        {isHome && (
          <span className="card__you">
            <span aria-hidden="true">📍</span>
            <span>You</span>
          </span>
        )}
        <span className="card__spacer" />
        <button
          type="button"
          className="icon-btn"
          aria-label={`Options for ${city.name}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          ⋯
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Remove ${city.name}`}
          onClick={() => dispatch({ type: 'remove', id: city.id })}
        >
          ✕
        </button>
      </div>
      {menuOpen && <CardMenu city={city} entry={entry} isHome={isHome} onClose={closeMenu} />}

      <div className="card__face">
        <ClockFace
          dt={dt}
          hour12={hour12}
          night={isNight(status)}
          style={effectiveStyle(entry, state.settings)}
          offsetLabel={offset}
          label={`${city.name}, ${timeText} ${dt.toFormat('cccc')}`}
          size={150}
        />
      </div>

      <h2 className="card__city">{city.name}</h2>
      <p className="card__place">{place}</p>
      <p className="card__meta">
        <span className="card__time">{timeText}</span>
        <span aria-hidden="true"> · </span>
        <span>{dt.toFormat('ccc')}</span>
        {relation !== 'same' && (
          <>
            {' '}
            <span className="card__relation">{RELATION_LABEL[relation]}</span>
          </>
        )}
        {!isHome && (
          <>
            <span aria-hidden="true"> · </span>
            <span>{offset}</span>
          </>
        )}
      </p>
      <p className="card__badges">
        <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>
        {entry.hours && <span className="badge badge--custom">custom hours</span>}
      </p>
      {dst && (
        <p className="card__dst">
          <span aria-hidden="true">⟲ </span>
          <span>{dstNoticeText(dst)}</span>
        </p>
      )}
    </article>
  );
}
