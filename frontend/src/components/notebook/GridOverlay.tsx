const SNAP_POINTS = [6, 8, 12, 16, 24];
const TOTAL_COLS = 24;

interface GridOverlayProps {
    visible: boolean;
}

export const GridOverlay = ({ visible }: GridOverlayProps) => {
    if (!visible) return null;

    return (
        <div 
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none z-10 rounded-xl overflow-hidden"
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${TOTAL_COLS}), 1fr`,
            }}
        >
            {Array.from({ length: TOTAL_COLS }, (_, i) => {
                const col = i + 1;
                const isSnap = SNAP_POINTS.includes(col);
                return (
                    <div 
                        key={col}
                        style={{
                            borderRight: isSnap
                                ? '1px solid rgba(251,191,36,0.30)'
                                : '1px solid rgba(255,255,255,0.04)',
                            height: '100%',
                            position: "relative"
                        }}
                    >
                        {isSnap && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 3,
                                    fontSize: 8,
                                    color: 'rgba(251,191,36,0.55)',
                                    fontFamily: 'monospace',
                                    lineHeight: 1,
                                    userSelect: 'none',
                                }}
                            >
                                {Math.round((col / TOTAL_COLS) * 100)}%
                            </span>
                        )}
                    </div>
                )
            })}
        </div>
    )
}