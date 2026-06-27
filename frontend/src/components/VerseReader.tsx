// src/components/VerseReader.tsx
import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { BibleResponse } from '../types/bible';
import { Search, Loader2 } from 'lucide-react';
import { resolveBookId } from '../utils/bookNames';

interface Props {
  translation: string;
}

export const VerseReader: React.FC<Props> = ({ translation }) => {
  const [reference, setReference] = useState('');
  const [data, setData] = useState<BibleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = reference.trim();
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
  };

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
          className="rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
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
          <div className="flex items-baseline justify-between pb-4"
            style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <h3 className="text-2xl font-serif italic" style={{ color: 'var(--text)' }}>
              {data.reference}
            </h3>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {data.translationName}
            </span>
          </div>

          <p className="text-xl leading-relaxed font-serif" style={{ color: 'var(--text-2)' }}>
            {data.verses.length > 0 ? (
              data.verses.map((v, idx) => (
                <span key={`${v.chapter}-${v.verse}-${idx}`} className="inline">
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
        </div>
      )}
    </div>
  );
};

