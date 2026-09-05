import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { GuestNotebookBanner } from './GuestNotebookBanner';
import { LanguageProvider } from '../../context/LanguageContext';
import * as guestStorage from '../../utils/guestNotebookStorage';

describe('GuestNotebookBanner', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
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

  it('renders title, countdown, and signup button', () => {
    vi.spyOn(guestStorage, 'getGuestRemainingSeconds').mockReturnValue(3300); // 55 min

    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <GuestNotebookBanner />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Väliaikainen vierastila (1 h)');
    expect(text).toContain('55 min');
    expect(text).toContain('Luo ilmainen tili');

    const link = container?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/register');
  });

  it('renders expired state when remaining seconds is zero', () => {
    vi.spyOn(guestStorage, 'getGuestRemainingSeconds').mockReturnValue(0);

    act(() => {
      root = createRoot(container!);
      root.render(
        <MemoryRouter>
          <LanguageProvider>
            <GuestNotebookBanner />
          </LanguageProvider>
        </MemoryRouter>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('0 min');
    expect(text).toContain('nollattu');
  });
});

