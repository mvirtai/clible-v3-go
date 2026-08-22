// src/components/notebook/useResizableCard.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { useResizableCard } from './useResizableCard';

function TestHookComponent({
  initialColSpan = 12,
  initialColStart = 1,
  initialRowStart,
  initialRowSpan,
  onResizeStart,
  onResizeEnd,
  onHookResult,
}: {
  initialColSpan?: number;
  initialColStart?: number;
  initialRowStart?: number;
  initialRowSpan?: number;
  onResizeStart?: () => void;
  onResizeEnd: (colSpan: number, rowSpan?: number) => void;
  onHookResult: (result: ReturnType<typeof useResizableCard>) => void;
}) {
  const result = useResizableCard({
    initialColSpan,
    initialColStart,
    initialRowStart,
    initialRowSpan,
    onResizeStart,
    onResizeEnd,
  });
  onHookResult(result);

  return (
    <div id="parent-grid" style={{ width: '1200px' }}>
      <div id="card-element" style={{ width: '600px', height: '192px' }}>
        <div
          id="handle-right"
          onPointerDown={(e) =>
            result.handlePointerDown(
              e,
              document.getElementById('card-element') as HTMLDivElement,
              'right'
            )
          }
          onPointerMove={result.handlePointerMove}
          onPointerUp={result.handlePointerUp}
        >
          Right Handle
        </div>
        <div
          id="handle-bottom"
          onPointerDown={(e) =>
            result.handlePointerDown(
              e,
              document.getElementById('card-element') as HTMLDivElement,
              'bottom'
            )
          }
          onPointerMove={result.handlePointerMove}
          onPointerUp={result.handlePointerUp}
        >
          Bottom Handle
        </div>
        <div
          id="handle-corner"
          onPointerDown={(e) =>
            result.handlePointerDown(
              e,
              document.getElementById('card-element') as HTMLDivElement,
              'corner'
            )
          }
          onPointerMove={result.handlePointerMove}
          onPointerUp={result.handlePointerUp}
        >
          Corner Handle
        </div>
      </div>
    </div>
  );
}

describe('useResizableCard hook', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('initializes with default colSpan 12 and given coordinates', () => {
    let hookResult: ReturnType<typeof useResizableCard> | undefined;
    const onResizeEnd = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <TestHookComponent
          onResizeEnd={onResizeEnd}
          onHookResult={(res) => {
            hookResult = res;
          }}
        />
      );
    });

    expect(hookResult?.colSpan).toBe(12);
    expect(hookResult?.rowSpan).toBe(5);
    expect(hookResult?.colStart).toBe(1);
    expect(hookResult?.isResizing).toBe(false);
  });

  it('accepts initial Matrix coordinates (colSpan, colStart, rowStart, rowSpan)', () => {
    let hookResult: ReturnType<typeof useResizableCard> | undefined;
    const onResizeEnd = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <TestHookComponent
          initialColSpan={18}
          initialColStart={6}
          initialRowStart={2}
          initialRowSpan={8}
          onResizeEnd={onResizeEnd}
          onHookResult={(res) => {
            hookResult = res;
          }}
        />
      );
    });

    expect(hookResult?.colSpan).toBe(18);
    expect(hookResult?.colStart).toBe(6);
    expect(hookResult?.rowStart).toBe(2);
    expect(hookResult?.rowSpan).toBe(8);
  });

  it('handles right edge horizontal drag resize and invokes callbacks', () => {
    let hookResult: ReturnType<typeof useResizableCard> | undefined;
    const onResizeStart = vi.fn();
    const onResizeEnd = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <TestHookComponent
          initialColSpan={12}
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
          onHookResult={(res) => {
            hookResult = res;
          }}
        />
      );
    });

    const handleRight = container?.querySelector('#handle-right') as HTMLDivElement;
    expect(handleRight).not.toBeNull();

    handleRight.setPointerCapture = vi.fn();
    handleRight.releasePointerCapture = vi.fn();
    handleRight.hasPointerCapture = vi.fn().mockReturnValue(true);

    // 1. Pointer Down
    act(() => {
      const downEvent = new Event('pointerdown', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(downEvent, { pointerId: 1, clientX: 100, clientY: 100 });
      handleRight.dispatchEvent(downEvent);
    });

    expect(hookResult?.isResizing).toBe(true);
    expect(onResizeStart).toHaveBeenCalledTimes(1);

    // 2. Pointer Move
    act(() => {
      const moveEvent = new Event('pointermove', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(moveEvent, { pointerId: 1, clientX: 400, clientY: 100 });
      handleRight.dispatchEvent(moveEvent);
    });

    // 3. Pointer Up
    act(() => {
      const upEvent = new Event('pointerup', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(upEvent, { pointerId: 1 });
      handleRight.dispatchEvent(upEvent);
    });

    expect(hookResult?.isResizing).toBe(false);
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
  });

  it('handles bottom edge vertical drag resize in 24px grid increments', () => {
    let hookResult: ReturnType<typeof useResizableCard> | undefined;
    const onResizeEnd = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <TestHookComponent
          initialColSpan={12}
          initialRowSpan={8}
          onResizeEnd={onResizeEnd}
          onHookResult={(res) => {
            hookResult = res;
          }}
        />
      );
    });

    const cardEl = container?.querySelector('#card-element') as HTMLDivElement;
    vi.spyOn(cardEl, 'getBoundingClientRect').mockReturnValue({
      width: 600,
      height: 192,
      top: 0,
      left: 0,
      bottom: 192,
      right: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const handleBottom = container?.querySelector('#handle-bottom') as HTMLDivElement;
    handleBottom.setPointerCapture = vi.fn();
    handleBottom.releasePointerCapture = vi.fn();
    handleBottom.hasPointerCapture = vi.fn().mockReturnValue(true);

    // Pointer Down
    act(() => {
      const downEvent = new Event('pointerdown', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(downEvent, { pointerId: 1, clientX: 100, clientY: 100 });
      handleBottom.dispatchEvent(downEvent);
    });

    // Pointer Move (drag down by 48px = +2 rows)
    act(() => {
      const moveEvent = new Event('pointermove', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(moveEvent, { pointerId: 1, clientX: 100, clientY: 148 });
      handleBottom.dispatchEvent(moveEvent);
    });

    // Pointer Up
    act(() => {
      const upEvent = new Event('pointerup', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(upEvent, { pointerId: 1 });
      handleBottom.dispatchEvent(upEvent);
    });

    expect(hookResult?.isResizing).toBe(false);
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd).toHaveBeenCalledWith(12, 10);
  });
});
