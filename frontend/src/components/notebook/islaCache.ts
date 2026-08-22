import type { CellResult } from './types';

const islaPromiseCache = new Map<string, Promise<CellResult>>();

export function clearISLAPromiseCache(): void {
  islaPromiseCache.clear();
}

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
          data: { message: errData.error || `Virhe ${res.status}: ${res.statusText}` },
        } satisfies CellResult;
      }
      return res.json();
    })
    .catch((err: Error) => {
      return {
        type: 'error',
        data: { message: err.message || 'Verkkovirhe tai yhteyskatkos' },
      } satisfies CellResult;
    });

  islaPromiseCache.set(cacheKey, promise);
  return promise;
}
