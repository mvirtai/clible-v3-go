import { useMemo, useState } from 'react';
import { BookOpenCheck, Download, Languages, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { InstalledTranslation } from '../../types/bible';
import type { OriginalStudyResult, StudyScope } from '../../types/originalStudy';
import { markdownComponents } from '../../utils/markdownComponents';
import { t } from '../../utils/i18n';
import { GeminiUsage } from '../layout/GeminiUsage';
import type { NextFocusItem, GeminiUsageMetadata } from '../../types/ai';
import { NextFocusChips } from '../search/NextFocusChips';
import { DeepDiveCard } from '../layout/DeepDiveCard';

const GREEK_PACK_ID = 'sblgnt';
const HEBREW_PACK_ID = 'heb-leningrad';
const MAX_TARGETS = 3;
const STUDY_SCOPES: StudyScope[] = ['verse', 'chapter', 'book'];

/**
 * Determines whether a given translation represents an original biblical language pack (Koine Greek or Biblical Hebrew).
 *
 * @param tr - Translation metadata to evaluate.
 * @returns True if translation is Greek or Hebrew source text.
 */
function isOriginalLanguage(tr: InstalledTranslation): boolean {
  const l = (tr.language ?? '').toLowerCase().trim();
  if (l === 'grc' || l === 'he' || l === 'hbo' || l.startsWith('heb')) return true;

  const id = (tr.id ?? '').toLowerCase().trim();
  if (id === GREEK_PACK_ID || id === 'greeksblgnt' || id === 'sblgnt') return true;
  if (id.startsWith('hebrew') || id.startsWith('heb-') || id.includes('leningrad')) return true;
  return false;
}

/**
 * Properties for {@link OriginalStudyView}.
 */
export interface OriginalStudyViewProps {
  /** Complete list of installed translations available on the server. */
  installedTranslations: InstalledTranslation[];
  /** Currently active translation identifier in the parent view. */
  activeTranslationId: string | null;
  /** Active UI display language for string localization. */
  uiLanguage: 'fi' | 'en';
  /** ID of language pack currently undergoing background download/linking. */
  installingTranslationId: string | null;
  /** Optional installation error alert message. */
  installError?: string | null;
  /** Optional installation success status message. */
  installSuccess?: string | null;
  /** Trigger translation pack installation. */
  onInstallTranslation: (id: string) => void;
  /** Analytical study result containing parsed interlinear breakdown and AI insights. */
  result: OriginalStudyResult | null;
  /** True while the AI original language analysis query is in flight. */
  loading: boolean;
  /** Error message if analysis failed. */
  error: string | null;
  /** Initial or default Bible reference to populate the input field. */
  defaultReference: string | null;
  /** Callback fired to execute the original language comparative study. */
  onStudy: (
    reference: string,
    originalId: string,
    translationIds: string[],
    scope: StudyScope,
  ) => void;
  /** Optional callback when user picks an AI next-step exploration topic. */
  onNextFocusPick?: (item: NextFocusItem) => void;
  /** Active deep-dive morphological/theological explanation markdown text. */
  deepDiveText?: string | null;
  /** Usage metrics for the deep dive request. */
  deepDiveUsage?: GeminiUsageMetadata | null;
  /** Callback fired when user closes the deep dive card. */
  onDeepDiveClose?: () => void;
  /** Optional export handler for saving markdown / notes. */
  onExport?: () => void;
  /** Whether the view is rendered in standalone full-page mode. */
  standalone?: boolean;
  /** Active workspace (scope) ID for saving research snapshots. */
  activeScopeId?: string;
  /** Callback to refresh workspace tree after saving analysis. */
  onWorkspaceUpdated?: () => void;
}

/**
 * Comprehensive Greek & Hebrew original language analysis view.
 *
 * Provides source text alignment, multi-translation comparison, interlinear morphology, and AI theological nuance analysis.
 *
 * @param props - Component properties conforming to {@link OriginalStudyViewProps}.
 * @returns Original language study view container.
 */
export function OriginalStudyView({
  installedTranslations,
  activeTranslationId,
  uiLanguage,
  installingTranslationId,
  installError = null,
  installSuccess = null,
  onInstallTranslation,
  result,
  loading,
  error,
  defaultReference,
  onStudy,
  onNextFocusPick,
  deepDiveText,
  deepDiveUsage,
  onDeepDiveClose,
  onExport,
  standalone = false,
  activeScopeId,
  onWorkspaceUpdated,
}: OriginalStudyViewProps) {
  const strings = t(uiLanguage);

  const [originalSaveStatus, setOriginalSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSaveOriginalStudy = async () => {
    if (!activeScopeId || !result || !reference) return;
    setOriginalSaveStatus('saving');
    try {
      const { apiService } = await import('../../services/api');
      await apiService.saveAnalysis({
        scopeId: activeScopeId,
        name: `${strings.originalStudyTitle}: ${reference}`,
        reference: reference,
        analysisType: 'original',
        translationId: originalId,
        paramsJson: JSON.stringify({
          originalId,
          targetIds,
          scope
        }),
        resultJson: JSON.stringify({
          result,
          deepDive: deepDiveText
        })
      });
      setOriginalSaveStatus('success');
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated();
      }
      setTimeout(() => setOriginalSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to save original language study', err);
      setOriginalSaveStatus('error');
      setTimeout(() => setOriginalSaveStatus('idle'), 4000);
    }
  };

  const originalOptions = useMemo(
    () => installedTranslations.filter(isOriginalLanguage).sort((a, b) => a.id.localeCompare(b.id)),
    [installedTranslations],
  );
  const targetOptions = useMemo(
    () =>
      installedTranslations
        .filter((tr) => !isOriginalLanguage(tr))
        .sort((a, b) => a.id.localeCompare(b.id)),
    [installedTranslations],
  );

  const greekInstalled = installedTranslations.some((tr) => tr.id === GREEK_PACK_ID || tr.id === 'greeksblgnt' || tr.language === 'grc');
  const hebrewInstalled = installedTranslations.some((tr) => tr.id === HEBREW_PACK_ID || tr.id.includes('leningrad') || tr.language === 'he');

  const [reference, setReference] = useState(() => defaultReference?.trim() ?? '');
  const [prevDefaultReference, setPrevDefaultReference] = useState(defaultReference);
  const [scope, setScope] = useState<StudyScope>('verse');
  const [originalId, setOriginalId] = useState<string>(() => originalOptions[0]?.id ?? '');
  const [targetIds, setTargetIds] = useState<string[]>(() => {
    if (activeTranslationId) {
      const activeMeta = installedTranslations.find((tr) => tr.id === activeTranslationId);
      if (activeMeta && !isOriginalLanguage(activeMeta)) {
        return [activeTranslationId];
      }
    }
    return targetOptions[0] ? [targetOptions[0].id] : [];
  });

  // Sync reference prop change during render to avoid cascading renders warning
  if (defaultReference !== prevDefaultReference) {
    setReference(defaultReference?.trim() ?? '');
    setPrevDefaultReference(defaultReference);
  }

  // Adjust originalId during render if the catalog changes
  const validOriginals = originalOptions.map(t => t.id);
  let adjustedOriginalId = originalId;
  if (originalOptions.length === 0) {
    adjustedOriginalId = '';
  } else if (!validOriginals.includes(originalId)) {
    adjustedOriginalId = originalOptions[0].id;
  }
  if (adjustedOriginalId !== originalId) {
    setOriginalId(adjustedOriginalId);
  }

  // Adjust targetIds during render if available targets change
  const allowedTargets = new Set(targetOptions.map(tr => tr.id));
  const filteredTargetIds = targetIds.filter(id => allowedTargets.has(id));
  let adjustedTargetIds = filteredTargetIds;
  if (filteredTargetIds.length === 0) {
    if (activeTranslationId && allowedTargets.has(activeTranslationId) && activeTranslationId !== originalId) {
      adjustedTargetIds = [activeTranslationId];
    } else if (targetOptions[0]?.id) {
      adjustedTargetIds = [targetOptions[0].id];
    }
  }
  if (JSON.stringify(adjustedTargetIds) !== JSON.stringify(targetIds)) {
    setTargetIds(adjustedTargetIds);
  }

  const noOriginalsInstalled = originalOptions.length === 0;
  const targetsAvailable = targetOptions.length > 0;
  const canRun =
    !loading &&
    !!reference.trim() &&
    !!originalId &&
    targetIds.length > 0 &&
    targetIds.length <= MAX_TARGETS;

  const scopeLabels: Record<StudyScope, string> = {
    verse: strings.originalVerseScope,
    chapter: strings.originalChapterScope,
    book: strings.originalBookScope,
  };

  const scopeReferenceHint: Record<StudyScope, string> = {
    verse: strings.originalVerseScopeHint,
    chapter: strings.originalChapterScopeHint,
    book: strings.originalBookScopeHint,
  };

  const toggleTarget = (id: string) => {
    setTargetIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_TARGETS) return prev;
      return [...prev, id];
    });
  };

  const renderSetup = () => (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Languages size={20} className="text-[var(--accent)]" />
        <h3 className="text-base font-semibold">{strings.originalSetupTitle}</h3>
      </div>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{strings.originalSetupHint}</p>
      {installError && (
        <p className="text-sm text-red-600" role="alert">
          {installError}
        </p>
      )}
      {installSuccess && (
        <p className="text-sm text-emerald-700" role="status">
          {installSuccess}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={greekInstalled || installingTranslationId === GREEK_PACK_ID}
          onClick={() => onInstallTranslation(GREEK_PACK_ID)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)]/80 disabled:opacity-50 disabled:cursor-not-allowed btn-tactile cursor-pointer"
        >
          {installingTranslationId === GREEK_PACK_ID ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpenCheck size={16} />
          )}
          {greekInstalled ? `${strings.originalAlreadyInstalled}: ${GREEK_PACK_ID}` : strings.originalInstallGreek}
        </button>
        <button
          type="button"
          disabled={hebrewInstalled || installingTranslationId === HEBREW_PACK_ID}
          onClick={() => onInstallTranslation(HEBREW_PACK_ID)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)]/80 disabled:opacity-50 disabled:cursor-not-allowed btn-tactile cursor-pointer"
        >
          {installingTranslationId === HEBREW_PACK_ID ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpenCheck size={16} />
          )}
          {hebrewInstalled ? `${strings.originalAlreadyInstalled}: ${HEBREW_PACK_ID}` : strings.originalInstallHebrew}
        </button>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-5">
      <div className="space-y-1">
        <div className="flex flex-wrap gap-2 pb-2" role="tablist" aria-label={strings.originalScopeLabel}>
          {STUDY_SCOPES.map((nextScope) => {
            const active = scope === nextScope;
            return (
              <button
                key={nextScope}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setScope(nextScope)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer btn-tactile ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text)]'
                    : 'border-[var(--border-soft)] text-[var(--muted)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {scopeLabels[nextScope]}
              </button>
            );
          })}
        </div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {strings.originalReferenceLabel}
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={strings.originalReferencePlaceholder}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm"
        />
        <p className="text-xs text-[var(--muted)]">{scopeReferenceHint[scope]}</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="original-lang-select" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {strings.originalSelectOriginal}
        </label>
        <select
          id="original-lang-select"
          value={originalId}
          onChange={(e) => setOriginalId(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm uppercase cursor-pointer"
          disabled={originalOptions.length === 0}
        >
          {originalOptions.map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.id} · {tr.name} ({tr.language})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {strings.originalSelectTranslations}
        </label>
        {targetsAvailable ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {targetOptions.map((tr) => {
              const checked = targetIds.includes(tr.id);
              const disabled = !checked && targetIds.length >= MAX_TARGETS;
              return (
                <label
                  key={tr.id}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    checked
                      ? 'border-[var(--accent)] bg-[var(--surface-2)]'
                      : 'border-[var(--border)] hover:bg-[var(--surface-2)]'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleTarget(tr.id)}
                  />
                  <span className="font-mono uppercase text-xs">{tr.id}</span>
                  <span className="text-[var(--muted)] truncate">{tr.name}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {strings.originalNeedTranslation}
          </p>
        )}
      </div>

      {targetsAvailable && targetIds.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">{strings.originalNeedTargets}</p>
      ) : null}

      <div>
        <button
          type="button"
          disabled={!canRun}
          onClick={() => onStudy(reference.trim(), originalId, targetIds, scope)}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--text)] hover:opacity-90 px-6 py-2.5 text-sm font-medium text-[var(--surface)] disabled:opacity-40 btn-tactile cursor-pointer"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={18} />}
          {strings.originalRunButton}
        </button>
      </div>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    // A structured list of verses from comparative sources
    return (
      <div className="space-y-6">
        {result.text.trim() ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--accent)]" />
              {strings.originalAnalysisHeading}
            </h3>
            <div className="font-sans text-[var(--text-2)]">
              <ReactMarkdown
                components={markdownComponents({ invert: false, insightLayout: true })}
                remarkPlugins={[remarkGfm]}
              >
                {result.text}
              </ReactMarkdown>
              <GeminiUsage usage={result.geminiUsageMetadata} />
            </div>
            {activeScopeId && (
              <div className="flex justify-end border-t border-[var(--border-soft)] pt-3 mt-4">
                <button
                  type="button"
                  onClick={handleSaveOriginalStudy}
                  disabled={originalSaveStatus === 'saving'}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold btn-accent btn-tactile cursor-pointer"
                >
                  {originalSaveStatus === 'saving' && strings.savingLabel}
                                    {originalSaveStatus === 'success' && strings.saveSuccess}
                                    {originalSaveStatus === 'error' && strings.saveFail}
                                    {originalSaveStatus === 'idle' && strings.originalSaveToWorkspace}
                </button>
              </div>
            )}
            {onNextFocusPick ? (
              <NextFocusChips
                title={strings.nextFocusTitle}
                items={result.nextFocus ?? []}
                onPick={onNextFocusPick}
              />
            ) : null}
            {deepDiveText && onDeepDiveClose ? (
              <DeepDiveCard
                title={strings.deepDiveToneTitle}
                text={deepDiveText}
                onClose={onDeepDiveClose}
                geminiUsageMetadata={deepDiveUsage || undefined}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={standalone ? 'space-y-8' : 'space-y-8 mt-8'}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[var(--text)]">
          <Languages size={22} className="text-[var(--accent)]" />
          <h2 className="text-lg font-semibold">{strings.originalStudyTitle}</h2>
        </div>
        {onExport && result ? (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] hover:opacity-90 rounded-full text-sm font-medium transition-colors border border-[var(--border)] cursor-pointer"
          >
            <Download size={16} /> {strings.compareExport}
          </button>
        ) : null}
      </div>

      {noOriginalsInstalled ? renderSetup() : renderForm()}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--muted)] text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {strings.originalLoading}
        </div>
      ) : null}

      {!loading && !result && !error ? (
        <p className="text-sm text-[var(--muted)]">{strings.originalNoResult}</p>
      ) : null}

      {!loading && result ? renderResult() : null}
    </div>
  );
}
