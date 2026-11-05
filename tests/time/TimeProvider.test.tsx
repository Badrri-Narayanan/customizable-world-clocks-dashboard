import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TimeProvider, useTime } from '../../src/time/TimeProvider';

const wrapper = ({ children }: { children: ReactNode }) => <TimeProvider>{children}</TimeProvider>;
const START = Date.UTC(2026, 10, 5, 16, 40, 0, 500);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});
afterEach(() => vi.useRealTimers());

test('now advances every second', () => {
  const { result } = renderHook(() => useTime(), { wrapper });
  expect(result.current.now).toBe(START);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current.now).toBeGreaterThanOrEqual(START + 500);
  const t1 = result.current.now;
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current.now).toBe(t1 + 1000);
});

test('planner offset shifts instant from the current quarter hour (AC12, review #7)', () => {
  const { result } = renderHook(() => useTime(), { wrapper });
  act(() => result.current.setPlannerMinutes(180));
  expect(result.current.plannerMinutes).toBe(180);
  // now is 16:40:00.5 → quarter-hour anchor 16:30 → +3h = 19:30:00 exactly
  expect(result.current.instant).toBe(Date.UTC(2026, 10, 5, 19, 30));
  act(() => result.current.setPlannerMinutes(15));
  expect(result.current.instant).toBe(Date.UTC(2026, 10, 5, 16, 45));
});

test('at zero the instant is the live time', () => {
  const { result } = renderHook(() => useTime(), { wrapper });
  expect(result.current.instant).toBe(result.current.now);
});

test.each([
  [10, 15],
  [2000, 1440],
  [-5, 0],
])('planner %i snaps/clamps to %i', (input, expected) => {
  const { result } = renderHook(() => useTime(), { wrapper });
  act(() => result.current.setPlannerMinutes(input));
  expect(result.current.plannerMinutes).toBe(expected);
});

test('resyncs on visibilitychange after sleep (Review Focus 3)', () => {
  const { result } = renderHook(() => useTime(), { wrapper });
  const later = START + 3 * 3600e3;
  vi.setSystemTime(later);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(result.current.now).toBe(later);
});
