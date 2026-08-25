import { useState, useEffect, useCallback, useRef } from 'react';
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
import { GridOverlay } from './components/notebook/GridOverlay';
import { CellBadge } from './components/notebook/CellBadge';
import { useResizableCard } from './components/notebook/useResizableCard';
import type { Notebook } from './components/notebook/types';
import { Terminal, Settings, BookOpen, Activity, GitCompare, Sun, Moon, LogOut, Languages, FileText, RotateCcw } from 'lucide-react';
import { LanguageSwitcher } from './components/LanguageSwitcher/LanguageSwitcher';
import { useLanguage } from './context/LanguageContext';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import { APP_VERSION } from './utils/version';

/**
 * Props for the {@link SortableNotebookCard} component.
 */
interface SortableNotebookCardProps {
  /** The notebook data entity */
  nb: Notebook;
  /** Index of the card in the grid list */
  index: number;
  /** Callback triggered when clicking the card to open notebook details */
  onClick: () => void;
  /** Optional callback triggered when card resizing begins */
  onResizeStart?: () => void;
  /** Callback triggered when card resizing ends with new column span and row span */
  onResizeEnd: (colSpan: number, rowSpan?: number) => void;
  /** Accessible title for the drag handle button */
  dragHandleTitle: string;
  /** Localized label for last update timestamp */
  updatedAtLabel: string;
  /** Localized placeholder label when no date is present */
  noDateLabel: string;
}

/**
 * Helper utility to strip raw Markdown markdown syntax and verse brackets for clean card previews.
 */
function stripMarkdown(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/#+\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/>+\s*/g, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Interactive card component representing a notebook item in the grid view.
 * Supports drag-and-drop reordering via `@dnd-kit/react/sortable` and multi-edge drag resizing.
 * Dynamically renders notebook cell previews when stretched vertically.
 */
function SortableNotebookCard({
  nb,
  index,
  onClick,
  onResizeStart,
  onResizeEnd,
  dragHandleTitle,
  updatedAtLabel,
  noDateLabel,
}: SortableNotebookCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { ref: sortableRef, handleRef, isDragging } = useSortable({ id: nb.id, index });

  // React 19 callback ref with optional cleanup
  const setCombinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      sortableRef(node);
      cardRef.current = node;
      return () => {
        cardRef.current = null;
      };
    },
    [sortableRef]
  );

  // Tiukka dynaminen maxRowSpan kortin sisältöjen perusteella (5 riviä pohja + 1 rivi per esikatselusolu, max 9 riviä = 216px)
  const contentCellCount = nb.cells ? Math.min(4, nb.cells.length) : 0;
  const maxRowSpan = contentCellCount > 0 ? (5 + contentCellCount) : 5;
  const effectiveRowSpan = Math.min(maxRowSpan, nb.rowSpan ?? (nb.colHeight ? Math.max(5, Math.round(nb.colHeight / 24)) : 5));

  const { colSpan, rowSpan, isResizing, handlePointerDown, handlePointerMove, handlePointerUp } =
    useResizableCard({
      initialColSpan: nb.colSpan ?? 12,
      initialColStart: nb.colStart ?? 1,
      initialRowStart: nb.rowStart,
      initialRowSpan: effectiveRowSpan,
      maxRowSpan,
      onResizeStart,
      onResizeEnd,
    });

  // Aseta eksplisiittiset CSS Grid matrix -koordinaatit kortille (automaattisella flow-fall-backilla)
  const gridStyle: React.CSSProperties = {
    gridColumn: nb.colStart && nb.colStart > 1 ? `${nb.colStart} / span ${colSpan}` : `span ${colSpan}`,
    ...(nb.rowStart && nb.rowStart > 1 ? { gridRowStart: nb.rowStart } : {}),
    gridRowEnd: `span ${rowSpan || effectiveRowSpan}`,
  };

  const hasCustomHeight = Boolean((rowSpan || effectiveRowSpan) > 5);

  return (
    <div
      ref={setCombinedRef}
      style={gridStyle}
      onClick={() => {
        if (!isResizing) {
          onClick();
        }
      }}
      className={`h-full relative group p-4 bg-[var(--surface-2)]/10 border border-[var(--border-soft)]
                  hover:border-amber-500/20 rounded-xl cursor-pointer select-none
                  hover:bg-[var(--surface-2)]/20 transition-all flex flex-col justify-between overflow-hidden
                  ${isDragging ? 'opacity-50 ring-2 ring-amber-500/40 z-50' : ''}
                  ${isResizing ? 'ring-2 ring-amber-400/60 shadow-lg' : ''}`}
    >
      {/* Header section: Drag handle, title, and timestamp */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <div className="flex items-start gap-2 flex-shrink-0">
          <span
            ref={handleRef}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 flex-shrink-0 p-1 -ml-1 text-[var(--muted)]
                       opacity-20 group-hover:opacity-60 transition-opacity
                       cursor-grab active:cursor-grabbing touch-none"
            title={dragHandleTitle}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6h16.5" />
            </svg>
          </span>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug text-[var(--text)]
                           group-hover:text-amber-500 transition-colors truncate">
              {nb.title}
            </h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              {updatedAtLabel}:{' '}
              {nb.updatedAt || nb.createdAt
                ? new Date(nb.updatedAt || nb.createdAt).toLocaleDateString('fi-FI')
                : noDateLabel}
            </p>
          </div>
        </div>

        {/* Content Preview Block (Revealed when vertically expanded/stretched) */}
        {hasCustomHeight && (
          <div className="mt-3 pt-3 border-t border-[var(--border-soft)]/50 flex-1 min-h-0 flex flex-col justify-start gap-2 overflow-y-auto pr-1">
            {nb.cells && nb.cells.length > 0 ? (
              nb.cells.slice(0, 4).map((cell) => {
                const cleanText = stripMarkdown(cell.content);
                return (
                  <div key={cell.id} className="text-xs shrink-0">
                    {cell.type === 'markdown' ? (
                      <div className="text-[var(--muted)] text-[11px] line-clamp-3 leading-relaxed bg-[var(--surface-2)]/30 rounded-lg p-2 border border-[var(--border-soft)]/40 shadow-2xs">
                        {cleanText || <em className="italic text-[var(--muted)]/60">...</em>}
                      </div>
                    ) : (
                      <div className="font-mono text-[11px] bg-[var(--surface-2)]/60 rounded-lg px-2.5 py-1 text-amber-500/90 truncate border border-[var(--border-soft)]/50 flex items-center gap-2 shadow-2xs">
                        <span className="text-[8px] font-bold text-amber-500/70 uppercase shrink-0 px-1 py-0.5 bg-amber-500/10 rounded">CLI</span>
                        <span className="truncate">{cleanText || '/read Joh 3:16'}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-3 px-3 rounded-lg bg-[var(--surface-2)]/30 border border-dashed border-[var(--border-soft)] text-center hover:border-amber-500/30 transition-colors my-auto">
                <p className="text-[11px] text-[var(--muted)] leading-tight">
                  {noDateLabel === '-' ? 'Klikkaa avataksesi muistikirjan ja lisätäksesi soluja' : 'Click to open notebook and add cells'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer section: Cell badges and width indicator */}
      <div className="flex items-center justify-between mt-3 pt-2.5
                      border-t border-[var(--border-soft)] flex-shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {nb.cellCounts && (
            <>
              <CellBadge type="markdown" count={nb.cellCounts.markdown} />
              <CellBadge type="code" count={nb.cellCounts.code} />
            </>
          )}
          {(!nb.cellCounts ||
            (nb.cellCounts.markdown === 0 && nb.cellCounts.code === 0)) && (
            <span className="text-[9px] text-[var(--muted)] italic">-</span>
          )}
        </div>

        <span className="text-[9px] font-mono text-amber-500/50
                         opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {Math.round((colSpan / 24) * 100)}%
        </span>
      </div>

      {/* Resize handles — multi-edge pointer interactions */}
      {/* Right edge */}
      <div className="absolute top-2 right-0 bottom-2 w-2.5 cursor-ew-resize
                      opacity-0 group-hover:opacity-100 transition-opacity
                      flex items-center justify-center touch-none select-none z-20"
           onClick={(e) => e.stopPropagation()}
           onPointerDown={(e) => handlePointerDown(e, cardRef.current, 'right')}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <div className="w-0.5 h-8 rounded-full"
          style={{ background: isResizing ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.35)' }} />
      </div>

      {/* Left edge */}
      <div className="absolute top-2 left-0 bottom-2 w-2.5 cursor-ew-resize
                      opacity-0 group-hover:opacity-100 transition-opacity
                      flex items-center justify-center touch-none select-none z-20"
           onClick={(e) => e.stopPropagation()}
           onPointerDown={(e) => handlePointerDown(e, cardRef.current, 'left')}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <div className="w-0.5 h-8 rounded-full"
          style={{ background: isResizing ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.35)' }} />
      </div>

      {/* Bottom edge */}
      <div className="absolute bottom-0 left-2 right-2 h-2.5 cursor-ns-resize
                      opacity-0 group-hover:opacity-100 transition-opacity
                      flex items-center justify-center touch-none select-none z-20"
           onClick={(e) => e.stopPropagation()}
           onPointerDown={(e) => handlePointerDown(e, cardRef.current, 'bottom')}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <div className="h-0.5 w-8 rounded-full"
          style={{ background: isResizing ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.35)' }} />
      </div>

      {/* Bottom-right corner handle */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize
                      opacity-0 group-hover:opacity-100 transition-opacity
                      touch-none select-none z-30"
           onClick={(e) => e.stopPropagation()}
           onPointerDown={(e) => handlePointerDown(e, cardRef.current, 'corner')}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <svg viewBox="0 0 10 10" className="w-full h-full"
          style={{ fill: isResizing ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.35)' }}>
          <polygon points="10,0 10,10 0,10" />
        </svg>
      </div>
    </div>
  );
}


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
  const [isAnyCardResizing, setIsAnyCardResizing] = useState(false);
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
      setInstallSuccess(lang === 'fi' ? `Paketti ${id} asennettiin onnistuneesti.` : `Package ${id} installed successfully.`);
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
              throw new Error(lang === 'fi' ? 'Alkutekstiä ei löytynyt tälle viitteelle.' : 'Original text not found for this reference.');
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

      const selectedTranslationMeta = installedTranslations.find((t) => t.id === translationIds[0]);
      const outputLanguage = selectedTranslationMeta?.language === 'fi' || selectedTranslationMeta?.language === 'en'
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

  const { lang, strings } = useLanguage();

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
        <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-16 py-2.5 sm:py-0 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--text)', color: 'var(--bg)' }}>
              <Terminal size={15} />
            </div>
            <h1 className="text-sm sm:text-lg font-medium tracking-tight" style={{ color: 'var(--text)' }}>
              Clible <span className="hidden sm:inline" style={{ color: 'var(--muted)', fontWeight: 400 }}>Workspace</span>
              <span className="ml-1 sm:ml-2 text-xs font-mono" style={{ color: 'var(--accent)' }}>v3</span>
            </h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink">
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
                          aria-label={strings.signOutTitle}
                          className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors btn-tactile hover:border-[var(--accent)] hover:text-[var(--text)] shrink-0"
                          style={{
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--muted)',
                          }}
                        >
                          <LogOut size={14} />
                          <span className="max-md:hidden">{strings.signOutTitle}</span>
                        </button>

            <button
                          onClick={() => setShowManager(!showManager)}
                          className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors btn-tactile hover:border-[var(--accent)] shrink-0"
                          style={{
                            border: '1px solid var(--border)',
                            background: showManager ? 'var(--accent-bg)' : 'transparent',
                            color: showManager ? 'var(--accent)' : 'var(--muted)',
                          }}
                        >
                          <Settings size={14} />
                          <span className="max-sm:hidden">{showManager ? strings.hideLabel : strings.translationsLabel}</span>
                        </button>

            <LanguageSwitcher />
            <TranslationSelector
              selectedTranslation={selectedTranslation}
              onSelectTranslation={handleSelectTranslation}
              translations={installedTranslations}
            />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12">

        {showManager && (
          <div className="mb-8 sm:mb-10 max-w-2xl mx-auto">
            <TranslationManager
              translations={installedTranslations}
              onTranslationChanged={handleTranslationChanged}
            />
          </div>
        )}

        {/* View Selection Tabs */}
        <div className="grid grid-cols-5 sm:flex items-center overflow-x-auto gap-1 sm:gap-1.5 p-1 rounded-xl w-full sm:w-fit mb-6 sm:mb-8 bg-[var(--surface-2)] border border-[var(--border-soft)] select-none">
          <button
            type="button"
            onClick={() => setViewMode('reader')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all btn-tactile text-center ${viewMode === 'reader'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
          >
            <BookOpen size={16} className="shrink-0" />
            <span>{strings.tabReader}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('analytics')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all btn-tactile text-center ${viewMode === 'analytics'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
          >
            <Activity size={16} className="shrink-0" />
            <span>
              <span className="hidden sm:inline">{strings.tabAnalytics}</span>
              <span className="sm:hidden">{lang === 'fi' ? 'Analyysi' : 'Analytics'}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all btn-tactile text-center ${viewMode === 'compare'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
          >
            <GitCompare size={16} className="shrink-0" />
            <span>
              <span className="hidden sm:inline">{strings.tabCompare}</span>
              <span className="sm:hidden">{lang === 'fi' ? 'Vertailu' : 'Compare'}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all btn-tactile text-center ${viewMode === 'original'
              ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
          >
            <Languages size={16} className="shrink-0" />
            <span>{strings.tabOriginal}</span>
          </button>

          <button
            type="button"
            onClick={() => { setViewMode('notebooks');
              setSelectedNotebookId(null); }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all btn-tactile text-center
                ${viewMode === 'notebooks' 
                  ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
                }`}
                >
                  <FileText size={16} className="shrink-0" />
                  <span>
                    <span className="hidden sm:inline">{strings.tabNotebooks}</span>
                    <span className="sm:hidden">{lang === 'fi' ? 'Muistio' : 'Notebooks'}</span>
                  </span>
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
                                <p className="font-medium" style={{ color: 'var(--text)' }}>{strings.noTranslationSelected}</p>
                                <p className="text-sm">{strings.noTranslationHint}</p>
                                <button
                                  onClick={() => setShowManager(true)}
                                  className="mt-4 px-5 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                >
                                  {strings.installTranslation}
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
                onWorkspaceUpdated={() => setWorkspaceTrigger(prev => !prev)}
              />
            )}

            {viewMode === 'notebooks' && (
              <div className="space-y-6">
                {selectedNotebookId ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedNotebookId(null)}
                      className="mb-4 px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--text)] text-xs rounded transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {strings.backToList}
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
                      <h2 className="text-lg font-bold text-[var(--text)]">{strings.notebookTitle}</h2>
                      <div className="flex items-center gap-2">
                        {notebooks.length > 0 && (
                          <button
                            onClick={handleResetNotebookSizes}
                            className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border-soft)] text-[var(--muted)] hover:text-amber-500 text-xs rounded font-medium transition-all flex items-center gap-1.5 shadow-xs"
                            title={strings.resetNotebookSizes || 'Palauta koot'}
                          >
                            <RotateCcw size={13} />
                            <span>{strings.resetNotebookSizes || 'Palauta koot'}</span>
                          </button>
                        )}
                        <button
                          onClick={handleCreateNotebook}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded transition-all shadow-sm"
                        >
                          + {strings.createNotebook}
                        </button>
                      </div>
                    </div>

                    <DragDropProvider
                      onDragEnd={(event) => {
                        setNotebooks((prev) => move(prev, event));
                      }}
                    >
                    {/* 24-sarakkeinen tiivis CSS Grid -kontti 24px automaattisilla rivikorkeuksilla */}
                    <div className="grid grid-cols-24 auto-rows-[24px] grid-flow-row-dense gap-4 items-start relative">
                      <GridOverlay visible={isAnyCardResizing} />
                      {notebooks.map((nb, index) => (
                        <SortableNotebookCard
                          key={nb.id}
                          nb={nb}
                          index={index}
                          onClick={() => setSelectedNotebookId(nb.id)}
                          onResizeStart={() => setIsAnyCardResizing(true)}
                          onResizeEnd={async (colSpan, rowSpan) => {
                            setIsAnyCardResizing(false);
                            try {
                              // Tallenna matriisikoot taustajärjestelmään (colSpan ja rowSpan)
                              await fetch(`/api/notebooks/${nb.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  colSpan,
                                  rowSpan,
                                }),
                              });
                              // Päivitä tila synkronisesti frontendissä
                              setNotebooks((prev) =>
                                prev.map((item) =>
                                  item.id === nb.id ? { ...item, colSpan, rowSpan } : item
                                )
                              );
                            } catch (err) {
                              console.error('Failed to update notebook dimensions:', err);
                            }
                          }}
                          dragHandleTitle={strings.dragHandleTitle || 'Vedä järjestääksesi'}
                          updatedAtLabel={strings.updatedAtLabel}
                          noDateLabel="-"
                        />
                      ))}
                      {notebooks.length === 0 && (
                        <div className="col-span-24 text-center py-12 text-[var(--muted)] text-sm">
                          {strings.noNotebooksText}
                        </div>
                      )}
                    </div>
                    </DragDropProvider>
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


          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 mt-12 text-center text-xs flex items-center justify-center gap-2"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
        <span>Clible-v3-go</span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium border"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)', color: 'var(--accent)' }}>
          v{APP_VERSION}
        </span>
        <span>— Built in partnership with Antigravity.</span>
      </footer>
    </div>
  );
}

export default App;

