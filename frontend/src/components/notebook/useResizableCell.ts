import { useState, useRef, useCallback } from 'react';

/**
 * Options for configuring the {@link UseResizableCell} hook.
 */
export interface UseResizableCellOptions {
  /** Initial column span for the cell grid layout (1 to 12) */
  initialColSpan?: number;
  /** Initial height of the cell in pixels */
  initialHeight?: number;
  /** Callback triggered when dragging ends with final column span and height */
  onResizeEnd: (colSpan: number, height?: number) => void;
}

/**
 * Custom React hook for handling drag-to-resize pointer events on notebook cells.
 * Manages dynamic column spanning (12-column grid) and card height adjustments.
 *
 * @param options Configuration options for initial dimensions and resize completion callback.
 * @returns State flags, current dimensions, and pointer event handlers for drag resizing.
 */
export function UseResizableCell({
  initialColSpan = 12,
  initialHeight,
  onResizeEnd,
}: UseResizableCellOptions) {
  const [colSpan, setColSpan] = useState<number>(initialColSpan);
  const [height, setHeight] = useState<number | undefined>(initialHeight);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const startColSpanRef = useRef<number>(12);
  const startHeightRef = useRef<number | undefined>(undefined);
  const containerWidthRef = useRef<number>(1000);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cardElement: HTMLDivElement | null) => {
      if (!cardElement) return;

      e.preventDefault();
      e.stopPropagation();

      // Lock pointer capture to handle drag events outside the element bounds
      e.currentTarget.setPointerCapture(e.pointerId);

      const parentGrid = cardElement.parentElement;
      const gridWidth = parentGrid ? parentGrid.getBoundingClientRect().width : 1000;
      containerWidthRef.current = gridWidth;

      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startColSpanRef.current = colSpan;
      startHeightRef.current = cardElement.getBoundingClientRect().height;

      setIsResizing(true);
    },
    [colSpan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startXRef.current;
      const deltaY = e.clientY - startYRef.current;

      // Calculate width of a single grid column in pixels (12-column grid layout)
      const columnWidthPx = containerWidthRef.current / 12;

      // Compute new column span constrained between 3 and 12
      const rawDeltaCols = Math.round(deltaX / columnWidthPx);
      const newCols = Math.min(12, Math.max(3, startColSpanRef.current + rawDeltaCols));

      setColSpan(newCols);

      // Update height if dragging vertically as well
      if (startHeightRef.current) {
        const newH = Math.max(120, Math.round(startHeightRef.current + deltaY));
        setHeight(newH);
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
      } catch {
        // Ignore errors if pointer capture was already released
      }

      setIsResizing(false);
      onResizeEnd(colSpan, height);
    },
    [isResizing, colSpan, height, onResizeEnd]
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
