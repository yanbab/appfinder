import { useSyncExternalStore } from 'react';

/**
 * Creates a lightweight, reactive external store with selector support.
 * Compatible with Zustand syntax: create((set, get) => ({ ... }))
 *
 * @template T
 * @param {(set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void, get: () => T) => T} createState
 * @returns {((selector?: (state: T) => any) => any) & { getState: () => T, setState: Function, subscribe: Function }}
 */
export function createStore(createState) {
  let state;
  const listeners = new Set();

  const setState = (partial, replace = false) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      state = replace || (typeof nextState !== 'object' || nextState === null)
        ? nextState
        : Object.assign({}, state, nextState);
      listeners.forEach(listener => listener());
    }
  };

  const getState = () => state;

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const api = { setState, getState, subscribe };
  state = createState(setState, getState, api);

  const useStore = (selector = (s) => s) => {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state)
    );
  };

  Object.assign(useStore, api);
  return useStore;
}
