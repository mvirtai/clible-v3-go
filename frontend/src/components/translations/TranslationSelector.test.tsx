import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { TranslationSelector } from './TranslationSelector';
import { LanguageProvider } from '../../context/LanguageContext';
import type { InstalledTranslation } from '../../types/bible';

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
    installed: true,
  },
  {
    id: 'sblgnt',
    name: 'Kreikka (SBLGNT)',
    language: 'grc',
    format: 'text',
    sourceUrl: '',
    installedAt: new Date().toISOString(),
    isGlobal: true,
    installed: true,
  },
];

describe('TranslationSelector', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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

  it('renders language optgroups and options correctly', async () => {
    const handleSelect = vi.fn();

    const r = createRoot(container!);
    root = r;
    await act(async () => {
      r.render(
        <LanguageProvider>
          <TranslationSelector
            selectedTranslation="fin-1992"
            onSelectTranslation={handleSelect}
            translations={mockTranslations}
          />
        </LanguageProvider>
      );
    });

    const optgroups = container!.querySelectorAll('optgroup');
    expect(optgroups.length).toBe(3);

    const labels = Array.from(optgroups).map((og) => og.getAttribute('label'));
    expect(labels).toContain('Suomi');
    expect(labels).toContain('Englanti');
    expect(labels).toContain('Alkukielet');

    const select = container!.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('fin-1992');

    await act(async () => {
      select.value = 'web';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(handleSelect).toHaveBeenCalledWith('web');
  });
});
