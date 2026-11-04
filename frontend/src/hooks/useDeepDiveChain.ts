import { useActionState, useOptimistic, startTransition } from 'react';
import { apiService } from '@/services/api';
import type { DeepDiveEntry, NextFocusItem } from '@/types/ai';
import { parseChain } from '@/utils/deepDiveSerialization';

export interface DeepDiveRequestContext {
  reference: string;
  translationA?: string;
  textA?: string;
  translationB?: string;
  textB?: string;
}

export interface ChainState {
  /** savedText this state was built from. */
  source: string | null;
  /** Analysis result object this chain belongs to. */
  scope: unknown;
  entries: DeepDiveEntry[];
  error: Error | null;
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
    return {
      source: action.source,
      scope: action.scope,
      entries: base.filter((e) => e.id !== action.id),
      error: null,
    };
  }

  try {
    const res = await apiService.getAiDeepDive(action.item.label, action.language, action.context);
    const entry: DeepDiveEntry = {
      id: crypto.randomUUID(),
      parentId: action.parentId,
      depth: 0, // Phase 3 calculates proper recursive depth
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
    };
  } catch (err) {
    return {
      source: action.source,
      scope: action.scope,
      entries: base,
      error: err instanceof Error ? err : new Error(String(err)),
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
  } satisfies ChainState);

  const valid = state.source === savedText && Object.is(state.scope, scope);
  const entries = valid ? state.entries : parseChain(savedText);
  const error = valid ? state.error : null;

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

  return { entries, pendingTopic, isPending, error, pick, remove };
}

