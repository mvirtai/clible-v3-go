import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { AiRefinePanel } from './AiRefinePanel';
import { strings } from '../../utils/i18n';

describe('AiRefinePanel', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  it('renders title, textarea, and suggestion pills', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <AiRefinePanel
          strings={strings.fi}
          isLoading={false}
          onRefine={vi.fn()}
          onClose={vi.fn()}
        />
      );
    });

    expect(container!.textContent).toContain(strings.fi.aiRefineTitle);
    const textarea = container!.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.placeholder).toBe(strings.fi.aiRefinePlaceholder);
    expect(container!.textContent).toContain(strings.fi.aiRefineSuggestions[0]);
  });

  it('populates textarea when a suggestion pill is clicked and submits via onRefine', () => {
    const onRefine = vi.fn();
    act(() => {
      root = createRoot(container!);
      root.render(
        <AiRefinePanel
          strings={strings.fi}
          isLoading={false}
          onRefine={onRefine}
          onClose={vi.fn()}
        />
      );
    });

    const submitBtn = container!.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    const suggestionBtn = Array.from(container!.querySelectorAll('button')).find(
      (b) => b.textContent === strings.fi.aiRefineSuggestions[1]
    ) as HTMLButtonElement;
    expect(suggestionBtn).toBeDefined();

    act(() => {
      suggestionBtn.click();
    });

    expect(submitBtn.disabled).toBe(false);

    act(() => {
      submitBtn.click();
    });
    expect(onRefine).toHaveBeenCalledWith(strings.fi.aiRefineSuggestions[1]);
  });

  it('disables submit button when loading and calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    act(() => {
      root = createRoot(container!);
      root.render(
        <AiRefinePanel
          strings={strings.fi}
          isLoading={true}
          onRefine={vi.fn()}
          onClose={onClose}
        />
      );
    });

    expect(container!.textContent).toContain(strings.fi.aiRefineRunning);
    const closeBtn = container!.querySelector(
      `button[aria-label="${strings.fi.aiRefineCloseAria}"]`
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    act(() => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
