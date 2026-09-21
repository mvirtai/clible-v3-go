import { BookOpen, Search, Activity, GitCompare, Languages, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { ViewMode } from './AppHeader';

/**
 * Props for the {@link ViewModeTabs} component.
 */
export interface ViewModeTabsProps {
  /** Currently active view mode */
  viewMode: ViewMode;
  /** Callback triggered when user selects a view mode */
  onSelectViewMode: (mode: ViewMode) => void;
  /** Callback triggered when resetting or selecting active notebook */
  onSelectNotebookId: (id: string | null) => void;
}

/**
 * Tab bar component for switching between main workspace views
 * (Reader, Analytics, Compare, Original Language Study, and Notebooks).
 * Strictly utilizes strings from i18n dictionary.
 */
export function ViewModeTabs({
  viewMode,
  onSelectViewMode,
  onSelectNotebookId,
}: ViewModeTabsProps) {
  const { strings } = useLanguage();

  return (
    <div className="flex items-center overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 p-1 rounded-2xl w-full sm:w-fit mb-6 sm:mb-8 bg-[var(--surface-2)] border border-[var(--border-soft)] select-none">
      <button
        type="button"
        onClick={() => onSelectViewMode('reader')}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[40px] sm:min-h-[44px] ${
          viewMode === 'reader'
            ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
        }`}
      >
        <BookOpen size={16} className="shrink-0" />
        <span>{strings.tabReader}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectViewMode('search')}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[40px] sm:min-h-[44px] ${
          viewMode === 'search'
            ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
        }`}
      >
        <Search size={16} className="shrink-0" />
        <span>{strings.tabSearch}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectViewMode('analytics')}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[40px] sm:min-h-[44px] ${
          viewMode === 'analytics'
            ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
        }`}
      >
        <Activity size={16} className="shrink-0" />
        <span>{strings.tabAnalytics}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectViewMode('compare')}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[40px] sm:min-h-[44px] ${
          viewMode === 'compare'
            ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
        }`}
      >
        <GitCompare size={16} className="shrink-0" />
        <span>{strings.tabCompare}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectViewMode('original')}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[40px] sm:min-h-[44px] ${
          viewMode === 'original'
            ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
        }`}
      >
        <Languages size={16} className="shrink-0" />
        <span>{strings.tabOriginal}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onSelectViewMode('notebooks');
          onSelectNotebookId(null);
        }}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[40px] sm:min-h-[44px] ${
          viewMode === 'notebooks'
            ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
        }`}
      >
        <FileText size={16} className="shrink-0" />
        <span>{strings.tabNotebooks}</span>
      </button>
    </div>
  );
}
