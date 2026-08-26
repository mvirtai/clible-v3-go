import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { Cell, CellResult } from './types';
import { formatResultToMarkdown, type CLIResultData } from '../../utils/markdown';
import { CellCountResult, type CountResultData } from './CellCountResult';
import { CellCompareResult, type CompareResultData } from './CellCompareResult';
import { CellVersesResult, type VersesResultData } from './CellVersesResult';

/**
 * An individual extracted keyword theme item.
 */
export interface ThemeItem {
  /** The thematic keyword or phrase */
  word: string;
  /** Occurrence count */
  count: number;
}

/**
 * Result payload returned from a `/themes` analysis query.
 */
export interface ThemesResult {
  /** List of extracted themes */
  themes: ThemeItem[];
  /** Maximum limit requested */
  limit?: number;
  /** Total count of themes */
  count: number;
}

/**
 * Properties for {@link CodeCell}.
 */
export interface CodeCellProps {
  /** The notebook code cell model instance */
  cell: Cell;
  /** Callback fired when code/command content changes */
  onChange: (content: string) => void;
  /** Callback fired to execute the command on the backend */
  onExecute: () => Promise<void>;
  /** Active translation identifier */
  translation?: string;
  /** Optional callback to freeze execution results to a Markdown cell */
  onFreeze?: (markdown: string, direction?: 'up' | 'down') => void;
}

/**
 * Interactive CLI code cell with execution controls, freeze-to-markdown workflow, and dynamic result renderers.
 *
 * @param props - Component properties conforming to {@link CodeCellProps}.
 * @returns Executable code cell container.
 */
export const CodeCell: React.FC<CodeCellProps> = ({
  cell,
  onChange,
  onExecute,
  translation = 'WEB',
  onFreeze,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [deselectedVerseIds, setDeselectedVerseIds] = useState<Record<string, boolean>>({});
  const { strings } = useLanguage();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  const handleExecute = async () => {
    if (isRunning) return;
    setIsRunning(true);
    // Reset deselected state on new execution
    setDeselectedVerseIds({});
    try {
      await onExecute();
    } finally {
      setIsRunning(false);
    }
  };

  // Check if result type is freezable
  const freezableTypes = ['read', 'search', 'refs', 'suggest', 'compare', 'themes', 'count'];
  const hasFreezeOption = cell.resultJson && freezableTypes.includes(cell.resultJson.type);

  // Toggle selection state of an individual verse
  const toggleVerse = (id: string) => {
    setDeselectedVerseIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Calculate count of selected verses
  const getVerseCountInfo = () => {
    if (!cell.resultJson || !cell.resultJson.data) return { total: 0, selected: 0 };
    const data = cell.resultJson.data as Record<string, unknown>;
    
    // For compare result: compare left and right verses
    if (cell.resultJson.type === 'compare') {
      const left = (data.left as { verses?: { id: string }[] })?.verses || [];
      const right = (data.right as { verses?: { id: string }[] })?.verses || [];
      const maxRows = Math.max(left.length, right.length);
      let selected = 0;
      for (let i = 0; i < maxRows; i++) {
        const leftId = left[i]?.id;
        const rightId = right[i]?.id;
        const isLeftDeselected = leftId ? !!deselectedVerseIds[leftId] : false;
        const isRightDeselected = rightId ? !!deselectedVerseIds[rightId] : false;
        if (!((leftId && isLeftDeselected) || (rightId && isRightDeselected))) {
          selected++;
        }
      }
      return { total: maxRows, selected };
    }

    const verses = (data.verses || data.references || data.suggestions || []) as { id: string }[];
    if (!Array.isArray(verses)) return { total: 1, selected: 1 }; // For non-array results (e.g. themes/count)
    const total = verses.length;
    const deselectedCount = Object.values(deselectedVerseIds).filter(Boolean).length;
    return { total, selected: Math.max(0, total - deselectedCount) };
  };

  const { selected: selectedCount } = getVerseCountInfo();

  const handleFreezeClick = () => {
    if (!cell.resultJson || !onFreeze) return;
    const formattedMd = formatResultToMarkdown(
      cell.resultJson.type,
      cell.resultJson.data as CLIResultData,
      translation
    );
    if (formattedMd.trim()) {
      onFreeze(formattedMd, direction);
      // Reset selection state after freeze
      setDeselectedVerseIds({});
    }
  };

  return (
    <div className="w-full flex flex-col bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden transition-all duration-200">
      {/* CLI Command Bar */}
      <div className="flex items-center px-4 py-3 gap-3 bg-neutral-900/90 border-b border-neutral-800/80">
        <span className="text-amber-500 font-mono font-bold text-sm select-none">$</span>
        <input
          type="text"
          className="flex-1 bg-transparent border-none text-neutral-100 font-mono text-sm focus:outline-none placeholder-neutral-500"
          value={cell.content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={strings.codeCellPlaceholder}
        />
        <div className="flex items-center gap-2">
          {/* Freeze Direction Selector */}
          {hasFreezeOption && onFreeze && (
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded p-0.5">
              <button
                type="button"
                onClick={() => setDirection('up')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded flex items-center gap-0.5 transition-all cursor-pointer ${
                  direction === 'up'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={strings.freezeUpTitle}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => setDirection('down')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded flex items-center gap-0.5 transition-all cursor-pointer ${
                  direction === 'down'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={strings.freezeDownTitle}
              >
                ↓
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExecute}
            disabled={isRunning || !cell.content.trim()}
            className={`px-3 py-1 text-xs font-mono font-medium rounded flex items-center gap-1.5 transition-all cursor-pointer ${
              isRunning || !cell.content.trim()
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold shadow-xs'
            }`}
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
      </div>

      {/* Result rendering area */}
      {cell.resultJson && (
        <div className="p-4 bg-neutral-950/70 border-t border-neutral-900/50 font-sans text-neutral-200">
          <div className="flex justify-between items-center mb-3 border-b border-neutral-900 pb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
              {strings.cliOutputPrefix} {cell.resultJson.type}
            </span> 
            {hasFreezeOption && onFreeze && (
              <button
                type="button"
                onClick={handleFreezeClick}
                disabled={selectedCount === 0}
                className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded border transition-all cursor-pointer ${
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
            translation={translation}
          />
        </div>
      )}
    </div>
  );
};

interface ResultRendererProps {
  result: CellResult;
  deselectedVerseIds?: Record<string, boolean>;
  onToggleVerse?: (id: string) => void;
  translation?: string;
}

/* Dynamic result renderer for different command types */
const ResultRenderer: React.FC<ResultRendererProps> = ({
  result,
  deselectedVerseIds = {},
  onToggleVerse,
}) => {
  const { strings } = useLanguage();

  if (result.type === 'error') {
    let errorMessage = 'Error executing command.';
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

  // 1. /read, /search, /refs, /suggest result (verses list with selectable checkmarks)
  if (
    result.type === 'read' ||
    result.type === 'search' ||
    result.type === 'refs' ||
    result.type === 'suggest' ||
    result.type === 'verses'
  ) {
    return (
      <CellVersesResult
        data={result.data as VersesResultData}
        deselectedVerseIds={deselectedVerseIds}
        onToggleVerse={onToggleVerse}
        selectable={true}
      />
    );
  }

  // 2. /themes result
  if (result.type === 'themes') {
    const data = result.data as ThemesResult;
    const themes = data.themes || [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-mono border-b border-neutral-800 pb-2">
          <span>{strings.identifiedThemesLabel}</span>
          <span>{data.count || 0} {strings.themesSuffix}</span>
        </div>
        
        {themes.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">{strings.noIdentifiedThemes}</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {themes.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all hover:border-amber-500/60"
              >
                <span>{t.word}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {t.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. count result
  if (result.type === 'count') {
    return <CellCountResult data={result.data as CountResultData} />;
  }

  // 4. compare result
  if (result.type === 'compare') {
    return (
      <CellCompareResult
        data={result.data as CompareResultData}
        deselectedVerseIds={deselectedVerseIds}
        onToggleVerse={onToggleVerse}
        selectable={true}
      />
    );
  }

  // Fallback: raw text / JSON stringify
  return (
    <pre className="font-mono text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded border border-neutral-900/30">
      {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
    </pre>
  );
};

