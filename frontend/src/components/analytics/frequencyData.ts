import type { TextStats, WordFrequency } from '../../types/bible';

export type FrequencyLevel = 'words' | 'bigrams' | 'trigrams';

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
