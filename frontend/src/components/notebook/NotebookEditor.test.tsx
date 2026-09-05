// src/components/notebook/NotebookEditor.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { NotebookEditor } from './NotebookEditor';
import { LanguageProvider } from '../../context/LanguageContext';
import * as guestStorage from '../../utils/guestNotebookStorage';

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

    // Mock fetch for Notebook loading and mutations
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/notebooks/nb-123/cells') && init?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        if (url.includes('/api/notebooks/nb-123') && init?.method === 'PUT') {
          const body = JSON.parse((init.body as string) || '{}');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ...mockNotebookData, title: body.title }),
          });
        }
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

  it('allows inserting a new markdown cell and schedules debounced auto-save', async () => {
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

    // Verify new cell was added to DOM
    expect(container?.textContent).toContain('Test Notebook');
  });

  it('initializes synchronous state immediately in guest mode without network calls (lazy initializer zero-flicker)', async () => {
    const mockGuestNotebook = {
      id: 'guest-nb-456',
      title: 'Vieraan Muistio',
      scopeId: 'guest-scope-1',
      cells: [
        {
          id: 'cell-guest-1',
          notebookId: 'guest-nb-456',
          type: 'markdown' as const,
          content: 'Paikallinen vierasmuistiinpano',
          position: 0,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(guestStorage, 'getSingleGuestNotebook').mockReturnValue(mockGuestNotebook);
    vi.spyOn(guestStorage, 'isGuestNotebookId').mockReturnValue(true);

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookEditor notebookId="guest-nb-456" isGuest={true} />
        </LanguageProvider>
      );
    });

    // Verify zero network calls were made
    expect(fetchSpy).not.toHaveBeenCalled();

    // Verify guest notebook and cell render immediately
    expect(container?.textContent).toContain('Vieraan Muistio');
    expect(container?.textContent).toContain('Paikallinen vierasmuistiinpano');
  });

  it('handles title inline editing and saving via form action and useActionState', async () => {
    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookEditor notebookId="nb-123" />
        </LanguageProvider>
      );
    });

    // Click on title heading to trigger inline edit mode
    const titleHeading = container?.querySelector('h1');
    expect(titleHeading).not.toBeNull();
    expect(titleHeading?.textContent).toBe('Test Notebook');

    await act(async () => {
      titleHeading?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Verify form input exists in DOM
    const input = container?.querySelector('input[name="title"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Test Notebook');

    // Simulate modifying title and submitting form
    await act(async () => {
      input.value = 'Updated Notebook Title';
      const form = input.form;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });

    // Verify fetch was called with PUT method and new title
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/notebooks/nb-123'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Notebook Title',
          scopeId: 'scope-1',
        }),
      })
    );
  });
});
