import type { CellResult } from './types';

/**
 * In-memory request deduplication and response promise cache for ISLA DSL queries.
 */
const islaPromiseCache = new Map<string, Promise<CellResult>>();

/**
 * Clears the in-memory ISLA evaluation cache.
 */
export function clearISLAPromiseCache(): void {
  islaPromiseCache.clear();
}

/**
 * Fetches and caches the evaluation result of an ISLA DSL query from `/api/dsl/eval`.
 *
 * @param query - The ISLA DSL query command string (e.g. `COUNT "light"` or `COMPARE "John 3:16" kjv web`).
 * @param translationId - Active Bible translation identifier.
 * @returns Promise resolving to the cell execution result payload.
 */
export function fetchISLAResult(query: string, translationId: string): Promise<CellResult> {
  const cacheKey = `${translationId}:${query}`;
  const existing = islaPromiseCache.get(cacheKey);
  if (existing) return existing;

  const promise = fetch('/api/dsl/eval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, translationId }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          type: 'error',
          data: { message: errData.error || `Error ${res.status}: ${res.statusText}` },
        } satisfies CellResult;
      }
      return res.json();
    })
    .catch((err: Error) => {
      return {
        type: 'error',
        data: { message: err.message || 'Network error or connection dropped' },
      } satisfies CellResult;
    });

  islaPromiseCache.set(cacheKey, promise);
  return promise;
}

