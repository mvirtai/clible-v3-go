import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MarkdownCell } from './MarkdownCell';
import { clearISLAPromiseCache } from '../isla/islaCache';
import { LanguageProvider } from '../../../context/LanguageContext';

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

  it('renders standard markdown text with single bracket [ref] and handles edit mode', async () => {
    const cell = {
      id: 'cell-m1',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: '# Title\n\nSome text with [Joh 3:16] and [[Room 8:28]] links, plus [External Link](https://example.com).',
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
    expect(container?.textContent).toContain('Room 8:28');
    expect(container?.textContent).toContain('External Link');

    // Verse link click triggers onSelectVerse
    const verseLink = Array.from(container?.querySelectorAll('a') ?? []).find(
      (a) => a.textContent === 'Joh 3:16'
    );
    expect(verseLink).toBeDefined();
    await act(async () => {
      verseLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(onSelectVerse).toHaveBeenCalledWith('Joh 3:16');

    // External link has target="_blank"
    const externalLink = Array.from(container?.querySelectorAll('a') ?? []).find(
      (a) => a.textContent === 'External Link'
    );
    expect(externalLink?.getAttribute('href')).toBe('https://example.com');
    expect(externalLink?.getAttribute('target')).toBe('_blank');

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

  it('renders ISLABlock with functional syntax: ! search("armo") => at(ROM) => use(KR92)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'search',
            data: {
              query: 'armo',
              translation: 'fin-1992',
              scope_book: 'ROM',
              verses: [
                {
                  id: 'fin-1992:ROM:1:7',
                  translationId: 'fin-1992',
                  bookId: 'ROM',
                  chapter: 1,
                  verse: 7,
                  text: 'Armoa teille ja rauhaa Jumalalta.',
                },
              ],
            },
          }),
      })
    );

    const cell = {
      id: 'cell-m6',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: '! search("armo") => at(ROM) => use(KR92)',
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell cell={cell} onChange={() => {}} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Armoa teille ja rauhaa Jumalalta.');
  });

  it('renders ISLABlock with context count: ! ^ => count(words) and passes contextText', async () => {
    const calls: Array<{ query?: string; contextText?: string }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, init) => {
        if (init?.body) {
          calls.push(JSON.parse(init.body as string));
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              type: 'count',
              data: {
                target_type: 'context',
                count: 6,
                unit: 'words',
              },
            }),
        });
      })
    );

    const cell = {
      id: 'cell-m7',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: 'Tämä on muistiinpanoni tekstiä.\n\n! ^ => count(words)',
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell cell={cell} onChange={() => {}} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('6');
    expect(container?.textContent).toContain('sanaa');
    expect(calls[0]?.query).toBe('^ => count(words)');
    expect(calls[0]?.contextText).toBe('Tämä on muistiinpanoni tekstiä.');
  });

  it('strips all embedded and preceding ISLA directives from contextText', async () => {
    const calls: Array<{ query?: string; contextText?: string }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, init) => {
        if (init?.body) {
          calls.push(JSON.parse(init.body as string));
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              type: 'count',
              data: {
                target_type: 'context',
                count: 8,
                unit: 'words',
              },
            }),
        });
      })
    );

    const cell = {
      id: 'cell-m8',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: '! Hes 1:26-28\nTämä on oikeaa muistiinpanotekstiä.\n! ^ => count(words)',
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell
            cell={cell}
            onChange={() => {}}
            contextText={'! @Joh 3:16\nEdellisen solun muistiinpano.'}
          />
        </LanguageProvider>
      );
    });

    const countCall = calls.find((c) => c.query === '^ => count(words)');
    expect(countCall?.contextText).toBe(
      'Edellisen solun muistiinpano.\n\nTämä on oikeaa muistiinpanotekstiä.'
    );
  });

  it('opens ISLAEditor with syntax layer and execute button when editing an ISLA cell', async () => {
    const cell = {
      id: 'cell-isla-1',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: '! @Joh 3:16 => web',
    };
    const onChange = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell cell={cell} onChange={onChange} />
        </LanguageProvider>
      );
    });

    // Double click to open edit mode
    const markdownDiv = container?.querySelector('div.prose');
    if (markdownDiv) {
      await act(async () => {
        markdownDiv.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      });
    }

    // ISLAEditor is rendered
    expect(container?.querySelector('div.group\\/isla-editor')).not.toBeNull();
    expect(container?.querySelector('[aria-hidden="true"]')).not.toBeNull();
    const executeBtn = container?.querySelector('button[aria-label="Suorita ISLA-komento"]');
    expect(executeBtn).not.toBeNull();

    // Clicking execute calls onChange and exits edit mode
    await act(async () => {
      (executeBtn as HTMLButtonElement)?.click();
    });
    expect(onChange).toHaveBeenCalledWith('! @Joh 3:16 => web');
    expect(container?.querySelector('div.group\\/isla-editor')).toBeNull();
  });

  it('triggers onOutputRoute when clicking the route button on an outputOp banner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'verses',
            data: {
              verses: [
                {
                  id: 'v1',
                  ref: 'Joh 3:16',
                  book: 'Joh',
                  chapter: 3,
                  verse: 16,
                  translationId: 'kr92',
                  text: 'Sillä niin on Jumala...',
                },
              ],
              output_op: {
                kind: 'cell_below',
                name: '#uusi-solu',
                raw: '>> #uusi-solu',
              },
            },
          }),
      })
    );

    const cell = {
      id: 'cell-route-1',
      notebookId: 'nb-1',
      type: 'markdown' as const,
      content: '! @Joh 3:16 >> #uusi-solu',
    };
    const onOutputRoute = vi.fn();
    const onChange = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <MarkdownCell cell={cell} onChange={onChange} onOutputRoute={onOutputRoute} />
        </LanguageProvider>
      );
    });

    // Verify output badge displays the target slug without manual button
    expect(container?.textContent).toContain('#uusi-solu');
    expect(container?.textContent).toContain('Alapuolelle');

    // Double-click into edit mode
    const proseDiv = container?.querySelector('div.prose');
    await act(async () => {
      proseDiv?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    });

    // Execute ISLA command
    const runBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (b) => b.textContent?.trim() === '▶'
    );
    expect(runBtn).toBeDefined();

    await act(async () => {
      runBtn?.click();
    });

    // onOutputRoute is triggered automatically and the current cell is formatted with a routing notice
    expect(onOutputRoute).toHaveBeenCalledWith('below', '#uusi-solu', '! @Joh 3:16');
    expect(onChange).toHaveBeenCalledWith(
      expect.stringContaining('Tulos reititetty uuteen soluun (alapuolelle): `#uusi-solu`')
    );
  });
});

