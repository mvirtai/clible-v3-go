import { useState, useEffect, useCallback } from 'react';
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
import type { InstalledTranslation, TextStats, ComparisonResult } from './types/bible';
import type { SavedSearch, SavedAnalysis } from './types/workspace';
import type { SearchVerse } from './types/search';
import { OriginalStudyView } from './components/OriginalStudyView';
import type { OriginalStudyResult } from './types/originalStudy';
import type { AiTextResponse } from './types/ai';
import { NotebookEditor } from './components/notebook/NotebookEditor';
import type { Notebook } from './components/notebook/types';
import { Terminal, Settings, BookOpen, Activity, GitCompare, Sun, Moon, LogOut, Languages, FileText } from 'lucide-react';


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
  const [viewMode, setViewMode] = useState<'reader' | 'analytics' | 'compare' | 'original' | 'notebooks'>('reader');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
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
  const [loadedInsight, setLoadedInsight] = useState<AiTextResponse | null>(null);
  const [loadedTone, setLoadedTone] = useState<AiTextResponse | null>(null);
  const [loadedDeepDive, setLoadedDeepDive] = useState<string | null>(null);
  const [loadedInsightDeepDive, setLoadedInsightDeepDive] = useState<string | null>(null);
  const [loadedComparisonAi, setLoadedComparisonAi] = useState<AiTextResponse | null>(null);
  const [loadedComparisonDeepDive, setLoadedComparisonDeepDive] = useState<string | null>(null);

  // Haetaan muistikirjat kun siirrytään näkymään tai palataan editorista listaukseen
  useEffect(() => {
    if (viewMode === 'notebooks') {
      const fetchNotebooks = async () => {
        try {
          const res = await fetch('/api/notebooks');
          if (res.ok) {
            const data = await res.json();
            setNotebooks(data || []);
          }
        } catch (err) {
          console.error('fetching notebooks failed:', err);
        }
      };
      fetchNotebooks();
    }
  }, [viewMode, selectedNotebookId]);

  const handleCreateNotebook = async () => {
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Uusi muistikirja',
          scopeId: activeScopeId || undefined
        }),
      });
      if (res.ok) {
        const newNotebook = await res.json();
        setNotebooks((prev) => [newNotebook, ...prev]);
        setSelectedNotebookId(newNotebook.id);
      }
    } catch (err) {
      console.error('Creating notebook failed:', err);
    }
  };

  const handleSelectReference = (ref: string) => {
    setActiveReference(ref);
    setLoadedInsight(null);
    setLoadedInsightDeepDive(null);
    if (ref) {
      localStorage.setItem('activeReference', ref);
    } else {
      localStorage.removeItem('activeReference')
    }
  }

  const handleSelectTranslation = useCallback(async (translation_id: string) => {
    setSelectedTranslation(translation_id);
    if (translation_id) {
      localStorage.setItem('selectedTranslation', translation_id);
      const tr = installedTranslations.find(t => t.id === translation_id);
      if (tr && !tr.installed) {
        try {
          await apiService.linkTranslation(translation_id);
          setTranslationTrigger((p) => !p);
        } catch (err) {
          console.error('Failed to auto-link translation:', err);
        }
      }
    } else {
      localStorage.removeItem('selectedTranslation');
    }
  }, [installedTranslations]);

  // Auto-select first active translation if selectedTranslation is empty or invalid
  useEffect(() => {
    if (installedTranslations.length === 0) return;
    const activeList = installedTranslations.filter((t) => t.installed);
    const exists = activeList.some((t) => t.id === selectedTranslation);
    if (activeList.length > 0 && (!selectedTranslation || !exists)) {
      const firstId = activeList[0].id;
      Promise.resolve().then(() => {
        handleSelectTranslation(firstId);
      });
    } else if (activeList.length === 0 && selectedTranslation) {
      Promise.resolve().then(() => {
        handleSelectTranslation('');
      });
    }
  }, [installedTranslations, selectedTranslation, handleSelectTranslation]);

  const handleScopeChanged = useCallback((id: string) => {
    setActiveScopeId(id);
    if (id) {
      localStorage.setItem('activeScopeId', id);
    } else {
      localStorage.removeItem('activeScopeId');
    }
  }, []);

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
        stats: result.stats || result,
        reference: a.reference,
        translationId: a.translationId
      });
      setSelectedTranslation(a.translationId);
      setViewMode('analytics');
      setLoadedTone(null);
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
        result: result.result || result,
        reference: a.reference,
        translationA: a.translationId,
        translationB: params.translationB
      });
      setLoadedComparisonAi(result.ai || null);
      setLoadedComparisonDeepDive(result.deepDive || null);
      setViewMode('compare');
    } else if (a.analysisType === 'insight') {
      setLoadedInsight(result.insight || result);
      setLoadedInsightDeepDive(result.deepDive || null);
      setActiveReference(a.reference);
      setSelectedTranslation(a.translationId);
      setViewMode('reader');
    } else if (a.analysisType === 'tone') {
      setLoadedTone(result.tone || result);
      setLoadedDeepDive(result.deepDive || null);
      setLoadedStats({
        stats: result.stats || null,
        reference: a.reference,
        translationId: a.translationId
      });
      setSelectedTranslation(a.translationId);
      setViewMode('analytics');
    } else if (a.analysisType === 'original') {
      setOriginalResult(result.result || result);
      setOriginalDeepDive(result.deepDive || null);
      setActiveReference(a.reference);
      setSelectedTranslation(a.translationId);
      setViewMode('original');
    }
  };

  // Tekoäly-alkukieliopiskelun tilat ja handlerit
  const [originalResult, setOriginalResult] = useState<OriginalStudyResult | null>(null);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [originalDeepDive, setOriginalDeepDive] = useState<string | null>(null);
  const [installingTranslationId, setInstallingTranslationId] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState<string | null>(null);

  const handleInstallOriginalTranslation = async (id: string) => {
    setInstallingTranslationId(id);
    setInstallError(null);
    setInstallSuccess(null);
    try {
      await apiService.linkTranslation(id);
      setInstallSuccess(uiLanguage === 'fi' ? `Paketti ${id} asennettiin onnistuneesti.` : `Package ${id} installed successfully.`);
      setTranslationTrigger((prev) => !prev);
    } catch (err) {
      const errorObj = err as Error;
      setInstallError(errorObj.message || 'Failed to install translation.');
    } finally {
      setInstallingTranslationId(null);
    }
  };

  const handleStudyOriginalLanguage = async (
    ref: string,
    originalId: string,
    translationIds: string[],
    scope: 'verse' | 'chapter' | 'book'
  ) => {
    setOriginalLoading(true);
    setOriginalError(null);
    setOriginalResult(null);
    setOriginalDeepDive(null);
    try {
      const versesRes = await apiService.getVerses(ref, originalId);
      const verses = versesRes.verses;
      if (verses.length === 0) {
        throw new Error(uiLanguage === 'fi' ? 'Alkutekstiä ei löytynyt tälle viitteelle.' : 'Original text not found for this reference.');
      }
      const sourceText = verses.map((v: { text: string }) => v.text).join('\n');
      const sourceLanguage = originalId === 'greeksblgnt' ? 'grc' : 'he';

      const translations: Array<{ id: string; name: string; text: string }> = [];
      for (const tid of translationIds) {
        const trVersesRes = await apiService.getVerses(ref, tid);
        const trVerses = trVersesRes.verses;
        const trMeta = installedTranslations.find((t) => t.id === tid);
        translations.push({
          id: tid,
          name: trMeta?.name || tid,
          text: trVerses.map((v: { text: string }) => v.text).join('\n')
        });
      }

      const res = await apiService.getAiOriginalStudy({
        reference: ref,
        sourceText,
        sourceLanguage,
        translations,
        scope,
      });
      setOriginalResult(res);
    } catch (err) {
      const errorObj = err as Error;
      setOriginalError(errorObj.message || 'Original study failed.');
    } finally {
      setOriginalLoading(false);
    }
  };

  const uiLanguage = 'fi'; // Kehitysfilosofian kieli


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
              translations={installedTranslations}
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

          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all btn-tactile ${viewMode === 'original'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
          >
            <Languages size={16} />
            <span>Alkukieli</span>
          </button>

          <button
            type="button"
            onClick={() => { setViewMode('notebooks');
              setSelectedNotebookId(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all btn-tactile
                ${viewMode === 'notebooks' 
                  ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
                  : 'text-[var(--muten)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
                }`}
                >
                  <FileText size={16} />
                  <span>Muistikirjat</span>
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
                    loadedSavedInsight={loadedInsight}
                    loadedSavedDeepDive={loadedInsightDeepDive}
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
                loadedSavedTone={loadedTone}
                loadedSavedDeepDive={loadedDeepDive}
                activeReference={activeReference}
              />
            )}

            {viewMode === 'compare' && (
              <CompareView
                installedTranslations={activatedTranslations}
                activeScopeId={activeScopeId}
                onWorkspaceUpdated={() => setWorkspaceTrigger(p => !p)}
                loadedSavedComparison={loadedComparison}
                loadedSavedAi={loadedComparisonAi}
                loadedSavedDeepDive={loadedComparisonDeepDive}
              />
            )}

            {viewMode === 'original' && (
              <OriginalStudyView
                installedTranslations={installedTranslations}
                activeTranslationId={selectedTranslation}
                uiLanguage={uiLanguage}
                installingTranslationId={installingTranslationId}
                installError={installError}
                installSuccess={installSuccess}
                onInstallTranslation={handleInstallOriginalTranslation}
                result={originalResult}
                loading={originalLoading}
                error={originalError}
                defaultReference={activeReference}
                onStudy={handleStudyOriginalLanguage}
                onNextFocusPick={(it) => {
                  setActiveReference(it.label);
                }}
                deepDiveText={originalDeepDive}
                onDeepDiveClose={() => setOriginalDeepDive(null)}
                activeScopeId={activeScopeId}
                onWorkspaceUpdated={() => setWorkspaceTrigger(prev => !prev)}
              />
            )}

            {viewMode === 'notebooks' && (
              <div className="space-y-6">
                {selectedNotebookId ? (
                  <div>
                    <button
                      onClick={() => setSelectedNotebookId(null)}
                      className="mb-4 px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--text)] text-xs rounded transition-all flex items-center gap-1"
                    >
                      ← Takaisin listaukseen
                    </button>
                    <NotebookEditor
                      notebookId={selectedNotebookId}
                      translation={selectedTranslation}
                      onSelectVerse={(ref) => {
                        handleSelectReference(ref);
                        setViewMode('reader');
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4">
                      <h2 className="text-lg font-bold text-[var(--text)]">Teologiset muistikirjat</h2>
                      <button
                        onClick={handleCreateNotebook}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded transition-all shadow-sm"
                      >
                        + Luo muistikirja
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {notebooks.map((nb) => (
                        <div
                          key={nb.id}
                          onClick={() => setSelectedNotebookId(nb.id)}
                          className="p-5 bg-[var(--surface-2)]/10 border border-[var(--border-soft)] hover:border-amber-500/20 rounded-xl cursor-pointer hover:bg-[var(--surface-2)]/20 transition-all group"
                        >
                          <h3 className="font-bold text-[var(--text)] group-hover:text-amber-500 transition-colors">
                            {nb.title}
                          </h3>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-soft)] text-[10px] text-[var(--muted)]">
                            <span>Päivitetty: {new Date(nb.updatedAt || nb.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                      {notebooks.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-[var(--muted)] text-sm">
                          Ei vielä muistikirjoja. Luo uusi aloittaaksesi!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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

