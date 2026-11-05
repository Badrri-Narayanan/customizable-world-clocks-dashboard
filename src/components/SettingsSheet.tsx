import { useEffect, useRef } from 'react';
import { DEFAULT_HOURS } from '../hours/status';
import { useAppState } from '../state/AppStateProvider';
import { HoursEditor } from './HoursEditor';

export function SettingsSheet({ onClose }: { onClose(): void }) {
  const { state, dispatch } = useAppState();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d || d.open) return;
    if (typeof d.showModal === 'function') d.showModal();
    else d.setAttribute('open', '');
  }, []);

  return (
    <dialog ref={ref} className="sheet" aria-label="Settings" onClose={onClose}>
      <div className="sheet__head">
        <h2>Settings</h2>
        <button type="button" className="icon-btn" aria-label="Close settings" onClick={onClose}>
          ✕
        </button>
      </div>
      <h3>Default hours for every city</h3>
      <p className="sheet__hint">Cities with custom hours keep their own.</p>
      <HoursEditor
        key={JSON.stringify(state.settings.hours)}
        value={state.settings.hours}
        onSave={(hours) => dispatch({ type: 'settings', patch: { hours } })}
        onReset={() => dispatch({ type: 'settings', patch: { hours: DEFAULT_HOURS } })}
      />
      <h3>Start over</h3>
      <button
        type="button"
        className="btn btn--danger"
        onClick={() => {
          if (window.confirm('Remove all cities and reset every setting?')) {
            dispatch({ type: 'reset' });
            onClose();
          }
        }}
      >
        Reset everything
      </button>
    </dialog>
  );
}
