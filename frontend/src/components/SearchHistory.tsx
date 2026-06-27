// src/components/SearchHistory.tsx
import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import type { SearchHistoryEntry } from '../types/searchQuery';
import { History, RefreshCw } from 'lucide-react';

interface Props {
  triggerRefresh: boolean;
}

export const SearchHistory: React.FC<Props> = ({ triggerRefresh }) => {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = () => {
    apiService
      .getHistory()
      .then((data) => { setHistory(data); setLoading(false); })
      .catch((err) => { console.error('Failed to load history', err); setLoading(false); });
  };

  useEffect(() => { fetchHistory(); }, [triggerRefresh]);

  return (
    <div className="rounded-3xl p-6 space-y-4" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted)' }}>
          <History size={14} style={{ color: 'var(--accent)' }} />
          Search History
        </div>
        <button
          onClick={fetchHistory}
          className="p-1.5 rounded-full transition-colors hover:opacity-70"
          style={{ color: 'var(--muted)' }}
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {loading ? (
        <p className="text-xs animate-pulse" style={{ color: 'var(--muted)' }}>Loading...</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {history.length === 0 ? (
            <p className="text-xs italic py-3 text-center" style={{ color: 'var(--muted)' }}>
              No recent searches.
            </p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="flex justify-between items-center rounded-xl px-3 py-2 text-left"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}>
                <div className="truncate pr-2 min-w-0">
                  <span className="text-xs font-medium block truncate" style={{ color: 'var(--text)' }}>
                    "{h.queryText}"
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                    {h.translationId.toUpperCase()} · {h.mode}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                  {h.resultCount}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
