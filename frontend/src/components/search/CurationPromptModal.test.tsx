import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { CurationUnreviewedBanner } from './CurationPromptModal';
import { strings } from '../../utils/i18n';

describe('CurationUnreviewedBanner', () => {
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

  it('renders unreviewed count message and localized actions', () => {
    const localeStrings = strings.fi;
    const onAcceptRemaining = vi.fn();
    const onRejectRemaining = vi.fn();
    const onCancel = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <CurationUnreviewedBanner
          strings={localeStrings}
          unreviewedCount={4}
          onAcceptRemaining={onAcceptRemaining}
          onRejectRemaining={onRejectRemaining}
          onCancel={onCancel}
        />,
      );
    });

    expect(container!.textContent).toContain(localeStrings.curateCommitConfirmTitle);
    expect(container!.textContent).toContain(localeStrings.curateUnreviewedPrompt(4));
    expect(container!.textContent).toContain(localeStrings.curateAcceptRemaining);
    expect(container!.textContent).toContain(localeStrings.curateRejectRemaining);
    expect(container!.textContent).toContain(localeStrings.curateCancelCommit);
  });

  it('invokes callback handlers on button clicks', () => {
    const localeStrings = strings.en;
    const onAcceptRemaining = vi.fn();
    const onRejectRemaining = vi.fn();
    const onCancel = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <CurationUnreviewedBanner
          strings={localeStrings}
          unreviewedCount={2}
          onAcceptRemaining={onAcceptRemaining}
          onRejectRemaining={onRejectRemaining}
          onCancel={onCancel}
        />,
      );
    });

    const buttons = Array.from(container!.querySelectorAll('button'));
    const acceptBtn = buttons.find((b) => b.textContent?.includes(localeStrings.curateAcceptRemaining));
    const rejectBtn = buttons.find((b) => b.textContent?.includes(localeStrings.curateRejectRemaining));
    const cancelBtn = buttons.find((b) => b.textContent?.includes(localeStrings.curateCancelCommit));
    const closeBtn = container!.querySelector('button:has(svg.lucide-x)') as HTMLButtonElement;

    expect(acceptBtn).toBeDefined();
    expect(rejectBtn).toBeDefined();
    expect(cancelBtn).toBeDefined();

    act(() => {
      acceptBtn!.click();
    });
    expect(onAcceptRemaining).toHaveBeenCalledTimes(1);

    act(() => {
      rejectBtn!.click();
    });
    expect(onRejectRemaining).toHaveBeenCalledTimes(1);

    act(() => {
      cancelBtn!.click();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);

    if (closeBtn) {
      act(() => {
        closeBtn.click();
      });
      expect(onCancel).toHaveBeenCalledTimes(2);
    }
  });
});
