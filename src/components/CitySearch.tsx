import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { cityLabel, searchCities } from '../cities/cities';
import type { City } from '../cities/types';
import { resolveHour12 } from '../time/hour12';
import { zoned } from '../time/zoned';

type Props = { cities: City[] | null; onAdd(id: string): void; addedIds: Set<string>; hour12?: boolean };

const DEBOUNCE_MS = 100;

export function CitySearch({ cities, onAdd, addedIds, hour12 }: Props) {
  const listId = useId();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(text), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text]);

  const results = useMemo(() => (cities ? searchCities(cities, query) : []), [cities, query]);
  const firstEnabled = results.findIndex((c) => !addedIds.has(c.id));
  useEffect(() => setActive(Math.max(0, firstEnabled)), [results, firstEnabled]);

  const showList = open && text.trim() !== '';
  const fmt = resolveHour12(hour12) ? 'h:mm a' : 'HH:mm';
  const now = Date.now();

  const choose = (c: City | undefined) => {
    if (!c || addedIds.has(c.id)) return;
    onAdd(c.id);
    setText('');
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (!results.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="search">
      <span className="search__icon" aria-hidden="true">
        ⌕
      </span>
      <input
        role="combobox"
        aria-label="Add a city"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        className="search__input"
        placeholder='Add a city… (e.g. "Chen")'
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul id={listId} role="listbox" className="search__list">
          {!cities && <li className="search__hint">Loading cities…</li>}
          {cities && query && !results.length && <li className="search__hint">No cities match “{query}”</li>}
          {results.map((c, i) => {
            const added = addedIds.has(c.id);
            const dt = zoned(c.zone, now);
            return (
              <li
                key={c.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={added}
                className={`search__option${i === active ? ' is-active' : ''}${added ? ' is-added' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c)}
              >
                <span className="search__label">{cityLabel(c)}</span>
                <span className="search__time">
                  {added ? 'Added' : `${dt.toFormat(fmt)} · UTC${dt.toFormat('ZZ')}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
