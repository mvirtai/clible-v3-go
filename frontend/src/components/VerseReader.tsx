// src/components/VerseReader.tsx
import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { BibleResponse, Verse } from '../types/bible';
import { Search, Loader2, ArrowLeft, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveBookId, parseReferenceForDisplay } from '../utils/bookNames';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '../utils/markdownComponents';
import { NextFocusChips } from './NextFocusChips';
import { DeepDiveCard } from './DeepDiveCard';
import { GeminiUsage } from './GeminiUsage';
import type { AiTextResponse, NextFocusItem, GeminiUsageMetadata } from '../types/ai';
import { useLanguage } from '../context/LanguageContext';
import { getNextChapterRef, getPreviousChapterRef, getChapterCount, formatChapterRef } from '../utils/readerNavigation';
import { getBookGenre } from '../utils/bookGenre';



/**
 * Properties for {@link VerseReader}.
 */
export interface VerseReaderProps {
  /** The translation ID selected globally (e.g. "kjv" or "fin-1992"). */
  translation: string;
  /** Active reference being read or navigated to. */
  activeReference?: string;
  /** Active workspace (scope) identifier for persisting reading snapshots. */
  activeScopeId?: string;
  /** Callback fired after saving a reading view to the active workspace. */
  onWorkspaceUpdated?: () => void;
  /** Pre-loaded saved AI insight response payload. */
  loadedSavedInsight?: AiTextResponse | null;
  /** Pre-loaded saved AI deep-dive explanation payload. */
  loadedSavedDeepDive?: string | null;
}

const CURRENT_CHAPTER_MATCH = /^((?:\d[A-Z]{2}|[A-Z]{3}))\s+(\d+)/;

/**
 * Extracts the canonical book ID and integer chapter index from a Bible passage reference.
 *
 * @param reference - Reference string (e.g. "JHN 3:16" or "GEN 1").
 * @returns Object with book ID and chapter, or null if unparseable.
 */
const parseCurrentChapter = (reference: string): { bookId: string, chapter: number } | null => {
  const m = reference.trim().match(CURRENT_CHAPTER_MATCH);
  if (!m) return null;
  return { bookId: m[1], chapter: parseInt(m[2], 10) };
};

/**
 * Passage reader providing chapter pagination, poetry/prose verse rendering, and Gemini AI exegetical insight commentary.
 *
 * @param props - Component properties conforming to {@link VerseReaderProps}.
 * @returns Scripture reading pane.
 */
export const VerseReader: React.FC<VerseReaderProps> = ({
  translation,
  activeReference,
  activeScopeId,
  onWorkspaceUpdated,
  loadedSavedInsight,
  loadedSavedDeepDive
}) => {
  const [reference, setReference] = useState(activeReference || '');
  const [prevActiveReference, setPrevActiveReference] = useState('');
  const [data, setData] = useState<BibleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backReference, setBackReference] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // AI states
  const [aiInsight, setAiInsight] = useState<AiTextResponse | null>(() => loadedSavedInsight || null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [deepDiveText, setDeepDiveText] = useState<string | null>(() => loadedSavedDeepDive || null);
  const [deepDiveUsage, setDeepDiveUsage] = useState<GeminiUsageMetadata | null>(null);
  const [aiSaveStatus, setAiSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const { lang, strings } = useLanguage();

  const displayRef = data ? parseReferenceForDisplay(data.reference, lang) : null;

  const currentChapterInfo = data ? parseCurrentChapter(data.reference) : null;

  const nextChapterRef = currentChapterInfo
    ? getNextChapterRef(currentChapterInfo.bookId, currentChapterInfo.chapter)
    : null;

  const prevChapterRef = currentChapterInfo
    ? getPreviousChapterRef(currentChapterInfo.bookId, currentChapterInfo.chapter)
    : null;

  const totalChapters = currentChapterInfo
    ? getChapterCount(currentChapterInfo.bookId)
    : null;

  const genre = currentChapterInfo
    ? getBookGenre(currentChapterInfo.bookId)
    : null;

  if (activeReference && activeReference !== prevActiveReference) {
    setPrevActiveReference(activeReference);
    setReference(activeReference);
    setBackReference(null);
    if (!loadedSavedInsight) {
      setAiInsight(null);
      setDeepDiveText(null);
      setDeepDiveUsage(null);
    }
    const trimmed = activeReference.trim();
    if (trimmed && translation) {
      const normalized = trimmed.replace(
        /^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.?\s+[a-zA-ZÀ-ÿ]+)*)/,
        (match) => resolveBookId(match) ?? match,
      );
      apiService.getVerses(normalized, translation)
        .then(setData)
        .catch(() => setError(strings.errSearchFailed));
    }
  }

  // Sync saved insight during render
  const [prevSavedInsight, setPrevSavedInsight] = useState(loadedSavedInsight);
  if (loadedSavedInsight && loadedSavedInsight !== prevSavedInsight) {
    setPrevSavedInsight(loadedSavedInsight);
    setAiInsight(loadedSavedInsight);
  }

  // Sync saved deep dive during render
  const [prevSavedDeepDive, setPrevSavedDeepDive] = useState(loadedSavedDeepDive);
  if (loadedSavedDeepDive && loadedSavedDeepDive !== prevSavedDeepDive) {
    setPrevSavedDeepDive(loadedSavedDeepDive);
    setDeepDiveText(loadedSavedDeepDive);
    setDeepDiveUsage(null);
  }

  const fetchVerses = React.useCallback(async (ref: string) => {
    const trimmed = ref.trim();
    if (!trimmed || !translation) return;

    // Normalise book name → canonical DB id (e.g. "Joh." → "JHN")
    const normalized = trimmed.replace(
      /^((?:\d+[\s.]*)?[a-zA-ZÀ-ÿ]+(?:\.?\s+[a-zA-ZÀ-ÿ]+)*)/,
      (match) => resolveBookId(match) ?? match,
    );

    setLoading(true);
    setError(null);
    if (!loadedSavedInsight) {
      setAiInsight(null);
      setDeepDiveText(null);
      setDeepDiveUsage(null);
    }
    setAiError(null);
    try {
      const result = await apiService.getVerses(normalized, translation);
      setData(result);
    } catch {
      setError(strings.fetchVersesFailed);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [translation, loadedSavedInsight, strings.fetchVersesFailed]);

  const handleFetchInsight = async () => {
    if (!data || data.verses.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    setAiInsight(null);
    try {
      const text = data.verses.map(v => `${v.verse}. ${v.text}`).join('\n');
      const res = await apiService.getAiInsight(text);
      setAiInsight(res);
    } catch (err) {
      const errorObj = err as Error;
      if (errorObj.message && errorObj.message.includes('503')) {
        setAiError(strings.aiUnavailable);
      } else {
        setAiError(errorObj.message || strings.aiInsightFailed);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiInsight = async () => {
    if (!activeScopeId || !aiInsight || !data) return;
    setAiSaveStatus('saving');
    try {
      await apiService.saveAnalysis({
        scopeId: activeScopeId,
        name: `${strings.aiAnalysisTitle}: ${parseReferenceForDisplay(data.reference, lang)}`,
        reference: data.reference,
        analysisType: 'insight',
        translationId: translation,
        paramsJson: JSON.stringify({}),
        resultJson: JSON.stringify({
          insight: aiInsight,
          deepDive: deepDiveText
        })
      });
      setAiSaveStatus('success');
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated();
      }
      setTimeout(() => setAiSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to save AI Insight', err);
      setAiSaveStatus('error');
      setTimeout(() => setAiSaveStatus('idle'), 4000);
    }
  };

  const handleNextFocusPick = async (it: NextFocusItem) => {
    if (it.kind === 'word' || it.kind === 'theme') {
      setAiLoading(true);
      setAiError(null);
      try {
        const res = await apiService.getAiDeepDive(it.label, lang, { reference: data?.reference || reference });
        setDeepDiveText(res.text);
        setDeepDiveUsage(res.geminiUsageMetadata || null);
      } catch (err) {
        const errorObj = err as Error;
        setAiError(errorObj.message || strings.deepDiveFailed);
      } finally {
        setAiLoading(false);
      }
    } else {
      setReference(it.label);
      fetchVerses(it.label);
    }
  };

  const handleFetch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBackReference(null);
    fetchVerses(reference);
  };

  const handleVerseClick = (v: Verse) => {
    if (data) {
      setBackReference(data.reference);
    }
    const verseRef = `${v.bookName} ${v.chapter}:${v.verse}`;
    setReference(verseRef);
    fetchVerses(verseRef);
  };

  const handleBackClick = () => {
    if (backReference) {
      setReference(backReference);
      fetchVerses(backReference);
      setBackReference(null);
    }
  };

  const handleNextChapter = () => {
    if (!nextChapterRef) return;
    const ref = formatChapterRef(nextChapterRef);
    setReference(ref);
    fetchVerses(ref);
  };

  const handlePreviousChapter = () => {
    if (!prevChapterRef) return;
    const ref = formatChapterRef(prevChapterRef);
    setReference(ref);
    fetchVerses(ref);
  };


  return (
    <div className="rounded-3xl p-4 sm:p-8 space-y-4 sm:space-y-6" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {strings.readByReference}
      </h2>

      <form onSubmit={handleFetch} className="flex flex-col sm:flex-row gap-2.5 sm:gap-2">
        <input
        type="text"
        placeholder={strings.versePlaceholder}
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        className="flex-1 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm transition-all outline-none"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      />
      <button
        type="submit"
        disabled={loading || !reference.trim()}
        className="rounded-full px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 btn-tactile btn-accent disabled:opacity-40 w-full sm:w-auto"
        style={{ cursor: 'pointer' }}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        {strings.fetchButtonLabel}
      </button>
      </form>

      {error && (
        <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
      )}



      {data && (
        <div className="space-y-6">
          <div className="flex justify-between items-baseline pb-4"
            style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <div className="space-y-1 text-left">
              <h3 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                {displayRef?.mainLabel}
              </h3>
              {displayRef?.subLabel && (
                <div className="text-xs font-mono tracking-wider font-normal" style={{ color: 'var(--muted)' }}>
                  {displayRef.subLabel}
                </div>
              )}
            </div>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {data.translationName}
            </span>
          </div>

          {/* Kontekstinavigaatio */}
          {!data.reference.includes(':') && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePreviousChapter}
                disabled={!prevChapterRef}
                className="flex items-center gap-1.5 text-xs font-medium btn-tactile px-3 py-1.5 rounded-full border disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--muted)',
                  borderColor: 'var(--border-soft)',
                  background: 'var(--surface-2)',
                  cursor: prevChapterRef ? 'pointer' : 'default',
                }}
              >
                <ChevronLeft size={14} />
                {strings.previousChapterLabel}
              </button>

              {totalChapters !== null && currentChapterInfo && (
                <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                  {currentChapterInfo.chapter}/{totalChapters}
                </span>
              )}

              <button
                type="button"
                onClick={handleNextChapter}
                disabled={!nextChapterRef}
                className="flex items-center gap-1.5 text-xs font-medium btn-tactile px-3 py-1.5 rounded-full border disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--muted)',
                  borderColor: 'var(--border-soft)',
                  background: 'var(--surface-2)',
                  cursor: nextChapterRef ? 'pointer' : 'default',
                }}
              >
                {strings.nextChapterLabel}
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Save verse passage to workspace */}
          {activeScopeId && data.verses.length > 0 && (
            <div className="p-4 rounded-2xl border space-y-2 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{strings.saveReaderView}</p>
              {!showSaveForm ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(true)}
                    className="px-3 py-1 rounded-full text-xs font-medium btn-accent btn-tactile"
                  >
                    {strings.saveLabel}
                  </button>
                  {saveStatus === 'success' && (
                    <span className="text-xs font-semibold text-emerald-500 animate-pulse">{strings.saveSuccess}</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-xs font-semibold text-red-500">{strings.saveFail}</span>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                                      type="text"
                                      placeholder={strings.saveNamePlaceholder}
                                      value={saveName}
                                      onChange={e => setSaveName(e.target.value)}
                                      className="flex-1 rounded-lg px-3 py-1 text-xs outline-none border"
                                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                      disabled={saveStatus === 'saving'}
                                    />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!saveName.trim()) return;
                      setSaveStatus('saving');
                      try {
                        await apiService.saveSearch({
                          scopeId: activeScopeId,
                          name: saveName.trim(),
                          queryText: data.reference,
                          searchScope: 'reference',
                          scopeValue: '',
                          translationId: translation,
                          resultJson: JSON.stringify(data.verses)
                        });
                        setSaveName('');
                        setShowSaveForm(false);
                        setSaveStatus('success');
                        setTimeout(() => setSaveStatus('idle'), 3000);
                        onWorkspaceUpdated?.();
                      } catch (err) {
                        console.error('Failed to save reference search', err);
                        setSaveStatus('error');
                        setTimeout(() => setSaveStatus('idle'), 4000);
                      }
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold btn-accent btn-tactile"
                    disabled={saveStatus === 'saving'}
                  >
                    {saveStatus === 'saving' ? strings.savingLabel : strings.saveLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold btn-tactile"
                    style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                    disabled={saveStatus === 'saving'}
                  >
                    {strings.cancelLabel}
                  </button>
                </div>
              )}
            </div>
          )}

          {data.verses.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>{strings.noVersesFound}</p>
          ) : genre === 'poetry' ? (
            <div className="space-y-2 max-w-[65ch]">
              {data.verses.map((v, idx) => (
                <div
                  key={`${v.chapter}-${v.verse}-${idx}`}
                  className="flex gap-2 items-baseline rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--accent-bg)] cursor-pointer"
                  onClick={() => handleVerseClick(v)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
                      e.preventDefault();
                      handleVerseClick(v);
                    }
                  }}
                  aria-label={`${strings.verseLabel} ${v.verse}: ${v.text}`}
                >
                  <sup
                    className="font-sans text-[0.55em] font-semibold shrink-0"
                    style={{ color: 'var(--accent)' }}
                    aria-hidden={true}
                  >
                    {v.verse}
                  </sup>
                  <span className="text-xl leading-relaxed font-serif" style={{ color: 'var(--text-2)' }}>
                    {v.text}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xl leading-relaxed font-serif max-w-[65ch]" style={{ color: 'var(--text-2)' }}>
              {data.verses.map((v, idx) => (
                <span
                  key={`${v.chapter}-${v.verse}-${idx}`}
                  className="inline px-1 py-0.5 rounded-md transition-colors hover:bg-[var(--accent-bg)] cursor-pointer"
                  onClick={() => handleVerseClick(v)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
                      e.preventDefault();
                      handleVerseClick(v);
                    }
                  }}
                  aria-label={`${strings.verseLabel} ${v.verse}: ${v.text}`}
                >
                  <sup className="mx-0.5 align-super font-sans text-[0.55em] font-semibold" style={{ color: 'var(--accent)' }} aria-hidden={true}>
                    {v.verse}
                  </sup>
                  {v.text}
                  {idx < data.verses.length - 1 ? ' ' : null}
                </span>
              ))}
            </p>
          )}

          {backReference && (
            <div className="flex justify-start pt-6">
              <button
                type="button"
                onClick={handleBackClick}
                className="text-xs flex items-center gap-1.5 transition-colors hover:text-[var(--accent)] font-medium btn-tactile px-3.5 py-1.5 rounded-full border border-[var(--border-soft)] hover:border-[var(--accent-border)] bg-[var(--surface-2)]"
                style={{ color: 'var(--muted)', cursor: 'pointer' }}
              >
                <ArrowLeft size={12} />
                <span>{strings.backToBroaderText} ({backReference})</span>
              </button>
            </div>
          )}

          {/* Tekoäly-analyysi (AI Insights) */}
          <div className="pt-6 border-t border-[var(--border-soft)] space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--accent)]" />
                {strings.aiAnalysisTitle}
              </h3>
              {!aiInsight && !aiLoading && (
                <button
                  type="button"
                  onClick={handleFetchInsight}
                  className="rounded-full px-3 py-1 text-xs font-semibold btn-accent btn-tactile cursor-pointer"
                >
                  {strings.analyzePassage}
                </button>
              )}
            </div>

            {aiLoading && (
              <div className="flex items-center gap-2 text-sm text-[var(--muted)] py-4">
                <Loader2 size={16} className="animate-spin" />
                <span>{strings.aiReading}</span>
              </div>
            )}

            {aiError && (
                          <p className="text-xs text-red-500 font-semibold">{aiError}</p>
                        )}

            {aiInsight && (
                          <div className="space-y-4">
                            <div className="font-sans text-[var(--text-2)]">
                              <ReactMarkdown
                                components={markdownComponents({ invert: false, insightLayout: true })}
                                remarkPlugins={[remarkGfm]}
                              >
                                {aiInsight.text}
                              </ReactMarkdown>
                              <GeminiUsage usage={aiInsight.geminiUsageMetadata} />
                            </div>

                {activeScopeId && (
                  <div className="flex justify-end border-t border-[var(--border-soft)] pt-3 mt-4">
                    <button
                      type="button"
                      onClick={handleSaveAiInsight}
                      disabled={aiSaveStatus === 'saving'}
                      className="rounded-full px-4 py-1.5 text-xs font-semibold btn-accent btn-tactile cursor-pointer"
                    >
                      {aiSaveStatus === 'saving' && strings.savingLabel}
                                            {aiSaveStatus === 'success' && strings.saveSuccess}
                                            {aiSaveStatus === 'error' && strings.saveFail}
                                            {aiSaveStatus === 'idle' && `${strings.saveLabel} ${strings.tabAnalytics}` }
                    </button>
                  </div>
                )}

                <NextFocusChips
                  title={strings.nextFocusTitle}
                  items={aiInsight.nextFocus ?? []}
                  onPick={handleNextFocusPick}
                />

                {deepDiveText && (
                  <DeepDiveCard
                    title={strings.deepDiveToneTitle}
                    text={deepDiveText}
                    onClose={() => {
                      setDeepDiveText(null);
                      setDeepDiveUsage(null);
                    }}
                    geminiUsageMetadata={deepDiveUsage || undefined}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
