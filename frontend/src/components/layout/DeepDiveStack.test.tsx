import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { DeepDiveStack } from './DeepDiveStack';
import { LanguageProvider } from '../../context/LanguageContext';
import type { DeepDiveEntry } from '../../types/ai';

describe('DeepDiveStack', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockEntries: DeepDiveEntry[] = [
    {
      id: 'entry-1',
      parentId: null,
      depth: 0,
      topic: 'Topic 1',
      text: 'First explanation body.',
      nextFocus: [],
    },
    {
      id: 'entry-2',
      parentId: 'entry-1',
      depth: 1,
      topic: 'Topic 2',
      text: 'Second explanation body.',
      nextFocus: [],
    },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders accordion with latest entry expanded and older collapsed by default', async () => {
    const onRemove = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveStack
            entries={mockEntries}
            pendingTopic={null}
            error={null}
            focusId={null}
            title="Deep Dive"
            onRemove={onRemove}
          />
        </LanguageProvider>,
      );
    });

    const toggleBtns = container.querySelectorAll('button[aria-expanded]');
    expect(toggleBtns).toHaveLength(2);

    // Entry 1 (older) is collapsed
    expect(toggleBtns[0]?.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('First explanation body.');

    // Entry 2 (latest) is expanded
    expect(toggleBtns[1]?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Second explanation body.');
  });

  it('allows toggling older entry open', async () => {
    const onRemove = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveStack
            entries={mockEntries}
            pendingTopic={null}
            error={null}
            focusId={null}
            title="Deep Dive"
            onRemove={onRemove}
          />
        </LanguageProvider>,
      );
    });

    const toggleBtns = container.querySelectorAll('button[aria-expanded]');
    await act(async () => {
      (toggleBtns[0] as HTMLButtonElement).click();
    });

    // Now Entry 1 is also expanded
    expect(toggleBtns[0]?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('First explanation body.');
  });

  it('respects focusId and expands the targeted entry', async () => {
    const onRemove = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveStack
            entries={mockEntries}
            pendingTopic={null}
            error={null}
            focusId="entry-1"
            title="Deep Dive"
            onRemove={onRemove}
          />
        </LanguageProvider>,
      );
    });

    const toggleBtns = container.querySelectorAll('button[aria-expanded]');
    // Entry 1 is focused -> expanded
    expect(toggleBtns[0]?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('First explanation body.');

    // Entry 2 is not focused -> collapsed
    expect(toggleBtns[1]?.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders pending skeleton and error states', async () => {
    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveStack
            entries={[]}
            pendingTopic="Covenant"
            error={new Error('Network error')}
            focusId={null}
            title="Deep Dive"
            onRemove={vi.fn()}
          />
        </LanguageProvider>,
      );
    });

    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.textContent).toContain('Covenant');
    expect(container.textContent).toContain('Network error');
  });

  it('renders breadcrumb and invokes onPick with parentId for child selections', async () => {
    const onRemove = vi.fn();
    const onPick = vi.fn();
    const entriesWithNextFocus: DeepDiveEntry[] = [
      {
        id: 'entry-1',
        parentId: null,
        depth: 0,
        topic: 'Root Topic',
        text: 'Root content',
        nextFocus: [{ label: 'Child Topic', kind: 'theme', reason: 'learn more' }],
      },
      {
        id: 'entry-2',
        parentId: 'entry-1',
        depth: 1,
        topic: 'Child Topic',
        text: 'Child content',
        nextFocus: [{ label: 'Grandchild', kind: 'theme', reason: 'deep dive' }],
      },
    ];

    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveStack
            entries={entriesWithNextFocus}
            pendingTopic={null}
            error={null}
            focusId="entry-2"
            title="Deep Dive"
            onRemove={onRemove}
            onPick={onPick}
          />
        </LanguageProvider>,
      );
    });

    // Entry 2 is focused, so its path is Root Topic › Child Topic
    const breadcrumb = container.querySelector('nav');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb?.textContent).toContain('Root Topic');
    expect(breadcrumb?.textContent).toContain('Child Topic');

    // Click child topic's NextFocusChip
    const chip = container.querySelector('button[title*="deep dive"]') as HTMLButtonElement;
    expect(chip).not.toBeNull();
    await act(async () => {
      chip.click();
    });
    expect(onPick).toHaveBeenCalledWith(
      { label: 'Grandchild', kind: 'theme', reason: 'deep dive' },
      'entry-2',
    );
  });
});
