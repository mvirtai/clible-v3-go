// src/components/VerseReader.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { VerseReader } from './VerseReader';
import { apiService } from '../services/api';
import { LanguageProvider } from '../context/LanguageContext';

vi.mock('../services/api', () => ({
  apiService: {
    getVerses: vi.fn(),
  },
}));

const mockChapterData = {
  reference: 'JHN 3',
  text: 'For God so loved the world...',
  translationName: 'World English Bible',
  verses: [
    { bookName: 'JHN', chapter: 3, verse: 16, text: 'For God so loved the world...' },
    { bookName: 'JHN', chapter: 3, verse: 17, text: 'For God did not send his Son...' },
  ],
};

const mockVerseData = {
  reference: 'JHN 3:16',
  text: 'For God so loved the world...',
  translationName: 'World English Bible',
  verses: [
    { bookName: 'JHN', chapter: 3, verse: 16, text: 'For God so loved the world...' },
  ],
};

describe('VerseReader', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.restoreAllMocks();
    localStorage.removeItem('app:lang');
  });

  afterEach(() => {
    if (root) {
      root.unmount();
      root = null;
    }
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('uses the global language setting for the reader UI even with a Finnish translation', async () => {
    localStorage.setItem('app:lang', 'en');
    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(
        <LanguageProvider>
          <VerseReader translation="fi-1992" />
        </LanguageProvider>,
      );
    });

    expect(container!.textContent).toContain('Read by Reference');
  });

  it('fetches and renders verses when activeReference changes', async () => {
    vi.mocked(apiService.getVerses).mockResolvedValue(mockChapterData);

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(<VerseReader translation="web" activeReference="JHN 3" />);
    });

    // Wait for the effect and promise resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(apiService.getVerses).toHaveBeenCalledWith('JHN 3', 'web');
    expect(container!.textContent).toContain('Evankeliumi Johanneksen mukaan 3');
    expect(container!.textContent).toContain('For God so loved the world');
    expect(container!.textContent).toContain('For God did not send his Son');
  });

  it('isolates a single verse on click and shows back-navigation button', async () => {
    vi.mocked(apiService.getVerses)
      .mockResolvedValueOnce(mockChapterData) // First load chapter
      .mockResolvedValueOnce(mockVerseData);  // Click load verse

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(<VerseReader translation="web" activeReference="JHN 3" />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Find the span elements representing verses
    const spans = Array.from(container!.querySelectorAll('span.cursor-pointer'));
    expect(spans.length).toBe(2);

    // Click the first verse (JHN 3:16)
    await act(async () => {
      (spans[0] as HTMLSpanElement).click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Check it queried JHN 3:16
    expect(apiService.getVerses).toHaveBeenLastCalledWith('JHN 3:16', 'web');
    expect(container!.textContent).toContain('Evankeliumi Johanneksen mukaan 3:16');

    // Confirm that the "Takaisin laajempaan tekstiin" button is visible with (JHN 3)
    const backBtn = container!.querySelector('button[type="button"]');
    expect(backBtn).toBeDefined();
    expect(backBtn!.textContent).toContain('Takaisin laajempaan tekstiin (JHN 3)');
  });

  it('returns to the previous broader text view when clicking back button', async () => {
    vi.mocked(apiService.getVerses)
      .mockResolvedValueOnce(mockChapterData) // First load chapter
      .mockResolvedValueOnce(mockVerseData)   // Click load verse
      .mockResolvedValueOnce(mockChapterData); // Click back button

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(<VerseReader translation="web" activeReference="JHN 3" />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const spans = Array.from(container!.querySelectorAll('span.cursor-pointer'));
    await act(async () => {
      (spans[0] as HTMLSpanElement).click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Find the back button and click it
    const buttons = Array.from(container!.querySelectorAll('button'));
    const backBtn = buttons.find(b => b.textContent?.includes('Takaisin laajempaan tekstiin'));
    expect(backBtn).toBeDefined();

    await act(async () => {
      backBtn!.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Should fetch the chapter again
    expect(apiService.getVerses).toHaveBeenLastCalledWith('JHN 3', 'web');
    // The back button should be gone now
    const backBtnAfter = Array.from(container!.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Takaisin laajempaan tekstiin'));
    expect(backBtnAfter).toBeUndefined();
  });

  it('renders poetry books with one verse per line', async () => {
    vi.mocked(apiService.getVerses).mockResolvedValue({
      reference: 'PSA 23',
      text: '...',
      translationName: 'World English Bible',
      verses: [
        { bookName: 'PSA', chapter: 23, verse: 1, text: 'The LORD is my shepherd...' },
        { bookName: 'PSA', chapter: 23, verse: 2, text: 'He makes me lie down...' },
      ],
    });

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(<VerseReader translation="web" activeReference="PSA 23" />);
    });
    await act(async () => { await Promise.resolve(); });

    // Runous-tilassa jae-elementit ovat <div>, eivät <span>
    const verseRows = container!.querySelectorAll('div.cursor-pointer');
    expect(verseRows.length).toBe(2);
  });

  it('renders GeminiUsage token counts when loadedSavedInsight contains usage metadata', async () => {
    const mockInsight = {
      text: 'Mocked insight text content',
      nextFocus: [],
      geminiUsageMetadata: {
        promptTokenCount: 150,
        candidatesTokenCount: 80,
        totalTokenCount: 230
      }
    };

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(
        <VerseReader 
          translation="web" 
          activeReference="JHN 3" 
          loadedSavedInsight={mockInsight} 
        />
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Verify token counts are rendered on screen
    expect(container!.textContent).toContain('Prompt: 150');
    expect(container!.textContent).toContain('Output: 80');
    expect(container!.textContent).toContain('Total: 230');
    expect(container!.textContent).toContain('Gemini Engine');
  });
});
