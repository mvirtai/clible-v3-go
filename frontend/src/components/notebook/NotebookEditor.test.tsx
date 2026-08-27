// src/components/notebook/NotebookEditor.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { NotebookEditor } from './NotebookEditor';
import { LanguageProvider } from '../../context/LanguageContext';

// Mock @dnd-kit/react DragDropProvider (transparent wrapper for tests)
vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="drag-drop-provider">{children}</div>
  ),
}));

// Mock @dnd-kit/react/sortable — useSortable returns no-op stubs
vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({
    ref: () => {},
    handleRef: () => {},
    isDragging: false,
  }),
}));

// Mock @dnd-kit/helpers move function
vi.mock('@dnd-kit/helpers', () => ({
  move: (arr: unknown[]) => arr,
}));

const mockNotebookData = {
  id: 'nb-123',
  title: 'Test Notebook',
  scopeId: 'scope-1',
  cells: [
    {
      id: 'cell-1',
      notebookId: 'nb-123',
      type: 'markdown',
      content: '# Heading 1\nPelkkä muistiinpano',
      position: 0,
    },
    {
      id: 'cell-2',
      notebookId: 'nb-123',
      type: 'markdown',
      content: '! @Joh 3:16 => in(KR92)',
      position: 1,
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('NotebookEditor', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock fetch for Notebook loading
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/notebooks/nb-123')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNotebookData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
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
    vi.restoreAllMocks();
  });

  it('loads and renders notebook cells inside DragDropProvider', async () => {
    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookEditor notebookId="nb-123" />
        </LanguageProvider>
      );
    });

    // Verify DragDropProvider wrapper is present
    const provider = container?.querySelector('[data-testid="drag-drop-provider"]');
    expect(provider).not.toBeNull();

    // Verify notebook title rendering
    expect(container?.textContent).toContain('Test Notebook');

    // Verify cells rendered
    expect(container?.textContent).toContain('Heading 1');
    expect(container?.textContent).toContain('Pelkkä muistiinpano');
  });

  it('allows inserting a new markdown cell', async () => {
    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookEditor notebookId="nb-123" />
        </LanguageProvider>
      );
    });

    const addBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('+ Lisää solu') || b.textContent?.includes('+ Solu') || b.textContent?.includes('+ Add cell')
    );
    expect(addBtn).toBeDefined();

    await act(async () => {
      addBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  });
});
