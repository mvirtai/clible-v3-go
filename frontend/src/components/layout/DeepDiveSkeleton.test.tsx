import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { DeepDiveSkeleton } from './DeepDiveSkeleton';
import { LanguageProvider } from '../../context/LanguageContext';

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('DeepDiveSkeleton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders with accessibility attributes and topic label', async () => {
    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveSkeleton topic="Covenant" />
        </LanguageProvider>,
      );
    });

    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.getAttribute('aria-busy')).toBe('true');
    expect(statusEl?.getAttribute('aria-live')).toBe('polite');
    expect(statusEl?.textContent).toContain('Covenant');
    expect(statusEl?.querySelectorAll('.animate-shimmer')).toHaveLength(3);
  });
});

