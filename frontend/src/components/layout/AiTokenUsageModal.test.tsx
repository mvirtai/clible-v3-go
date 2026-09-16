import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
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

  const mockSummary = {
    userStats: { totalCalls: 12, totalPromptTokens: 1200, totalCandTokens: 800, totalTokens: 2000, cachedTokens: 150 },
    guestStats: { totalCalls: 4, totalPromptTokens: 400, totalCandTokens: 200, totalTokens: 600, cachedTokens: 0 },
    globalStats: { totalCalls: 16, totalPromptTokens: 1600, totalCandTokens: 1000, totalTokens: 2600, cachedTokens: 150 },
    byFeature: {
      insight: { totalCalls: 10, totalPromptTokens: 1000, totalCandTokens: 600, totalTokens: 1600, cachedTokens: 100 },
      tone: { totalCalls: 6, totalPromptTokens: 600, totalCandTokens: 400, totalTokens: 1000, cachedTokens: 50 },
    },
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.spyOn(apiService, 'getMyAiUsage').mockResolvedValue(mockStats);
    vi.spyOn(apiService, 'getGlobalAiUsageSummary').mockResolvedValue(mockSummary);
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
        <LanguageProvider>
          <AiTokenUsageModal isOpen={false} onClose={vi.fn()} isAuthenticated={true} />
        </LanguageProvider>
      );
    });

    expect(container?.innerHTML).toBe('');
  });

  it('renders modal content with stats and triggers onClose when close button clicked', async () => {
    const handleClose = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <AiTokenUsageModal
            isOpen={true}
            onClose={handleClose}
            isAuthenticated={true}
            initialStats={mockStats}
            initialSummary={mockSummary}
          />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Tekoälyn token-kulutus');
    expect(container?.textContent).toContain('2.0k'); // formatTokens(2000) -> 2.0k
    expect(container?.textContent).toContain('12'); // totalCalls

    // Click close button
    const closeBtn = container?.querySelector('button[aria-label="Sulje"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    act(() => {
      closeBtn?.click();
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
