// src/components/VerseReader.tsx
import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { BibleResponse, Verse } from '../types/bible';
import { Search, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { resolveBookId, parseReferenceForDisplay, type UILanguage } from '../utils/bookNames';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '../utils/markdownComponents';
import { NextFocusChips } from './NextFocusChips';
import { DeepDiveCard } from './DeepDiveCard';
import { GeminiUsage } from './GeminiUsage';
import type { AiTextResponse, NextFocusItem, GeminiUsageMetadata } from '../types/ai';

interface Props {
  translation: string;
  activeReference?: string;
  activeScopeId?: string;
  onWorkspaceUpdated?: () => void;
  loadedSavedInsight?: AiTextResponse | null;
  loadedSavedDeepDive?: string | null;
}

export const VerseReader: React.FC<Props> = ({
  translation,
  activeReference,
  activeScopeId,
  onWorkspaceUpdated,
  loadedSavedInsight,
  loadedSavedDeepDive
}) => {
  const [reference, setReference] = useState('');
  const [prevActiveReference, setPrevActiveReference] = useState(activeReference);
  const [data, setData] = useState<BibleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backReference, setBackReference] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // AI states
  const [aiInsight, setAiInsight] = useState<AiTextResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [deepDiveText, setDeepDiveText] = useState<string | null>(null);
  const [deepDiveUsage, setDeepDiveUsage] = useState<GeminiUsageMetadata | null>(null);
  const [aiSaveStatus, setAiSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const isFinnish = translation.toLowerCase().startsWith('fi') || translation.toLowerCase().includes('fin');
  const lang: UILanguage = isFinnish ? 'fi' : 'en';

  const displayRef = data ? parseReferenceForDisplay(data.reference, lang) : null;

  // Sync state during render instead of in useEffect to avoid cascading renders warning
  const [prevLoadedSavedInsight, setPrevLoadedSavedInsight] = useState<AiTextResponse | null>(null);
  const normalizedSavedInsight = loadedSavedInsight || null;
  if (normalizedSavedInsight !== prevLoadedSavedInsight) {
    setAiInsight(normalizedSavedInsight);
    setPrevLoadedSavedInsight(normalizedSavedInsight);
  }

  const [prevLoadedSavedDeepDive, setPrevLoadedSavedDeepDive] = useState<string | null>(null);
  const normalizedSavedDeepDive = loadedSavedDeepDive || null;
  if (normalizedSavedDeepDive !== prevLoadedSavedDeepDive) {
    setDeepDiveText(normalizedSavedDeepDive);
    setDeepDiveUsage(null);
    setPrevLoadedSavedDeepDive(normalizedSavedDeepDive);
  }

  if (activeReference !== prevActiveReference) {
    setReference(activeReference || '');
    setBackReference(null);
    setPrevActiveReference(activeReference);
    if (!loadedSavedInsight) {
      setAiInsight(null);
      setDeepDiveText(null);
      setDeepDiveUsage(null);
    }
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
      setError('Failed to fetch verses. Check the reference (e.g. John 3:16, Joh. 3:16, 1 Moos 1:1).');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [translation, loadedSavedInsight]);

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
        setAiError(lang === 'fi' ? 'Tekoäly ei ole käytettävissä. Aseta GEMINI_API_KEY.' : 'AI not available. Set GEMINI_API_KEY.');
      } else {
        setAiError(errorObj.message || 'Failed to fetch AI insights.');
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
        name: `AI-analyysi: ${parseReferenceForDisplay(data.reference, lang)}`,
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
        setAiError(errorObj.message || 'Deep dive failed.');
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

  // React to activeReference changes (e.g. clicked from search results)
  React.useEffect(() => {
    if (activeReference) {
      Promise.resolve().then(() => {
        fetchVerses(activeReference);
      });
    }
  }, [activeReference, fetchVerses]);

  return (
    <div className="rounded-3xl p-8 space-y-6" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        Read by Reference
      </h2>

      <form onSubmit={handleFetch} className="flex gap-2">
        <input
          type="text"
          placeholder="John 3:16 · Joh. 3:16 · 1 Moos 1:1"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="flex-1 rounded-full px-5 py-2.5 text-sm transition-all outline-none"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
        <button
          type="submit"
          disabled={loading || !reference.trim()}
          className="rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2 btn-tactile btn-accent disabled:opacity-40"
          style={{ cursor: 'pointer' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Fetch
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

          {/* Save verse passage to workspace */}
          {activeScopeId && data.verses.length > 0 && (
            <div className="p-4 rounded-2xl border space-y-2 text-left" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Tallenna tämä lukunäkymä työtilaan</p>
              {!showSaveForm ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(true)}
                    className="px-3 py-1 rounded-full text-xs font-medium btn-accent btn-tactile"
                  >
                    Tallenna jaehaku
                  </button>
                  {saveStatus === 'success' && (
                    <span className="text-xs font-semibold text-emerald-500 animate-pulse">✓ Tallennettu työtilaan!</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-xs font-semibold text-red-500">✗ Tallennus epäonnistui.</span>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nimi (esim. Vuorisaarna)..."
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
                    {saveStatus === 'saving' ? 'Tallennetaan...' : 'Tallenna'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold btn-tactile"
                    style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                    disabled={saveStatus === 'saving'}
                  >
                    Peruuta
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-xl leading-relaxed font-serif" style={{ color: 'var(--text-2)' }}>
            {data.verses.length > 0 ? (
              data.verses.map((v, idx) => (
                <span
                  key={`${v.chapter}-${v.verse}-${idx}`}
                  className="inline px-1 py-0.5 rounded-md transition-colors hover:bg-[var(--accent-bg)] cursor-pointer"
                  onClick={() => handleVerseClick(v)}
                >
                  <sup className="mx-0.5 align-super font-sans text-[0.55em] font-semibold"
                    style={{ color: 'var(--accent)' }}>
                    {v.verse}
                  </sup>
                  {v.text}
                  {idx < data.verses.length - 1 ? ' ' : null}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--muted)' }}>No verses found.</span>
            )}
          </p>

          {backReference && (
            <div className="flex justify-start pt-6">
              <button
                type="button"
                onClick={handleBackClick}
                className="text-xs flex items-center gap-1.5 transition-colors hover:text-[var(--accent)] font-medium btn-tactile px-3.5 py-1.5 rounded-full border border-[var(--border-soft)] hover:border-[var(--accent-border)] bg-[var(--surface-2)]"
                style={{ color: 'var(--muted)', cursor: 'pointer' }}
              >
                <ArrowLeft size={12} />
                <span>Takaisin laajempaan tekstiin ({backReference})</span>
              </button>
            </div>
          )}

          {/* Tekoäly-analyysi (AI Insights) */}
          <div className="pt-6 border-t border-[var(--border-soft)] space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--accent)]" />
                {lang === 'fi' ? 'Tekoäly-analyysi (Gemini)' : 'AI Analysis (Gemini)'}
              </h3>
              {!aiInsight && !aiLoading && (
                <button
                  type="button"
                  onClick={handleFetchInsight}
                  className="rounded-full px-3 py-1 text-xs font-semibold btn-accent btn-tactile cursor-pointer"
                >
                  {lang === 'fi' ? 'Analysoi tekstiä' : 'Analyze Passage'}
                </button>
              )}
            </div>

            {aiLoading && (
              <div className="flex items-center gap-2 text-sm text-[var(--muted)] py-4">
                <Loader2 size={16} className="animate-spin" />
                <span>{lang === 'fi' ? 'Tekoäly opiskelee tekstikohtaa...' : 'AI is reading the passage...'}</span>
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
                      {aiSaveStatus === 'saving' && 'Tallennetaan...'}
                      {aiSaveStatus === 'success' && 'Tallennettu! ✓'}
                      {aiSaveStatus === 'error' && 'Virhe tallennuksessa'}
                      {aiSaveStatus === 'idle' && (lang === 'fi' ? 'Tallenna analyysi työtilaan' : 'Save analysis to workspace')}
                    </button>
                  </div>
                )}

                <NextFocusChips
                  title={lang === 'fi' ? 'Seuraavat suositellut painopisteet' : 'Next focus suggestions'}
                  items={aiInsight.nextFocus ?? []}
                  onPick={handleNextFocusPick}
                />

                {deepDiveText && (
                  <DeepDiveCard
                    title={lang === 'fi' ? 'Syvennys' : 'Deep dive'}
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

