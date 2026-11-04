import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { NextFocusChips } from './NextFocusChips';
import type { NextFocusItem } from '../../types/ai';

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('NextFocusChips', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockItems: NextFocusItem[] = [
    { label: 'Covenant', kind: 'theme', reason: 'Explores biblical covenant' },
    { label: 'Grace', kind: 'theme', reason: 'Grace in context' },
  ];

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

  it('renders chips and handles pick', async () => {
    const onPick = vi.fn();

    await act(async () => {
      root.render(
        <NextFocusChips
          title="Jatkoaiheet"
          items={mockItems}
          onPick={onPick}
        />,
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain('Covenant');

    await act(async () => {
      buttons[0].click();
    });

    expect(onPick).toHaveBeenCalledWith(mockItems[0]);
  });

  it('sets aria-busy and highlights only the pending chip', async () => {
    const onPick = vi.fn();

    await act(async () => {
      root.render(
        <NextFocusChips
          title="Jatkoaiheet"
          items={mockItems}
          onPick={onPick}
          pendingLabel="Grace"
          disabled={true}
        />,
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons[0].getAttribute('aria-busy')).toBe('false');
    expect(buttons[0].disabled).toBe(true);

    expect(buttons[1].getAttribute('aria-busy')).toBe('true');
    expect(buttons[1].disabled).toBe(true);
    // Should render spinning icon inside pending chip
    expect(buttons[1].querySelector('svg')).not.toBeNull();
  });
});

