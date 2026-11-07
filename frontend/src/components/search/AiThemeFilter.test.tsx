import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { AiThemeFilter } from './AiThemeFilter';
import { strings } from '../../utils/i18n';
import type { SearchThemeCluster } from '../../types/aiSearch';

describe('AiThemeFilter', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const themes: SearchThemeCluster[] = [
    {
      id: 'noah-covenant',
      title: 'Noahic Covenant',
      summary: 'Rainbow covenant',
      verseIds: ['gen-9-1', 'gen-9-2'],
    },
    {
      id: 'new-covenant',
      title: 'New Covenant',
      summary: 'Jeremiah and NT covenant',
      verseIds: ['jer-31-31'],
    },
  ];

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

  it('renders recommendation summary and theme cluster pills', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <AiThemeFilter
          strings={strings.en}
          themes={themes}
          activeThemeId={null}
          onSelectTheme={vi.fn()}
          recommendedCount={3}
          totalFilteredCount={10}
          onApplyRecommendation={vi.fn()}
        />
      );
    });

    expect(container!.textContent).toContain(
      strings.en.aiRefineRecommendationTitle(3, 10)
    );
    expect(container!.textContent).toContain(strings.en.aiRefineAllThemes);
    expect(container!.textContent).toContain('Noahic Covenant (2)');
    expect(container!.textContent).toContain('New Covenant (1)');
  });

  it('triggers onSelectTheme when a theme pill or All Themes is clicked', () => {
    const onSelectTheme = vi.fn();
    act(() => {
      root = createRoot(container!);
      root.render(
        <AiThemeFilter
          strings={strings.en}
          themes={themes}
          activeThemeId="noah-covenant"
          onSelectTheme={onSelectTheme}
          recommendedCount={2}
          totalFilteredCount={5}
          onApplyRecommendation={vi.fn()}
        />
      );
    });

    const buttons = Array.from(container!.querySelectorAll('button'));
    const newThemeBtn = buttons.find((b) => b.textContent?.includes('New Covenant (1)'));
    const allThemesBtn = buttons.find((b) => b.textContent === strings.en.aiRefineAllThemes);

    act(() => {
      newThemeBtn?.click();
    });
    expect(onSelectTheme).toHaveBeenCalledWith('new-covenant');

    act(() => {
      allThemesBtn?.click();
    });
    expect(onSelectTheme).toHaveBeenCalledWith(null);
  });

  it('triggers onApplyRecommendation and onClearRefinement when respective buttons are clicked', () => {
    const onApplyRecommendation = vi.fn();
    const onClearRefinement = vi.fn();
    act(() => {
      root = createRoot(container!);
      root.render(
        <AiThemeFilter
          strings={strings.fi}
          themes={themes}
          activeThemeId={null}
          onSelectTheme={vi.fn()}
          recommendedCount={2}
          totalFilteredCount={5}
          onApplyRecommendation={onApplyRecommendation}
          onClearRefinement={onClearRefinement}
        />
      );
    });

    const applyBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(strings.fi.aiRefineApplySuggestion)
    );
    act(() => {
      applyBtn?.click();
    });
    expect(onApplyRecommendation).toHaveBeenCalledTimes(1);

    const clearBtn = container!.querySelector(
      `button[aria-label="${strings.fi.aiRefineClearAria}"]`
    ) as HTMLButtonElement;
    act(() => {
      clearBtn.click();
    });
    expect(onClearRefinement).toHaveBeenCalledTimes(1);
  });
});
