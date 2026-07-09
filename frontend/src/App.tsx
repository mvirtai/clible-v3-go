import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TranslationSelector } from './components/TranslationSelector';
import { TranslationManager } from './components/TranslationManager';
import { VerseReader } from './components/VerseReader';
import { VerseSearch } from './components/VerseSearch';
import { SearchHistory } from './components/SearchHistory';
import { AnalyticsView } from './components/AnalyticsView';
import { CompareView } from './components/CompareView';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { apiService } from './services/api';
import { useAuth } from './context/AuthContext';
import { Terminal, Settings, BookOpen, Activity, GitCompare, Sun, Moon, LogOut } from 'lucide-react';
import type { InstalledTranslation, TextStats, ComparisonResult } from './types/bible';
import type { SavedSearch, SavedAnalysis } from './types/workspace';
import type { SearchVerse } from './types/search';

interface LoadedSearchState {
  query: string;
  translation: string;
  searchScope: 'all' | 'ot' | 'nt' | 'book';
  scopeValue: string;
  results: SearchVerse[];
}

interface LoadedStatsState {
  stats: TextStats;
  reference: string;
  translationId: string;
}

interface LoadedComparisonState {
  result: ComparisonResult;
  reference: string;
  translationA: string;
  translationB: string;
}

function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedTranslation, setSelectedTranslation] = useState<string>(
    () => localStorage.getItem('selectedTranslation') || ''
  )
  const [historyTrigger, setHistoryTrigger] = useState(false);
  const [translationTrigger, setTranslationTrigger] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [viewMode, setViewMode] = useState<'reader' | 'analytics' | 'compare'>('reader');
  const [installedTranslations, setInstalledTranslations] = useState<InstalledTranslation[]>([]);
  const [activeReference, setActiveReference] = useState<string>(
    () => localStorage.getItem('activeReference') || ''
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check if class .dark exists in documentElement
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  // Työtilanhallinnan tilat
  const [activeScopeId, setActiveScopeId] = useState<string>(() => localStorage.getItem('activeScopeId') || '');
  const [workspaceTrigger, setWorkspaceTrigger] = useState(false);

  // Tallennettujen tulosten pikalatauksen tilat (välimuisti)
  const [loadedSearch, setLoadedSearch] = useState<LoadedSearchState | null>(null);
  const [loadedStats, setLoadedStats] = useState<LoadedStatsState | null>(null);
  const [loadedComparison, setLoadedComparison] = useState<LoadedComparisonState | null>(null);

  const handleSelectReference = (ref: string) => {
    setActiveReference(ref);
    if (ref) {
      localStorage.setItem('activeReference', ref);
    } else {
      localStorage.removeItem('activeReference')
    }
  }

  const handleSelectTranslation = (translation_id: string) => {
    setSelectedTranslation(translation_id);
    if (translation_id) {
      localStorage.setItem('selectedTranslation', translation_id);
    } else {
      localStorage.removeItem('selectedTranslation')
    }
  }

  const handleScopeChanged = (id: string) => {
    setActiveScopeId(id);
    localStorage.setItem('activeScopeId', id);
  };

  const handleLoadSavedSearch = (s: SavedSearch) => {
    if (s.searchScope === 'reference') {
      handleSelectTranslation(s.translationId);
      setActiveReference(s.queryText);
      setViewMode('reader');
      setLoadedSearch(null);
      return;
    }

    let results = [];
    try {
      if (s.resultJson) {
        results = JSON.parse(s.resultJson);
      }
    } catch (err) {
      console.error('Failed to parse saved search results JSON', err);
    }
    const validScopes = ['all', 'ot', 'nt', 'book'] as const;
    const scope = validScopes.includes(s.searchScope as typeof validScopes[number])
      ? (s.searchScope as 'all' | 'ot' | 'nt' | 'book')
      : 'all';
    setLoadedSearch({
      query: s.queryText,
      translation: s.translationId,
      searchScope: s.searchScope as 'all' | 'ot' | 'nt' | 'book',
      scopeValue: scope,
      results: Array.isArray(results) ? results : []
    });
    handleSelectTranslation(s.translationId);
    setViewMode('reader');
  };

  const handleLoadSavedAnalysis = (a: SavedAnalysis) => {
    let result = null;
    try {
      if (a.resultJson) {
        result = JSON.parse(a.resultJson);
      }
    } catch (err) {
      console.error('Failed to parse saved analysis results JSON', err);
    }

    if (a.analysisType === 'single_stats') {
      setLoadedStats({
        stats: result,
        reference: a.reference,
        translationId: a.translationId
      });
      setSelectedTranslation(a.translationId);
      setViewMode('analytics');
    } else if (a.analysisType === 'comparison') {
      let params = { translationB: '' };
      try {
        if (a.paramsJson) {
          params = JSON.parse(a.paramsJson);
        }
      } catch (err) {
        console.error('Failed to parse paramsJson', err);
      }
      setLoadedComparison({
        result,
        reference: a.reference,
        translationA: a.translationId,
        translationB: params.translationB
      });
      setViewMode('compare');
    }
  };

  // Sync system prefers-color-scheme changes with theme state
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme)

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // Load installed traslations list for CompareView select options
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const list = await apiService.getTranslations();
        setInstalledTranslations(list);
      } catch (err) {
        console.error('Failed to load translations list:', err);
      }
    };
    loadTranslations();
  }, [translationTrigger]);

  const handleSearchFinished = () => setHistoryTrigger((p) => !p);
  const handleTranslationChanged = () => setTranslationTrigger((p) => !p);

  // Only translations the user has activated (installed=true) are usable for verse reading/analysis
  const activatedTranslations = installedTranslations.filter(t => t.installed);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {/* Theme switch */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Käytä vaaleaa tilaa' : 'Käytä pimeää tilaa'}
              className="theme-toggle-btn"
            >
              {theme === 'dark' ? (
                <Sun size={15} className="text-amber-400 animate-spin-slow" />
              ) : (
                <Moon size={15} className="text-slate-500" />
              )}
            </button>

            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--text)', color: 'var(--bg)' }}>
              <Terminal size={16} />
            </div>
            <h1 className="text-lg font-medium tracking-tight" style={{ color: 'var(--text)' }}>
              Clible <span style={{ color: 'var(--muted)', fontWeight: 400 }}>Workspace</span>
              <span className="ml-2 text-xs font-mono" style={{ color: 'var(--accent)' }}>v3</span>
            </h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs max-md:hidden" style={{ color: 'var(--muted)' }}>
                {user.email}
              </span>
            )}

            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              aria-label="Kirjaudu ulos"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors btn-tactile hover:border-[var(--accent)] hover:text-[var(--text)]"
              style={{
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--muted)',
              }}
            >
              <LogOut size={14} />
              <span className="max-md:hidden">Log out</span>
            </button>

            <button
              onClick={() => setShowManager(!showManager)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors btn-tactile hover:border-[var(--accent)]"
              style={{
                border: '1px solid var(--border)',
                background: showManager ? 'var(--accent-bg)' : 'transparent',
                color: showManager ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              <Settings size={14} />
              <span>{showManager ? 'Hide' : 'Translations'}</span>
            </button>

            <TranslationSelector
              selectedTranslation={selectedTranslation}
              onSelectTranslation={handleSelectTranslation}
              refreshTrigger={translationTrigger}
            />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-6 py-12">

        {showManager && (
          <div className="mb-10 max-w-2xl mx-auto">
            <TranslationManager
              translations={installedTranslations}
              onTranslationChanged={handleTranslationChanged}
            />
          </div>
        )}

        {/* View Selection Tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl w-fit mb-8 bg-[var(--surface-2)] border border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => setViewMode('reader')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all btn-tactile ${viewMode === 'reader'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
          >
            <BookOpen size={16} />
            <span>Lukukone</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all btn-tactile ${viewMode === 'analytics'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
          >
            <Activity size={16} />
            <span>Tekstianalyysi</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all btn-tactile ${viewMode === 'compare'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
          >
            <GitCompare size={16} />
            <span>Käännösvertailu</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Active view content */}
          <div className="lg:col-span-2 space-y-8">
            {viewMode === 'reader' && (
              selectedTranslation ? (
                <>
                  <VerseReader
                    translation={selectedTranslation}
                    activeReference={activeReference}
                    activeScopeId={activeScopeId}
                    onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                  />
                  <div onClick={handleSearchFinished}>
                    <VerseSearch
                      translation={selectedTranslation}
                      onSelectVerse={handleSelectReference}
                      activeScopeId={activeScopeId}
                      onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                      loadedSavedResults={loadedSearch}
                      onClearLoadedResults={() => setLoadedSearch(null)}
                    />
                  </div>
                </>
              ) : (
                <div className="py-24 text-center space-y-4" style={{ color: 'var(--muted)' }}>
                  <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}>
                    <BookOpen size={28} />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>No translation selected</p>
                  <p className="text-sm">Open <strong>Translations</strong> in the header and install one.</p>
                  <button
                    onClick={() => setShowManager(true)}
                    className="mt-4 px-5 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Install a Translation
                  </button>
                </div>
              )
            )}

            {viewMode === 'analytics' && (
              <AnalyticsView
                defaultTranslation={selectedTranslation || (activatedTranslations[0]?.id || '')}
                activeScopeId={activeScopeId}
                onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                loadedSavedStats={loadedStats}
              />
            )}

            {viewMode === 'compare' && (
              <CompareView
                installedTranslations={activatedTranslations}
                activeScopeId={activeScopeId}
                onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                loadedSavedComparison={loadedComparison}
              />
            )}
          </div>

          {/* Right: Persistent workspace sidebar */}
          <div className="space-y-8">
            <WorkspaceSidebar
              activeScopeId={activeScopeId}
              onScopeChanged={handleScopeChanged}
              onLoadSavedSearch={handleLoadSavedSearch}
              onLoadSavedAnalysis={handleLoadSavedAnalysis}
              refreshTrigger={workspaceTrigger}
            />

            {viewMode === 'reader' && (
              <SearchHistory triggerRefresh={historyTrigger} />
            )}

            <div className="rounded-2xl p-6 text-left" style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-soft)',
            }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                Quick Start
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                Install a translation, then try reading{' '}
                <code>Joh. 3:16</code> or <code>John 3:16</code>, or search
                for <code>light</code> in the text search below.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 mt-12 text-center text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
        Clible-v3-go — Built in partnership with Antigravity.
      </footer>
    </div>
  );
}

export default App;

