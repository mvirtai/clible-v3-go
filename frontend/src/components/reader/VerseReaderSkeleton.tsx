import type { JSX } from 'react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * VerseReaderSkeleton provides a placeholder for chapter text during data fetches.
 * Prevents Cumulative Layout Shift (CLS) when reading passages.
 */
export function VerseReaderSkeleton(): JSX.Element {
  const { strings } = useLanguage();

  return (
    <div
      className="space-y-6 animate-pulse"
      aria-busy="true"
      aria-label={strings.loadingLabel || 'Loading...'}
    >
      {/* Passage Header Skeleton */}
      <div
        className="flex justify-between items-center pb-4 gap-2 flex-wrap border-b"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <div className="space-y-2">
          <div className="w-48 h-8 rounded-xl bg-[var(--surface-2)]" />
          <div className="w-32 h-4 rounded-lg bg-[var(--surface-2)]/60" />
        </div>
        <div className="w-24 h-6 rounded-lg bg-[var(--surface-2)]" />
      </div>

      {/* Chapter Text Lines Skeleton */}
      <div className="space-y-3.5 max-w-[65ch] pt-2">
        <div className="w-full h-5 rounded-md bg-[var(--surface-2)]" />
        <div className="w-11/12 h-5 rounded-md bg-[var(--surface-2)]" />
        <div className="w-full h-5 rounded-md bg-[var(--surface-2)]" />
        <div className="w-4/5 h-5 rounded-md bg-[var(--surface-2)]" />
        <div className="w-full h-5 rounded-md bg-[var(--surface-2)]" />
        <div className="w-10/12 h-5 rounded-md bg-[var(--surface-2)]" />
        <div className="w-full h-5 rounded-md bg-[var(--surface-2)]" />
        <div className="w-3/4 h-5 rounded-md bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}
