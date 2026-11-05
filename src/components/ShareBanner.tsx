import { cityLabel } from '../cities/cities';
import type { City } from '../cities/types';

type Props = { cities: City[]; onAdd(): void; onDismiss(): void };

export function ShareBanner({ cities, onAdd, onDismiss }: Props) {
  const n = cities.length;
  return (
    <section className="banner" aria-label="Shared cities">
      <p className="banner__title">
        Someone shared {n} {n === 1 ? 'city' : 'cities'} with you
      </p>
      <p className="banner__list">{cities.map(cityLabel).join(' · ')}</p>
      <div className="banner__actions">
        <button type="button" className="btn btn--primary" onClick={onAdd} disabled={!n}>
          Add to my dashboard
        </button>
        <button type="button" className="btn btn--ghost" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </section>
  );
}
