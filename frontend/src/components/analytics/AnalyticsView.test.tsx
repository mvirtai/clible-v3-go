import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { AnalyticsView } from './AnalyticsView';
import { LanguageProvider } from '../../context/LanguageContext';
import { apiService } from '../../services/api';

vi.mock('../../services/api', () => ({
  apiService: {
    analyze: vi.fn(),
    getAiTone: vi.fn(),
    getAiDeepDive: vi.fn(),
  },
}));

// @ts-expect-error React testing environment flg
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('AnalyticsView', () => {
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
      root = null;
    }
    container?.remove();
    container = null;
    vi.clearAllMocks();
  });

  it('renders analytics control panel and handles deep dive pick', async () => {
    vi.mocked(apiService.getAiDeepDive).mockResolvedValueOnce({
      text: '## Rhetorical Nuance\nAnalysis of literary tone and mood.',
      nextFocus: [],
    });

    const mockStats = {
      tokenCount: 100,
      uniqueTokenCount: 50,
      typeTokenRatio: 0.5,
      avgWordLength: 4.5,
      characterCount: 450,
      topWords: [{ name: 'Lord', value: 10 }],
      topBigrams: [],
      topTrigrams: [],
    };

    const mockSavedTone = {
      text: 'Tone analysis of Psalms',
      nextFocus: [
        {
          label: 'Praise and Lament',
          kind: 'theme' as const,
          reason: 'Tone dynamics',
        },
      ],
    };

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <AnalyticsView
            defaultTranslation="web"
            activeReference="PSA 23"
            loadedSavedStats={{
              reference: 'PSA 23',
              translationId: 'web',
              stats: mockStats,
            }}
            loadedSavedTone={mockSavedTone}
          />
        </LanguageProvider>,
      );
    });

    const chip = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Praise and Lament'),
    );
    expect(chip).toBeDefined();

    await act(async () => {
      chip!.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container!.textContent).toContain('Rhetorical Nuance');
  });
});
