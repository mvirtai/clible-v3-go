import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { VerseCurationHeader } from './VerseCurationHeader';
import { strings } from '../../utils/i18n';

describe('VerseCurationHeader', () => {
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

  it('renders tab buttons with correct badge counts', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <VerseCurationHeader
          strings={strings.en}
          filter="all"
          onFilterChange={vi.fn()}
          totalCount={10}
          acceptedCount={4}
          rejectedCount={2}
          onAcceptAll={vi.fn()}
          onResetCuration={vi.fn()}
        />
      );
    });

    expect(container!.textContent).toContain(strings.en.curateAll);
    expect(container!.textContent).toContain('10');
    expect(container!.textContent).toContain(strings.en.curateAccepted);
    expect(container!.textContent).toContain('4');
    expect(container!.textContent).toContain(strings.en.curateRejected);
    expect(container!.textContent).toContain('2');
  });

  it('calls onFilterChange when clicking tab buttons', () => {
    const onFilterChange = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <VerseCurationHeader
          strings={strings.en}
          filter="all"
          onFilterChange={onFilterChange}
          totalCount={5}
          acceptedCount={2}
          rejectedCount={1}
          onAcceptAll={vi.fn()}
          onResetCuration={vi.fn()}
        />
      );
    });

    const buttons = Array.from(container!.querySelectorAll('button'));
    const acceptedBtn = buttons.find((b) => b.textContent?.includes(strings.en.curateAccepted));
    const rejectedBtn = buttons.find((b) => b.textContent?.includes(strings.en.curateRejected));
    const allBtn = buttons.find((b) => b.textContent?.includes(strings.en.curateAll));

    act(() => {
      acceptedBtn?.click();
    });
    expect(onFilterChange).toHaveBeenCalledWith('accepted');

    act(() => {
      rejectedBtn?.click();
    });
    expect(onFilterChange).toHaveBeenCalledWith('rejected');

    act(() => {
      allBtn?.click();
    });
    expect(onFilterChange).toHaveBeenCalledWith('all');
  });

  it('shows Accept All button when acceptedCount < totalCount and triggers callback', () => {
    const onAcceptAll = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <VerseCurationHeader
          strings={strings.en}
          filter="all"
          onFilterChange={vi.fn()}
          totalCount={5}
          acceptedCount={4}
          rejectedCount={0}
          onAcceptAll={onAcceptAll}
          onResetCuration={vi.fn()}
        />
      );
    });

    const acceptAllBtn = container!.querySelector(`button[title="${strings.en.curateAcceptAll}"]`) as HTMLButtonElement;
    expect(acceptAllBtn).not.toBeNull();

    act(() => {
      acceptAllBtn.click();
    });
    expect(onAcceptAll).toHaveBeenCalledTimes(1);
  });

  it('hides Accept All button when all verses are already accepted', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <VerseCurationHeader
          strings={strings.en}
          filter="all"
          onFilterChange={vi.fn()}
          totalCount={5}
          acceptedCount={5}
          rejectedCount={0}
          onAcceptAll={vi.fn()}
          onResetCuration={vi.fn()}
        />
      );
    });

    const acceptAllBtn = container!.querySelector(`button[title="${strings.en.curateAcceptAll}"]`);
    expect(acceptAllBtn).toBeNull();
  });

  it('shows Reset button when there are accepted or rejected verses and triggers callback', () => {
    const onResetCuration = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <VerseCurationHeader
          strings={strings.en}
          filter="all"
          onFilterChange={vi.fn()}
          totalCount={5}
          acceptedCount={1}
          rejectedCount={1}
          onAcceptAll={vi.fn()}
          onResetCuration={onResetCuration}
        />
      );
    });

    const resetBtn = container!.querySelector(`button[title="${strings.en.curateReset}"]`) as HTMLButtonElement;
    expect(resetBtn).not.toBeNull();

    act(() => {
      resetBtn.click();
    });
    expect(onResetCuration).toHaveBeenCalledTimes(1);
  });

  it('hides Reset button when no verses are curated yet', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <VerseCurationHeader
          strings={strings.en}
          filter="all"
          onFilterChange={vi.fn()}
          totalCount={5}
          acceptedCount={0}
          rejectedCount={0}
          onAcceptAll={vi.fn()}
          onResetCuration={vi.fn()}
        />
      );
    });

    const resetBtn = container!.querySelector(`button[title="${strings.en.curateReset}"]`);
    expect(resetBtn).toBeNull();
  });
});
