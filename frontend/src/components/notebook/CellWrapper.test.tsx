// src/components/notebook/CellWrapper.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { CellWrapper } from './CellWrapper';
import type { Cell } from './types';
import { LanguageProvider } from '../../context/LanguageContext';

const mockCell: Cell = {
  id: 'cell-1',
  notebookId: 'nb-1',
  type: 'markdown',
  content: '# Hello World',
  width: 'half',
  colSpan: 6,
  position: 0,
};

describe('CellWrapper', () => {
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

  it('renders cell content, percentage badge, drag handle, and resize handle', () => {
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onChangeType = vi.fn();
    const onChangeWidth = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellWrapper
            cell={mockCell}
            index={0}
            totalCells={2}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onChangeType={onChangeType}
            onChangeWidth={onChangeWidth}
          >
            <div data-testid="child-content">Cell Content</div>
          </CellWrapper>
        </LanguageProvider>
      );
    });

    // Verify child element rendering
    const child = container?.querySelector('[data-testid="child-content"]');
    expect(child).not.toBeNull();
    expect(child?.textContent).toBe('Cell Content');

    // Verify percentage badge rendering (6/12 = 50%)
    expect(container?.textContent).toContain('50%');

    // Verify drag handle presence
    const dragHandle = container?.querySelector('[title*="Vedä solua"], [title*="Drag to reorder"]');
    expect(dragHandle).not.toBeNull();

    // Verify resize handle presence
    const resizeHandle = container?.querySelector('[title*="Vedä hiirellä muuttaaksesi kortin kokoa"]');
    expect(resizeHandle).not.toBeNull();
  });

  it('triggers onChangeWidth when selecting a new cell width', () => {
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onChangeType = vi.fn();
    const onChangeWidth = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellWrapper
            cell={mockCell}
            index={0}
            totalCells={2}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onChangeType={onChangeType}
            onChangeWidth={onChangeWidth}
          >
            <div>Cell Content</div>
          </CellWrapper>
        </LanguageProvider>
      );
    });

    const selects = container?.querySelectorAll('select');
    expect(selects).toBeDefined();
    const widthSelect = selects?.[0];
    expect(widthSelect).toBeDefined();

    if (widthSelect) {
      act(() => {
        widthSelect.value = 'full';
        widthSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onChangeWidth).toHaveBeenCalledWith('full');
    }
  });

  it('triggers onChangeType when selecting a new cell type', () => {
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onChangeType = vi.fn();
    const onChangeWidth = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellWrapper
            cell={mockCell}
            index={0}
            totalCells={2}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onChangeType={onChangeType}
            onChangeWidth={onChangeWidth}
          >
            <div>Cell Content</div>
          </CellWrapper>
        </LanguageProvider>
      );
    });

    const selects = container?.querySelectorAll('select');
    const typeSelect = selects?.[1];
    expect(typeSelect).toBeDefined();

    if (typeSelect) {
      act(() => {
        typeSelect.value = 'code';
        typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onChangeType).toHaveBeenCalledWith('code');
    }
  });

  it('handles move up, move down, and delete button clicks', () => {
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onChangeType = vi.fn();
    const onChangeWidth = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellWrapper
            cell={mockCell}
            index={1}
            totalCells={3}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onChangeType={onChangeType}
            onChangeWidth={onChangeWidth}
          >
            <div>Cell Content</div>
          </CellWrapper>
        </LanguageProvider>
      );
    });

    const buttons = container?.querySelectorAll('button');
    expect(buttons?.length).toBeGreaterThanOrEqual(3);

    // Click move up
    const moveUpBtn = buttons?.[0];
    if (moveUpBtn) {
      act(() => {
        moveUpBtn.click();
      });
      expect(onMoveUp).toHaveBeenCalledTimes(1);
    }

    // Click move down
    const moveDownBtn = buttons?.[1];
    if (moveDownBtn) {
      act(() => {
        moveDownBtn.click();
      });
      expect(onMoveDown).toHaveBeenCalledTimes(1);
    }

    // Click delete
    const deleteBtn = buttons?.[2];
    if (deleteBtn) {
      act(() => {
        deleteBtn.click();
      });
      expect(onDelete).toHaveBeenCalledTimes(1);
    }
  });

  it('handles pointer down on resize handle without throwing errors', () => {
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onChangeType = vi.fn();
    const onChangeWidth = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellWrapper
            cell={mockCell}
            index={0}
            totalCells={1}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onChangeType={onChangeType}
            onChangeWidth={onChangeWidth}
          >
            <div>Cell Content</div>
          </CellWrapper>
        </LanguageProvider>
      );
    });

    const resizeHandle = container?.querySelector('[title*="Vedä hiirellä muuttaaksesi kortin kokoa"]') as HTMLDivElement;
    expect(resizeHandle).not.toBeNull();

    resizeHandle.setPointerCapture = vi.fn();

    act(() => {
      const downEvent = new Event('pointerdown', { bubbles: true }) as unknown as MouseEvent;
      Object.assign(downEvent, { pointerId: 1, clientX: 500, clientY: 300 });
      resizeHandle.dispatchEvent(downEvent);
    });
  });
});
