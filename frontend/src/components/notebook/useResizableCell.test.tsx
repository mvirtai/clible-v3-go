// src/components/notebook/useResizableCell.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { UseResizableCell } from './useResizableCell';

function TestHookComponent({
  initialColSpan,
  initialHeight,
  onResizeEnd,
  onHookResult,
}: {
  initialColSpan?: number;
  initialHeight?: number;
  onResizeEnd: (colSpan: number, height?: number) => void;
  onHookResult: (result: ReturnType<typeof UseResizableCell>) => void;
}) {
  const result = UseResizableCell({
    initialColSpan,
    initialHeight,
    onResizeEnd,
  });
  onHookResult(result);

  return (
    <div id="parent-grid" style={{ width: '1200px' }}>
      <div id="card-element" style={{ width: '600px', height: '200px' }}>
        <div
          id="handle"
          onPointerDown={(e) =>
            result.handlePointerDown(
              e,
              document.getElementById('card-element') as HTMLDivElement
            )
          }
          onPointerMove={result.handlePointerMove}
          onPointerUp={result.handlePointerUp}
        >
          Resize Handle
        </div>
      </div>
    </div>
  );
}

describe('UseResizableCell hook', () => {
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

  it('initializes with default colSpan 12 and given height', () => {
    let hookResult: ReturnType<typeof UseResizableCell> | undefined;
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
    expect(hookResult?.height).toBeUndefined();
    expect(hookResult?.isResizing).toBe(false);
  });

  it('accepts initialColSpan and initialHeight props', () => {
    let hookResult: ReturnType<typeof UseResizableCell> | undefined;
    const onResizeEnd = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <TestHookComponent
          initialColSpan={6}
          initialHeight={250}
          onResizeEnd={onResizeEnd}
          onHookResult={(res) => {
            hookResult = res;
          }}
        />
      );
    });

    expect(hookResult?.colSpan).toBe(6);
    expect(hookResult?.height).toBe(250);
  });

  it('handles pointer down, move, and up resize workflow', () => {
    let hookResult: ReturnType<typeof UseResizableCell> | undefined;
    const onResizeEnd = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <TestHookComponent
          initialColSpan={6}
          initialHeight={200}
          onResizeEnd={onResizeEnd}
          onHookResult={(res) => {
            hookResult = res;
          }}
        />
      );
    });

    const handle = container?.querySelector('#handle') as HTMLDivElement;
    expect(handle).not.toBeNull();

    // Mock pointer capture methods on handle
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn().mockReturnValue(true);

    // 1. Pointer Down
    act(() => {
      const downEvent = new Event('pointerdown', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(downEvent, { pointerId: 1, clientX: 100, clientY: 100 });
      handle.dispatchEvent(downEvent);
    });

    expect(hookResult?.isResizing).toBe(true);

    // 2. Pointer Move (dragging right and down)
    act(() => {
      const moveEvent = new Event('pointermove', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(moveEvent, { pointerId: 1, clientX: 300, clientY: 150 });
      handle.dispatchEvent(moveEvent);
    });

    // 3. Pointer Up
    act(() => {
      const upEvent = new Event('pointerup', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(upEvent, { pointerId: 1 });
      handle.dispatchEvent(upEvent);
    });

    expect(hookResult?.isResizing).toBe(false);
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
  });
});
