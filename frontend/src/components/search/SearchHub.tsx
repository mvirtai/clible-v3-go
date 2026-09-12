import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { VerseSearch } from './VerseSearch';
import type { SearchVerse } from '@/types/search';

export type SearchSubModule = 'lexical' | 'semantic';

export interface SearchHubProps {
    /** Active translation identifier */
    translation: string;
    /** Callback fired when a verse is selected to navigate from reader */
    onSelectVerse?: (reference: string) => void;
    /** Active workspace scope ID */
    activeScopeId?: string;
    /** Callback to notify parent of workspace changes */
    onWorkspaceUpdated?: () => void;
    /** Restored search state from workspace */
    loadedSavedResults?: {
        query: string;
        translation: string;
        searchScope: 'all' | 'ot' | 'nt' | 'book';
        scopeValue: string;
        results: SearchVerse[];
    } | null;
    /** Clear external loaded state */
    onClearLoadedResults?: () => void;
}

/**
 * Bible Search Hub uniting traditional lexical search and AI semantic search.
 */
export function SearchHub({
    translation,
    onSelectVerse,
    activeScopeId,
    onWorkspaceUpdated,
    loadedSavedResults,
    onClearLoadedResults,
}: SearchHubProps) {
    const [activeTab, setActiveTab] = useState<SearchSubModule>('lexical');
    const { strings } = useLanguage();

    return (
         <div className="space-y-6">
      {/* Header and Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
            {strings.searchHubTitle}
          </h2>
          <p className="text-xs text-[var(--muted)]">
            {strings.searchHubSubtitle}
          </p>
        </div>

        {/* Sub-mode selector pills */}
        <div className="inline-flex p-1 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('lexical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'lexical'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Search size={14} />
            <span>{strings.searchModeLexical}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('semantic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'semantic'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Sparkles size={14} />
            <span>{strings.searchModeSemantic}</span>
          </button>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'lexical' && (
        <VerseSearch
          translation={translation}
          onSelectVerse={onSelectVerse}
          activeScopeId={activeScopeId}
          onWorkspaceUpdated={onWorkspaceUpdated}
          loadedSavedResults={loadedSavedResults}
          onClearLoadedResults={onClearLoadedResults}
        />
      )}

      {activeTab === 'semantic' && (
        <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--muted)]">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-[var(--accent)] animate-pulse" />
          <p className="font-medium text-[var(--text)]">{strings.searchModeSemantic}</p>
          <p className="text-xs mt-1">Ready for PR #085 integration.</p>
        </div>
      )}
    </div>
    )

}
