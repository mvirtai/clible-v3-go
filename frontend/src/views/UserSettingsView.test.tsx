import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UserSettingsView } from './UserSettingsView';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import { apiService } from '../services/api';
import type { UserSettings } from '../types/user';

describe('UserSettingsView', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mockSettings: UserSettings = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    preferredLang: 'fi',
    themePreference: 'dark',
    defaultTranslationId: 'fin-1992',
    subscriptionTier: 'supporter',
    subscriptionStatus: 'active',
    isVerified: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.spyOn(apiService, 'getUserSettings').mockResolvedValue(mockSettings);
    vi.spyOn(apiService, 'getTranslations').mockResolvedValue([
      {
        id: 'fin-1992',
        name: 'Finnish 1992',
        language: 'fi',
        format: 'xml',
        sourceUrl: '',
        installedAt: '2026-01-01T00:00:00Z',
        isGlobal: true,
        installed: true,
      },
      {
        id: 'web',
        name: 'World English Bible',
        language: 'en',
        format: 'xml',
        sourceUrl: '',
        installedAt: '2026-01-01T00:00:00Z',
        isGlobal: true,
        installed: true,
      },
    ]);
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
    vi.restoreAllMocks();
  });

  it('renders guest mode notice when user is unauthenticated', async () => {
    // AuthProvider defaults to guest/unauthenticated when /auth/me returns 401
    vi.spyOn(apiService, 'getMe').mockRejectedValue(new Error('Unauthorized'));

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <AuthProvider>
              <UserSettingsView />
            </AuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Käyttäjäasetukset ja profiili');
  });
});
