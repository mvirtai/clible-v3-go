// src/components/SearchHistory.tsx
import React, { use, useState } from 'react';
import { apiService } from '../services/api';
import type { SearchHistoryEntry } from '../types/searchQuery';
import { History, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Properties for {@link SearchHistory}.
 */
export interface SearchHistoryProps {
  /** Boolean toggle to trigger refetching of recent search logs. */
  triggerRefresh: boolean;
}

let historyPromiseCache: Promise<SearchHistoryEntry[]> | null = null;
let lastTriggerValue: boolean | null = null;

function getHistoryPromise(trigger: boolean, force = false): Promise<SearchHistoryEntry[]> {
  if (force || !historyPromiseCache || lastTriggerValue !== trigger) {
    lastTriggerValue = trigger;
    historyPromiseCache = apiService.getHistory().catch(() => []);
  }
  return historyPromiseCache;
}

/**
 * Displays recent search queries across translations with hit counts and refresh control.
 *
 * Built with React 19 declarative `use(promise)` data fetching and `<React.Suspense>`.
 *
 * @param props - Component properties conforming to {@link SearchHistoryProps}.
 * @returns Search history feed card.
 */
export const SearchHistory: React.FC<SearchHistoryProps> = ({ triggerRefresh }) => {
  const { strings } = useLanguage();
  const [refreshToken, setRefreshToken] = useState(0);

  const historyPromise = getHistoryPromise(triggerRefresh, refreshToken > 0);

  return (
    <div className="rounded-3xl p-6 space-y-4" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--muted)' }}>
        <History size={14} style={{ color: 'var(--accent)' }} />
        {strings.searchRecentHeader}
      </div>
        <button
          type="button"
          onClick={() => {
            getHistoryPromise(triggerRefresh, true);
            setRefreshToken((k) => k + 1);
          }}
          className="p-1.5 rounded-full btn-tactile hover:text-[var(--text)] hover:bg-[var(--surface-2)] group cursor-pointer"
          style={{ color: 'var(--muted)' }}
          title={strings.loadingLabel}
        >
          <RefreshCw size={13} className="transition-transform duration-500 group-hover:rotate-180" />
        </button>
      </div>

      <React.Suspense fallback={<p className="text-xs animate-pulse" style={{ color: 'var(--muted)' }}>{strings.loadingLabel}</p>}>
        <HistoryEntriesList promise={historyPromise} />
      </React.Suspense>
    </div>
  );
};

function HistoryEntriesList({ promise }: { promise: Promise<SearchHistoryEntry[]> }) {
  const history = use(promise);
  const { strings } = useLanguage();

  if (!history || history.length === 0) {
    return (
      <p className="text-xs italic py-3 text-center" style={{ color: 'var(--muted)' }}>
        {strings.searchNoResults}
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
      {history.map((h) => (
        <div key={h.id} className="flex justify-between items-center rounded-xl px-3 py-2 text-left border transition-all hover:border-[var(--border)] hover:bg-[var(--surface)]"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)' }}>
          <div className="truncate pr-2 min-w-0">
            <span className="text-xs font-medium block truncate" style={{ color: 'var(--text)' }}>
              "{h.queryText}"
            </span>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
              {h.translationId.toUpperCase()} · {h.mode}
            </span>
          </div>
          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            {h.resultCount}
          </span>
        </div>
      ))}
    </div>
  );
}

