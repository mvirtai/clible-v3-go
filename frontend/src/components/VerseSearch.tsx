import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { SearchVerse } from '../types/search';
import { Search, Loader2, Save } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import bibleStructure from '../data/bible_structure.json';

const BIBLE_BOOKS = bibleStructure.books as Array<{ id: string; name: string }>;

/**
 * Properties for {@link VerseSearch}.
 */
export interface VerseSearchProps {
  /** The translation ID selected globally (e.g. "kjv" or "fin-1992"). */
  translation: string;
  /** Callback fired when a search result verse card is clicked. */
  onSelectVerse?: (reference: string) => void;
  /** Active workspace (scope) identifier for persisting search snapshots. */
  activeScopeId?: string;
  /** Callback fired after saving a search to the active workspace. */
  onWorkspaceUpdated?: () => void;
  /** Pre-loaded search state and results for restoring a workspace snapshot. */
  loadedSavedResults?: {
    query: string;
    translation: string;
    searchScope: 'all' | 'ot' | 'nt' | 'book';
    scopeValue: string;
    results: SearchVerse[];
  } | null;
  /** Callback fired to clear external pre-loaded search results once consumed. */
  onClearLoadedResults?: () => void;
}

/**
 * Text and regex search interface across biblical texts with OT/NT/Book scoping and workspace search persistence.
 *
 * @param props - Component properties conforming to {@link VerseSearchProps}.
 * @returns Scripture search interface.
 */
export const VerseSearch: React.FC<VerseSearchProps> = ({
  translation,
  onSelectVerse,
  activeScopeId,
  onWorkspaceUpdated,
  loadedSavedResults,
  onClearLoadedResults
}) => {
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [results, setResults] = useState<SearchVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search scope states
  const [searchScope, setSearchScope] = useState<'all' | 'ot' | 'nt' | 'book'>('all');
  const [scopeValue, setScopeValue] = useState('');

  // Save form states
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { strings } = useLanguage();

  // Sync restored search results during render phase
  const [prevLoadedSavedResults, setPrevLoadedSavedResults] = useState(loadedSavedResults);
  if (loadedSavedResults && loadedSavedResults !== prevLoadedSavedResults) {
    setPrevLoadedSavedResults(loadedSavedResults);
    setQuery(loadedSavedResults.query);
    setSearchScope(loadedSavedResults.searchScope);
    setScopeValue(loadedSavedResults.scopeValue);
    setError(null);
    if (loadedSavedResults.results && loadedSavedResults.results.length > 0) {
      setResults(loadedSavedResults.results);
      setSearched(true);
    }
  }

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim() || !translation) return;

    if (onClearLoadedResults) {
      onClearLoadedResults();
    }

    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const data = await apiService.search(query, translation, regex, searchScope, scopeValue);
      setResults(data);
      setSearched(true);

      await apiService.addSearch({
        queryText: query,
        searchScope: searchScope,
        scopeValue: scopeValue,
        translationId: translation,
        mode: regex ? 'regex' : 'phrase',
        resultCount: data.length,
      }).catch((err) => console.error('Failed to persist search history', err));
    } catch {
      setError(strings.errSearchFailed);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!saveName.trim() || !activeScopeId) return;
    setSaving(true);
    try {
      await apiService.saveSearch({
        scopeId: activeScopeId,
        name: saveName.trim(),
        queryText: query,
        searchScope: searchScope,
        scopeValue: scopeValue,
        translationId: translation,
        resultJson: JSON.stringify(results)
      });
      setSaveName('');
      setShowSaveForm(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated();
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl p-4 sm:p-8 space-y-4 sm:space-y-6" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-left" style={{ color: 'var(--muted)' }}>
        {strings.searchFindInScripture}
      </h2>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-2">
          <input
            type="text"
            placeholder={strings.searchPlaceholderVerse}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm transition-all outline-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-full px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 btn-tactile btn-accent disabled:opacity-40 w-full sm:w-auto cursor-pointer"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {strings.searchFindInScripture}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-left">
          <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={regex}
              onChange={(e) => setRegex(e.target.checked)}
              className="rounded cursor-pointer"
            />
            {strings.regexLabel}
          </label>

          <div className="flex items-center gap-2">
            <label htmlFor="search-scope-select" style={{ color: 'var(--muted)' }}>{strings.searchScopeLabel}:</label>
            <select
              id="search-scope-select"
              value={searchScope}
              onChange={(e) => {
                setSearchScope(e.target.value as 'all' | 'ot' | 'nt' | 'book');
                setScopeValue('');
              }}
              className="rounded-lg border px-2 py-1 outline-none cursor-pointer"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <option value="all">{strings.scopeAll}</option>
              <option value="ot">{strings.scopeOT}</option>
              <option value="nt">{strings.scopeNT}</option>
              <option value="book">{strings.scopeBook}</option>
            </select>

            {searchScope === 'book' && (
              <select
                aria-label={strings.selectBookAria}
                value={scopeValue}
                onChange={(e) => setScopeValue(e.target.value)}
                className="rounded-lg border px-2 py-1 outline-none cursor-pointer max-w-[150px]"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <option value="">{strings.chooseBookPlaceholder}</option>
                {BIBLE_BOOKS.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </form>

      {error && (
        <p className="text-sm text-left" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      {/* Save to workspace section */}
      {activeScopeId && searched && results.length > 0 && (
        <div className="p-4 rounded-2xl border text-left space-y-3" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)' }}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              {strings.saveAnalysisWorkspacePrompt}
            </span>
            {!showSaveForm && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveForm(true)}
                  className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 btn-tactile hover:border-[var(--accent)] border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  <Save size={12} /> {strings.saveLabel}
                </button>
                {saveStatus === 'success' && (
                  <span className="text-xs font-semibold text-emerald-500 animate-pulse">{strings.saveSuccess}</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-xs font-semibold text-red-500">{strings.saveFail}</span>
                )}
              </div>
            )}
          </div>

          {showSaveForm && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={strings.saveNamePlaceholder}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button
                type="button"
                onClick={handleSaveSearch}
                disabled={saving || !saveName.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-accent btn-tactile cursor-pointer"
              >
                {saving ? strings.savingLabel : strings.saveLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowSaveForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border text-[var(--muted)] border-[var(--border)] bg-transparent cursor-pointer"
              >
                {strings.cancelLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {searched && results.length > 0 && (
            <p className="text-xs text-left animate-fade-in" style={{ color: 'var(--muted)' }}>
              {strings.foundMatches} <strong>{results.length}</strong> {strings.matchesSuffix}
            </p>
          )}

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
            {searched && results.length === 0 ? (
              <p className="text-sm italic py-6 text-center" style={{ color: 'var(--muted)' }}>
                {strings.searchNoResults}
              </p>
            ) : (
              results.map((r, i) => (
                <div
                  key={`${r.bookId}-${r.chapter}-${r.verse}-${i}`}
                  className="rounded-2xl p-4 transition-all text-left cursor-pointer card-tactile border"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)' }}
                  onClick={() => onSelectVerse?.(`${r.bookId} ${r.chapter}:${r.verse}`)}
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
