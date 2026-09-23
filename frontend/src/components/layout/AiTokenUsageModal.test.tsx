import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AiTokenUsageModal } from './AiTokenUsageModal';
import { LanguageProvider } from '../../context/LanguageContext';
import { apiService } from '../../services/api';

describe('AiTokenUsageModal', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mockStats = {
    totalCalls: 12,
    totalPromptTokens: 1200,
    totalCandidatesTokens: 800,
    totalTokens: 2000,
    cachedTokens: 150,
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
  });

  it('renders nothing when closed', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <AiTokenUsageModal isOpen={false} onClose={vi.fn()} isAuthenticated={true} />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    expect(container?.innerHTML).toBe('');
  });

  it('renders modal content with personal stats and triggers onClose when close button clicked', async () => {
    const handleClose = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <AiTokenUsageModal
              isOpen={true}
              onClose={handleClose}
              isAuthenticated={true}
              initialStats={mockStats}
            />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    expect(document.body.textContent).toContain('Oma tekoälyn kulutus');
    expect(document.body.textContent).toContain('2.0k'); // formatTokens(2000) -> 2.0k
    expect(document.body.textContent).toContain('12'); // totalCalls
    // Global summary must NOT be called or displayed
    expect(apiService.getGlobalAiUsageSummary).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('Koko järjestelmä');

    // Click close button
    const closeBtn = document.body.querySelector('button[aria-label="Sulje"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    act(() => {
      closeBtn?.click();
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders guest prompt and sign in action when not authenticated without showing stats or calling global summary', async () => {
    await act(async () => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <AiTokenUsageModal
              isOpen={true}
              onClose={vi.fn()}
              isAuthenticated={false}
            />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    expect(document.body.textContent).toContain('Kirjaudu sisään seurataksesi henkilökohtaista tekoälyn token-kulutustasi.');
    expect(document.body.textContent).toContain('Kirjaudu sisään');
    expect(apiService.getGlobalAiUsageSummary).not.toHaveBeenCalled();
    expect(apiService.getMyAiUsage).not.toHaveBeenCalled();
  });
});
