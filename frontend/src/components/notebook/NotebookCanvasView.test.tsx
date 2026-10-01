import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { NotebookCanvasView } from './NotebookCanvasView';
import { LanguageProvider } from '../../context/LanguageContext';
import type { Notebook } from './types';

// Mock dnd-kit sortable hook
vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({
    ref: vi.fn(),
    handleRef: vi.fn(),
    isDragging: false,
  }),
}));

describe('NotebookCanvasView', () => {
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

  const mockNotebooks: Notebook[] = [
    {
      id: 'nb-1',
      title: 'Ensimmäinen muistikirja',
      scopeId: 'scope-1',
      colSpan: 12,
      rowSpan: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cells: [
        { id: 'c1', notebookId: 'nb-1', type: 'markdown', content: 'Solun teksti' },
      ],
    },
    {
      id: 'nb-2',
      title: 'Toinen muistikirja',
      scopeId: 'scope-1',
      colSpan: 12,
      rowSpan: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cells: [],
    },
  ];

  it('renders canvas action bar and list of notebooks with scrollable container', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookCanvasView
            notebooks={mockNotebooks}
            onNotebooksChange={vi.fn()}
            selectedNotebookId={null}
            onSelectNotebook={vi.fn()}
            selectedTranslation="fin-pr92"
            onSelectVerse={vi.fn()}
            onCreateNotebook={vi.fn()}
            onResetNotebookSizes={vi.fn()}
          />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('2D Matrix');
    expect(text).toContain('Ensimmäinen muistikirja');
    expect(text).toContain('Toinen muistikirja');

    // Scroll container present
    const scrollContainer = container?.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer?.querySelector('.grid-cols-24')).toBeDefined();
  });

  it('renders empty placeholder when no notebooks exist', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookCanvasView
            notebooks={[]}
            onNotebooksChange={vi.fn()}
            selectedNotebookId={null}
            onSelectNotebook={vi.fn()}
            selectedTranslation="fin-pr92"
            onSelectVerse={vi.fn()}
            onCreateNotebook={vi.fn()}
            onResetNotebookSizes={vi.fn()}
          />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('2D Matrix');
    const emptyState = container?.querySelector('.col-span-24');
    expect(container?.querySelector('.grid-cols-24')).not.toBeNull();
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent?.trim()).toBeTruthy();
  });
});
