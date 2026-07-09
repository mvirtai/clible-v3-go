// src/components/VerseReader.tsx
import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { BibleResponse, Verse } from '../types/bible';
import { Search, Loader2, ArrowLeft } from 'lucide-react';
import { resolveBookId, parseReferenceForDisplay, type UILanguage } from '../utils/bookNames';

interface Props {
  translation: string;
  activeReference?: string;
  activeScopeId?: string;
  onWorkspaceUpdated?: () => void;
}

export const VerseReader: React.FC<Props> = ({
  translation,
  activeReference,
  activeScopeId,
  onWorkspaceUpdated
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

  const isFinnish = translation.toLowerCase().startsWith('fi') || translation.toLowerCase().includes('fin');
  const lang: UILanguage = isFinnish ? 'fi' : 'en';

  const displayRef = data ? parseReferenceForDisplay(data.reference, lang) : null;

  // Sync state during render instead of in useEffect to avoid cascading renders warning
  if (activeReference !== prevActiveReference) {
    setReference(activeReference || '');
    setBackReference(null);
    setPrevActiveReference(activeReference);
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
    try {
      const result = await apiService.getVerses(normalized, translation);
      setData(result);
    } catch {
      setError('Failed to fetch verses. Check the reference (e.g. John 3:16, Joh. 3:16, 1 Moos 1:1).');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [translation]);

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
        <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p>
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
        </div>
      )}
    </div>
  );
};

