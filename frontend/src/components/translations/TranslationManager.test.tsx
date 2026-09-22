// src/components/TranslationManager.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { TranslationManager } from './TranslationManager';
import { apiService } from '../../services/api';
import type { InstalledTranslation } from '../../types/bible';
import { LanguageProvider } from '../../context/LanguageContext';

vi.mock('../../services/api', () => ({
  apiService: {
    linkTranslation: vi.fn().mockResolvedValue(undefined),
    unlinkTranslation: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockTranslations: InstalledTranslation[] = [
  {
    id: 'web',
    name: 'World English Bible',
    language: 'en',
    format: 'text',
    sourceUrl: '',
    installedAt: new Date().toISOString(),
    isGlobal: true,
    installed: true,
  },
  {
    id: 'fin-1992',
    name: 'Kirkkoraamattu (1992)',
    language: 'fi',
    format: 'text',
    sourceUrl: '',
    installedAt: new Date().toISOString(),
    isGlobal: true,
    installed: false,
  },
  {
    id: 'sblgnt',
    name: 'Kreikka (SBLGNT)',
    language: 'grc',
    format: 'text',
    sourceUrl: '',
    installedAt: new Date().toISOString(),
    isGlobal: true,
    installed: false,
  },
];

describe('TranslationManager', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (root) {
      root.unmount();
      root = null;
    }
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('renders language family groupings correctly', async () => {
    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(
        <LanguageProvider>
          <TranslationManager translations={mockTranslations} />
        </LanguageProvider>
      );
    });

    const textContent = container!.textContent || '';
    expect(textContent).toContain('Suomi');
    expect(textContent).toContain('Englanti');
    expect(textContent).toContain('Alkukielet');
    expect(textContent).toContain('World English Bible');
    expect(textContent).toContain('Kirkkoraamattu (1992)');
    expect(textContent).toContain('Kreikka (SBLGNT)');
  });

  it('calls linkTranslation when toggling an uninstalled translation switch', async () => {
    const onChanged = vi.fn();
    vi.mocked(apiService.linkTranslation).mockResolvedValue(undefined);

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(
        <LanguageProvider>
          <TranslationManager translations={mockTranslations} onTranslationChanged={onChanged} />
        </LanguageProvider>
      );
    });

    const toggleBtn = container!.querySelector('#toggle-fin-1992') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-checked')).toBe('false');

    await act(async () => {
      toggleBtn.click();
    });

    expect(apiService.linkTranslation).toHaveBeenCalledWith('fin-1992');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('calls unlinkTranslation when toggling an installed translation switch', async () => {
    const onChanged = vi.fn();
    vi.mocked(apiService.unlinkTranslation).mockResolvedValue(undefined);

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(
        <LanguageProvider>
          <TranslationManager translations={mockTranslations} onTranslationChanged={onChanged} />
        </LanguageProvider>
      );
    });

    const toggleBtn = container!.querySelector('#toggle-web') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-checked')).toBe('true');

    await act(async () => {
      toggleBtn.click();
    });

    expect(apiService.unlinkTranslation).toHaveBeenCalledWith('web');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when close button is clicked', async () => {
    const handleClose = vi.fn();

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(
        <LanguageProvider>
          <TranslationManager translations={mockTranslations} onClose={handleClose} />
        </LanguageProvider>
      );
    });

    const closeBtn = container!.querySelector('button[aria-label="Sulje"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.click();
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
