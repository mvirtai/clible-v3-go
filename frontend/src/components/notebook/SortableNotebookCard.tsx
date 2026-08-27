import { useRef } from 'react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useResizableCard } from './grid/useResizableCard';
import { NotebookContentBadges } from './cells/CellBadge';
import { classifyCell, type ContentCategory } from '../../utils/islaClassifier';
import { useLanguage } from '../../context/LanguageContext';
import type { Notebook } from './types';

/**
 * Props for the {@link SortableNotebookCard} component.
 */
export interface SortableNotebookCardProps {
  /** The notebook data entity */
  nb: Notebook;
  /** Index of the card in the grid list */
  index: number;
  /** Callback triggered when clicking the card to open notebook details */
  onClick: () => void;
  /** Optional callback triggered when card resizing begins */
  onResizeStart?: () => void;
  /** Callback triggered when card resizing ends with new column span and row span */
  onResizeEnd: (colSpan: number, rowSpan?: number) => void;
  /** Accessible title for the drag handle button */
  dragHandleTitle: string;
  /** Localized label for last update timestamp */
  updatedAtLabel: string;
  /** Localized placeholder label when no date is present */
  noDateLabel: string;
}

const PREVIEW_CATEGORY_THEMES: Record<
  ContentCategory,
  {
    containerClass: string;
    badgeClass: string;
    emoji: string;
    label: { fi: string; en: string };
  }
> = {
  search: {
    containerClass: 'bg-amber-500/5 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    emoji: '🔍',
    label: { fi: 'Haku', en: 'Search' },
  },
  verse: {
    containerClass: 'bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    emoji: '📖',
    label: { fi: 'Jae', en: 'Verse' },
  },
  compare: {
    containerClass: 'bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
    emoji: '⚖️',
    label: { fi: 'Vertailu', en: 'Compare' },
  },
  count: {
    containerClass: 'bg-purple-500/5 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
    emoji: '📊',
    label: { fi: 'Määrä', en: 'Count' },
  },
  refs: {
    containerClass: 'bg-fuchsia-500/5 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/25',
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
    emoji: '🔗',
    label: { fi: 'Viitteet', en: 'Refs' },
  },
  text: {
    containerClass: 'bg-sky-500/5 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    emoji: '📝',
    label: { fi: 'Teksti', en: 'Text' },
  },
};

/**
 * Interactive card component representing a notebook item in the 2D canvas grid matrix.
 * Supports drag-and-drop reordering via `@dnd-kit/react/sortable` and multi-edge drag resizing.
 * Dynamically renders notebook cell previews when stretched vertically with category-matching colors and emojis.
 */
export function SortableNotebookCard({
  nb,
  index,
  onClick,
  onResizeStart,
  onResizeEnd,
  dragHandleTitle,
  updatedAtLabel,
  noDateLabel,
}: SortableNotebookCardProps) {
  const { lang } = useLanguage();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { ref: sortableRef, handleRef, isDragging } = useSortable({ id: nb.id, index });

  // React 19 callback ref with optional cleanup
  const setCombinedRef = (node: HTMLDivElement | null) => {
    sortableRef(node);
    cardRef.current = node;
    return () => {
      cardRef.current = null;
    };
  };

  // Dynaminen maxRowSpan kortin sisältöjen perusteella (5 riviä pohja + 1 rivi per esikatselusolu, max 8 solua + 1 jatkoilmoitus)
  const totalCells = nb.cells ? nb.cells.length : 0;
  const previewLimit = 8;
  const previewCellCount = Math.min(previewLimit, totalCells);
  const extraIndicatorRow = totalCells > previewLimit ? 1 : 0;
  const maxRowSpan = previewCellCount > 0 ? 5 + previewCellCount + extraIndicatorRow : 5;
  const effectiveRowSpan = Math.min(
    maxRowSpan,
    nb.rowSpan ?? (nb.colHeight ? Math.max(5, Math.round(nb.colHeight / 24)) : 5)
  );

  const { colSpan, rowSpan, isResizing, handlePointerDown, handlePointerMove, handlePointerUp } =
    useResizableCard({
      initialColSpan: nb.colSpan ?? 12,
      initialColStart: nb.colStart ?? 1,
      initialRowStart: nb.rowStart,
      initialRowSpan: effectiveRowSpan,
      maxRowSpan,
      onResizeStart,
      onResizeEnd,
    });

  // Aseta eksplisiittiset CSS Grid matrix -koordinaatit kortille (automaattisella flow-fall-backilla)
  const gridStyle: React.CSSProperties = {
    gridColumn: nb.colStart && nb.colStart > 1 ? `${nb.colStart} / span ${colSpan}` : `span ${colSpan}`,
    ...(nb.rowStart && nb.rowStart > 1 ? { gridRowStart: nb.rowStart } : {}),
    gridRowEnd: `span ${rowSpan || effectiveRowSpan}`,
  };

  const currentSpan = rowSpan || effectiveRowSpan;
  const hasCustomHeight = currentSpan > 5;

  return (
    <div
      ref={setCombinedRef}
      style={gridStyle}
      onClick={onClick}
      className={`group relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between text-left
                  transition-all duration-200 cursor-pointer overflow-hidden
                  hover:shadow-md hover:border-amber-500/40
                  bg-[var(--surface-2)] border border-[var(--border-soft)]
                  ${isDragging ? 'opacity-40 shadow-2xl z-40 ring-2 ring-amber-500' : ''}
                  ${isResizing ? 'select-none ring-2 ring-amber-400 shadow-xl' : ''}`}
    >
      {/* Top Header Section of Card */}
      <div className="flex-1 min-h-0 flex flex-col justify-start">
        <div className="flex items-start justify-between gap-2">
          {/* Drag Handle button */}
          <button
            ref={handleRef}
            type="button"
            aria-label={dragHandleTitle}
            title={dragHandleTitle}
            className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded-md
                       text-[var(--muted)] hover:text-amber-500
                       hover:bg-[var(--surface)] transition-colors shrink-0 touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="opacity-60 group-hover:opacity-100"
            >
              <line x1="3" y1="5" x2="13" y2="5" />
              <line x1="3" y1="11" x2="13" y2="11" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug text-[var(--text)]
                           group-hover:text-amber-500 transition-colors truncate">
              {nb.title}
            </h3>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              {updatedAtLabel}:{' '}
              {nb.updatedAt || nb.createdAt
                ? new Date(nb.updatedAt || nb.createdAt).toLocaleDateString('fi-FI')
                : noDateLabel}
            </p>
          </div>
        </div>

        {/* Content Preview Block (Revealed when vertically expanded/stretched) */}
        {hasCustomHeight && (
          <div className="mt-3 pt-3 border-t border-[var(--border-soft)]/50 flex-1 min-h-0 flex flex-col justify-start gap-2 overflow-y-auto pr-1">
            {nb.cells && nb.cells.length > 0 ? (
              <>
                {nb.cells.slice(0, previewLimit).map((cell) => {
                  const info = classifyCell(cell);
                  const cleanText = info.cleanPreview;
                  const theme = PREVIEW_CATEGORY_THEMES[info.primaryCategory] || PREVIEW_CATEGORY_THEMES.text;

                  return (
                    <div key={cell.id} className="text-xs shrink-0">
                      {info.isISLA ? (
                        <div
                          className={`font-mono text-[11px] rounded-lg px-2.5 py-1.5 border flex items-center gap-2 shadow-2xs transition-colors ${theme.containerClass}`}
                        >
                          <span
                            className={`text-[9px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded flex items-center gap-1 leading-none ${theme.badgeClass}`}
                          >
                            <span>{theme.emoji}</span>
                            <span>{theme.label[lang] || theme.label.fi}</span>
                          </span>
                          <span className="truncate flex-1 font-mono text-[11px]">
                            {cleanText || 'ISLA expression'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[var(--muted)] text-[11px] line-clamp-2 leading-relaxed bg-[var(--surface-2)]/30 rounded-lg p-2 border border-[var(--border-soft)]/40 shadow-2xs">
                          {cleanText || (
                            <em className="italic text-[var(--muted)]/60">
                              {lang === 'fi' ? 'Tyhjä muistiinpano...' : 'Empty note...'}
                            </em>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {nb.cells.length > previewLimit && (
                  <div className="text-[10px] text-center font-medium text-[var(--muted)]/80 py-1 px-2 rounded-lg bg-[var(--surface-2)]/30 border border-dashed border-[var(--border-soft)]/60 shrink-0">
                    + {nb.cells.length - previewLimit} {lang === 'fi' ? 'muuta solua...' : 'more cells...'}
                  </div>
                )}
              </>
            ) : (
              <div className="py-3 px-3 rounded-lg bg-[var(--surface-2)]/30 border border-dashed border-[var(--border-soft)] text-center hover:border-amber-500/30 transition-colors my-auto">
                <p className="text-[11px] text-[var(--muted)] leading-tight">
                  {lang === 'fi' ? 'Klikkaa avataksesi muistikirjan' : 'Click to open notebook and add cells'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer section: Cell badges and width indicator */}
      <div className="flex items-center justify-between mt-3 pt-2.5
                      border-t border-[var(--border-soft)] flex-shrink-0">
        <NotebookContentBadges cells={nb.cells} fallbackCellCounts={nb.cellCounts} />

        <span className="text-[9px] font-mono text-amber-500/50
                         opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {Math.round((colSpan / 24) * 100)}%
        </span>
      </div>

      {/* Resize handles — multi-edge pointer interactions */}
      {/* Right edge */}
      <div className="absolute top-2 right-0 bottom-2 w-2.5 cursor-ew-resize
                      opacity-0 group-hover:opacity-100 transition-opacity
                      flex items-center justify-center touch-none select-none z-20"
           onClick={(e) => e.stopPropagation()}
           onPointerDown={(e) => handlePointerDown(e, cardRef.current, 'right')}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <div className="w-0.5 h-8 rounded-full"
          style={{ background: isResizing ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.35)' }} />
      </div>

      {/* Left edge */}
      <div className="absolute top-2 left-0 bottom-2 w-2.5 cursor-ew-resize
                      opacity-0 group-hover:opacity-100 transition-opacity
                      flex items-center justify-center touch-none select-none z-20"
           onClick={(e) => e.stopPropagation()}
           onPointerDown={(e) => handlePointerDown(e, cardRef.current, 'left')}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <div className="w-0.5 h-8 rounded-full"
          style={{ background: isResizing ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.35)' }} />
      </div>

      {/* Bottom edge */}
      <div className="absolute bottom-0 left-2 right-2 h-2.5 cursor-ns-resize
                      opacity-0 group-hover:opacity-100 transition-opacity
                      flex items-center justify-center touch-none select-none z-20"
           onClick={(e) => e.stopPropagation()}
           onPointerDown={(e) => handlePointerDown(e, cardRef.current, 'bottom')}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <div className="h-0.5 w-8 rounded-full"
          style={{ background: isResizing ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.35)' }} />
      </div>

      {/* Bottom-right corner handle */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize
                      opacity-0 group-hover:opacity-100 transition-opacity
                      touch-none select-none z-30"
           onClick={(e) => e.stopPropagation()}
           onPointerDown={(e) => handlePointerDown(e, cardRef.current, 'corner')}
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <div className="w-1.5 h-1.5 rounded-full"
          style={{ background: isResizing ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.35)' }} />
      </div>
    </div>
  );
}
