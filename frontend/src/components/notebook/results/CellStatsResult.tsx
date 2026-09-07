import { Activity, BookOpen, Layers, Type, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import type { WordFrequencyItem } from './CellWordFreqResult';

export interface StatsResultData {
  mode?: string;
  token_count: number;
  unique_tokens: number;
  type_token_ratio: number;
  character_count?: number;
  avg_word_length?: number;
  top_words?: WordFrequencyItem[];
}

export interface CellStatsResultProps {
  data: StatsResultData;
}

/**
 * Visual card displaying text lexical metrics including Type-Token Ratio (TTR) and word counts.
 */
export function CellStatsResult({ data }: CellStatsResultProps) {
  const { strings } = useLanguage();

  const ttrPercent = (data.type_token_ratio * 100).toFixed(1);

  return (
    <div className="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-100 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            {strings.statsTitle}
          </span>
        </div>
        <span className="text-xs font-mono text-amber-800/80 dark:text-amber-400/80">
          TTR: {ttrPercent} %
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: TTR */}
        <div className="p-3 rounded-lg bg-amber-500/10 dark:bg-black/20 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="truncate">{strings.ttrLabel}</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-950 dark:text-amber-100 mt-1">
            {ttrPercent} %
          </div>
        </div>

        {/* Metric 2: Unique words */}
        <div className="p-3 rounded-lg bg-amber-500/10 dark:bg-black/20 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="truncate">{strings.uniqueWordsLabel}</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-950 dark:text-amber-100 mt-1">
            {data.unique_tokens}
          </div>
        </div>

        {/* Metric 3: Total words */}
        <div className="p-3 rounded-lg bg-amber-500/10 dark:bg-black/20 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="truncate">{strings.totalWordsLabel}</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-950 dark:text-amber-100 mt-1">
            {data.token_count}
          </div>
        </div>

        {/* Metric 4: Avg Word Length */}
        <div className="p-3 rounded-lg bg-amber-500/10 dark:bg-black/20 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <Type className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="truncate">{strings.avgWordLengthLabel}</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-950 dark:text-amber-100 mt-1">
            {data.avg_word_length ?? '—'}
          </div>
        </div>
      </div>

      {/* Top Words Preview (if present) */}
      {data.top_words && data.top_words.length > 0 && data.mode !== 'ttr' && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            {strings.topWordsTitle}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.top_words.slice(0, 10).map((t) => (
              <span
                key={t.word}
                className="inline-flex items-center gap-1 text-xs font-mono bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full"
              >
                <span className="font-semibold">#{t.word}</span>
                <span className="text-[10px] opacity-75">({t.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
