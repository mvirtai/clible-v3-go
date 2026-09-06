import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { LanguageProvider } from '../../../context/LanguageContext';
import { CellCountResult } from './CellCountResult';

describe('CellCountResult', () => {
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

  it('renders search count result with regex correctly', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCountResult
            data={{
              target_type: 'search',
              query: 'opetuslaps.*',
              is_regex: true,
              count: 268,
              translation: 'KR92',
            }}
          />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('/opetuslaps.*/');
    expect(content).toContain('268');
    expect(content).toContain('KR92');
  });

  it('renders reference count result for verses correctly', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCountResult
            data={{
              target_type: 'reference',
              reference: 'Room 8',
              count: 39,
              translation: 'KR92',
            }}
          />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('Room 8');
    expect(content).toContain('39');
  });

  it('renders singular hit label when count is 1', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCountResult
            data={{
              target_type: 'search',
              query: 'Melkisedek',
              is_regex: false,
              count: 1,
              translation: 'KR92',
            }}
          />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('"Melkisedek"');
    expect(content).toContain('1');
    expect(content).toContain('osuma');
  });

  it('renders search count result with book scope correctly', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCountResult
            data={{
              target_type: 'search',
              query: 'armo',
              is_regex: false,
              scope_book: 'Room',
              count: 24,
              translation: 'KR92',
            }}
          />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('"armo"');
    expect(content).toContain('@Room');
    expect(content).toContain('24');
    expect(content).toContain('osumaa');
  });

  it('renders custom unit labels correctly for books, chapters, verses, and words', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellCountResult
            data={{
              target_type: 'search',
              query: 'armo',
              count: 5,
              unit: 'books',
              translation: 'KR92',
            }}
          />
        </LanguageProvider>
      );
    });

    let content = container?.textContent || '';
    expect(content).toContain('5');
    expect(content).toContain('kirjaa');

    act(() => {
      root?.render(
        <LanguageProvider>
          <CellCountResult
            data={{
              target_type: 'search',
              query: 'armo',
              count: 1,
              unit: 'books',
              translation: 'KR92',
            }}
          />
        </LanguageProvider>
      );
    });
    content = container?.textContent || '';
    expect(content).toContain('1');
    expect(content).toContain('kirja');

    act(() => {
      root?.render(
        <LanguageProvider>
          <CellCountResult
            data={{
              target_type: 'search',
              query: 'rakkaus',
              count: 120,
              unit: 'words',
              translation: 'KR92',
            }}
          />
        </LanguageProvider>
      );
    });
    content = container?.textContent || '';
    expect(content).toContain('120');
    expect(content).toContain('sanaa');

    act(() => {
      root?.render(
        <LanguageProvider>
          <CellCountResult
            data={{
              target_type: 'search',
              query: 'rakkaus',
              count: 3,
              unit: 'chapters',
              translation: 'KR92',
            }}
          />
        </LanguageProvider>
      );
    });
    content = container?.textContent || '';
    expect(content).toContain('3');
    expect(content).toContain('lukua');
  });
});
