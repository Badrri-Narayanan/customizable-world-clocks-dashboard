import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="toast" role="status">
      Update available
      <button type="button" className="btn btn--primary btn--small" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
      <button type="button" className="btn btn--ghost btn--small" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
