import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, useState } from 'react';
import { SearchHub } from './SearchHub';
import { LanguageProvider } from '../../context/LanguageContext';
import { apiService } from '../../services/api';
import type { AiSearchResponse, SemanticSearchSnapshot } from '../../types/aiSearch';

vi.mock('../../services/api', () => ({
  apiService: {
    search: vi.fn().mockResolvedValue([]),
    addSearch: vi.fn().mockResolvedValue({}),
    executeAiSearch: vi.fn(),
  },
}));

const mockResponse: AiSearchResponse = {
  plan: {
    terms: ['storm'],
    mode: 'words',
    operator: 'or',
    scope: 'bible',
    book: null,
    rationale: 'Search for storm passages',
  },
  search: {
    verses: [
      {
        id: 'v1',
        translationId: 'web',
        bookId: 'MAT',
        chapter: 8,
        verse: 26,
        text: 'Then he rebuked the winds and the sea.',
      },
      {
        id: 'v2',
        translationId: 'web',
        bookId: 'HEB',
        chapter: 11,
        verse: 1,
        text: 'Now faith is the assurance of things hoped for.',
      },
    ],
  },
  summary: null,
};

describe('SearchHub', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  it('renders mode switch pills with mobile-friendly grid and touch targets', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <SearchHub translation="web" />
        </LanguageProvider>
      );
    });

    const buttons = Array.from(container!.querySelectorAll('button'));
    const lexicalBtn = buttons.find((b) => b.textContent?.includes('Perinteinen') || b.textContent?.includes('Lexical'));
    const semanticBtn = buttons.find((b) => b.textContent?.includes('Semanttinen') || b.textContent?.includes('Semantic'));

    expect(lexicalBtn).toBeDefined();
    expect(semanticBtn).toBeDefined();

    // Responsive 2-column container on mobile
    const pillsContainer = container!.querySelector('.grid.grid-cols-2');
    expect(pillsContainer).not.toBeNull();
  });

  it('preserves semantic search results through SearchHub parent round-trip unmount and remount', async () => {
    vi.mocked(apiService.executeAiSearch).mockResolvedValue(mockResponse);

    function TestHarness() {
      const [snapshot, setSnapshot] = useState<SemanticSearchSnapshot | null>(null);
      const [mounted, setMounted] = useState(true);

      return (
        <div>
          <button data-testid="toggle-mount" onClick={() => setMounted((m) => !m)}>
            Toggle Mount
          </button>
          {mounted && (
            <SearchHub
              translation="web"
              initialTab="semantic"
              loadedSemanticData={snapshot}
              onSemanticSearchCompleted={setSnapshot}
              onSemanticCurationCommitted={(data) => {
                setSnapshot((current) => current ? { ...current, data } : current);
              }}
            />
          )}
        </div>
      );
    }

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <TestHarness />
        </LanguageProvider>
      );
    });

    // Find suggestion chip in semantic tab and trigger search
    const chip = Array.from(container!.querySelectorAll('button')).find((b) =>
      /Armor of God|Jumalan taisteluvarustus/.test(b.textContent ?? '')
    );
    expect(chip).toBeDefined();

    await act(async () => {
      chip!.click();
    });

    // Verify verse results are rendered
    expect(container!.textContent).toContain('Then he rebuked the winds and the sea.');
    expect(container!.textContent).toContain('Now faith is the assurance of things hoped for.');

    const v1Card = container!.querySelector('[data-testid="curated-verse-v1"]') as HTMLElement;
    const v2Card = container!.querySelector('[data-testid="curated-verse-v2"]') as HTMLElement;
    const acceptV1 = v1Card.querySelector('button[aria-label*="Accept"], button[aria-label*="Hyväksy"]') as HTMLButtonElement;
    const rejectV2 = v2Card.querySelector('button[aria-label*="Reject"], button[aria-label*="Hylkää"]') as HTMLButtonElement;
    act(() => {
      acceptV1.click();
      rejectV2.click();
    });

    const commitBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      /Apply selection|Toteuta valinnat/.test(b.textContent ?? '')
    );
    expect(commitBtn).toBeDefined();
    act(() => {
      commitBtn!.click();
    });

    expect(container!.textContent).toContain('Then he rebuked the winds and the sea.');
    expect(container!.textContent).not.toContain('Now faith is the assurance of things hoped for.');

    const toggleBtn = container!.querySelector('[data-testid="toggle-mount"]') as HTMLButtonElement;

    // Simulate navigating away (e.g. to Reader view) -> SearchHub unmounts
    act(() => {
      toggleBtn.click();
    });
    expect(container!.textContent).not.toContain('Then he rebuked the winds and the sea.');

    // Simulate navigating back (e.g. browser Back button) -> SearchHub remounts
    act(() => {
      toggleBtn.click();
    });

    // Verify restored state in remounted SearchHub
    const input = container!.querySelector('input[name="query"]') as HTMLInputElement;
    expect(input.value).toMatch(/Armor of God|Jumalan taisteluvarustus/);
    expect(container!.textContent).toContain('Then he rebuked the winds and the sea.');
    expect(container!.textContent).not.toContain('Now faith is the assurance of things hoped for.');
    expect(container!.textContent).toContain('MAT 8:26');
  });
});
