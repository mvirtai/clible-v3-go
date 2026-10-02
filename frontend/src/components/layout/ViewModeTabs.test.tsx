import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ViewModeTabs } from './ViewModeTabs';
import type { ViewMode } from './AppHeader';
import { LanguageProvider } from '../../context/LanguageContext';
import { strings } from '../../utils/i18n';

describe('ViewModeTabs', () => {
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
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  const renderTabs = (
    viewMode: ViewMode,
    onSelectViewMode = vi.fn(),
    onSelectNotebookId = vi.fn(),
  ) => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ViewModeTabs
            viewMode={viewMode}
            onSelectViewMode={onSelectViewMode}
            onSelectNotebookId={onSelectNotebookId}
          />
        </LanguageProvider>,
      );
    });
    return { onSelectViewMode, onSelectNotebookId };
  };

  const buttonWithText = (scope: ParentNode, text: string) => {
    const button = Array.from(scope.querySelectorAll('button')).find((item) =>
      item.textContent?.includes(text),
    );
    if (!button) {
      throw new Error(`Could not find button containing "${text}"`);
    }
    return button as HTMLButtonElement;
  };

  it('renders direct views and grouped destinations with localized labels', () => {
    renderTabs('reader');

    const text = container?.textContent ?? '';
    expect(text).toContain('Lukija');
    expect(text).toContain('Tutki');
    expect(text).toContain('Haku');
    expect(text).toContain('Käännösvertailu');
    expect(text).toContain('Alkukieli');
    expect(text).toContain('Analytiikka');
    expect(text).toContain('Suunnittele');
    expect(text).toContain('Lukusuunnitelmat');
    expect(text).toContain('Kirkkovuosi');
    expect(text).toContain('Muistikirjat');

    const desktopNavigation = container?.querySelector('.hidden.sm\\:flex');
    expect(desktopNavigation).not.toBeNull();
    expect(desktopNavigation?.querySelectorAll(':scope > button')).toHaveLength(2);
    expect(desktopNavigation?.querySelectorAll(':scope > div > button')).toHaveLength(2);

    expect(strings.en.navExplore).toBe('Explore');
    expect(strings.en.navPlanning).toBe('Plan');
    expect(strings.fi.navExplore).toBe('Tutki');
    expect(strings.fi.navPlanning).toBe('Suunnittele');
  });

  it('opens desktop groups, selects the requested view, and shows active group and item', () => {
    const onSelectViewMode = vi.fn();
    renderTabs('compare', onSelectViewMode);

    const desktopNavigation = container?.querySelector('.hidden.sm\\:flex');
    const exploreTrigger = buttonWithText(desktopNavigation!, 'Tutki');
    const exploreOptions = container?.querySelector('#explore-view-options') as HTMLDivElement;

    expect(exploreTrigger.getAttribute('aria-current')).toBe('page');
    expect(exploreTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(exploreOptions.hidden).toBe(true);

    act(() => exploreTrigger.click());
    expect(exploreTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(exploreOptions.hidden).toBe(false);
    expect(buttonWithText(exploreOptions, 'Käännösvertailu').getAttribute('aria-current')).toBe('page');

    act(() => buttonWithText(exploreOptions, 'Alkukieli').click());
    expect(onSelectViewMode).toHaveBeenCalledWith('original');
    expect(exploreOptions.hidden).toBe(true);

    act(() => {
      root?.render(
        <LanguageProvider>
          <ViewModeTabs
            viewMode="original"
            onSelectViewMode={onSelectViewMode}
            onSelectNotebookId={vi.fn()}
          />
        </LanguageProvider>,
      );
    });

    const updatedExploreTrigger = buttonWithText(container!.querySelector('.hidden.sm\\:flex')!, 'Tutki');
    const updatedExploreOptions = container?.querySelector('#explore-view-options') as HTMLDivElement;
    act(() => updatedExploreTrigger.click());
    expect(updatedExploreTrigger.getAttribute('aria-current')).toBe('page');
    expect(buttonWithText(updatedExploreOptions, 'Alkukieli').getAttribute('aria-current')).toBe('page');
  });

  it('closes desktop groups with Escape and restores focus to the group trigger', () => {
    renderTabs('plans');

    const planningTrigger = buttonWithText(container!.querySelector('.hidden.sm\\:flex')!, 'Suunnittele');
    const planningOptions = container?.querySelector('#planning-view-options') as HTMLDivElement;

    expect(planningTrigger.getAttribute('aria-current')).toBe('page');
    act(() => planningTrigger.click());
    const plansOption = buttonWithText(planningOptions, 'Lukusuunnitelmat');
    act(() => plansOption.focus());
    act(() => {
      plansOption.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(planningOptions.hidden).toBe(true);
    expect(planningTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(planningTrigger);
  });

  it('keeps mobile selection compact and presents destinations in the same groups', () => {
    const onSelectViewMode = vi.fn();
    const onSelectNotebookId = vi.fn();
    renderTabs('liturgical', onSelectViewMode, onSelectNotebookId);

    const mobileNavigation = container?.querySelector('.sm\\:hidden');
    const mobileTrigger = mobileNavigation?.querySelector('button') as HTMLButtonElement;
    const mobileOptions = container?.querySelector('#mobile-view-options') as HTMLDivElement;

    expect(mobileTrigger.textContent).toContain('Kirkkovuosi');
    expect(mobileTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(mobileOptions.hidden).toBe(true);

    act(() => mobileTrigger.click());
    expect(mobileOptions.hidden).toBe(false);
    expect(mobileOptions.textContent).toContain('Lukija');
    expect(mobileOptions.textContent).toContain('Tutki');
    expect(mobileOptions.textContent).toContain('Suunnittele');
    expect(mobileOptions.textContent).toContain('Muistikirjat');
    expect(Array.from(mobileOptions.querySelectorAll('p')).map((heading) => heading.textContent)).toEqual([
      'Tutki',
      'Suunnittele',
    ]);
    expect(mobileOptions.querySelectorAll('li > ul')[0]?.querySelectorAll(':scope > li')).toHaveLength(4);
    expect(mobileOptions.querySelectorAll('li > ul')[1]?.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(buttonWithText(mobileOptions, 'Kirkkovuosi').getAttribute('aria-current')).toBe('page');
    expect(mobileOptions.querySelector('[role="menu"], [role="menuitem"]')).toBeNull();

    act(() => {
      mobileTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(mobileOptions.hidden).toBe(true);
    expect(document.activeElement).toBe(mobileTrigger);
    act(() => mobileTrigger.click());

    act(() => buttonWithText(mobileOptions, 'Kirkkovuosi').click());
    expect(onSelectViewMode).toHaveBeenCalledWith('liturgical');
    expect(onSelectNotebookId).not.toHaveBeenCalled();
    expect(mobileOptions.hidden).toBe(true);
    expect(mobileTrigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps notebooks as a direct view and resets the active notebook selection', () => {
    const onSelectViewMode = vi.fn();
    const onSelectNotebookId = vi.fn();
    renderTabs('reader', onSelectViewMode, onSelectNotebookId);

    const notebooksButton = buttonWithText(container!.querySelector('.hidden.sm\\:flex')!, 'Muistikirjat');
    act(() => notebooksButton.click());

    expect(onSelectViewMode).toHaveBeenCalledWith('notebooks');
    expect(onSelectNotebookId).toHaveBeenCalledWith(null);
  });
});
