import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { CellVersesResult, type VersesResultData } from './CellVersesResult';
import { LanguageProvider } from '../../context/LanguageContext';

describe('CellVersesResult', () => {
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

  it('renders empty message when no verses found', async () => {
    const data: VersesResultData = {
      reference: 'John 99:1',
      verses: [],
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellVersesResult data={data} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('John 99:1');
  });

  it('renders verses with citations, verse-text class, and handles selection toggle', async () => {
    const onToggle = vi.fn();
    const data: VersesResultData = {
      reference: 'Joh 3:16',
      verses: [
        {
          id: 'web:JHN:3:16',
          translationId: 'web',
          bookId: 'JHN',
          chapter: 3,
          verse: 16,
          text: 'For God so loved the world...',
        },
      ],
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellVersesResult
            data={data}
            deselectedVerseIds={{}}
            onToggleVerse={onToggle}
          />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Joh. 3:16 (WEB)');
    expect(container?.textContent).toContain('For God so loved the world...');

    const verseTextEl = container?.querySelector('.verse-text');
    expect(verseTextEl).not.toBeNull();

    // Click to toggle
    const item = container?.querySelector('.group');
    expect(item).not.toBeNull();
    item?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToggle).toHaveBeenCalledWith('web:JHN:3:16');
  });

  it('renders search query and keywords', async () => {
    const data: VersesResultData = {
      query: 'light',
      keywords: ['grace', 'truth'],
      verses: [
        {
          id: 'web:GEN:1:3',
          translationId: 'web',
          bookId: 'GEN',
          chapter: 1,
          verse: 3,
          text: 'Let there be light.',
        },
      ],
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellVersesResult data={data} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('"light"');
    expect(container?.textContent).toContain('#grace');
    expect(container?.textContent).toContain('#truth');
    expect(container?.textContent).toContain('Let there be light.');
  });
});
