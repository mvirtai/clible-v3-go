import type { JSX } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export interface DeepDiveSkeletonProps {
  /** Topic label currently in flight. */
  topic: string;
}

/**
 * Loading skeleton placeholder for in-flight deep dive queries.
 * Matches DeepDiveCard dimensions to prevent layout shifts (CLS).
 */
export function DeepDiveSkeleton({ topic }: DeepDiveSkeletonProps): JSX.Element {
  const { strings } = useLanguage();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={strings.deepDiveLoadingAria}
      className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all animate-in fade-in duration-200"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {strings.deepDivePendingTitle}: <span className="text-[var(--text)]">{topic}</span>
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="h-3.5 w-full rounded-md animate-shimmer" />
        <div className="h-3.5 w-4/5 rounded-md animate-shimmer" />
        <div className="h-3.5 w-3/5 rounded-md animate-shimmer" />
      </div>
    </div>
  );
}

