import React, { useState } from 'react';
import type { Cell, CellResult } from './types';

interface CodeCellProps {
  cell: Cell;
  onChange: (content: string) => void;
  onExecute: () => Promise<void>;
}

export const CodeCell: React.FC<CodeCellProps> = ({
  cell,
  onChange,
  onExecute,
}) => {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      await onExecute();
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRun();
    }
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden transition-all duration-300 shadow-inner">
      {/* CLI-Syöterivi */}
      <div className="flex items-center gap-3 bg-neutral-900 px-4 py-2 border-b border-neutral-800/80">
        <span className="font-mono text-amber-500 font-bold tracking-wider select-none">$ clible</span>
        <input
          type="text"
          className="flex-1 font-mono bg-transparent text-neutral-100 border-none outline-none focus:ring-0 text-sm placeholder-neutral-600"
          value={cell.content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/read Efesolaiskirje 2:8-9 tai /search armo"
          onKeyDown={handleKeyDown}
          disabled={isRunning}
        />
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 text-neutral-950 font-bold text-xs rounded transition-all shadow-sm"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-neutral-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              Run
            </>
          )}
        </button>
      </div>

      {/* Tuloksen renderöintialue */}
      {cell.resultJson && (
        <div className="p-4 bg-neutral-950/70 border-t border-neutral-900/50 font-sans text-neutral-200">
          <ResultRenderer result={cell.resultJson} />
        </div>
      )}
    </div>
  );
};

interface VerseData {
  book: string;
  chapter: number;
  verse: number;
  translation: string;
  text: string;
}

/* Yksinkertainen sisäinen apukomponentti tulosten renderöintiin */
const ResultRenderer: React.FC<{ result: CellResult }> = ({ result }) => {
  if (result.type === 'error') {
    // Tyyppitarkistus error-datan message-kentälle, koska result.data on unknown
    let errorMessage = 'Virhe komennon suorituksessa.';
    if (result.data && typeof result.data === 'object' && 'message' in result.data) {
      const obj = result.data as { message?: unknown };
      if (typeof obj.message === 'string') {
        errorMessage = obj.message;
      }
    }
    return (
      <div className="text-red-400 font-mono text-sm border-l-2 border-red-500 pl-3 py-1">
        {errorMessage}
      </div>
    );
  }

  if (result.type === 'verse_list') {
    const verses = (Array.isArray(result.data) ? result.data : []) as VerseData[];
    return (
      <div className="space-y-3">
        {verses.map((v, idx) => (
          <div key={idx} className="border-b border-neutral-900 pb-2 last:border-0 last:pb-0">
            <span className="text-amber-500 font-semibold text-xs mr-2 select-none">
              {v.book} {v.chapter}:{v.verse} ({v.translation})
            </span>
            <p className="text-neutral-300 leading-relaxed text-sm mt-0.5">{v.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // Oletus: raakateksti / fallback
  return (
    <pre className="font-mono text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded border border-neutral-900/30">
      {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
    </pre>
  );
};
