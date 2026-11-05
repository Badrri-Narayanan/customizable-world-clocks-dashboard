import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppStateProvider, useAppState } from '../../src/state/AppStateProvider';
import { STORAGE_KEY } from '../../src/state/storage';

const wrapper = ({ children }: { children: ReactNode }) => <AppStateProvider>{children}</AppStateProvider>;

beforeEach(() => localStorage.clear());

test('loads from localStorage and saves every change', () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, cities: [{ id: 'a' }], settings: { theme: 'dark' }, initialised: true }),
  );
  const { result } = renderHook(() => useAppState(), { wrapper });
  expect(result.current.state.cities).toEqual([{ id: 'a' }]);
  act(() => result.current.dispatch({ type: 'add', id: 'b' }));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).cities).toEqual([{ id: 'a' }, { id: 'b' }]);
});

test('useAppState outside the provider throws a clear error', () => {
  expect(() => renderHook(() => useAppState())).toThrow(/AppStateProvider/);
});
