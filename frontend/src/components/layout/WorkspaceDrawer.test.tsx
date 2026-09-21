import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceDrawer } from './WorkspaceDrawer';
import { LanguageProvider } from '../../context/LanguageContext';
import { AuthProvider } from '../../context/AuthContext';
import { apiService } from '../../services/api';

describe('WorkspaceDrawer', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.spyOn(apiService, 'getMe').mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
    vi.spyOn(apiService, 'getScopes').mockResolvedValue([]);
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

  it('renders nothing when isOpen is false', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <AuthProvider>
            <LanguageProvider>
              <WorkspaceDrawer
                isOpen={false}
                onClose={vi.fn()}
                activeScopeId="scope-1"
                onScopeChanged={vi.fn()}
                onLoadSavedSearch={vi.fn()}
                onLoadSavedAnalysis={vi.fn()}
                refreshTrigger={false}
              />
            </LanguageProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('renders dialog with header, close button, and role="dialog" when isOpen is true', () => {
    const onClose = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <AuthProvider>
            <LanguageProvider>
              <WorkspaceDrawer
                isOpen={true}
                onClose={onClose}
                activeScopeId="scope-1"
                onScopeChanged={vi.fn()}
                onLoadSavedSearch={vi.fn()}
                onLoadSavedAnalysis={vi.fn()}
                refreshTrigger={false}
              />
            </LanguageProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    const heading = document.getElementById('workspace-drawer-title');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain('Työtilat');

    // Close button triggers onClose
    const closeBtn = dialog?.querySelector('button[aria-label="Peruuta"]');
    expect(closeBtn).not.toBeNull();
    act(() => {
      closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when pressing Escape key on dialog container', () => {
    const onClose = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <AuthProvider>
            <LanguageProvider>
              <WorkspaceDrawer
                isOpen={true}
                onClose={onClose}
                activeScopeId="scope-1"
                onScopeChanged={vi.fn()}
                onLoadSavedSearch={vi.fn()}
                onLoadSavedAnalysis={vi.fn()}
                refreshTrigger={false}
              />
            </LanguageProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    act(() => {
      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
