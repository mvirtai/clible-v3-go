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
    expect(text).toContain('Analytiikka');
    expect(text).toContain('Käännösvertailu');
    expect(text).toContain('Alkukieli');
    expect(text).toContain('Muistikirjat');
  });
});
