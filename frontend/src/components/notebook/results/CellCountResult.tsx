import { Hash } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * Data payload returned by an ISLA `COUNT` operation.
 */
export interface CountResultData {
  /** Target classification (e.g. 'search' or 'verse_list'). */
  target_type?: string;
  /** Search query string if target_type is 'search'. */
  query?: string;
  /** Verse passage reference if target_type is 'verses'. */
  reference?: string;
  /** Whether regex matching was enabled. */
  is_regex?: boolean;
  /** Optional book identifier scope filter (e.g. 'GEN'). */
  scope_book?: string;
  /** Total matching count. */
  count: number;
  /** Translation identifier used for the calculation. */
  translation?: string;
}

/**
 * Properties for {@link CellCountResult}.
 */
export interface CellCountResultProps {
  /** Count result payload returned by backend ISLA executor. */
  data: CountResultData;
}

/**
 * Visual statistic card rendering the output of an ISLA `COUNT` command.
 *
 * @param props - Component properties conforming to {@link CellCountResultProps}.
 * @returns Count summary card.
 */
export function CellCountResult({ data }: CellCountResultProps) {
  const { strings } = useLanguage();

  return (
    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 text-amber-950 dark:text-amber-100 shadow-xs">
      <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex-shrink-0">
        <Hash className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">
          {data.target_type === 'search' ? (
            <span>
              {strings.countResultsForSearch}{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-900/10 dark:bg-black/40 text-amber-950 dark:text-amber-200 border border-amber-500/20 font-mono">
                {data.is_regex ? `/${data.query}/` : `"${data.query}"`}
              </code>
              {data.scope_book && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-300 font-mono text-xs font-bold">
                  @{data.scope_book}
                </span>
              )}
            </span>
          ) : (
            <span>
              {strings.countVersesForRef}{' '}
              <span className="font-bold text-amber-950 dark:text-amber-100">{data.reference}</span>
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-amber-950 dark:text-amber-100 mt-0.5 tracking-tight">
          {data.count}{' '}
          <span className="text-xs font-medium text-amber-800/90 dark:text-amber-300/80">
            {data.count === 1 ? strings.countMatchSingular : strings.countMatchPlural} ({data.translation || strings.defaultTranslationLabel})
          </span>
        </div>
      </div>
    </div>
  );
};