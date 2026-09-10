import type { CellResult } from '../types';

/**
 * In-memory request deduplication and response promise cache for ISLA DSL queries.
 */
const islaPromiseCache = new Map<string, Promise<CellResult>>();

/**
 * In-memory registry of named variable results (e.g. #mat1) from executed ISLA queries.
 */
const islaVariableRegistry = new Map<string, CellResult>();

/**
 * Clears the in-memory ISLA evaluation cache.
 */
export function clearISLAPromiseCache(): void {
  islaPromiseCache.clear();
  islaVariableRegistry.clear();
}

/**
 * Registers an ISLA named variable directly (e.g. from loaded notebook cells).
 */
export function registerISLAVariable(name: string, result: CellResult): void {
  const clean = name.replace(/^#/, '');
  islaVariableRegistry.set(clean, result);
  islaVariableRegistry.set(`#${clean}`, result);
}

/**
 * Fetches and caches the evaluation result of an ISLA DSL query from `/api/dsl/eval`.
 *
 * @param query - The ISLA DSL query command string (e.g. `COUNT "light"` or `COMPARE "John 3:16" kjv web`).
 * @param translationId - Active Bible translation identifier.
 * @param contextText - Optional notebook text context for caret (^) scope operations.
 * @returns Promise resolving to the cell execution result payload.
 */
export function fetchISLAResult(
  query: string,
  translationId: string,
  contextText: string = ''
): Promise<CellResult> {
  // Collect currently known variables to send with the request
  const variables: Record<string, CellResult> = {};
  islaVariableRegistry.forEach((val, key) => {
    variables[key] = val;
  });

  // Only caret (^) context operations depend on preceding cell text.
  // For normal searches, verse citations, comparisons, etc., ignore contextText
  // so typing in other notebook cells does not invalidate the cache or hammer the database.
  const effectiveContext = query.includes('^') ? contextText.trim() : '';

  const cacheKey = `${translationId}:${query}:${effectiveContext}:${Object.keys(variables).sort().join(',')}`;
  const existing = islaPromiseCache.get(cacheKey);
  if (existing) return existing;

  const promise = fetch('/api/dsl/eval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      translationId,
      ...(effectiveContext ? { contextText: effectiveContext } : {}),
      ...(Object.keys(variables).length > 0 ? { variables } : {}),
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          type: 'error',
          data: { message: errData.error || `Error ${res.status}: ${res.statusText}` },
        } satisfies CellResult;
      }
      const data = (await res.json()) as CellResult;
      // If result contains an output_op with a name, register it as a known variable for downstream cells
      const outputOp = (data?.data as { output_op?: { name?: string } })?.output_op;
      if (outputOp?.name) {
        registerISLAVariable(outputOp.name, data);
      }
      return data;
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

