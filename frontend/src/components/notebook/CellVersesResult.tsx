import React from 'react';
import { bookCitationAbbrevFi } from '../../utils/bookNames';
import { useLanguage } from '../../context/LanguageContext';

export interface VerseItem {
  id: string;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface VersesResultData {
  reference?: string;
  query?: string;
  source?: string;
  keywords?: string[];
  translation?: string;
  verses?: VerseItem[];
  references?: VerseItem[];
  suggestions?: VerseItem[];
}

interface CellVersesResultProps {
  data: VersesResultData;
  deselectedVerseIds?: Record<string, boolean>;
  onToggleVerse?: (id: string) => void;
  selectable?: boolean;
}

export const CellVersesResult: React.FC<CellVersesResultProps> = ({
  data,
  deselectedVerseIds = {},
  onToggleVerse,
  selectable = false,
}) => {
  const { strings } = useLanguage();
  const verses = data.verses || data.references || data.suggestions || [];

  if (verses.length === 0) {
    return (
      <p className="text-neutral-500 text-sm italic py-2">
        {data.reference
          ? `${strings.noVersesFound} ${data.reference}.`
          : data.query
          ? strings.noResults
          : data.source
          ? strings.noRefsFound
          : strings.suggestNoData}
      </p>
    );
  }

  return (
    <div className="space-y-3 font-sans w-full max-w-full">
      {data.query && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {strings.searchResultsForQuery}: <span className="text-[var(--text)] font-mono font-medium">"{data.query}"</span>
        </p>
      )}
      {data.source && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {strings.dynamicRefsFor}: <span className="text-amber-600 dark:text-amber-500 font-semibold">{data.source}</span>
        </p>
      )}
      {data.keywords && data.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-[10px] text-neutral-500 self-center mr-1">{strings.identifiedThemesLabel}</span>
          {data.keywords.map((kw) => (
            <span key={kw} className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded">
              #{kw}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2.5 w-full max-w-full">
        {verses.map((v) => {
          const book = bookCitationAbbrevFi(v.bookId);
          const isDeselected = selectable && !!deselectedVerseIds[v.id];

          return (
            <div
              key={v.id}
              onClick={selectable ? () => onToggleVerse?.(v.id) : undefined}
              className={`transition-all duration-200 w-full max-w-full ${
                selectable
                  ? `group cursor-pointer select-none p-2.5 rounded-lg border border-transparent ${
                      isDeselected
                        ? 'opacity-40 text-neutral-500'
                        : 'text-[var(--text)] bg-neutral-100/70 dark:bg-[var(--surface-2)]/70 hover:bg-neutral-200/70 dark:hover:bg-[var(--surface-2)] hover:border-neutral-300 dark:hover:border-[var(--border-soft)]'
                    }`
                  : 'select-text py-1'
              }`}
            >
              <div className={`flex items-start ${selectable ? 'gap-2.5' : 'gap-2'} w-full max-w-full`}>
                {/* Render checkbox only when selectable is enabled */}
                {selectable && (
                  <div className="mt-1 flex items-center justify-center w-3.5 h-3.5 rounded border border-neutral-400 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-amber-500 transition-colors group-hover:border-amber-500/50 flex-shrink-0">
                    {!isDeselected && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0 max-w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-600 dark:text-amber-500 font-semibold text-xs font-mono">
                      {book} {v.chapter}:{v.verse} ({v.translationId.toUpperCase()})
                    </span>
                  </div>
                  <p className={`verse-text leading-relaxed text-[1.0625rem] text-[var(--text)] whitespace-normal break-words transition-all ${isDeselected ? 'line-through opacity-50' : ''}`}>
                    {v.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
