import { Loader2, BookOpen, Sparkles } from 'lucide-react';
import type { NextFocusItem } from '../../types/ai';
import { isBibleReference } from '../../utils/bookNames';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Properties for {@link NextFocusChips}.
 */
export interface NextFocusChipsProps {
  /** Section header or category title displayed above chip suggestions. */
  title: string;
  /** Collection of actionable AI-recommended focus areas. */
  items: NextFocusItem[];
  /** Callback fired when user clicks a suggested chip item. */
  onPick: (item: NextFocusItem) => void;
  /** Label of the chip whose deep dive is loading (highlights it, sets aria-busy). */
  pendingLabel?: string | null;
  /** Disables all chips, e.g. while any deep dive request is in flight. */
  disabled?: boolean;
}

/**
 * Renders interactive AI follow-up recommendation chips allowing rapid one-click research pivot.
 * Differentiates visually between direct Bible passage navigation (BookOpen) and AI deep-dive topics (Sparkles).
 *
 * @param props - Component properties conforming to {@link NextFocusChipsProps}.
 * @returns Chip collection or null if items array is empty.
 */
export function NextFocusChips({
  title,
  items,
  onPick,
  pendingLabel,
  disabled = false,
}: NextFocusChipsProps) {
  const { strings } = useLanguage();

  if (!items || items.length === 0) return null;

  const hasBibleRef = items.some((it) => isBibleReference(it.label));
  const hasTopicRef = items.some((it) => !isBibleReference(it.label));

  return (
    <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {title}
        </div>
        {hasBibleRef && hasTopicRef && (
          <div className="hidden sm:flex items-center gap-2.5 text-[10px] text-[var(--muted)]" aria-hidden="true">
            <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300">
              <BookOpen className="w-2.5 h-2.5" />
              <span>{strings.nextFocusLegendBible}</span>
            </span>
            <span className="text-[var(--border-soft)]">•</span>
            <span className="inline-flex items-center gap-1 text-[var(--accent)]">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{strings.nextFocusLegendDeepDive}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((it, idx) => {
          const isPending = pendingLabel === it.label;
          const isRef = isBibleReference(it.label);

          const actionHint = isRef
            ? strings.nextFocusBibleNavTooltip
            : strings.nextFocusDeepDiveTooltip;
          const fullTitle = it.reason ? `${it.reason} • ${actionHint}` : actionHint;
          const ariaAction = isRef
            ? strings.nextFocusBibleNavAria
            : strings.nextFocusDeepDiveAria;
          const ariaLabel = `${it.label} (${ariaAction})`;

          const chipClasses = isRef
            ? 'border-sky-500/30 bg-sky-50/50 text-sky-900 dark:border-sky-700/40 dark:bg-sky-950/30 dark:text-sky-200 hover:bg-sky-100/70 dark:hover:bg-sky-900/40'
            : isPending
              ? 'border-[var(--accent)] bg-[var(--surface-2)] text-[var(--accent)] ring-2 ring-[var(--accent)]/30'
              : 'border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--accent-bg)]';

          return (
            <button
              key={`${it.kind}:${it.label}:${idx}`}
              type="button"
              onClick={() => onPick(it)}
              title={fullTitle}
              aria-label={ariaLabel}
              disabled={disabled || isPending}
              aria-busy={isPending}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${chipClasses} ${
                disabled || isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer btn-tactile'
              }`}
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" aria-hidden="true" />
              ) : isRef ? (
                <BookOpen className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
              ) : (
                <Sparkles className="w-3 h-3 text-[var(--accent)] shrink-0" aria-hidden="true" />
              )}
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
