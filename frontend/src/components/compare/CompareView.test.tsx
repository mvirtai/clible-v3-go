import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { CompareView } from './CompareView';
import { LanguageProvider } from '../../context/LanguageContext';
import type { ComparisonResult, InstalledTranslation } from '../../types/bible';

describe('CompareView', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mockTranslations: InstalledTranslation[] = [
    {
      id: 'fin-1992',
      name: 'Finnish 1992',
      language: 'fi',
      format: 'xml',
      installed: true,
      sourceUrl: '',
      installedAt: '2026-01-01T00:00:00Z',
      isGlobal: true,
    },
    {
      id: 'web',
      name: 'World English Bible',
      language: 'en',
      format: 'xml',
      installed: true,
      sourceUrl: '',
      installedAt: '2026-01-01T00:00:00Z',
      isGlobal: true,
    },
  ];

  const mockComparisonResult: ComparisonResult = {
    reference: 'John 3:16',
    translationA: 'fin-1992',
    translationB: 'web',
    summary: {
      totalVerses: 1,
      fullyAlignedVerses: 1,
      averageSimilarity: 0.85,
      exactMatches: 0,
      exactMatchRatio: 0,
      topSharedWords: [{ name: 'Jumala', value: 1 }],
      mostSimilarVerseRef: 'JHN 3:16',
    },
    alignedVerses: [
      {
        bookId: 'JHN',
        chapter: 3,
        verse: 16,
        textA: 'Sillä niin on Jumala maailmaa rakastanut',
        textB: 'For God so loved the world',
        similarity: 0.85,
        exactMatch: false,
      },
    ],
  };

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

  it('renders control panel with reference input and translation pickers', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CompareView installedTranslations={mockTranslations} />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Käännösvertailu');
    expect(container?.querySelector('input[type="text"]')).not.toBeNull();
  });

  it('renders both mobile stacked cards and desktop table when comparison result is loaded', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CompareView
            installedTranslations={mockTranslations}
            loadedSavedComparison={{
              result: mockComparisonResult,
              reference: 'John 3:16',
              translationA: 'fin-1992',
              translationB: 'web',
            }}
          />
        </LanguageProvider>
      );
    });

    // Verify mobile stacked container
    const mobileContainer = container?.querySelector('.md\\:hidden');
    expect(mobileContainer).not.toBeNull();
    expect(mobileContainer?.textContent).toContain('Sillä niin on Jumala maailmaa rakastanut');
    expect(mobileContainer?.textContent).toContain('For God so loved the world');

    // Verify desktop table container
    const desktopContainer = container?.querySelector('.hidden.md\\:block');
    expect(desktopContainer).not.toBeNull();
    expect(desktopContainer?.querySelector('table')).not.toBeNull();
  });

  it('prefills activeReference when passed as prop', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CompareView
            installedTranslations={mockTranslations}
            activeReference="Romans 8:28"
          />
        </LanguageProvider>
      );
    });

    const input = container?.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Romans 8:28');
  });

  it('clears input when pressing Enter on pristine field in CompareView', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CompareView
            installedTranslations={mockTranslations}
            activeReference="Romans 8:28"
          />
        </LanguageProvider>
      );
    });

    const input = container?.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Romans 8:28');

    act(() => {
      input.focus();
    });

    act(() => {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(enterEvent);
    });

    expect(input.value).toBe('');
  });

  it('replaces full input with first typed character when pristine in CompareView', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CompareView
            installedTranslations={mockTranslations}
            activeReference="Romans 8:28"
          />
        </LanguageProvider>
      );
    });

    const input = container?.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Romans 8:28');

    act(() => {
      input.focus();
    });

    act(() => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'm',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(keyEvent);
    });

    expect(input.value).toBe('m');
  });

  it('clears reference when clear button is clicked', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CompareView
            installedTranslations={mockTranslations}
            activeReference="Romans 8:28"
          />
        </LanguageProvider>
      );
    });

    const input = container?.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).toBe('Romans 8:28');

    const clearBtn = container?.querySelector('button[aria-label="Clear input"]') as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();

    act(() => {
      clearBtn.click();
    });

    expect(input.value).toBe('');
  });
});
