import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const PLANNER_MAX_MINUTES = 1440;
export const PLANNER_STEP_MINUTES = 15;

type Ctx = { now: number; plannerMinutes: number; setPlannerMinutes(m: number): void; instant: number };
const TimeContext = createContext<Ctx | null>(null);

export const snapPlannerMinutes = (m: number): number =>
  Math.min(PLANNER_MAX_MINUTES, Math.max(0, Math.round(m / PLANNER_STEP_MINUTES) * PLANNER_STEP_MINUTES));

const QUARTER_MS = PLANNER_STEP_MINUTES * 60_000;
/** Live time at 0; otherwise whole quarter-hour slots counted from the current quarter (16:40 + 3h → 19:30). */
export const plannedInstant = (now: number, minutes: number): number =>
  minutes > 0 ? Math.floor(now / QUARTER_MS) * QUARTER_MS + minutes * 60_000 : now;

/** One ticker for every clock: reads Date.now() on each whole second and whenever the page becomes visible. */
export function TimeProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  const [plannerMinutes, setRaw] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      timer = setTimeout(tick, 1000 - (t % 1000));
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    const onVisible = () => {
      clearTimeout(timer);
      tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const setPlannerMinutes = useCallback((m: number) => setRaw(snapPlannerMinutes(m)), []);
  const value = useMemo(
    () => ({ now, plannerMinutes, setPlannerMinutes, instant: plannedInstant(now, plannerMinutes) }),
    [now, plannerMinutes, setPlannerMinutes],
  );
  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

export function useTime(): Ctx {
  const ctx = useContext(TimeContext);
  if (!ctx) throw new Error('useTime must be used inside <TimeProvider>');
  return ctx;
}
