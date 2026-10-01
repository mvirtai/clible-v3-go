import type { TextStats, WordFrequency } from '../../types/bible';

export type FrequencyLevel = 'words' | 'bigrams' | 'trigrams';

const MIN_CHART_HEIGHT = 240;
const ROW_HEIGHT = 34;

export function selectFrequencyData(
  stats: TextStats,
  level: FrequencyLevel,
): WordFrequency[] {
  switch (level) {
    case 'bigrams':
      return stats.topBigrams;
    case 'trigrams':
      return stats.topTrigrams;
    default:
      return stats.topWords;
  }
}

export function getFrequencyChartHeight(itemCount: number): number {
  return Math.max(MIN_CHART_HEIGHT, itemCount * ROW_HEIGHT);
}
