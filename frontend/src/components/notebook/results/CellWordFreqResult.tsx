import { BarChart2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export interface WordFrequencyItem {
  word: string;
  count: number;
}

export interface WordFreqResultData {
  words: WordFrequencyItem[];
  limit?: number;
  count?: number;
  token_count?: number;
  unique_tokens?: number;
  type_token_ratio?: number;
}

export interface CellWordFreqResultProps {
  data: WordFreqResultData;
}

/**
 * Visual bar chart rendering the most frequent words from an ISLA `top(...)` or `words(...)` pipeline.
 */
export function CellWordFreqResult({ data }: CellWordFreqResultProps) {
  const { strings } = useLanguage();
  const items = data.words || [];

  if (items.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-sm">
        {strings.noResults}
      </div>
    );
  }

  const maxCount = Math.max(...items.map((it) => it.count), 1);

  return (
    <div className="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-100 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            {strings.topWordsTitle}
          </span>
        </div>
        {data.unique_tokens !== undefined && data.token_count !== undefined && (
          <span className="text-xs font-mono text-amber-800/80 dark:text-amber-400/80">
            {data.unique_tokens} / {data.token_count} {strings.countUnitWordsPlural}
          </span>
        )}
      </div>

      {/* Bar Chart List */}
      <div className="space-y-2 pt-1" role="list">
        {items.map((item, idx) => {
          const percentage = Math.round((item.count / maxCount) * 100);
          return (
            <div
              key={item.word}
              role="listitem"
              className="flex items-center gap-3 text-xs group hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors"
            >
              {/* Rank */}
              <span className="w-5 text-right font-mono text-amber-700/70 dark:text-amber-400/70 font-semibold">
                {idx + 1}.
              </span>

              {/* Word label */}
              <span className="w-28 sm:w-36 font-semibold text-amber-950 dark:text-amber-100 truncate font-mono">
                {item.word}
              </span>

              {/* Bar track and fill */}
              <div className="flex-1 h-3.5 bg-amber-950/10 dark:bg-black/30 rounded-full overflow-hidden p-0.5 border border-amber-500/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-500 dark:to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(percentage, 4)}%` }}
                />
              </div>

              {/* Count */}
              <span className="w-12 text-right font-mono font-bold text-amber-900 dark:text-amber-200">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
