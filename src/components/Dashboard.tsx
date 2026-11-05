import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { findHomeCity, loadCities } from '../cities/cities';
import type { City } from '../cities/types';
import { buildShareUrl, clearShareHash, parseShareHash } from '../share/shareLink';
import { useAppState } from '../state/AppStateProvider';
import type { CardEntry } from '../state/types';
import { browserZone } from '../time/browserZone';
import { resolveHour12 } from '../time/hour12';
import { ClockCard } from './ClockCard';
import { MeetingPlanner } from './MeetingPlanner';
import { SettingsSheet } from './SettingsSheet';
import { ShareBanner } from './ShareBanner';
import { TopBar } from './TopBar';

function SortableCard(props: { city: City; entry: CardEntry; homeZone: string; isHome: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.entry.id });
  return (
    <li
      ref={setNodeRef}
      className={`grid__item${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <ClockCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </li>
  );
}

export function Dashboard() {
  const { state, dispatch } = useAppState();
  const [cities, setCities] = useState<City[] | null>(null);
  const [shared, setShared] = useState<string[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let alive = true;
    loadCities().then((c) => alive && setCities(c));
    return () => {
      alive = false;
    };
  }, []);

  const byId = useMemo(() => new Map((cities ?? []).map((c) => [c.id, c])), [cities]);

  useEffect(() => {
    if (cities && !state.initialised) dispatch({ type: 'initHome', id: findHomeCity(cities, browserZone())?.id });
  }, [cities, state.initialised, dispatch]);

  useEffect(() => {
    if (!cities) return;
    const read = () => setShared(parseShareHash(location.hash, new Set(byId.keys())));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [cities, byId]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const order = state.cities.map((c) => c.id);
  const nameOf = (id: UniqueIdentifier) => byId.get(String(id))?.name ?? 'City';
  const position = (id?: UniqueIdentifier) => `position ${order.indexOf(String(id)) + 1} of ${order.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id ? `${nameOf(active.id)} moved to ${position(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped at ${position(over.id)}.` : `${nameOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = state.cities.map((c) => c.id);
    dispatch({ type: 'move', from: ids.indexOf(String(active.id)), to: ids.indexOf(String(over.id)) });
  };

  const share = useCallback(async () => {
    const url = buildShareUrl(
      state.cities.map((c) => c.id),
      location.origin + location.pathname,
    );
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My world clocks', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast('Link copied');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setToast('Could not share the link');
    }
  }, [state.cities]);

  const closeShare = () => {
    clearShareHash();
    setShared(null);
  };

  const hour12 = resolveHour12(state.settings.hour12);
  const homeCity = state.homeCityId ? byId.get(state.homeCityId) : undefined;
  const homeZone = homeCity?.zone ?? browserZone();
  const visible = state.cities.filter((e) => byId.has(e.id));

  return (
    <div className="app">
      <TopBar cities={cities} hour12={hour12} onShare={share} onOpenSettings={() => setSettingsOpen(true)} />
      {shared && (
        <ShareBanner
          cities={shared.map((id) => byId.get(id)!)}
          onAdd={() => {
            dispatch({ type: 'merge', ids: shared });
            closeShare();
          }}
          onDismiss={closeShare}
        />
      )}
      <MeetingPlanner homeZone={homeZone} hour12={hour12} />
      <main className="dashboard">
        {!cities && <p className="dashboard__loading">Loading cities…</p>}
        {cities && !visible.length && (
          <div className="empty">
            <p className="empty__title">Add your first city</p>
            <p className="empty__hint">Use the search box above, for example “Chennai” or “New York”.</p>
          </div>
        )}
        {cities && visible.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable: 'To reorder, press Space, use the arrow keys to move, then Space again to drop. Escape cancels.',
              },
            }}
          >
            <SortableContext items={visible.map((e) => e.id)} strategy={rectSortingStrategy}>
              <ul className="grid">
                {visible.map((entry) => (
                  <SortableCard
                    key={entry.id}
                    city={byId.get(entry.id)!}
                    entry={entry}
                    homeZone={homeZone}
                    isHome={entry.id === state.homeCityId}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </main>
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
