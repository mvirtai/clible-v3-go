// src/components/TranslationManager.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { TranslationManager } from './TranslationManager';
import { apiService } from '../services/api';
import type { InstalledTranslation } from '../types/bible';

vi.mock('../services/api', () => ({
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
    id: 'kjv',
    name: 'King James Version',
    language: 'en',
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

  it('renders active and available translation sections correctly', async () => {
    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(<TranslationManager translations={mockTranslations} />);
    });

    const textContent = container!.textContent || '';
    // Active section should show World English Bible
    expect(textContent).toContain('World English Bible');
    // Available section should show uninstalled translations
    expect(textContent).toContain('Kirkkoraamattu (1992)');
    expect(textContent).toContain('King James Version');
  });

  it('calls linkTranslation when activating an available translation', async () => {
    const onChanged = vi.fn();
    vi.mocked(apiService.linkTranslation).mockResolvedValue(undefined);

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(<TranslationManager translations={mockTranslations} onTranslationChanged={onChanged} />);
    });

    // Find the activate button for fin-1992
    const activateBtn = container!.querySelector('#activate-fin-1992') as HTMLButtonElement;
    expect(activateBtn).not.toBeNull();

    await act(async () => {
      activateBtn.click();
    });

    expect(apiService.linkTranslation).toHaveBeenCalledWith('fin-1992');
  });
});
