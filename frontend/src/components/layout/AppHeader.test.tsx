import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
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

  it('renders branding and user controls for logged in user', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
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
        </MemoryRouter>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Clible');
    expect(text).toContain(`v${APP_VERSION}`);
    expect(text).toContain('test@clible.com');
  });

  it('renders guest mode controls when user is null', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <AppHeader
              theme="light"
              onToggleTheme={vi.fn()}
              user={null}
              onSignOut={vi.fn()}
              showManager={false}
              onToggleManager={vi.fn()}
              installedTranslations={[]}
              selectedTranslation=""
              onSelectTranslation={vi.fn()}
            />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Clible');
    expect(text).toContain('Luo tili');
  });
});
