import { Suspense, use } from 'react';
import { CellCompareResult, type CompareResultData } from '../results/CellCompareResult';
import { CellVersesResult, type VersesResultData } from '../results/CellVersesResult';
import { CellCountResult, type CountResultData } from '../results/CellCountResult';
import { CellWordFreqResult, type WordFreqResultData } from '../results/CellWordFreqResult';
import { CellStatsResult, type StatsResultData } from '../results/CellStatsResult';
import { fetchISLAResult } from './islaCache';
import { useLanguage } from '../../../context/LanguageContext';

function ISLASkeleton({ code }: { code: string }) {
  return (
    <div
      className="my-4 p-4 w-full max-w-full rounded-xl border border-amber-500/20 bg-amber-500/5 animate-pulse not-prose select-none whitespace-normal break-words"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-500 font-mono text-xs font-semibold">✦ ISLA</span>
        <span className="text-neutral-500 dark:text-neutral-400 font-mono text-xs truncate">{code}</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-amber-500/10 rounded w-3/4"></div>
        <div className="h-4 bg-amber-500/10 rounded w-5/6"></div>
        <div className="h-4 bg-amber-500/10 rounded w-1/2"></div>
      </div>
    </div>
  );
}

function ISLAContent({
  code,
  translation,
  contextText = '',
  onOutputRoute,
}: {
  code: string;
  translation: string;
  contextText?: string;
  onOutputRoute?: (op: { kind: string; name?: string; raw?: string }, code: string) => void;
}) {
  const { strings } = useLanguage();
  const result = use(fetchISLAResult(code, translation, contextText));

  if (result.type === 'error') {
    const errorMsg = (result.data as { message?: string })?.message || 'Unknown ISLA error';
    return (
      <div
        className="my-4 p-3 w-full max-w-full rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300 font-mono text-xs not-prose whitespace-normal break-words"
      >
        <span className="font-bold text-red-500">ISLA error:</span> {errorMsg}
        <div className="text-neutral-500 mt-1">{code}</div>
      </div>
    );
  }

  const outputOp = (result.data as { output_op?: { kind: string; name?: string; raw?: string } })?.output_op;

  return (
    <div
      className="group relative my-4 block w-full max-w-full rounded-xl border border-amber-500/30 dark:border-amber-500/25 bg-amber-500/5 dark:bg-[var(--surface)] p-4 shadow-xs hover:shadow-md transition-all not-prose text-[var(--text)] whitespace-normal break-words"
    >
      {/* Always-visible ISLA command header with syntax badge and output routing */}
      <div className="mb-3 pb-2 border-b border-amber-500/15 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
            <span className="text-amber-500">✦</span> {code}
          </span>
          {outputOp?.name && (
            <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px]">
              {outputOp.name}
            </span>
          )}
          {outputOp?.kind === 'cell_above' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-sans text-amber-600 dark:text-amber-400 font-medium">
              <span>↑</span> {strings.islaOutputAbove}
            </span>
          )}
          {outputOp?.kind === 'cell_below' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-sans text-amber-600 dark:text-amber-400 font-medium">
              <span>↓</span> {strings.islaOutputBelow}
            </span>
          )}
        </div>
        {outputOp && onOutputRoute && outputOp.kind !== 'inline' && (
          <button
            type="button"
            onClick={() => onOutputRoute(outputOp, code)}
            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
          >
            {outputOp.kind === 'cell_above' ? '↑ route' : '↓ route'}
          </button>
        )}
      </div>

      <div className="w-full max-w-full">
        {(result.type === 'compare' || result.type === 'comparison') && (
          <CellCompareResult
            data={result.data as CompareResultData}
            selectable={false}
          />
        )}
        {(result.type === 'verses' || result.type === 'read' || result.type === 'search' || result.type === 'refs' || result.type === 'suggest' || result.type === 'range') && (
          <CellVersesResult
            data={result.data as VersesResultData}
            selectable={false}
          />
        )}
        {result.type === 'themes' && (
          <div className="space-y-2 font-sans w-full max-w-full">
            <div className="flex flex-wrap gap-1.5">
              {((result.data as { themes?: Array<{ word: string; count: number }> })?.themes || []).map((t) => (
                <span
                  key={t.word}
                  className="inline-flex items-center gap-1 text-xs font-mono bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full shadow-2xs"
                >
                  <span className="font-semibold">#{t.word}</span>
                  <span className="text-[10px] opacity-75 font-sans">({t.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {result.type === 'count' && (
          <CellCountResult data={result.data as CountResultData} />
        )}
        {(result.type === 'words' || result.type === 'top_words') && (
          <CellWordFreqResult data={result.data as WordFreqResultData} />
        )}
        {result.type === 'stats' && (
          <CellStatsResult data={result.data as StatsResultData} />
        )}
      </div>
    </div>
  );
}

/**
 * Properties for {@link ISLABlock}.
 */
export interface ISLABlockProps {
  /** The raw ISLA DSL code snippet to evaluate (e.g. `COUNT "light"`). */
  code: string;
  /** Active Bible translation identifier for resolving text data. */
  translation: string;
  /** Optional notebook text context for caret (^) scope operations. */
  contextText?: string;
  /** Optional callback fired when routing an output to a new cell above or below. */
  onOutputRoute?: (op: { kind: string; name?: string; raw?: string }, code: string) => void;
}

/**
 * Suspense-driven ISLA DSL block renderer utilizing React 19 `use(promise)` for zero-waterfall inline DSL embedding in Markdown.
 *
 * @param props - Component properties conforming to {@link ISLABlockProps}.
 * @returns Suspended interactive ISLA query visualization.
 */
export function ISLABlock({ code, translation, contextText = '', onOutputRoute }: ISLABlockProps) {
  const cleanQuery = code.trim();
  if (!cleanQuery) return null;

  return (
    <Suspense fallback={<ISLASkeleton code={code} />}>
      <ISLAContent code={cleanQuery} translation={translation} contextText={contextText} onOutputRoute={onOutputRoute} />
    </Suspense>
  );
}

