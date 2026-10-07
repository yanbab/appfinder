import { useSyncExternalStore } from 'react';

export type StateCreator<T> = (
  set: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void,
  get: () => T,
  api: StoreApi<T>
) => T;

export interface StoreApi<T> {
  setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
}

export type UseStore<T> = {
  <U = T>(selector?: (state: T) => U): U;
} & StoreApi<T>;

/**
 * Creates a lightweight, reactive external store with selector support.
 * Compatible with Zustand syntax: create((set, get) => ({ ... }))
 */
export function create<T extends object>(createState: StateCreator<T>): UseStore<T> {
  let state: T;
  const listeners = new Set<() => void>();

  const setState = (partial: Partial<T> | ((state: T) => Partial<T>), replace: boolean = false) => {
    const nextState = typeof partial === 'function' ? (partial as (state: T) => Partial<T>)(state) : partial;
    if (!Object.is(nextState, state)) {
      state = replace || (typeof nextState !== 'object' || nextState === null)
        ? (nextState as T)
        : Object.assign({}, state, nextState);
      listeners.forEach(listener => listener());
    }
  };

  const getState = (): T => state;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const api: StoreApi<T> = { setState, getState, subscribe };
  state = createState(setState, getState, api);

  const useStore = (<U = T>(selector: (state: T) => U = (s: T) => s as unknown as U): U => {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state)
    );
  }) as UseStore<T>;

  Object.assign(useStore, api);
  return useStore;
}

export const createStore = create;
export default create;
