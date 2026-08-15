import React, { useCallback, useRef } from 'react';
import { useSortable } from '@dnd-kit/react/sortable';
import type { CellType, CellWidth, Cell } from './types';
import { useLanguage } from '../../context/LanguageContext';
import { UseResizableCell } from './useResizableCell';

/**
 * Props for the {@link CellWrapper} component.
 */
interface CellWrapperProps {
  /** The notebook cell model data */
  cell: Cell;
  /** Index position of the cell in the notebook list */
  index: number;
  /** Total number of cells in the notebook */
  totalCells: number;
  /** Callback triggered when deleting the cell */
  onDelete: () => void;
  /** Callback triggered when moving the cell up in order */
  onMoveUp: () => void;
  /** Callback triggered when moving the cell down in order */
  onMoveDown: () => void;
  /** Callback triggered when changing the cell type */
  onChangeType: (newType: CellType) => void;
  /** Callback triggered when changing the cell width, column span, or height */
  onChangeWidth: (newWidth: CellWidth, colSpan?: number, customHeight?: number) => void;
  /** Renderable inner cell content (MarkdownCell or CodeCell) */
  children: React.ReactNode;
}



/**
 * Maps numeric column spans (1 to 12) to responsive Tailwind CSS grid column classes.
 *
 * @param colSpan Grid column count (defaults to 12 for full width).
 * @returns Tailwind CSS grid column class string.
 */
const getColSpanClass = (colSpan: number = 12): string => {
  switch (colSpan) {
    case 3:
      return 'col-span-12 md:col-span-3';
    case 4:
      return 'col-span-12 md:col-span-4';
    case 6:
      return 'col-span-12 md:col-span-6';
    case 8:
      return 'col-span-12 md:col-span-8';
    case 9:
      return 'col-span-12 md:col-span-9';
    case 12:
    default:
      return 'col-span-12';
  }
};

/**
 * Wrapper component for notebook cells providing drag-and-drop sortability,
 * toolbar controls (reordering, resizing, type toggling, deletion), and drag-resize handles.
 */
export function CellWrapper({
  cell,
  index,
  totalCells,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeType,
  onChangeWidth,
  children,
}: CellWrapperProps) {
  const { strings } = useLanguage();

  const cardRef = useRef<HTMLDivElement | null>(null);
  // Sortable hook from @dnd-kit/react/sortable
  const { ref: sortableRef, handleRef, isDragging } = useSortable({ id: cell.id, index });

  // React 19 callback ref with cleanup function
  const setCombinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      sortableRef(node);
      cardRef.current = node;
      return () => {
        cardRef.current = null;
      };
    },
    [sortableRef]
  );

  const initialCols = cell.colSpan || (cell.width === 'half' ? 6 : cell.width === 'third' ? 4 : cell.width === 'twothirds' ? 8 : 12);

  const { colSpan, height, isResizing, handlePointerDown, handlePointerMove, handlePointerUp } =
    UseResizableCell({
      initialColSpan: initialCols,
      initialHeight: cell.customHeight,
      onResizeEnd: (finalCols, finalHeight) => {
        const widthPreset: CellWidth =
          finalCols <= 4 ? 'third' : finalCols <= 6 ? 'half' : finalCols <= 8 ? 'twothirds' : 'full';
        onChangeWidth(widthPreset, finalCols, finalHeight);
      },
    });

  const gridSpanClass = getColSpanClass(colSpan);

  return (
    <div
      ref={setCombinedRef}
      style={height ? { minHeight: `${height}px` } : undefined}
      className={`${gridSpanClass} group relative border border-[var(--border-soft)] hover:border-amber-500/30 bg-[var(--surface-2)]/10 hover:bg-[var(--surface-2)]/20 rounded-xl p-4 transition-all duration-150 ${
        isDragging ? 'opacity-40 ring-2 ring-amber-500/50 shadow-2xl z-50' : ''
      } ${isResizing ? 'ring-2 ring-amber-500/80 shadow-lg select-none' : ''}`}
    >
      {/* Cell action toolbar (appears on hover) */}
      <div className="absolute -top-3 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[var(--surface)] border border-[var(--border-soft)] rounded-md px-1.5 py-0.5 shadow-md z-10">

        {/* Drag handle */}
        <span
          ref={handleRef}
          className="p-1 text-[var(--muted)] hover:text-amber-500 cursor-grab active:cursor-grabbing transition-colors focus:outline-none select-none touch-none"
          title={strings.dragHandleTitle || 'Drag to reorder'}
          aria-label={strings.dragHandleTitle || 'Drag to reorder'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6h16.5" />
          </svg>
        </span>

        <span className="w-px h-3 bg-[var(--border-soft)]" />

        {/* Column span width percentage indicator */}
        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold px-1">
          {Math.round((colSpan / 12) * 100)}%
        </span>

        <span className="w-px h-3 bg-[var(--border-soft)]" />

        {/* Cell width selector */}
        <select
          aria-label="Select cell width"
          value={cell.width || 'full'}
          onChange={(e) => onChangeWidth(e.target.value as CellWidth)}
          className="bg-transparent text-[var(--muted)] text-[10px] font-medium focus:outline-none border-none cursor-pointer hover:text-amber-500"
        >
          <option value="full" className="bg-[var(--surface)] text-[var(--text)]">{strings.cellWidthFull}</option>
          <option value="half" className="bg-[var(--surface)] text-[var(--text)]">{strings.cellWidthHalf}</option>
          <option value="third" className="bg-[var(--surface)] text-[var(--text)]">{strings.cellWidthThird}</option>
          <option value="twothirds" className="bg-[var(--surface)] text-[var(--text)]">{strings.cellWidthTwoThirds}</option>
        </select>

        <span className="w-px h-3 bg-[var(--border-soft)]" />

        {/* Cell type selector */}
        <select
          aria-label="Select cell type"
          value={cell.type}
          onChange={(e) => onChangeType(e.target.value as CellType)}
          className="bg-transparent text-[var(--muted)] text-[10px] font-medium focus:outline-none border-none cursor-pointer hover:text-amber-500"
        >
          <option value="markdown" className="bg-[var(--surface)] text-[var(--text)]">{strings.markdownOptionLabel}</option>
          <option value="code" className="bg-[var(--surface)] text-[var(--text)]">{strings.codeOptionLabel}</option>
        </select>

        <span className="w-px h-3 bg-[var(--border-soft)]" />

        {/* Move cell up */}
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 text-[var(--muted)] hover:text-amber-500 disabled:text-[var(--border-soft)] disabled:hover:text-[var(--border-soft)] transition-colors"
          title={strings.moveUpTitle}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>

        {/* Move cell down */}
        <button
          onClick={onMoveDown}
          disabled={index === totalCells - 1}
          className="p-1 text-[var(--muted)] hover:text-amber-500 disabled:text-[var(--border-soft)] disabled:hover:text-[var(--border-soft)] transition-colors"
          title={strings.moveDownTitle}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <span className="w-px h-3 bg-[var(--border-soft)]" />

        {/* Delete cell */}
        <button
          onClick={onDelete}
          className="p-1 text-[var(--muted)] hover:text-red-500 transition-colors"
          title={strings.deleteCellTitle}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Main cell inner content */}
      <div className="pt-2">
        {children}
      </div>

      {/* Bottom-right corner drag-resize handle */}
      <div
        onPointerDown={(e) => handlePointerDown(e, cardRef.current)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 text-[var(--muted)] hover:text-amber-500 opacity-40 hover:opacity-100 transition-opacity touch-none select-none"
        title="Drag to resize cell width and height"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 19.5l-6-6m6 0l-6 6M19.5 13.5l-3-3" />
        </svg>
      </div>
    </div>
  );
};
