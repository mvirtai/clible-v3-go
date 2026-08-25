// src/components/notebook/CellBadge.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { CellBadge, NotebookContentBadges } from './CellBadge';
import { LanguageProvider } from '../../context/LanguageContext';
import type { Cell } from './types';

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
      root.render(
        <LanguageProvider>
          <CellBadge type="markdown" count={0} />
        </LanguageProvider>
      );
    });

    expect(container?.firstElementChild).toBeNull();
  });

  it('renders markdown count badge correctly', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellBadge type="markdown" count={3} />
        </LanguageProvider>
      );
    });

    const badge = container?.firstElementChild as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('3');
    expect(badge.textContent).toContain('MD');
  });

  it('renders smart category badges with emojis', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellBadge type="search" count={4} />
        </LanguageProvider>
      );
    });

    const badge = container?.firstElementChild as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('🔍');
    expect(badge.textContent).toContain('4');
    expect(badge.textContent).toContain('Haku');
  });

  it('renders NotebookContentBadges correctly for mixed cells', () => {
    const cells: Cell[] = [
      { id: '1', notebookId: 'nb', type: 'markdown', content: '# Muistiinpano' },
      { id: '2', notebookId: 'nb', type: 'markdown', content: '```isla\n? "valo"\n```' },
      { id: '3', notebookId: 'nb', type: 'markdown', content: '!@Joh 3:16' },
    ];

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookContentBadges cells={cells} />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('📝');
    expect(text).toContain('🔍');
    expect(text).toContain('📖');
  });

  it('renders empty label when no cells or counts', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookContentBadges cells={[]} />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('Tyhjä');
  });
});
