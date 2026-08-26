import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, type ViewMode } from './components/layout/AppHeader';
import { ViewModeTabs } from './components/layout/ViewModeTabs';
import { TranslationManager } from './components/translations/TranslationManager';
import { VerseReader } from './components/reader/VerseReader';
import { VerseSearch } from './components/search/VerseSearch';
import { SearchHistory } from './components/search/SearchHistory';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { CompareView } from './components/compare/CompareView';
import { OriginalStudyView } from './components/original/OriginalStudyView';
import { NotebookCanvasView } from './components/notebook/NotebookCanvasView';
import { WorkspaceSidebar } from './components/layout/WorkspaceSidebar';
import { apiService } from './services/api';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { BookOpen } from 'lucide-react';
import { APP_VERSION } from './utils/version';
import type { InstalledTranslation, TextStats, ComparisonResult } from './types/bible';
import type { SavedSearch, SavedAnalysis } from './types/workspace';
import type { SearchVerse } from './types/search';
import type { OriginalStudyResult } from './types/originalStudy';
import type { AiTextResponse } from './types/ai';
import type { Notebook } from './components/notebook/types';

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

export function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { lang, strings } = useLanguage();

  const [selectedTranslation, setSelectedTranslation] = useState<string>(
    () => localStorage.getItem('selectedTranslation') || ''
  );
  const [historyTrigger, setHistoryTrigger] = useState(false);
  const [translationTrigger, setTranslationTrigger] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('reader');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [installedTranslations, setInstalledTranslations] = useState<InstalledTranslation[]>([]);
  const [activeReference, setActiveReference] = useState<string>(
    () => localStorage.getItem('activeReference') || ''
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
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
          scopeId: activeScopeId || undefined,
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

  const handleResetNotebookSizes = async () => {
    setNotebooks((prev) =>
      prev.map((nb) => ({
        ...nb,
        colSpan: 12,
        colStart: undefined,
        rowStart: undefined,
        rowSpan: 5,
        colHeight: undefined,
      }))
    );
    try {
      await Promise.all(
        notebooks.map((nb) =>
          fetch(`/api/notebooks/${nb.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              colSpan: 12,
              colStart: null,
              rowStart: null,
              rowSpan: 5,
              colHeight: null,
            }),
          })
        )
      );
    } catch (err) {
      console.error('Resetting notebook sizes failed:', err);
    }
  };

  const handleSelectReference = (ref: string) => {
    setActiveReference(ref);
    setLoadedInsight(null);
    setLoadedInsightDeepDive(null);
    if (ref) {
      localStorage.setItem('activeReference', ref);
    } else {
      localStorage.removeItem('activeReference');
    }
  };

  const handleSelectTranslation = async (translation_id: string) => {
    setSelectedTranslation(translation_id);
    if (translation_id) {
      localStorage.setItem('selectedTranslation', translation_id);
      const tr = installedTranslations.find((t) => t.id === translation_id);
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
  };

  const handleScopeChanged = (id: string) => {
    setActiveScopeId(id);
    if (id) {
      localStorage.setItem('activeScopeId', id);
    } else {
      localStorage.removeItem('activeScopeId');
    }
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
    const scope = validScopes.includes(s.searchScope as (typeof validScopes)[number])
      ? (s.searchScope as 'all' | 'ot' | 'nt' | 'book')
      : 'all';
    setLoadedSearch({
      query: s.queryText,
      translation: s.translationId,
      searchScope: s.searchScope as 'all' | 'ot' | 'nt' | 'book',
      scopeValue: scope,
      results: Array.isArray(results) ? results : [],
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
        translationId: a.translationId,
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
        translationB: params.translationB,
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
        translationId: a.translationId,
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
      setInstallSuccess(
        lang === 'fi' ? `Paketti ${id} asennettiin onnistuneesti.` : `Package ${id} installed successfully.`
      );
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
        throw new Error(
          lang === 'fi'
            ? 'Alkutekstiä ei löytynyt tälle viitteelle.'
            : 'Original text not found for this reference.'
        );
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
          text: trVerses.map((v: { text: string }) => v.text).join('\n'),
        });
      }

      const selectedTranslationMeta = installedTranslations.find((t) => t.id === translationIds[0]);
      const outputLanguage =
        selectedTranslationMeta?.language === 'fi' || selectedTranslationMeta?.language === 'en'
          ? selectedTranslationMeta.language
          : lang;

      const res = await apiService.getAiOriginalStudy({
        reference: ref,
        sourceText,
        sourceLanguage,
        outputLanguage,
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

  // Sync system prefers-color-scheme changes with theme state
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load installed translations list and auto-select active translation if needed
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const list = await apiService.getTranslations();
        setInstalledTranslations(list);

        const activeList = list.filter((t) => t.installed);
        const stored = localStorage.getItem('selectedTranslation') || '';
        const exists = activeList.some((t) => t.id === stored);
        if (activeList.length > 0 && (!stored || !exists)) {
          const firstId = activeList[0].id;
          setSelectedTranslation(firstId);
          localStorage.setItem('selectedTranslation', firstId);
        } else if (activeList.length === 0 && stored) {
          setSelectedTranslation('');
          localStorage.removeItem('selectedTranslation');
        }
      } catch (err) {
        console.error('Failed to load translations list:', err);
      }
    };
    loadTranslations();
  }, [translationTrigger]);

  const handleSearchFinished = () => setHistoryTrigger((p) => !p);
  const handleTranslationChanged = () => setTranslationTrigger((p) => !p);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* ── Top Header ── */}
      <AppHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        onSignOut={async () => {
          await logout();
          navigate('/login');
        }}
        showManager={showManager}
        onToggleManager={() => setShowManager(!showManager)}
        installedTranslations={installedTranslations}
        selectedTranslation={selectedTranslation}
        onSelectTranslation={handleSelectTranslation}
      />

      {/* ── Main Workspace ── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        {/* ── View Selection Tabs ── */}
        <ViewModeTabs
          viewMode={viewMode}
          onSelectViewMode={(mode) => setViewMode(mode)}
          onSelectNotebookId={setSelectedNotebookId}
        />

        {showManager && (
          <div className="mb-8 sm:mb-10 max-w-2xl mx-auto">
            <TranslationManager
              translations={installedTranslations}
              onTranslationChanged={handleTranslationChanged}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Active View Content */}
          <div className="lg:col-span-2 space-y-8">
            {viewMode === 'reader' && (
              selectedTranslation ? (
                <>
                  <VerseReader
                    translation={selectedTranslation}
                    activeReference={activeReference}
                    activeScopeId={activeScopeId}
                    onWorkspaceUpdated={() => setWorkspaceTrigger((p) => !p)}
                    loadedSavedInsight={loadedInsight}
                    loadedSavedDeepDive={loadedInsightDeepDive}
                  />
                  <div onClick={handleSearchFinished}>
                    <VerseSearch
                      translation={selectedTranslation}
                      onSelectVerse={handleSelectReference}
                      activeScopeId={activeScopeId}
                      onWorkspaceUpdated={() => setWorkspaceTrigger((p) => !p)}
                      loadedSavedResults={loadedSearch}
                      onClearLoadedResults={() => setLoadedSearch(null)}
                    />
                  </div>
                </>
              ) : (
                <div className="py-24 text-center space-y-4" style={{ color: 'var(--muted)' }}>
                  <div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
                  >
                    <BookOpen size={28} />
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>
                    {strings.noTranslationSelected}
                  </p>
                  <p className="text-sm">{strings.noTranslationHint}</p>
                  <button
                    onClick={() => setShowManager(true)}
                    className="mt-4 px-5 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80 cursor-pointer"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                  >
                    {strings.installTranslation}
                  </button>
                </div>
              )
            )}

            {viewMode === 'analytics' && (
              <AnalyticsView
                defaultTranslation={selectedTranslation}
                activeReference={activeReference}
                activeScopeId={activeScopeId}
                onWorkspaceUpdated={() => setWorkspaceTrigger((p) => !p)}
                loadedSavedStats={loadedStats}
                loadedSavedTone={loadedTone}
                loadedSavedDeepDive={loadedDeepDive}
              />
            )}

            {viewMode === 'compare' && (
              <CompareView
                installedTranslations={installedTranslations}
                activeScopeId={activeScopeId}
                onWorkspaceUpdated={() => setWorkspaceTrigger((p) => !p)}
                loadedSavedComparison={loadedComparison}
                loadedSavedAi={loadedComparisonAi}
                loadedSavedDeepDive={loadedComparisonDeepDive}
              />
            )}

            {viewMode === 'original' && (
              <OriginalStudyView
                installedTranslations={installedTranslations}
                activeTranslationId={selectedTranslation}
                uiLanguage={lang}
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
                onWorkspaceUpdated={() => setWorkspaceTrigger((prev) => !prev)}
              />
            )}

            {viewMode === 'notebooks' && (
              <NotebookCanvasView
                notebooks={notebooks}
                onNotebooksChange={setNotebooks}
                selectedNotebookId={selectedNotebookId}
                onSelectNotebook={setSelectedNotebookId}
                selectedTranslation={selectedTranslation}
                onSelectVerse={(ref) => {
                  handleSelectReference(ref);
                  setViewMode('reader');
                }}
                onCreateNotebook={handleCreateNotebook}
                onResetNotebookSizes={handleResetNotebookSizes}
              />
            )}
          </div>

          {/* Right: Persistent Workspace Sidebar */}
          <div className="space-y-8">
            <WorkspaceSidebar
              activeScopeId={activeScopeId}
              onScopeChanged={handleScopeChanged}
              onLoadSavedSearch={handleLoadSavedSearch}
              onLoadSavedAnalysis={handleLoadSavedAnalysis}
              refreshTrigger={workspaceTrigger}
            />

            {viewMode === 'reader' && <SearchHistory triggerRefresh={historyTrigger} />}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="mt-16 py-6 text-center text-xs border-t"
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
      >
        <p>
          Clible v{APP_VERSION} &bull; {strings.quickStart} &bull; SQLite FTS5 / Vector Engine
        </p>
      </footer>
    </div>
  );
}

export default App;
