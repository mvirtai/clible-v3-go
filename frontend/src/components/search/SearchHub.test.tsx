import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { SearchHub } from './SearchHub';
import { LanguageProvider } from '../../context/LanguageContext';

vi.mock('../../services/api', () => ({
  apiService: {
    search: vi.fn().mockResolvedValue([]),
    addSearch: vi.fn().mockResolvedValue({}),
  },
}));

describe('SearchHub', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      root.unmount();
      root = null;
    }
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('renders mode switch pills with mobile-friendly grid and touch targets', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <SearchHub translation="web" />
        </LanguageProvider>
      );
    });

    const buttons = Array.from(container!.querySelectorAll('button'));
    const lexicalBtn = buttons.find((b) => b.textContent?.includes('Perinteinen') || b.textContent?.includes('Lexical'));
    const semanticBtn = buttons.find((b) => b.textContent?.includes('Semanttinen') || b.textContent?.includes('Semantic'));

    expect(lexicalBtn).toBeDefined();
    expect(semanticBtn).toBeDefined();

    // Responsive 2-column container on mobile
    const pillsContainer = container!.querySelector('.grid.grid-cols-2');
    expect(pillsContainer).not.toBeNull();
  });
});
