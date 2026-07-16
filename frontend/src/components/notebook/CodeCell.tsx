import React, { useState } from 'react';
import type { Cell, CellResult } from './types';
import { bookCitationAbbrevFi } from '../../utils/bookNames';
import { formatResultToMarkdown, type CLIResultData } from '../../utils/markdown';

interface CodeCellProps {
  cell: Cell;
  onChange: (content: string) => void;
  onExecute: () => Promise<void>;
  translation?: string;
  onFreeze?: (markdown: string) => void;
}

export const CodeCell: React.FC<CodeCellProps> = ({
  cell,
  onChange,
  onExecute,
  translation = 'WEB',
  onFreeze,
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

  const hasFreezeOption = cell.resultJson && 
    ['read', 'search', 'refs', 'suggest'].includes(cell.resultJson.type);

  const handleFreezeClick = () => {
    if (!cell.resultJson || !onFreeze) return;
    const markdown = formatResultToMarkdown(
      cell.resultJson.type,
      cell.resultJson.data as CLIResultData,
      translation
    );
    if (markdown) {
      onFreeze(markdown);
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
          placeholder="/read Joh 3:16 tai /suggest tai /refs Joh 3:16"
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
          <div className="flex justify-between items-center mb-3 border-b border-neutral-900 pb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
              CLI Output — {cell.resultJson.type}
            </span>
            {hasFreezeOption && onFreeze && (
              <button
                onClick={handleFreezeClick}
                className="text-[10px] font-bold text-neutral-400 hover:text-amber-500 flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 px-2 py-1 rounded border border-neutral-800 transition-all"
                title="Muunna Markdown-soluksi nykyisen solun alapuolelle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Freeze to Markdown
              </button>
            )}
          </div>
          <ResultRenderer result={cell.resultJson} />
        </div>
      )}
    </div>
  );
};

interface Verse {
  id: string;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

interface ReadResult {
  reference: string;
  verses: Verse[];
}

interface SearchResult {
  query: string;
  verses: Verse[];
}

interface RefsResult {
  source: string;
  references: Verse[];
}

interface SuggestResult {
  keywords: string[];
  suggestions: Verse[];
}

/* Tulosten dynaaminen renderöijä eri komennon tyypeille */
const ResultRenderer: React.FC<{ result: CellResult }> = ({ result }) => {
  if (result.type === 'error') {
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

  // 1. /read tulos
  if (result.type === 'read') {
    const data = result.data as ReadResult;
    const verses = data.verses || [];
    return (
      <div className="space-y-3">
        {verses.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">Ei jakeita löydetty viitteellä {data.reference}.</p>
        ) : (
          verses.map((v) => {
            const book = bookCitationAbbrevFi(v.bookId);
            return (
              <div key={v.id} className="pb-1">
                <span className="text-amber-500 font-semibold text-xs mr-2 select-none">
                  {book} {v.chapter}:{v.verse} ({v.translationId.toUpperCase()})
                </span>
                <p className="text-neutral-300 leading-relaxed text-sm mt-0.5">{v.text}</p>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // 2. /search tulos
  if (result.type === 'search') {
    const data = result.data as SearchResult;
    const verses = data.verses || [];
    return (
      <div className="space-y-3">
        <p className="text-xs text-neutral-400">Hakutulokset kyselylle: <span className="text-neutral-200 font-mono">"{data.query}"</span></p>
        {verses.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">Ei tuloksia.</p>
        ) : (
          verses.map((v) => {
            const book = bookCitationAbbrevFi(v.bookId);
            return (
              <div key={v.id} className="border-b border-neutral-900 pb-2 last:border-0 last:pb-0">
                <span className="text-amber-500 font-semibold text-xs mr-2 select-none">
                  {book} {v.chapter}:{v.verse} ({v.translationId.toUpperCase()})
                </span>
                <p className="text-neutral-300 leading-relaxed text-sm mt-0.5">{v.text}</p>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // 3. /refs tulos
  if (result.type === 'refs') {
    const data = result.data as RefsResult;
    const refs = data.references || [];
    return (
      <div className="space-y-3">
        <p className="text-xs text-neutral-400">Dynaamiset ristiinviitteet jakeelle: <span className="text-amber-500 font-semibold">{data.source}</span></p>
        {refs.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">Ei ristiinviitteitä löydetty (jae saattaa sisältää vain yleisiä sanoja).</p>
        ) : (
          <div className="space-y-3">
            {refs.map((v) => {
              const book = bookCitationAbbrevFi(v.bookId);
              return (
                <div key={v.id} className="border-b border-neutral-900 pb-2 last:border-0 last:pb-0">
                  <span className="text-amber-500 font-semibold text-xs mr-2 select-none">
                    {book} {v.chapter}:{v.verse} ({v.translationId.toUpperCase()})
                  </span>
                  <p className="text-neutral-300 leading-relaxed text-sm mt-0.5">{v.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 4. /suggest tulos
  if (result.type === 'suggest') {
    const data = result.data as SuggestResult;
    const suggestions = data.suggestions || [];
    return (
      <div className="space-y-3">
        {data.keywords && data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] text-neutral-500 self-center mr-1">Tunnistetut teemat:</span>
            {data.keywords.map((kw) => (
              <span key={kw} className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                #{kw}
              </span>
            ))}
          </div>
        )}
        {suggestions.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">Kirjoita ensin enemmän Markdown-soluihin saadaksesi teemakohtaisia ehdotuksia.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((v) => {
              const book = bookCitationAbbrevFi(v.bookId);
              return (
                <div key={v.id} className="border-b border-neutral-900 pb-2 last:border-0 last:pb-0">
                  <span className="text-amber-500 font-semibold text-xs mr-2 select-none">
                    {book} {v.chapter}:{v.verse} ({v.translationId.toUpperCase()})
                  </span>
                  <p className="text-neutral-300 leading-relaxed text-sm mt-0.5">{v.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Fallback: raakateksti / JSON stringify
  return (
    <pre className="font-mono text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded border border-neutral-900/30">
      {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
    </pre>
  );
};
