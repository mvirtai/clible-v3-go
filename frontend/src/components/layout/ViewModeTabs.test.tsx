import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ViewModeTabs } from './ViewModeTabs';
import { LanguageProvider } from '../../context/LanguageContext';

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
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('renders all main tabs using i18n strings', () => {
    const onSelect = vi.fn();
    const onSelectNb = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ViewModeTabs
            viewMode="reader"
            onSelectViewMode={onSelect}
            onSelectNotebookId={onSelectNb}
          />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Lukija');
    expect(text).toContain('Kirkkovuosi');
    expect(text).toContain('Analytiikka');
    expect(text).toContain('Käännösvertailu');
    expect(text).toContain('Alkukieli');
    expect(text).toContain('Muistikirjat');
  });

  it('renders mobile dropdown selector and desktop pills with accessible min-height', () => {
    const onSelect = vi.fn();
    const onSelectNb = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ViewModeTabs
            viewMode="search"
            onSelectViewMode={onSelect}
            onSelectNotebookId={onSelectNb}
          />
        </LanguageProvider>
      );
    });

    // Mobile trigger button (< 640px)
    const mobileContainer = container?.querySelector('.sm\\:hidden');
    expect(mobileContainer).not.toBeNull();
    const mobileBtn = mobileContainer?.querySelector('button');
    expect(mobileBtn?.textContent).toContain('Haku');
    expect(mobileBtn?.className).toContain('min-h-[44px]');

    // Desktop pill container (>= 640px)
    const desktopContainer = container?.querySelector('.hidden.sm\\:flex');
    expect(desktopContainer).not.toBeNull();

    const desktopButtons = desktopContainer?.querySelectorAll('button');
    expect(desktopButtons?.length).toBe(7);
    desktopButtons?.forEach((btn) => {
      expect(btn.className).toContain('min-h-[44px]');
      expect(btn.className).toContain('whitespace-nowrap');
    });
  });

  it('opens mobile dropdown menu when clicking mobile selector button', () => {
    const onSelect = vi.fn();
    const onSelectNb = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ViewModeTabs
            viewMode="reader"
            onSelectViewMode={onSelect}
            onSelectNotebookId={onSelectNb}
          />
        </LanguageProvider>
      );
    });

    const mobileBtn = container?.querySelector('.sm\\:hidden button') as HTMLButtonElement;
    expect(mobileBtn).not.toBeNull();

    act(() => {
      mobileBtn.click();
    });

    // Dropdown menu items should now be rendered
    const menu = container?.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    const menuItems = menu?.querySelectorAll('[role="menuitem"]');
    expect(menuItems?.length).toBe(7);

    // Clicking a menu item selects it and closes the dropdown
    act(() => {
      (menuItems![1] as HTMLButtonElement).click();
    });
    expect(onSelect).toHaveBeenCalledWith('liturgical');
    expect(container?.querySelector('[role="menu"]')).toBeNull();
  });
});
