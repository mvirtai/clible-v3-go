import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { AppHeader } from './AppHeader';
import { LanguageProvider } from '../../context/LanguageContext';
import { APP_VERSION } from '../../utils/version';

describe('AppHeader', () => {
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

  it('renders branding and user controls', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <AppHeader
            theme="dark"
            onToggleTheme={vi.fn()}
            user={{ email: 'test@clible.com' }}
            onSignOut={vi.fn()}
            showManager={false}
            onToggleManager={vi.fn()}
            installedTranslations={[]}
            selectedTranslation=""
            onSelectTranslation={vi.fn()}
          />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Clible');
    expect(text).toContain(`v${APP_VERSION}`);
    expect(text).toContain('test@clible.com');
  });
});
