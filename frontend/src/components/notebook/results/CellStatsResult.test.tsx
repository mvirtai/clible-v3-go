import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { LanguageProvider } from '../../../context/LanguageContext';
import { CellStatsResult } from './CellStatsResult';

describe('CellStatsResult', () => {
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

  it('renders lexical metrics cards and TTR percentage correctly', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellStatsResult
            data={{
              token_count: 250,
              unique_tokens: 125,
              type_token_ratio: 0.5,
              avg_word_length: 5.42,
              character_count: 1350,
              top_words: [
                { word: 'valo', count: 12 },
                { word: 'pimeys', count: 6 },
              ],
            }}
          />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('50.0 %');
    expect(content).toContain('125');
    expect(content).toContain('250');
    expect(content).toContain('5.42');
    expect(content).toContain('#valo');
    expect(content).toContain('#pimeys');
  });

  it('handles ttr mode without top words preview', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <CellStatsResult
            data={{
              mode: 'ttr',
              token_count: 80,
              unique_tokens: 60,
              type_token_ratio: 0.75,
              top_words: [
                { word: 'sana', count: 5 },
              ],
            }}
          />
        </LanguageProvider>
      );
    });

    const content = container?.textContent || '';
    expect(content).toContain('75.0 %');
    expect(content).toContain('60');
    expect(content).toContain('80');
    // In 'ttr' mode top words should not be displayed
    expect(content).not.toContain('#sana');
  });
});
