// src/components/VerseSearch.tsx
import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { SearchVerse } from '../types/search';
import { Search, Loader2 } from 'lucide-react';

interface Props {
  translation: string;
}

export const VerseSearch: React.FC<Props> = ({ translation }) => {
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [results, setResults] = useState<SearchVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim() || !translation) return;

    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const data = await apiService.search(query, translation, regex);
      setResults(data);
      setSearched(true);

      await apiService.addSearch({
        queryText: query,
        searchScope: 'all',
        scopeValue: '',
        translationId: translation,
        mode: regex ? 'regex' : 'phrase',
        resultCount: data.length,
      }).catch((err) => console.error('Failed to persist search history', err));
    } catch {
      setError('Search failed. Check that the query is valid.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl p-8 space-y-6" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        Text Search
      </h2>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={regex ? 'Regex pattern (e.g. light|darkness)' : 'Search words (e.g. light)'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-full px-5 py-2.5 text-sm transition-all outline-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none text-sm"
          style={{ color: 'var(--muted)' }}>
          <input
            type="checkbox"
            checked={regex}
            onChange={(e) => setRegex(e.target.checked)}
            className="rounded"
          />
          Use Regular Expressions
        </label>
      </form>

      {error && (
        <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {searched && results.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Found <strong>{results.length}</strong> matches
            </p>
          )}

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
            {searched && results.length === 0 ? (
              <p className="text-sm italic py-6 text-center" style={{ color: 'var(--muted)' }}>
                No matches found for "{query}".
              </p>
            ) : (
              results.map((r, i) => (
                <div
                  key={`${r.bookId}-${r.chapter}-${r.verse}-${i}`}
                  className="rounded-2xl p-4 transition-colors text-left"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                    {r.bookId} {r.chapter}:{r.verse}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                    {r.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

