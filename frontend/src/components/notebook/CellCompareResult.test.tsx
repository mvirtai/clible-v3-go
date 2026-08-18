import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { LanguageProvider } from '../../context/LanguageContext';
import { CellCompareResult, type CompareResultData } from './CellCompareResult';

const mockData: CompareResultData = {
  reference: 'Joh 3:16',
  left: {
    translation: 'KR92',
    verses: [
      {
        id: 'joh-3-16-kr92',
        bookId: 'JHN',
        chapter: 3,
        verse: 16,
        text: 'Sillä niin on Jumala maailmaa rakastanut...',
        translationId: 'fin-1992',
      },
    ],
  },
  right: {
    translation: 'KJV',
    verses: [
      {
        id: 'joh-3-16-kjv',
        bookId: 'JHN',
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world...',
        translationId: 'kjv',
      },
    ],
  },
};

describe('CellCompareResult', () => {
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

  it('renders side-by-side translation comparison correctly', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCompareResult data={mockData} />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('Joh 3:16');
    expect(content).toContain('KR92');
    expect(content).toContain('KJV');
    expect(content).toContain('Joh. 3:16');
    expect(content).toContain('Sillä niin on Jumala maailmaa rakastanut...');
    expect(content).toContain('For God so loved the world...');
  });

  it('renders asymmetrical verse rows with dash placeholder', () => {
    const asymmetricalData: CompareResultData = {
      reference: 'Ps 23:1-2',
      left: {
        translation: 'KR92',
        verses: [
          { id: 'ps-23-1-kr92', bookId: 'PSA', chapter: 23, verse: 1, text: 'Herra on minun paimeneni', translationId: 'fin-1992' },
          { id: 'ps-23-2-kr92', bookId: 'PSA', chapter: 23, verse: 2, text: 'Viheriäisille niityille...', translationId: 'fin-1992' },
        ],
      },
      right: {
        translation: 'KJV',
        verses: [
          { id: 'ps-23-1-kjv', bookId: 'PSA', chapter: 23, verse: 1, text: 'The LORD is my shepherd', translationId: 'kjv' },
        ],
      },
    };

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCompareResult data={asymmetricalData} />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('Ps 23:1-2');
    expect(content).toContain('Herra on minun paimeneni');
    expect(content).toContain('The LORD is my shepherd');
    expect(content).toContain('Viheriäisille niityille...');
    expect(content).toContain('—');
  });

  it('triggers onToggleVerse for both verses when clicking a row', () => {
    const handleToggle = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCompareResult data={mockData} onToggleVerse={handleToggle} />
        </LanguageProvider>
      );
    });

    const clickableRow = container?.querySelector('.cursor-pointer') as HTMLDivElement;
    expect(clickableRow).not.toBeNull();

    act(() => {
      clickableRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleToggle).toHaveBeenCalledTimes(2);
    expect(handleToggle).toHaveBeenCalledWith('joh-3-16-kr92');
    expect(handleToggle).toHaveBeenCalledWith('joh-3-16-kjv');
  });

  it('renders deselected style when verse IDs are marked in deselectedVerseIds', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCompareResult
            data={mockData}
            deselectedVerseIds={{ 'joh-3-16-kr92': true, 'joh-3-16-kjv': true }}
          />
        </LanguageProvider>
      );
    });

    const row = container?.querySelector('.cursor-pointer') as HTMLDivElement;
    expect(row).not.toBeNull();
    expect(row.className).toContain('opacity-40');
    expect(row.innerHTML).toContain('line-through');
  });

  it('handles empty verses list gracefully without errors', () => {
    const emptyData: CompareResultData = {
      reference: 'Empty 1:1',
      left: { translation: 'KR92', verses: [] },
      right: { translation: 'KJV', verses: [] },
    };

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCompareResult data={emptyData} />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('Empty 1:1');
    expect(content).toContain('KR92');
    expect(content).toContain('KJV');
  });
});
