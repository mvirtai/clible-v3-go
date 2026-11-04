import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { DeepDiveCard } from './DeepDiveCard';
import { LanguageProvider } from '../../context/LanguageContext';

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('DeepDiveCard', () => {
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

  it('renders without toggle controls when onToggle is omitted', async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveCard
            title="Analysis Title"
            text="## Content\nSample analysis text."
            onClose={onClose}
          />
        </LanguageProvider>,
      );
    });

    expect(container.querySelector('button[aria-expanded]')).toBeNull();
    expect(container.textContent).toContain('Analysis Title');
    expect(container.textContent).toContain('Sample analysis text.');

    const closeBtn = container.querySelector('button[aria-label="Piilota"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    await act(async () => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('supports collapsed state and onToggle callback when provided', async () => {
    const onToggle = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <LanguageProvider>
          <DeepDiveCard
            title="Toggleable Topic"
            text="Hidden text when collapsed."
            collapsed={true}
            onToggle={onToggle}
            onClose={onClose}
          />
        </LanguageProvider>,
      );
    });

    const toggleBtn = container.querySelector('button[aria-expanded]') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    // Content should NOT be rendered when collapsed
    expect(container.textContent).not.toContain('Hidden text when collapsed.');

    await act(async () => {
      toggleBtn.click();
    });
    expect(onToggle).toHaveBeenCalled();
  });
});
