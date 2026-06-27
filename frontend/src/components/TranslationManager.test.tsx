// src/components/TranslationManager.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { TranslationManager } from './TranslationManager';
import { apiService } from '../services/api';

vi.mock('../services/api', () => ({
  apiService: {
    importTranslation: vi.fn(),
  },
}));

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

  it('renders preset translation cards', async () => {
    root = createRoot(container!);
    await act(async () => {
      root.render(<TranslationManager />);
    });

    const textContent = container!.textContent || '';
    expect(textContent).toContain('Kirkkoraamattu (1992)');
    expect(textContent).toContain('Kirkkoraamattu (1933/38)');
    expect(textContent).toContain('World English Bible');
  });

  it('downloads and installs preset translation when clicked (KR92 / BEBLIA)', async () => {
    // Mock global fetch to return dummy XML file
    const mockBlob = new Blob(['<bible></bible>'], { type: 'text/xml' });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    } as Response);

    root = createRoot(container!);
    await act(async () => {
      root.render(<TranslationManager />);
    });

    // Find the Kirkkoraamattu (1992) button
    const buttons = Array.from(container!.querySelectorAll('button'));
    const kr92Button = buttons.find(b => b.textContent?.includes('Kirkkoraamattu (1992)'));
    expect(kr92Button).toBeDefined();

    // Click the button
    await act(async () => {
      kr92Button!.click();
    });

    // Verify fetch was called with the correct Beblia XML URL
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/Finnish1992Bible.xml'
    );

    // Verify importTranslation was called with the correct parameters and dynamic file
    expect(apiService.importTranslation).toHaveBeenCalledWith(
      'fin-1992',
      'Kirkkoraamattu (1992)',
      'fi',
      expect.any(File)
    );
  });
});
