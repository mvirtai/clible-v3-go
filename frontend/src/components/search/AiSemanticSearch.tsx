import { useState, useActionState, startTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '../../utils/markdownComponents';
import { apiService } from '../../services/api';
import type { AiSearchResponse, AiVerseMatch, SemanticSearchSnapshot } from '../../types/aiSearch';
import { VerseCurationHeader, type CurationFilter } from './VerseCurationHeader';
import { CuratedVerseCard } from './CuratedVerseCard';
import { CurationUnreviewedBanner } from './CurationPromptModal';
import {
  Sparkles,
  Search,
  BookOpen,
  Loader2,
  ArrowRight,
  Compass,
  AlertCircle,
  SearchX,
  Bookmark,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface AiSemanticSearchProps {
  /** Active Bible translation code (e.g. 'fin-1992' or 'web') */
  translation: string;
  /** Callback triggered when user clicks a verse or identified passage to navigate to reader */
  onSelectVerse?: (reference: string) => void;

  activeScopeId?: string;
  /** Callback for when workspace is updated */
  onWorkspaceUpdated?: () => void;
  /**
   * Optional restored search. Ignored when its `translationId` differs from
   * the active `translation`, because the verse text is translation-specific.
   */
  loadedData?: SemanticSearchSnapshot | null;
  /**
   * Fired after a successful search so the parent can retain the result.
   * The component is unmounted when navigating to the reader, so the parent
   * owns persistence and feeds it back through `loadedData` on remount.
   */
  onSearchCompleted?: (result: SemanticSearchSnapshot) => void;
}

interface SaveActionState {
  status: 'idle' | 'success' | 'error';
  errorMessage: string | null;
}

interface SemanticSearchState {
  data: AiSearchResponse | null;
  /** Translation that produced `data`; null when there is no result. */
  translationId: string | null;
  error: string | null;
}

/**
 * Modern React 19.2 semantic AI search component powered by useActionState.
 */
export function AiSemanticSearch({
  translation,
  onSelectVerse,
  activeScopeId,
  onWorkspaceUpdated,
  loadedData,
  onSearchCompleted,
}: AiSemanticSearchProps) {
  // Pure derived value: a retained result is only valid for its own translation.
  const restored =
    loadedData && loadedData.translationId === translation ? loadedData : null;
  const [queryInput, setQueryInput] = useState(restored?.query ?? '');
  const { strings, lang, aiLang } = useLanguage();

  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(() => new Set());
  const [curationFilter, setCurationFilter] = useState<CurationFilter>('all');
  const [showUnreviewedPrompt, setShowUnreviewedPrompt] = useState(false);
  const [committedVerses, setCommittedVerses] = useState<AiVerseMatch[] | null>(null);

  // Pure derived state: localized search suggestions
  const examples =
    lang === 'fi'
      ? [
          'Jumalan taisteluvarustus',
          'Usko ilman tekoja on kuollut',
          'Jeesus tyynnyttää myrskyn',
          'Vuorisaarna ja autuaaksijulistukset',
        ]
      : [
          'Armor of God',
          'Faith without works is dead',
          'Jesus calming the storm',
          'Sermon on the Mount beatitudes',
        ];

  // React 19 useActionState replaces legacy loading/error/data useState trios
  const [searchState, searchAction, isPending] = useActionState<
    SemanticSearchState,
    FormData
  >(async (_prevState, formData) => {
    const q = ((formData.get('query') as string) || '').trim();
    if (!q || !translation) {
      return { data: null, translationId: null, error: null };
    }
    try {
      const targetLang = aiLang === 'auto' ? lang : (aiLang as 'fi' | 'en');
      const resp = await apiService.executeAiSearch(q, translation, targetLang);
      onSearchCompleted?.({ query: q, translationId: translation, data: resp });
      setAcceptedIds(new Set());
      setRejectedIds(new Set());
      setCurationFilter('all');
      setCommittedVerses(null);
      setShowUnreviewedPrompt(false);
      return { data: resp, translationId: translation, error: null };
    } catch (err: unknown) {
      console.error('Semantic search failed:', err);
      return { data: null, translationId: null, error: strings.semanticSearchError };
    }
  }, {
    data: restored?.data ?? null,
    translationId: restored?.translationId ?? null,
    error: null,
  });

  const [saveState, saveAction, isSaving] = useActionState(
    async (_prevState: SaveActionState, formData: FormData): Promise<SaveActionState> => {
      const title = (formData.get('title') as string)?.trim();
      if (!title || !activeScopeId || !searchState.data || !searchState.translationId) {
        return { status: 'error', errorMessage: 'Missing required data' };
      }
      try {
        const curatedPayload: AiSearchResponse = {
          ...searchState.data,
          search: searchState.data.search
            ? {
                ...searchState.data.search,
                verses:
                  acceptedIds.size > 0
                    ? searchState.data.search.verses.filter((v) => acceptedIds.has(v.id))
                    : searchState.data.search.verses,
              }
            : searchState.data.search,
        };

        // Persist the translation that produced the result, not the current selector value.
        // If restored from an existing saved search, update that search in-place by passing id.
        await apiService.saveSearch({
          id: restored?.savedSearchId,
          scopeId: activeScopeId,
          name: title,
          queryText: queryInput,
          searchScope: 'semantic',
          scopeValue: searchState.translationId,
          translationId: searchState.translationId,
          resultJson: JSON.stringify(curatedPayload),
        });
        onWorkspaceUpdated?.();
        return { status: 'success', errorMessage: null };
      } catch (err) {
        return { status: 'error', errorMessage: String(err) };
      }
    },
    { status: 'idle', errorMessage: null }
  );

  // Trigger search from inspiration chips using React 19 startTransition
  const handleSelectExample = (exampleText: string) => {
    setQueryInput(exampleText);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('query', exampleText);
      await searchAction(fd);
    });
  };

  // Curatation handlers
  const handleAcceptVerse = (id: string) => {
    setAcceptedIds(prev => new Set(prev).add(id))
    setRejectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleRejectVerse = (id: string) => {
    setRejectedIds(prev => new Set(prev).add(id));
    setAcceptedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleRestoreVerse = (id: string) => {
    setAcceptedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setRejectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleAcceptAll = (allVerses: { id: string }[]) => {
    setAcceptedIds(new Set(allVerses.map(v => v.id)));
    setRejectedIds(new Set());
  };

  const handleResetCuration = () => {
    setAcceptedIds(new Set());
    setRejectedIds(new Set());
  };

  // Derived effective data: use committed verses if selection was finalized
  const rawData = searchState.data;
  const data = rawData
    ? {
        ...rawData,
        search: rawData.search
          ? {
              ...rawData.search,
              verses: committedVerses !== null ? committedVerses : rawData.search.verses,
            }
          : rawData.search,
      }
    : null;
  const error = searchState.error;

  const handleCommitCuration = (forceRemaining?: 'accept' | 'reject') => {
    if (!data?.search?.verses) return;
    const currentVerses = data.search.verses;

    const finalAccepted = new Set(acceptedIds);
    const finalRejected = new Set(rejectedIds);

    if (forceRemaining === 'accept') {
      currentVerses.forEach((v) => {
        if (!finalRejected.has(v.id)) finalAccepted.add(v.id);
      });
    } else if (forceRemaining === 'reject') {
      currentVerses.forEach((v) => {
        if (!finalAccepted.has(v.id)) finalRejected.add(v.id);
      });
    } else {
      // Check if unreviewed verses exist
      const hasUnreviewed = currentVerses.some(
        (v) => !finalAccepted.has(v.id) && !finalRejected.has(v.id)
      );
      if (hasUnreviewed) {
        setShowUnreviewedPrompt(true);
        return;
      }
    }

    // Keep only accepted verses permanently
    const kept = currentVerses.filter((v) => finalAccepted.has(v.id));
    setCommittedVerses(kept);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());
    setCurationFilter('all');
    setShowUnreviewedPrompt(false);
  };


  return (
    <div className="space-y-6">
      {/* Search Input Card with native form action */}
      <form
        action={searchAction}
        className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              name="query"
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-[var(--surface-2)] border border-[var(--border-soft)] text-[var(--text)] focus:outline-hidden focus:border-[var(--accent)] transition-colors"
            />
            <Sparkles className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--accent)]" />
          </div>

          <button
            type="submit"
            disabled={isPending || !queryInput.trim()}
            className="px-5 py-3 sm:py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] shrink-0"
          >
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Search size={15} />
            )}
            <span>
              {isPending
                ? strings.semanticSearching
                : strings.semanticSearchBtn}
            </span>
          </button>
        </div>

        {/* Query Inspiration Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[var(--muted)]">
            {strings.semanticSearchExamplesLabel}
          </span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleSelectExample(ex)}
              className="text-xs px-2.5 py-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {data && (
        <div className="space-y-6">
          {/* Save / Update to workspace card */}
          {activeScopeId && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <Bookmark size={13} className="text-[var(--accent)]" />
                  <span>
                    {restored?.savedSearchId
                      ? strings.updateSemanticSearch
                      : strings.saveSemanticSearch}
                  </span>
                </div>
                {saveState.status === 'success' && (
                  <p className="text-xs text-emerald-500 font-medium animate-pulse">
                    {restored?.savedSearchId
                      ? strings.updateSemanticSearchSuccess
                      : strings.saveSemanticSearchSuccess}
                  </p>
                )}
                {saveState.status === 'error' && (
                  <p className="text-xs text-red-500 font-medium">
                    {saveState.errorMessage || 'Failed to save search'}
                  </p>
                )}
              </div>

              <form action={saveAction} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  name="title"
                  type="text"
                  required
                  placeholder={strings.saveSemanticSearchPlaceholder}
                  defaultValue={restored?.savedName ?? queryInput}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text)] focus:outline-hidden focus:border-[var(--accent)] transition-colors min-w-[200px]"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {isSaving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Bookmark size={12} />
                  )}
                  <span>
                    {isSaving
                      ? (restored?.savedSearchId ? strings.updatingSemanticSearch : strings.savingSemanticSearch)
                      : (restored?.savedSearchId ? strings.updateSemanticSearchButton : strings.saveSemanticSearchButton)}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* 1. Resolved Canonical Reference (Highlighted Hero Card) */}
          {data.plan?.resolvedReference && (
            <div className="p-5 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  <Compass size={14} />
                  <span>{strings.semanticResolvedPassageTitle}</span>
                </div>
                <div className="text-xl font-bold text-[var(--text)]">
                  {data.plan.resolvedReference}
                </div>
              </div>

              {onSelectVerse && (
                <button
                  type="button"
                  onClick={() => onSelectVerse(data.plan.resolvedReference!)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-xs"
                >
                  <BookOpen size={14} />
                  <span>{strings.semanticOpenInReader}</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}

          {/* 2. Theological Summary Synthesis */}
          {data.summary?.text && (
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                <Sparkles size={13} className="text-[var(--accent)]" />
                <span>{strings.semanticSummaryTitle}</span>
              </div>
              <div className="prose dark:prose-invert text-sm leading-relaxed text-[var(--text)]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents({ invert: false, insightLayout: true })}
                >
                  {data.summary.text}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* 3. AI Search Strategy / Plan Rationale */}
          {data.plan && (
            <div className="p-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] text-xs space-y-2">
              <span className="font-semibold text-[var(--text)]">
                {strings.semanticPlanTitle}:{' '}
              </span>
              <span className="text-[var(--muted)]">{data.plan.rationale}</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[var(--muted)]">Keywords:</span>
                {(data.plan.terms || []).map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border-soft)] font-mono text-[11px] text-[var(--text)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 4. Scripture Verse Hits */}
          {(() => {
            const allVerses = data.search?.verses || [];
            const displayedVerses = allVerses.filter((v) => {
              if (curationFilter === 'accepted') return acceptedIds.has(v.id);
              if (curationFilter === 'rejected') return rejectedIds.has(v.id);
              return true;
            });
            const acceptedCount = allVerses.filter((v) => acceptedIds.has(v.id)).length;
            const rejectedCount = allVerses.filter((v) => rejectedIds.has(v.id)).length;

            return (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-[var(--text)]">
                    {strings.semanticHitsTitle} ({allVerses.length})
                  </h3>
                </div>

                {allVerses.length === 0 ? (
                  <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[var(--text)] space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                      <SearchX className="w-4 h-4 shrink-0" />
                      <span>{strings.semanticNoHitsFound}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] leading-relaxed pl-6">
                      {strings.semanticNoHitsHint}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <VerseCurationHeader
                      strings={strings}
                      filter={curationFilter}
                      onFilterChange={setCurationFilter}
                      totalCount={allVerses.length}
                      acceptedCount={acceptedCount}
                      rejectedCount={rejectedCount}
                      onAcceptAll={() => handleAcceptAll(allVerses)}
                      onResetCuration={handleResetCuration}
                      onCommitSelection={() => handleCommitCuration()}
                    />

                    {showUnreviewedPrompt && (
                      <CurationUnreviewedBanner
                        strings={strings}
                        unreviewedCount={allVerses.length - acceptedCount - rejectedCount}
                        onAcceptRemaining={() => handleCommitCuration('accept')}
                        onRejectRemaining={() => handleCommitCuration('reject')}
                        onCancel={() => setShowUnreviewedPrompt(false)}
                      />
                    )}

                    {displayedVerses.length === 0 ? (
                      <div className="p-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)]/40 text-center text-xs text-[var(--muted)]">
                        {curationFilter === 'accepted'
                          ? strings.curateAcceptedCount(0)
                          : strings.curateRejectedCount(0)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5">
                        {displayedVerses.map((v) => {
                          const status = acceptedIds.has(v.id)
                            ? 'accepted'
                            : rejectedIds.has(v.id)
                              ? 'rejected'
                              : 'unreviewed';

                          return (
                            <CuratedVerseCard
                              key={v.id}
                              verse={v}
                              status={status}
                              strings={strings}
                              onAccept={handleAcceptVerse}
                              onReject={handleRejectVerse}
                              onRestore={handleRestoreVerse}
                              onSelectVerse={onSelectVerse}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
