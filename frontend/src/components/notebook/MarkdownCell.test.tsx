import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MarkdownCell } from './MarkdownCell';
import { clearISLAPromiseCache } from './islaCache';
import { LanguageProvider } from '../../context/LanguageContext';

describe('MarkdownCell', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    clearISLAPromiseCache();
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
    vi.restoreAllMocks();
  });

  it('renders standard markdown text and handles edit mode', async () => {
    const cell = {
      id: 'cell-m1',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: '# Title\n\nSome text with [[Joh 3:16]] link.',
    };
    const onChange = vi.fn();
    const onSelectVerse = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell
            cell={cell}
            onChange={onChange}
            onSelectVerse={onSelectVerse}
          />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Title');
    expect(container?.textContent).toContain('Joh 3:16');

    // Double clicking markdown opens edit mode
    const markdownDiv = container?.querySelector('div.prose');
    if (markdownDiv) {
      await act(async () => {
        markdownDiv.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      });
      expect(container?.querySelector('textarea')).not.toBeNull();
    }
  });

  it('renders ISLABlock when code block has language isla or magic', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'read',
            data: {
              reference: 'Joh 3:16',
              verses: [
                {
                  id: 'web:JHN:3:16',
                  translationId: 'web',
                  bookId: 'JHN',
                  chapter: 3,
                  verse: 16,
                  text: 'For God so loved the world.',
                },
              ],
            },
          }),
      })
    );

    const cell = {
      id: 'cell-m2',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: 'Here is verse:\n\n```isla\n@Joh 3:16 => web\n```',
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell cell={cell} onChange={() => {}} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Here is verse:');
    expect(container?.textContent).toContain('For God so loved the world.');
  });

  it('renders ISLABlock with quick line directive !isla and !@', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'read',
            data: {
              reference: 'Joh 3:16',
              verses: [
                {
                  id: 'web:JHN:3:16',
                  translationId: 'web',
                  bookId: 'JHN',
                  chapter: 3,
                  verse: 16,
                  text: 'For God so loved the world.',
                },
              ],
            },
          }),
      })
    );

    const cell = {
      id: 'cell-m3',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: 'Quick note:\n\n!@Joh 3:16 => web\n\nAnd another:\n!isla @Joh 3:16 => web',
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell cell={cell} onChange={() => {}} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Quick note:');
    expect(container?.textContent).toContain('For God so loved the world.');
  });

  it('renders ISLABlock with inline shortcut `!isla @Joh 3:16`', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'read',
            data: {
              reference: 'Joh 3:16',
              verses: [
                {
                  id: 'web:JHN:3:16',
                  translationId: 'web',
                  bookId: 'JHN',
                  chapter: 3,
                  verse: 16,
                  text: 'For God so loved the world.',
                },
              ],
            },
          }),
      })
    );

    const cell = {
      id: 'cell-m4',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: 'Inline passage `!isla @Joh 3:16 => web` inside text.',
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell cell={cell} onChange={() => {}} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Inline passage');
    expect(container?.textContent).toContain('For God so loved the world.');
  });

  it('renders ISLABlock with count metric shorthand and mid-line placement', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'count',
            data: {
              target_type: 'search',
              query: 'armo',
              scope_book: 'ut',
              count: 51,
              translation: 'kr92',
            },
          }),
      })
    );

    const cell = {
      id: 'cell-m5',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: 'Count / Match Metric: !# "armo" @ut',
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell cell={cell} onChange={() => {}} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Count / Match Metric:');
    expect(container?.textContent).toContain('51');
    expect(container?.textContent).toContain('@ut');
  });
});
