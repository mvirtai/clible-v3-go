import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ISLABlock } from './ISLABlock';
import { clearISLAPromiseCache } from './islaCache';
import { LanguageProvider } from '../../context/LanguageContext';

describe('ISLABlock', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    clearISLAPromiseCache();
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
    vi.restoreAllMocks();
  });

  it('renders loading shimmer and then successful verse result', async () => {
    const mockCLIResult = {
      type: 'read',
      data: {
        reference: 'Joh 3:16',
        translation: 'web',
        verses: [
          {
            id: 'web:JHN:3:16',
            translationId: 'web',
            bookId: 'JHN',
            chapter: 3,
            verse: 16,
            text: 'For God so loved the world.',
          },
        ],
      },
    };

    let resolveFetch: (val: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        fetchPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve(mockCLIResult),
        }))
      )
    );

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ISLABlock code="@Joh 3:16 => web" translation="web" />
        </LanguageProvider>
      );
    });

    // Check loading state
    expect(container?.textContent).toContain('✦ ISLA');

    // Resolve fetch
    await act(async () => {
      resolveFetch(null);
    });

    // Check rendered result
    expect(container?.textContent).toContain('@Joh 3:16 => web');
    expect(container?.textContent).toContain('For God so loved the world.');
  });

  it('renders error state on failed evaluation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'unknown book' }),
      })
    );

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ISLABlock code="@BadBook 1:1" translation="web" />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('ISLA error:');
    expect(container?.textContent).toContain('unknown book');
  });

  it('renders compare result correctly', async () => {
    const mockCompareResult = {
      type: 'compare',
      data: {
        reference: 'Joh 3:16',
        left: {
          translation: 'KR92',
          verses: [
            {
              id: 'kr92:JHN:3:16',
              translationId: 'kr92',
              bookId: 'JHN',
              chapter: 3,
              verse: 16,
              text: 'Sillä niin on Jumala maailmaa rakastanut',
            },
          ],
        },
        right: {
          translation: 'KJV',
          verses: [
            {
              id: 'kjv:JHN:3:16',
              translationId: 'kjv',
              bookId: 'JHN',
              chapter: 3,
              verse: 16,
              text: 'For God so loved the world',
            },
          ],
        },
      },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCompareResult),
      })
    );

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <ISLABlock code="@Joh 3:16 ? KR92 : KJV" translation="web" />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('KR92');
    expect(container?.textContent).toContain('KJV');
    expect(container?.textContent).toContain('Sillä niin on Jumala maailmaa rakastanut');
    expect(container?.textContent).toContain('For God so loved the world');
  });
});
