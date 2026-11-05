import { useEffect, useRef, useState } from 'react';
import type { City } from '../cities/types';
import { useAppState } from '../state/AppStateProvider';
import { STYLE_IDS, STYLE_LABEL, effectiveHours, type CardEntry } from '../state/types';
import { HoursEditor } from './HoursEditor';

type Props = { city: City; entry: CardEntry; isHome: boolean; onClose(): void };

export function CardMenu({ city, entry, isHome, onClose }: Props) {
  const { state, dispatch } = useAppState();
  const [editingHours, setEditingHours] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onPointer = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div ref={ref} className="card-menu" role="dialog" aria-label={`Options for ${city.name}`}>
      {editingHours ? (
        <>
          <h3 className="card-menu__title">Hours in {city.name}</h3>
          <HoursEditor
            value={effectiveHours(entry, state.settings)}
            onSave={(hours) => act(() => dispatch({ type: 'setHours', id: city.id, hours }))()}
            onReset={entry.hours ? act(() => dispatch({ type: 'setHours', id: city.id })) : undefined}
            onCancel={() => setEditingHours(false)}
          />
        </>
      ) : (
        <>
          <h3 className="card-menu__title">Clock style</h3>
          <div className="card-menu__styles">
            {STYLE_IDS.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                aria-pressed={entry.style === s}
                onClick={act(() => dispatch({ type: 'setStyle', id: city.id, style: s }))}
              >
                {STYLE_LABEL[s]}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              aria-pressed={!entry.style}
              onClick={act(() => dispatch({ type: 'setStyle', id: city.id }))}
            >
              Use default style
            </button>
          </div>
          <div className="card-menu__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setEditingHours(true)}>
              Set custom hours
            </button>
            {!isHome && (
              <button type="button" className="btn btn--ghost" onClick={act(() => dispatch({ type: 'setHome', id: city.id }))}>
                Set as my city
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
