import { Suspense, use } from 'react';
import { CellCompareResult, type CompareResultData } from '../results/CellCompareResult';
import { CellVersesResult, type VersesResultData } from '../results/CellVersesResult';
import { CellCountResult, type CountResultData } from '../results/CellCountResult';
import { fetchISLAResult } from './islaCache';

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

function ISLAContent({ code, translation }: { code: string; translation: string }) {
  const result = use(fetchISLAResult(code, translation));

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

  return (
    <div
      className="group relative my-4 block w-full max-w-full rounded-xl border border-amber-500/30 dark:border-amber-500/25 bg-amber-500/5 dark:bg-[var(--surface)] p-4 shadow-xs hover:shadow-md transition-all not-prose text-[var(--text)] whitespace-normal break-words"
    >
      {/* Floating hover badge revealing the underlying ISLA command */}
      <div className="absolute top-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/90 dark:bg-[var(--surface-2)] border border-amber-500/30 text-amber-600 dark:text-amber-400 backdrop-blur-sm shadow-xs">
          ✦ {code}
        </span>
      </div>

      <div className="w-full max-w-full">
        {result.type === 'compare' && (
          <CellCompareResult
            data={result.data as CompareResultData}
            selectable={false}
          />
        )}
        {(result.type === 'verses' || result.type === 'read' || result.type === 'search' || result.type === 'refs' || result.type === 'suggest') && (
          <CellVersesResult
            data={result.data as VersesResultData}
            selectable={false}
          />
        )}
        {result.type === 'count' && (
          <CellCountResult data={result.data as CountResultData} />
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
}

/**
 * Suspense-driven ISLA DSL block renderer utilizing React 19 `use(promise)` for zero-waterfall inline DSL embedding in Markdown.
 *
 * @param props - Component properties conforming to {@link ISLABlockProps}.
 * @returns Suspended interactive ISLA query visualization.
 */
export function ISLABlock({ code, translation }: ISLABlockProps) {
  const cleanQuery = code.trim();
  if (!cleanQuery) return null;

  return (
    <Suspense fallback={<ISLASkeleton code={code} />}>
      <ISLAContent code={cleanQuery} translation={translation} />
    </Suspense>
  );
}

