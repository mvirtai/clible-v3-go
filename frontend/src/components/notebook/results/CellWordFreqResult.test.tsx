import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { LanguageProvider } from '../../../context/LanguageContext';
import { CellWordFreqResult } from './CellWordFreqResult';

describe('CellWordFreqResult', () => {
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

  it('renders word frequencies list correctly with ranks and counts', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellWordFreqResult
            data={{
              words: [
                { word: 'armo', count: 15 },
                { word: 'totuus', count: 10 },
                { word: 'rakkaus', count: 8 },
              ],
              limit: 5,
              token_count: 100,
              unique_tokens: 45,
            }}
          />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('armo');
    expect(content).toContain('15');
    expect(content).toContain('totuus');
    expect(content).toContain('10');
    expect(content).toContain('rakkaus');
    expect(content).toContain('8');
    expect(content).toContain('45 / 100');
  });

  it('renders empty message when words array is empty', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellWordFreqResult
            data={{
              words: [],
            }}
          />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('Ei tuloksia');
  });
});
