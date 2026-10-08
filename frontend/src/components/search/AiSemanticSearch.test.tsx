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
});
