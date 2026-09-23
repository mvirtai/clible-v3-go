import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UserMenuDropdown } from './UserMenuDropdown';
import { LanguageProvider } from '@/context/LanguageContext';
import { apiService } from '@/services/api';
import type { User } from '@/context/AuthContext';

describe('UserMenuDropdown', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mockUser: User = {
    id: 'usr-123',
    email: 'test@example.com',
    name: 'Teppo Testaaja',
    displayName: 'Teppo',
    avatarId: 'dove',
  };

  const mockStats = {
    totalCalls: 5,
    totalPromptTokens: 500,
    totalCandidatesTokens: 300,
    totalTokens: 800,
    cachedTokens: 50,
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.spyOn(apiService, 'getMyAiUsage').mockResolvedValue(mockStats);
    vi.spyOn(apiService, 'getGlobalAiUsageSummary');
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    localStorage.clear();
  });

  it('renders avatar trigger button with accessible aria attributes and opens menu upon click', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <UserMenuDropdown
              user={mockUser}
              onSignOut={vi.fn()}
              showManager={false}
              onToggleManager={vi.fn()}
            />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button[aria-label="Käyttäjävalikko"]') as HTMLButtonElement;
    expect(triggerBtn).not.toBeNull();
    expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');

    // Click trigger to open menu
    act(() => {
      triggerBtn.click();
    });

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');
    expect(container?.textContent).toContain('Teppo');
    expect(container?.textContent).toContain('Tekoälyn token-kulutus');
    expect(container?.textContent).toContain('Käyttäjäasetukset ja profiili');
    expect(container?.textContent).toContain('Kirjaudu ulos');
  });

  it('renders guest options and signup button when user is null', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <UserMenuDropdown
              user={null}
              onSignOut={vi.fn()}
              showManager={false}
              onToggleManager={vi.fn()}
            />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button[aria-label="Käyttäjävalikko"]') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    expect(container?.textContent).toContain('Vierailija');
    expect(container?.textContent).toContain('Kirjaudu sisään');
    expect(container?.textContent).toContain('Luo tili');
  });

  it('opens usage modal without calling getGlobalAiUsageSummary', async () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <UserMenuDropdown
              user={mockUser}
              onSignOut={vi.fn()}
              showManager={false}
              onToggleManager={vi.fn()}
            />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button[aria-label="Käyttäjävalikko"]') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    // Find AI Usage button inside dropdown
    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const usageBtn = buttons.find((b) => b.textContent?.includes('Tekoälyn token-kulutus'));
    expect(usageBtn).not.toBeUndefined();

    await act(async () => {
      usageBtn?.click();
    });

    // Modal portal mounts into document.body
    expect(document.body.textContent).toContain('Oma tekoälyn kulutus');
    expect(apiService.getGlobalAiUsageSummary).not.toHaveBeenCalled();
    expect(apiService.getMyAiUsage).toHaveBeenCalledWith(30);
  });
});
