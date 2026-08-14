import { useState, useRef } from 'react';

/** Grid snapping column increments for responsive card snapping (1-column smooth resolution) */
const SNAP_POINTS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

/** Total column track count of the parent grid overlay */
const TOTAL_COLS = 24;

/** Height of a single matrix row track in pixels */
const GRID_ROW_HEIGHT_PX = 24;

/** Minimum row height span in 24px grid units */
const MIN_ROW_SPAN = 5;

/** Maximum row height span in 24px grid units (12 rows = 288px max height) */
const MAX_ROW_SPAN = 12;

/** Resize edge positions supported by the card handle overlays */
type ResizeEdge = 'right' | 'left' | 'bottom' | 'corner';

/**
 * Snaps a raw floating-point column calculation to the nearest valid grid column boundary.
 * 
 * @param raw Calculated floating column span value.
 * @returns Nearest valid column span number from SNAP_POINTS.
 */
function snapToNearest(raw: number): number {
  return SNAP_POINTS.reduce((prev, curr) => Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev);
}

/**
 * Options for configuring the {@link useResizableCard} hook.
 */
interface UseResizableCardOptions {
  /** Initial grid column span (6 to 24 columns) */
  initialColSpan?: number;
  /** Initial grid column start coordinate (1 to 24) */
  initialColStart?: number;
  /** Initial grid row start coordinate (1 to N) */
  initialRowStart?: number;
  /** Initial grid row height span in 24px units */
  initialRowSpan?: number;
  /** Maximum allowable row height span dynamically dictated by card content */
  maxRowSpan?: number;
  /** Optional callback invoked when pointer drag resizing begins */
  onResizeStart?: () => void;
  /** Callback triggered when drag resizing completes with final matrix span values */
  onResizeEnd: (colSpan: number, rowSpan?: number) => void;
}

/**
 * Custom React 19 hook managing 2D Canvas Grid matrix layout for Notebook Cards in a 24-column grid.
 * Designed specifically for React Compiler: zero `useCallback`/`useMemo` wrappers and zero `useEffect` side-effects.
 * 
 * @param options Card matrix configuration options and completion callback
 * @returns Matrix layout state and pointer event handlers
 */
export function useResizableCard({
  initialColSpan = 12,
  initialColStart = 1,
  initialRowStart,
  initialRowSpan = MIN_ROW_SPAN,
  maxRowSpan = MAX_ROW_SPAN,
  onResizeEnd,
  onResizeStart,
}: UseResizableCardOptions) {
  // State variables for active column span and row height span
  const [colSpan, setColSpan] = useState<number>(initialColSpan);
  const [rowSpan, setRowSpan] = useState<number>(initialRowSpan);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Derived state synchronization for prop updates during render
  const [prevColSpan, setPrevColSpan] = useState<number>(initialColSpan);
  const [prevRowSpan, setPrevRowSpan] = useState<number>(initialRowSpan);

  if (initialColSpan !== prevColSpan || initialRowSpan !== prevRowSpan) {
    setPrevColSpan(initialColSpan);
    setPrevRowSpan(initialRowSpan);
    setColSpan(initialColSpan);
    setRowSpan(initialRowSpan);
  }

  // Transient reference tracking during pointer drag gestures
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const startColSpanRef = useRef<number | undefined>(initialColSpan);
  const startRowSpanRef = useRef<number>(initialRowSpan || MIN_ROW_SPAN);
  const containerWidthRef = useRef<number>(1000);
  const edgeRef = useRef<ResizeEdge>('right');
  const currentSpanRef = useRef({ colSpan: initialColSpan, rowSpan: initialRowSpan });

  // Pure function: React Compiler automatically memoizes pointer down handler
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    cardEl: HTMLDivElement | null,
    edge: ResizeEdge
  ) => {
    if (!cardEl) return;

    // Prevent default browser drag-select and stop event propagation
    e.preventDefault();
    e.stopPropagation();

    // Lock pointer capture to maintain event delivery when dragging outside bounds
    e.currentTarget.setPointerCapture(e.pointerId);

    // Measure parent container width dynamically for accurate column calculation
    const gridEl = cardEl.parentElement;
    containerWidthRef.current = gridEl ? gridEl.getBoundingClientRect().width : 1000;

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startColSpanRef.current = colSpan;

    // Calculate initial row height span safely clamped between MIN_ROW_SPAN and MAX_ROW_SPAN
    const initialRows = rowSpan || Math.max(MIN_ROW_SPAN, Math.round(cardEl.getBoundingClientRect().height / GRID_ROW_HEIGHT_PX));
    const clampedRows = Math.min(MAX_ROW_SPAN, Math.max(MIN_ROW_SPAN, initialRows));
    startRowSpanRef.current = clampedRows;
    edgeRef.current = edge;

    currentSpanRef.current = { colSpan, rowSpan: clampedRows };
    setIsResizing(true);
    onResizeStart?.();
  };

  // Pure function: React Compiler automatically memoizes pointer move handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;

    const edge = edgeRef.current;
    // Calculate pixel width of a single grid column track
    const colPx = containerWidthRef.current / TOTAL_COLS;
    let newCols = colSpan;
    let newRows = rowSpan || startRowSpanRef.current;

    // Handle horizontal column span adjustment
    if (edge === 'right' || edge === 'left' || edge === 'corner') {
      const deltaX = e.clientX - startXRef.current;
      const sign = edge === 'left' ? -1 : 1;
      const rawCols = startColSpanRef.current + Math.round((sign * deltaX) / colPx);
      const clamped = Math.min(TOTAL_COLS, Math.max(6, rawCols));
      newCols = snapToNearest(clamped);
    }

    // Handle vertical row span adjustment in 24px increments with min/max bounds
    if (edge === 'bottom' || edge === 'corner') {
      const deltaY = e.clientY - startYRef.current;
      const rawDeltaRows = Math.round(deltaY / GRID_ROW_HEIGHT_PX);
      const effectiveMax = Math.max(MIN_ROW_SPAN, maxRowSpan);
      newRows = Math.min(effectiveMax, Math.max(MIN_ROW_SPAN, startRowSpanRef.current + rawDeltaRows));
    }

    currentSpanRef.current = { colSpan: newCols, rowSpan: newRows };
    setColSpan(newCols);
    setRowSpan(newRows);
  };

  // Pure function: React Compiler automatically memoizes pointer up handler
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;

    // Release pointer capture safely
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore if pointer capture was already released */
    }

    setIsResizing(false);
    // Notify parent component of final grid matrix span coordinates
    onResizeEnd(currentSpanRef.current.colSpan, currentSpanRef.current.rowSpan);
  };

  return {
    colSpan,
    rowSpan,
    colStart: initialColStart,
    rowStart: initialRowStart,
    isResizing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}