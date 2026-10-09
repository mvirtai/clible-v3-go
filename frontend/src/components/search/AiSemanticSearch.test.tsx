import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { AiSemanticSearch } from './AiSemanticSearch';
import { LanguageProvider } from '../../context/LanguageContext';
import { apiService } from '../../services/api';
import type { AiSearchResponse } from '../../types/aiSearch';

vi.mock('../../services/api', () => ({
  apiService: {
    executeAiSearch: vi.fn(),
    saveSearch: vi.fn().mockResolvedValue({}),
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
    ],
  },
  summary: null,
};

describe('AiSemanticSearch state retention', () => {
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

  it('restores query and results from loadedData when translation matches', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <AiSemanticSearch
            translation="web"
            loadedData={{ query: 'calming the storm', translationId: 'web', data: mockResponse }}
          />
        </LanguageProvider>,
      );
    });

    const input = container!.querySelector('input[name="query"]') as HTMLInputElement;
    expect(input.value).toBe('calming the storm');
    expect(container!.textContent).toContain('Then he rebuked the winds and the sea.');
    expect(container!.textContent).toContain('MAT 8:26');
  });

  it('discards retained results produced by a different translation', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <AiSemanticSearch
            translation="fin-1992"
            loadedData={{ query: 'calming the storm', translationId: 'web', data: mockResponse }}
          />
        </LanguageProvider>,
      );
    });

    const input = container!.querySelector('input[name="query"]') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(container!.textContent).not.toContain('Then he rebuked the winds and the sea.');
  });

  it('reports completed searches to the parent via onSearchCompleted', async () => {
    vi.mocked(apiService.executeAiSearch).mockResolvedValue(mockResponse);
    const onSearchCompleted = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <AiSemanticSearch translation="web" onSearchCompleted={onSearchCompleted} />
        </LanguageProvider>,
      );
    });

    // Suggestion chips trigger the same action as the form submit.
    const chip = Array.from(container!.querySelectorAll('button')).find((b) =>
      /Armor of God|Jumalan taisteluvarustus/.test(b.textContent ?? ''),
    );
    expect(chip).toBeDefined();

    await act(async () => {
      chip!.click();
    });

    expect(onSearchCompleted).toHaveBeenCalledTimes(1);
    const arg = onSearchCompleted.mock.calls[0][0];
    expect(arg.data).toBe(mockResponse);
    expect(arg.translationId).toBe('web');
    expect(arg.query).toMatch(/Armor of God|Jumalan taisteluvarustus/);
  });

  describe('verse curation and triage integration', () => {
    const multiVerseResponse: AiSearchResponse = {
      plan: {
        terms: ['faith'],
        mode: 'words',
        operator: 'or',
        scope: 'bible',
        book: null,
        rationale: 'Search for faith passages',
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

    it('filters verses by accepted status and saves curated verses to workspace', async () => {
      act(() => {
        root = createRoot(container!);
        root.render(
          <LanguageProvider>
            <AiSemanticSearch
              translation="web"
              activeScopeId="scope-123"
              loadedData={{ query: 'faith', translationId: 'web', data: multiVerseResponse }}
            />
          </LanguageProvider>,
        );
      });

      // Both cards are rendered initially
      expect(container!.textContent).toContain('MAT 8:26');
      expect(container!.textContent).toContain('HEB 11:1');

      // Click accept on first verse card (v1)
      const v1Card = container!.querySelector('[data-testid="curated-verse-v1"]') as HTMLElement;
      expect(v1Card).not.toBeNull();
      const acceptBtn = v1Card.querySelector('button[aria-label*="Accept"], button[aria-label*="Hyväksy"]') as HTMLButtonElement;
      expect(acceptBtn).not.toBeNull();
      act(() => {
        acceptBtn.click();
      });

      expect(v1Card.getAttribute('data-status')).toBe('accepted');

      // Switch tab to "Accepted"
      const buttons = Array.from(container!.querySelectorAll('button'));
      const acceptedTab = buttons.find((b) => /Accepted|Hyväksytyt/.test(b.textContent ?? ''));
      expect(acceptedTab).toBeDefined();

      act(() => {
        acceptedTab!.click();
      });

      // Now only v1 is displayed in the list
      expect(container!.querySelector('[data-testid="curated-verse-v1"]')).not.toBeNull();
      expect(container!.querySelector('[data-testid="curated-verse-v2"]')).toBeNull();

      // Submit save search form
      const titleInput = container!.querySelector('input[name="title"]') as HTMLInputElement;
      expect(titleInput).not.toBeNull();
      titleInput.value = 'Faith Search';

      const saveForm = titleInput.closest('form') as HTMLFormElement;
      expect(saveForm).not.toBeNull();
      const saveSubmitBtn = saveForm.querySelector('button[type="submit"]') as HTMLButtonElement;

      await act(async () => {
        if (typeof saveForm.requestSubmit === 'function') {
          saveForm.requestSubmit(saveSubmitBtn);
        } else {
          saveSubmitBtn.click();
        }
      });

      expect(apiService.saveSearch).toHaveBeenCalledTimes(1);
      const savePayload = vi.mocked(apiService.saveSearch).mock.calls[0][0];
      expect(savePayload.scopeId).toBe('scope-123');

      const parsedResult = JSON.parse(savePayload.resultJson);
      expect(parsedResult.search.verses).toHaveLength(1);
      expect(parsedResult.search.verses[0].id).toBe('v1');
    });

    it('accept all button marks all verses as accepted', () => {
      act(() => {
        root = createRoot(container!);
        root.render(
          <LanguageProvider>
            <AiSemanticSearch
              translation="web"
              loadedData={{ query: 'faith', translationId: 'web', data: multiVerseResponse }}
            />
          </LanguageProvider>,
        );
      });

      const acceptAllBtn = container!.querySelector('button[title*="Accept all"], button[title*="Hyväksy kaikki"]') as HTMLButtonElement;
      expect(acceptAllBtn).not.toBeNull();

      act(() => {
        acceptAllBtn.click();
      });

      const v1Card = container!.querySelector('[data-testid="curated-verse-v1"]') as HTMLElement;
      const v2Card = container!.querySelector('[data-testid="curated-verse-v2"]') as HTMLElement;
      expect(v1Card.getAttribute('data-status')).toBe('accepted');
      expect(v2Card.getAttribute('data-status')).toBe('accepted');
    });
  });
});
