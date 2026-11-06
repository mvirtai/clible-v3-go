import { useActionState, useOptimistic, startTransition } from 'react';
import { apiService } from '@/services/api';
import type { DeepDiveEntry, NextFocusItem } from '@/types/ai';
import { parseChain } from '@/utils/deepDiveSerialization';

export const MAX_DEEP_DIVE_DEPTH = 5;

/** Topics from the root down to (and including) the given entry. */
export function pathTo(entries: DeepDiveEntry[], id: string | null): string[] {
  const path: string[] = [];
  let currentId = id;
  while (currentId) {
    const entry = entries.find((e) => e.id === currentId);
    if (!entry) break;
    path.unshift(entry.topic);
    currentId = entry.parentId;
  }
  return path;
}

/** Entry ids of `id` and all its descendants. */
export function subtreeIds(entries: DeepDiveEntry[], id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of entries) {
      if (e.parentId && ids.has(e.parentId) && !ids.has(e.id)) {
        ids.add(e.id);
        grew = true;
      }
    }
  }
  return ids;
}

export interface DeepDiveRequestContext {
  reference: string;
  translationA?: string;
  textA?: string;
  translationB?: string;
  textB?: string;
  path?: string[];
}

export interface ChainState {
  /** savedText this state was built from. */
  source: string | null;
  /** Analysis result object this chain belongs to. */
  scope: unknown;
  entries: DeepDiveEntry[];
  error: Error | null;
  /** ID of the entry that should be opened / focused in the UI. */
  focusId: string | null;
}

export type ChainAction =
  | {
      type: 'pick';
      item: NextFocusItem;
      parentId: string | null;
      language: string;
      context: DeepDiveRequestContext;
      source: string | null;
      scope: unknown;
    }
  | { type: 'remove'; id: string; source: string | null; scope: unknown };

export async function chainReducer(prev: ChainState, action: ChainAction): Promise<ChainState> {
  // Base = user's entries if still valid for this source+scope, otherwise derived from saved text
  const valid = prev.source === action.source && Object.is(prev.scope, action.scope);
  const base = valid ? prev.entries : parseChain(action.source);

  if (action.type === 'remove') {
    const gone = subtreeIds(base, action.id);
    return {
      source: action.source,
      scope: action.scope,
      entries: base.filter((e) => !gone.has(e.id)),
      error: null,
      focusId: null,
    };
  }

  const parent = action.parentId ? base.find((e) => e.id === action.parentId) : undefined;
  const depth = parent ? parent.depth + 1 : 0;
  if (depth >= MAX_DEEP_DIVE_DEPTH) {
    // Reached maximum allowed depth
    return {
      source: action.source,
      scope: action.scope,
      entries: base,
      error: null,
      focusId: parent ? parent.id : null,
    };
  }

  const normalized = action.item.label.trim().toLowerCase();
  const existing = base.find((e) => e.topic.trim().toLowerCase() === normalized);
  if (existing) {
    // Already fetched: no network call. The UI expands this entry.
    return {
      source: action.source,
      scope: action.scope,
      entries: base,
      error: null,
      focusId: existing.id,
    };
  }

  try {
    const requestPath = pathTo(base, action.parentId);
    const requestContext: DeepDiveRequestContext = {
      ...action.context,
      ...(requestPath.length > 0 ? { path: requestPath } : {}),
    };

    const res = await apiService.getAiDeepDive(action.item.label, action.language, requestContext);
    const entry: DeepDiveEntry = {
      id: crypto.randomUUID(),
      parentId: action.parentId,
      depth,
      topic: action.item.label,
      text: res.text,
      nextFocus: res.nextFocus ?? [],
      usage: res.geminiUsageMetadata,
    };
    return {
      source: action.source,
      scope: action.scope,
      entries: [...base, entry],
      error: null,
      focusId: entry.id,
    };
  } catch (err) {
    return {
      source: action.source,
      scope: action.scope,
      entries: base,
      error: err instanceof Error ? err : new Error(String(err)),
      focusId: null,
    };
  }
}

export function useDeepDiveChain({
  savedText,
  scope,
}: {
  savedText: string | null;
  scope: unknown;
}) {
  const [state, dispatch, isPending] = useActionState(chainReducer, {
    source: savedText,
    scope,
    entries: parseChain(savedText),
    error: null,
    focusId: null,
  } satisfies ChainState);

  const valid = state.source === savedText && Object.is(state.scope, scope);
  const entries = valid ? state.entries : parseChain(savedText);
  const error = valid ? state.error : null;
  const focusId = valid ? state.focusId : null;

  // Optimistic "this topic is loading" label; reverts to null when the transition ends.
  const [pendingTopic, setPendingTopic] = useOptimistic<string | null, string | null>(
    null,
    (_current, topic) => topic,
  );

  const pick = (
    item: NextFocusItem,
    opts: { parentId?: string; language: string; context: DeepDiveRequestContext },
  ) => {
    startTransition(() => {
      setPendingTopic(item.label);
      dispatch({
        type: 'pick',
        item,
        parentId: opts.parentId ?? null,
        language: opts.language,
        context: opts.context,
        source: savedText,
        scope,
      });
    });
  };

  const remove = (id: string) => {
    startTransition(() => {
      dispatch({ type: 'remove', id, source: savedText, scope });
    });
  };

  return { entries, pendingTopic, isPending, error, focusId, pick, remove };
}
