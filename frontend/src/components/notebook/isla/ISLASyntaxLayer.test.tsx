import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ISLASyntaxLayer } from './ISLASyntaxLayer';

describe('ISLASyntaxLayer', () => {
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

  it('renders without crashing for empty string', () => {
    act(() => {
      root?.render(<ISLASyntaxLayer code="" />);
    });
    expect(container?.firstChild).toBeTruthy();
  });

  it('renders directive token with amber styling', () => {
    act(() => {
      root?.render(<ISLASyntaxLayer code="! search" />);
    });
    const spans = container?.querySelectorAll('span');
    expect(spans && spans.length > 0).toBe(true);
    const directive = spans?.[0];
    expect(directive?.textContent?.trim()).toBe('!');
    expect(directive?.className).toContain('amber');
  });

  it('renders string token with cyan styling', () => {
    act(() => {
      root?.render(<ISLASyntaxLayer code='! search("armo")' />);
    });
    const spans = Array.from(container?.querySelectorAll('span') || []);
    const stringSpan = spans.find((s) => s.textContent === '"armo"');
    expect(stringSpan?.className).toContain('cyan');
  });

  it('renders reference token with emerald styling', () => {
    act(() => {
      root?.render(<ISLASyntaxLayer code="! @Joh 3:16" />);
    });
    const spans = Array.from(container?.querySelectorAll('span') || []);
    const refSpan = spans.find((s) => s.textContent?.includes('Joh 3:16'));
    expect(refSpan?.className).toContain('emerald');
  });

  it('is aria-hidden for accessibility compliance', () => {
    act(() => {
      root?.render(<ISLASyntaxLayer code="! @Joh 3:16" />);
    });
    const overlay = container?.firstChild as HTMLElement;
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });
});
