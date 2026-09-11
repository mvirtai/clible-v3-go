import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ISLAAutocomplete } from './ISLAAutocomplete';
import { LanguageProvider } from '../../../context/LanguageContext';

describe('ISLAAutocomplete', () => {
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

  it('renders suggestions list for valid ISLA trigger', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAAutocomplete
            lineText="!"
            cursorOffset={1}
            onSelect={vi.fn()}
          />
        </LanguageProvider>
      );
    });

    const listbox = container?.querySelector('[role="listbox"]');
    expect(listbox).toBeTruthy();
    const options = container?.querySelectorAll('[role="option"]');
    expect(options && options.length > 0).toBe(true);
    expect(options?.[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('returns null when no suggestions match', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAAutocomplete
            lineText="plain markdown without trigger"
            cursorOffset={10}
            onSelect={vi.fn()}
          />
        </LanguageProvider>
      );
    });

    expect(container?.firstChild).toBeNull();
  });

  it('renders with controlled activeIndex', () => {
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAAutocomplete
            lineText="!"
            cursorOffset={1}
            activeIndex={1}
            onSelect={vi.fn()}
          />
        </LanguageProvider>
      );
    });

    const options = container?.querySelectorAll('[role="option"]');
    expect(options?.[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('calls onSelect when clicking a suggestion option', () => {
    const onSelect = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAAutocomplete
            lineText="!"
            cursorOffset={1}
            onSelect={onSelect}
          />
        </LanguageProvider>
      );
    });

    const options = container?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    expect(options && options.length > 0).toBe(true);
    act(() => {
      options?.[0]?.click();
    });
    expect(onSelect).toHaveBeenCalled();
  });

  it('highlights option on mouse enter', () => {
    const onHighlight = vi.fn();
    act(() => {
      root?.render(
        <LanguageProvider>
          <ISLAAutocomplete
            lineText="!"
            cursorOffset={1}
            onSelect={vi.fn()}
            onHighlight={onHighlight}
          />
        </LanguageProvider>
      );
    });

    const options = container?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    expect(options && options.length > 1).toBe(true);
    act(() => {
      options?.[1]?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(onHighlight).toHaveBeenCalledWith(1);
    expect(options?.[1]?.getAttribute('aria-selected')).toBe('true');
  });
});
