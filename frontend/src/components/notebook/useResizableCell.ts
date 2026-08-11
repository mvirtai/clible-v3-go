import { useState, useRef, useCallback } from 'react';

interface UseResizableCellOptions {
    initialColSpan?: number;
    initialHeight?: number;
    onResizeEnd: (colSpan: number, height?: number) => void;
}

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

            // Lukitaan pointer-tapahtumat vetoelementtiin
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

            // Lasketaan yhden sarakkeen leveys pikseleinä (12-sarakkeen grid)
            const columnWidthPx = containerWidthRef.current / 12;

            // Lasketaan uusi colSpan (rajoitettu välille 3 - 12)
            const rawDeltaCols = Math.round(deltaX / columnWidthPx);
            const newCols = Math.min(12, Math.max(3, startColSpanRef.current + rawDeltaCols));

            setColSpan(newCols);

            // Korkeuden päivitys, jos vedetään myös pystysuunnassa
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
            // Ignoroidaan jos capturaus oli jo vapautunut
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