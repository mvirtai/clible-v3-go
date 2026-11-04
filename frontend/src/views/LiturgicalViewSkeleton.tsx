import type { JSX } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * LiturgicalViewSkeleton renders a layout placeholder matching the LiturgicalView structure.
 * This prevents Cumulative Layout Shift (CLS) when liturgical day data is loading asynchronously.
 */
export function LiturgicalViewSkeleton(): JSX.Element {
  const { strings } = useLanguage();

  return (
    <div
      className="space-y-6 sm:space-y-8 animate-pulse"
      aria-busy="true"
      aria-label={strings.liturgicalLoading || 'Loading...'}
    >
      {/* ── Top Bar Skeleton ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] min-h-[60px]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface)]" />
          <div className="w-20 h-7 rounded-xl bg-[var(--surface)]" />
          <div className="w-9 h-9 rounded-xl bg-[var(--surface)]" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-36 h-8 rounded-xl bg-[var(--surface)]" />
          <div className="w-32 h-8 rounded-xl bg-[var(--surface)]" />
        </div>
      </div>

      {/* ── Celebration Header Card Skeleton ── */}
      <div className="relative overflow-hidden p-5 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4 min-h-[220px]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-24 h-6 rounded-full bg-[var(--surface-2)]" />
            <div className="w-28 h-6 rounded-full bg-[var(--surface-2)]" />
          </div>
          <div className="w-24 h-6 rounded-lg bg-[var(--surface-2)]" />
        </div>

        <div className="space-y-2 py-1">
          <div className="w-3/4 h-8 rounded-xl bg-[var(--surface-2)]" />
          <div className="w-1/2 h-5 rounded-lg bg-[var(--surface-2)]" />
        </div>

        <div className="w-full sm:w-2/3 h-14 rounded-2xl bg-[var(--surface-2)]/60" />
      </div>

      {/* ── Main Section Drawers Skeleton ── */}
      <div className="space-y-4">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-6 space-y-3 min-h-[90px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)]" />
                <div className="w-40 h-6 rounded-lg bg-[var(--surface-2)]" />
              </div>
              <div className="w-6 h-6 rounded-lg bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
