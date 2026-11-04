import { Loader2 } from 'lucide-react';
import type { NextFocusItem } from '../../types/ai';

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
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-xs">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, idx) => {
          const isPending = pendingLabel === it.label;
          return (
            <button
              key={`${it.kind}:${it.label}:${idx}`}
              type="button"
              onClick={() => onPick(it)}
              title={it.reason}
              disabled={disabled || isPending}
              aria-busy={isPending}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                isPending
                  ? 'border-[var(--accent)] bg-[var(--surface-2)] text-[var(--accent)] ring-2 ring-[var(--accent)]/30'
                  : 'border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border-soft)]'
              } ${disabled || isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer btn-tactile'}`}
            >
              {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" aria-hidden="true" />
              )}
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
