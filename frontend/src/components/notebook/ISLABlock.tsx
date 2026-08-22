import React, { Suspense, use } from 'react';
import { CellCompareResult, type CompareResultData } from './CellCompareResult';
import { CellVersesResult, type VersesResultData } from './CellVersesResult';
import { CellCountResult, type CountResultData } from './CellCountResult';
import { fetchISLAResult } from './islaCache';

const ISLASkeleton: React.FC<{ code: string }> = ({ code }) => (
  <div
    className="my-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 animate-pulse not-prose select-none"
  >
    <div className="flex items-center gap-2 mb-3">
      <span className="text-amber-400 font-mono text-xs font-semibold">✦ ISLA</span>
      <span className="text-neutral-400 font-mono text-xs truncate">{code}</span>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-amber-500/10 rounded w-3/4"></div>
      <div className="h-4 bg-amber-500/10 rounded w-5/6"></div>
      <div className="h-4 bg-amber-500/10 rounded w-1/2"></div>
    </div>
  </div>
);

const ISLAContent: React.FC<{ code: string; translation: string }> = ({ code, translation }) => {
  const result = use(fetchISLAResult(code, translation));

  if (result.type === 'error') {
    const errorMsg = (result.data as { message?: string })?.message || 'Unknown ISLA error';
    return (
      <div
        className="my-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 font-mono text-xs not-prose"
      >
        <span className="font-bold text-red-400">ISLA error:</span> {errorMsg}
        <div className="text-neutral-500 mt-1">{code}</div>
      </div>
    );
  }

  return (
    <div
      className="group relative my-4 rounded-xl border border-amber-500/20 bg-neutral-900/40 hover:bg-neutral-900/60 overflow-hidden shadow-sm hover:shadow-md transition-all not-prose text-neutral-200"
    >
      {/* Floating hover badge revealing the underlying ISLA command */}
      <div className="absolute top-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-950/85 border border-amber-500/30 text-amber-400 backdrop-blur-sm shadow-sm">
          ✦ {code}
        </span>
      </div>

      <div className="p-4">
        {result.type === 'compare' && (
          <CellCompareResult
            data={result.data as CompareResultData}
            deselectedVerseIds={{}}
            onToggleVerse={() => {}}
          />
        )}
        {(result.type === 'verses' || result.type === 'read' || result.type === 'search' || result.type === 'refs' || result.type === 'suggest') && (
          <CellVersesResult
            data={result.data as VersesResultData}
            deselectedVerseIds={{}}
            onToggleVerse={() => {}}
          />
        )}
        {result.type === 'count' && (
          <CellCountResult data={result.data as CountResultData} />
        )}
      </div>
    </div>
  );
};

interface ISLABlockProps {
  code: string;
  translation: string;
}

export const ISLABlock: React.FC<ISLABlockProps> = ({ code, translation }) => {
  const cleanQuery = code.trim();
  if (!cleanQuery) return null;

  return (
    <Suspense fallback={<ISLASkeleton code={code} />}>
      <ISLAContent code={cleanQuery} translation={translation} />
    </Suspense>
  );
};
