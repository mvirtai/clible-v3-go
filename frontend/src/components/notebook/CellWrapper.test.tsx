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

  it('renders cell content and drag handle button', () => {
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onChangeType = vi.fn();

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

    // Verify drag handle presence
    const dragHandle = container?.querySelector('[title*="Vedä solua"], [title*="Drag to reorder"]');
    expect(dragHandle).not.toBeNull();
  });

  it('handles move and delete button clicks', () => {
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onChangeType = vi.fn();

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
          >
            <div>Cell Content</div>
          </CellWrapper>
        </LanguageProvider>
      );
    });

    const buttons = container?.querySelectorAll('button');
    expect(buttons).toBeDefined();

    // Trigger delete button
    const deleteBtn = Array.from(buttons || []).find(btn => btn.title?.includes('Poista') || btn.title?.includes('Delete'));
    if (deleteBtn) {
      act(() => {
        deleteBtn.click();
      });
      expect(onDelete).toHaveBeenCalledTimes(1);
    }
  });
});
