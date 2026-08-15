// src/components/notebook/GridOverlay.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { GridOverlay } from './GridOverlay';

describe('GridOverlay', () => {
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

  it('renders nothing when visible prop is false', () => {
    act(() => {
      root = createRoot(container!);
      root.render(<GridOverlay visible={false} />);
    });

    expect(container?.firstElementChild).toBeNull();
  });

  it('renders 24 grid columns with snap percentage labels when visible prop is true', () => {
    act(() => {
      root = createRoot(container!);
      root.render(<GridOverlay visible={true} />);
    });

    const overlay = container?.firstElementChild as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.style.gridTemplateColumns).toBe('repeat(24), 1fr');

    const columnDivs = overlay.children;
    expect(columnDivs.length).toBe(24);

    // Verify snap point labels (25%, 33%, 50%, 67%, 100%)
    expect(container?.textContent).toContain('25%');
    expect(container?.textContent).toContain('33%');
    expect(container?.textContent).toContain('50%');
    expect(container?.textContent).toContain('67%');
    expect(container?.textContent).toContain('100%');
  });
});
