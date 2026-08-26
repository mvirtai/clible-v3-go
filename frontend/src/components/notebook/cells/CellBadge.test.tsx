// src/components/notebook/CellBadge.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { CellBadge } from './CellBadge';

describe('CellBadge', () => {
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
  });

  it('renders null when count is 0', () => {
    act(() => {
      root = createRoot(container!);
      root.render(<CellBadge type="markdown" count={0} />);
    });

    expect(container?.firstElementChild).toBeNull();
  });

  it('renders markdown count badge correctly', () => {
    act(() => {
      root = createRoot(container!);
      root.render(<CellBadge type="markdown" count={3} />);
    });

    const badge = container?.firstElementChild as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('3 MD');
  });

  it('renders code count badge correctly', () => {
    act(() => {
      root = createRoot(container!);
      root.render(<CellBadge type="code" count={5} />);
    });

    const badge = container?.firstElementChild as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('5 CODE');
  });
});
