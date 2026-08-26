import type { NextFocusItem } from "../../types/ai";

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
}

/**
 * Renders interactive AI follow-up recommendation chips allowing rapid one-click research pivot.
 *
 * @param props - Component properties conforming to {@link NextFocusChipsProps}.
 * @returns Chip collection or null if items array is empty.
 */
export function NextFocusChips({ title, items, onPick }: NextFocusChipsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-xs">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, idx) => (
          <button
            key={`${it.kind}:${it.label}:${idx}`}
            type="button"
            onClick={() => onPick(it)}
            title={it.reason}
            className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--border-soft)] transition-all cursor-pointer btn-tactile"
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

