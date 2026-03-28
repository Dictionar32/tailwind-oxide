/**
 * lazyAsync - A lazy async loader with caching, using ES2024 Promise.withResolvers()
 * 
 * - No `let` declarations anywhere
 * - Uses module-level `const` state object to store cached value and pending Promise
 * - Uses ES2024 `Promise.withResolvers()` for race-condition-free concurrent calls
 * - Caches result for subsequent calls
 * - Propagates first error and clears state on failure
 */

const state: {
  cached: unknown;
  pending: Promise<unknown> | undefined;
} = {
  cached: undefined,
  pending: undefined,
};

/**
 * Creates a lazy async loader that caches its result
 * @param loader Async function that returns T
 * @returns Promise<T> that resolves to the cached value
 */
export function lazyAsync<T>(loader: () => Promise<T>): Promise<T> {
  if (state.cached !== undefined) {
    return Promise.resolve(state.cached as T);
  }

  if (state.pending !== undefined) {
    return state.pending as Promise<T>;
  }

  const { promise, resolve, reject } = Promise.withResolvers<T>();

  state.pending = promise;

  loader()
    .then((value) => {
      state.cached = value;
      state.pending = undefined;
      resolve(value);
    })
    .catch((error) => {
      state.cached = undefined;
      state.pending = undefined;
      reject(error);
    });

  return promise;
}

/**
 * Resets the lazy async state (useful for testing)
 */
export function resetLazyAsync(): void {
  state.cached = undefined;
  state.pending = undefined;
}