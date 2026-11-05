import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { reducer, type Action } from './reducer';
import { load, save } from './storage';
import type { AppState } from './types';

type Ctx = { state: AppState; dispatch: Dispatch<Action> };
const AppStateContext = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => load());
  useEffect(() => save(state), [state]);
  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>;
}

export function useAppState(): Ctx {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}
