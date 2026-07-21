import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
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
  const [deselectedVerseIds, setDeselectedVerseIds] = useState<Record<string, boolean>>({});

  const [prevResultJson, setPrevResultJson] = useState<unknown>(null);

  const { strings } = useLanguage();

  if (cell.resultJson !== prevResultJson) {
    setPrevResultJson(cell.resultJson);
    setDeselectedVerseIds({});
  }

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setDeselectedVerseIds({});
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

  const selectedCount = (() => {
    if (!cell.resultJson) return 0;
    const data = cell.resultJson.data as CLIResultData;
    const verses = data.verses || data.references || data.suggestions || [];
    return verses.filter(v => !deselectedVerseIds[v.id]).length;
  })();

  const toggleVerse = (id: string) => {
    setDeselectedVerseIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFreezeClick = () => {
    if (!cell.resultJson || !onFreeze) return;
    
    const data = cell.resultJson.data as CLIResultData;
    const filteredData = { ...data };

    if (data.verses) {
      filteredData.verses = data.verses.filter(v => !deselectedVerseIds[v.id]);
    }
    if (data.references) {
      filteredData.references = data.references.filter(v => !deselectedVerseIds[v.id]);
    }
    if (data.suggestions) {
      filteredData.suggestions = data.suggestions.filter(v => !deselectedVerseIds[v.id]);
    }

    const markdown = formatResultToMarkdown(
      cell.resultJson.type,
      filteredData,
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
          placeholder={strings.codeCellPlaceholder}
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
              {strings.runningLabel}
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              {strings.runLabel}
            </>
          )}
        </button>
      </div>

      {/* Tuloksen renderöintialue */}
      {cell.resultJson && (
        <div className="p-4 bg-neutral-950/70 border-t border-neutral-900/50 font-sans text-neutral-200">
          <div className="flex justify-between items-center mb-3 border-b border-neutral-900 pb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
            {strings.cliOutputPrefix} {cell.resultJson.type}
          </span> 
            {hasFreezeOption && onFreeze && (
              <button
                onClick={handleFreezeClick}
                disabled={selectedCount === 0}
                className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded border transition-all ${
                  selectedCount === 0
                    ? 'text-neutral-600 bg-neutral-950 border-neutral-900 cursor-not-allowed'
                    : 'text-neutral-400 hover:text-amber-500 bg-neutral-900 hover:bg-neutral-800 border-neutral-800'
                }`}
                title={selectedCount === 0 ? strings.freezeDisabledTitle : strings.freezeEnabledTitle}
              >
                {strings.freezeLabel}
              </button>
            )}
          </div>
          <ResultRenderer
            result={cell.resultJson}
            deselectedVerseIds={deselectedVerseIds}
            onToggleVerse={toggleVerse}
            strings={strings}
          />
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

interface ResultRendererProps {
  result: CellResult;
  deselectedVerseIds?: Record<string, boolean>;
  onToggleVerse?: (id: string) => void;
  strings: ReturnType<typeof useLanguage>['strings'];
}

/* Tulosten dynaaminen renderöijä eri komennon tyypeille */
const ResultRenderer: React.FC<ResultRendererProps> = ({
  result,
  deselectedVerseIds = {},
  onToggleVerse,
  strings,
}) => {
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

  // Helper component to render a clickable verse item
  const RenderVerseItem = ({ v }: { v: Verse }) => {
    const book = bookCitationAbbrevFi(v.bookId);
    const isDeselected = !!deselectedVerseIds[v.id];
    return (
      <div
        onClick={() => onToggleVerse?.(v.id)}
        className={`group cursor-pointer select-none transition-all duration-200 p-2 rounded hover:bg-neutral-900 border border-transparent ${
          isDeselected ? 'opacity-40 text-neutral-500' : 'text-neutral-300'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="mt-1 flex items-center justify-center w-3.5 h-3.5 rounded border border-neutral-700 bg-neutral-950 text-amber-500 transition-colors group-hover:border-amber-500/50">
            {!isDeselected && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 font-semibold text-xs select-none">
                {book} {v.chapter}:{v.verse} ({v.translationId.toUpperCase()})
              </span>
            </div>
            <p className={`leading-relaxed text-sm mt-1 transition-all ${isDeselected ? 'line-through text-neutral-600' : 'text-neutral-300'}`}>
              {v.text}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 1. /read tulos
  if (result.type === 'read') {
    const data = result.data as ReadResult;
    const verses = data.verses || [];
    return (
      <div className="space-y-1">
        {verses.length === 0 ? (
                  <p className="text-neutral-500 text-sm italic">{strings.noVersesFound} {data.reference}.</p>
                ) : (
                  verses.map((v) => <RenderVerseItem key={v.id} v={v} />)
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
        <p className="text-xs text-neutral-400">{strings.searchResultsForQuery}: <span className="text-neutral-200 font-mono">"{data.query}"</span></p>
        {verses.length === 0 ? (
                  <p className="text-neutral-500 text-sm italic">{strings.noResults}</p>
                ) : (
          <div className="space-y-1">
            {verses.map((v) => <RenderVerseItem key={v.id} v={v} />)}
          </div>
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
        <p className="text-xs text-neutral-400">{strings.dynamicRefsFor}: <span className="text-amber-500 font-semibold">{data.source}</span></p>
        {refs.length === 0 ? (
                  <p className="text-neutral-500 text-sm italic">{strings.noRefsFound}</p>
                ) : (
          <div className="space-y-1">
            {refs.map((v) => <RenderVerseItem key={v.id} v={v} />)}
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
                    <span className="text-[10px] text-neutral-500 self-center mr-1">{strings.identifiedThemesLabel}</span>
                    {data.keywords.map((kw) => (
              <span key={kw} className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                #{kw}
              </span>
            ))}
          </div>
        )}
        {suggestions.length === 0 ? (
                  <p className="text-neutral-500 text-sm italic">{strings.suggestNoData}</p>
                ) : (
          <div className="space-y-1">
            {suggestions.map((v) => <RenderVerseItem key={v.id} v={v} />)}
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
