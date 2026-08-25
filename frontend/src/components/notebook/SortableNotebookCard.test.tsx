import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { SortableNotebookCard } from './SortableNotebookCard';
import type { Notebook } from './types';

// Mock dnd-kit sortable hook
vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({
    ref: vi.fn(),
    handleRef: vi.fn(),
    isDragging: false,
  }),
}));

describe('SortableNotebookCard', () => {
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

  const baseNotebook: Notebook = {
    id: 'nb-1',
    title: 'Tutkimusmuistikirja',
    scopeId: 'scope-1',
    colSpan: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cells: [
      { id: 'c1', notebookId: 'nb-1', type: 'markdown', content: 'Tavallinen muistiinpano' },
      { id: 'c2', notebookId: 'nb-1', type: 'markdown', content: '```isla\n? "valo" gjoh --limit:5\n```' },
      { id: 'c3', notebookId: 'nb-1', type: 'markdown', content: '!@Joh 3:16' },
    ],
  };

  it('renders title and smart content badges', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <SortableNotebookCard
          nb={baseNotebook}
          index={0}
          onClick={vi.fn()}
          onResizeEnd={vi.fn()}
          dragHandleTitle="Vedä"
          updatedAtLabel="Päivitetty"
          noDateLabel="-"
        />
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Tutkimusmuistikirja');
    expect(text).toContain('📝');
    expect(text).toContain('🔍');
    expect(text).toContain('📖');
  });

  it('renders up to 8 cells and "+ N muuta solua..." indicator when stretched with >8 cells', () => {
    const manyCellsNotebook: Notebook = {
      ...baseNotebook,
      rowSpan: 8, // Triggers hasCustomHeight preview
      cells: Array.from({ length: 11 }, (_, i) => ({
        id: `c-${i}`,
        notebookId: 'nb-1',
        type: 'markdown',
        content: i === 1 ? '```isla\n? "valo"\n```' : `Solu numero ${i + 1}`,
      })),
    };

    act(() => {
      root = createRoot(container!);
      root.render(
        <SortableNotebookCard
          nb={manyCellsNotebook}
          index={0}
          onClick={vi.fn()}
          onResizeEnd={vi.fn()}
          dragHandleTitle="Vedä"
          updatedAtLabel="Päivitetty"
          noDateLabel="-"
        />
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('✦ ISLA');
    expect(text).toContain('+ 3 muuta solua...');
  });
});
