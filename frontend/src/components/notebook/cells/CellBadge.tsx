
const CELL_STYLES = {
  markdown: { bg: 'rgba(59,130,246,0.12)', dot: '#3b82f6', label: 'MD' },
  code:     { bg: 'rgba(139,92,246,0.12)', dot: '#8b5cf6', label: 'CODE' },
} as const;

/**
 * Properties for {@link CellBadge}.
 */
export interface CellBadgeProps {
  /** The cell content type. */
  type: 'markdown' | 'code';
  /** Number of cells of this type contained within the parent card. */
  count: number;
}

/**
 * Compact pill badge displaying the cell count for markdown and code cells on canvas cards.
 *
 * @param props - Component properties conforming to {@link CellBadgeProps}.
 * @returns Pill badge or null if count is zero.
 */
export function CellBadge({ type, count }: CellBadgeProps) {
  if (count === 0) return null;
  const { bg, dot, label } = CELL_STYLES[type];

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold leading-none"
      style={{ background: bg, color: dot }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      {count} {label}
    </span>
  );
}

