import { useState, useRef, useCallback, useEffect } from 'react';

const SNAP_POINTS = [6, 8, 12, 16, 18, 24];
const TOTAL_COLS = 24;
const MIN_HEIGHT = 100;

type ResizeEdge = 'right' | 'left' | 'bottom' | 'corner';

function snapToNearest(raw: number): number {
  return SNAP_POINTS.reduce((prev, curr) =>
    Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev
  );
}

/**
 * Options for configuring the {@link useResizableCard} hook.
 */
interface UseResizableCardOptions {
  /** Initial grid column span (6 to 24) */
  initialColSpan?: number;
  /** Initial card height in pixels */
  initialHeight?: number;
  /** Optional callback invoked when drag-resizing starts */
  onResizeStart?: () => void;
  /** Callback invoked when drag-resizing completes with final span and height */
  onResizeEnd: (colSpan: number, height?: number) => void;
}

/**
 * Custom React hook managing multi-edge pointer interactions for card resizing in a 24-column grid layout.
 * Supports horizontal column snapping and vertical pixel height resizing.
 *
 * @param options Hook options including initial dimensions and lifecycle callbacks.
 * @returns Current state flags, calculated dimensions, and pointer event handlers.
 */
export function useResizableCard({
  initialColSpan = 12,
  initialHeight,
  onResizeStart,
  onResizeEnd,
}: UseResizableCardOptions) {
  const [colSpan, setColSpan] = useState(initialColSpan);
  const [height, setHeight] = useState<number | undefined>(initialHeight);
  const [isResizing, setIsResizing] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startColSpanRef = useRef(initialColSpan);
  const startHeightRef = useRef<number | undefined>(initialHeight);
  const containerWidthRef = useRef(1000);
  const edgeRef = useRef<ResizeEdge>('right');
  const currentColSpanRef = useRef(initialColSpan);
  const currentHeightRef = useRef<number | undefined>(initialHeight);

  // Sync internal state when initial props change externally (e.g. reset sizes button)
  const [prevInitialColSpan, setPrevInitialColSpan] = useState(initialColSpan);
  const [prevInitialHeight, setPrevInitialHeight] = useState(initialHeight);

  if (initialColSpan !== prevInitialColSpan || initialHeight !== prevInitialHeight) {
    setPrevInitialColSpan(initialColSpan);
    setPrevInitialHeight(initialHeight);
    setColSpan(initialColSpan);
    setHeight(initialHeight);
  }

  // Sync ref values safely inside useEffect to avoid updating refs during render
  useEffect(() => {
    currentColSpanRef.current = colSpan;
    currentHeightRef.current = height;
  }, [colSpan, height]);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      cardEl: HTMLDivElement | null,
      edge: ResizeEdge
    ) => {
      if (!cardEl) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const gridEl = cardEl.parentElement;
      containerWidthRef.current = gridEl
        ? gridEl.getBoundingClientRect().width
        : 1000;

      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startColSpanRef.current = colSpan;
      startHeightRef.current = cardEl.getBoundingClientRect().height;
      edgeRef.current = edge;

      setIsResizing(true);
      onResizeStart?.();
    },
    [colSpan, onResizeStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing) return;

      const edge = edgeRef.current;
      const colPx = containerWidthRef.current / TOTAL_COLS;

      if (edge === 'right' || edge === 'left' || edge === 'corner') {
        const deltaX = e.clientX - startXRef.current;
        const sign = edge === 'left' ? -1 : 1;
        const rawCols = startColSpanRef.current + Math.round((sign * deltaX) / colPx);
        const clamped = Math.min(TOTAL_COLS, Math.max(6, rawCols));
        setColSpan(snapToNearest(clamped));
      }

      if (edge === 'bottom' || edge === 'corner') {
        const deltaY = e.clientY - startYRef.current;
        if (startHeightRef.current !== undefined) {
          const newH = Math.max(MIN_HEIGHT, Math.round(startHeightRef.current + deltaY));
          setHeight(newH);
        }
      }
    },
    [isResizing]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing) return;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch { /* ignore */ }
      setIsResizing(false);
      onResizeEnd(currentColSpanRef.current, currentHeightRef.current);
    },
    [isResizing, onResizeEnd]
  );

  return {
    colSpan,
    height,
    isResizing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
