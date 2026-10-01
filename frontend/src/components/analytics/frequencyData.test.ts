import { describe, expect, it } from 'vitest';
import {
  getFrequencyChartHeight,
  selectFrequencyData,
} from './frequencyData';
import type { TextStats } from '../../types/bible';

const stats: TextStats = {
  tokenCount: 12,
  uniqueTokenCount: 8,
  typeTokenRatio: 0.67,
  characterCount: 64,
  avgWordLength: 4.2,
  topWords: [{ name: 'armo', value: 4 }],
  topBigrams: [{ name: 'jumalan armo', value: 3 }],
  topTrigrams: [{ name: 'jumalan armo riittää', value: 2 }],
};

describe('selectFrequencyData', () => {
  it('selects the requested n-gram level', () => {
    expect(selectFrequencyData(stats, 'words')).toEqual(stats.topWords);
    expect(selectFrequencyData(stats, 'bigrams')).toEqual(stats.topBigrams);
    expect(selectFrequencyData(stats, 'trigrams')).toEqual(stats.topTrigrams);
  });

  it('allocates a readable row height for every frequency item', () => {
    expect(getFrequencyChartHeight(0)).toBe(240);
    expect(getFrequencyChartHeight(10)).toBe(340);
  });
});
