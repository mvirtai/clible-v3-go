import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ISLAHoverCard } from './ISLAHoverCard';
import { LanguageProvider } from '../../../context/LanguageContext';

describe('ISLAHoverCard', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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
  });

  it('returns null when keyword is undefined or null', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAHoverCard keyword={undefined} />
        </LanguageProvider>
      );
    });
    expect(container?.firstChild).toBeNull();

    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAHoverCard keyword={null} />
        </LanguageProvider>
      );
    });
    expect(container?.firstChild).toBeNull();
  });

  it('returns null for unknown keyword', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAHoverCard keyword="nonExistentCommand123" />
        </LanguageProvider>
      );
    });
    expect(container?.firstChild).toBeNull();
  });

  it('renders documentation card for search command', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAHoverCard keyword="search" />
        </LanguageProvider>
      );
    });
    const tooltip = container?.querySelector('[role="tooltip"]');
    expect(tooltip).toBeTruthy();
    expect(tooltip?.textContent).toContain('search');
    expect(tooltip?.textContent).toContain('search(');
  });

  it('renders documentation card for count command', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAHoverCard keyword="count" />
        </LanguageProvider>
      );
    });
    const tooltip = container?.querySelector('[role="tooltip"]');
    expect(tooltip).toBeTruthy();
    expect(tooltip?.textContent).toContain('count');
  });
});
