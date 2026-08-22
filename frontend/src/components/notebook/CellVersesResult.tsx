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
}

export const CellVersesResult: React.FC<CellVersesResultProps> = ({
  data,
  deselectedVerseIds = {},
  onToggleVerse,
}) => {
  const { strings } = useLanguage();
  const verses = data.verses || data.references || data.suggestions || [];

  if (verses.length === 0) {
    return (
      <p className="text-neutral-500 text-sm italic">
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
    <div className="space-y-2 font-sans">
      {data.query && (
        <p className="text-xs text-neutral-400">
          {strings.searchResultsForQuery}: <span className="text-neutral-200 font-mono">"{data.query}"</span>
        </p>
      )}
      {data.source && (
        <p className="text-xs text-neutral-400">
          {strings.dynamicRefsFor}: <span className="text-amber-500 font-semibold">{data.source}</span>
        </p>
      )}
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

      <div className="space-y-1">
        {verses.map((v) => {
          const book = bookCitationAbbrevFi(v.bookId);
          const isDeselected = !!deselectedVerseIds[v.id];
          return (
            <div
              key={v.id}
              onClick={() => onToggleVerse?.(v.id)}
              className={`group cursor-pointer select-none transition-all duration-200 p-2.5 rounded-lg border border-transparent ${
                isDeselected
                  ? 'opacity-40 text-neutral-500'
                  : 'text-neutral-300 bg-neutral-900/40 hover:bg-neutral-900/80 hover:border-neutral-800'
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-500 font-semibold text-xs select-none font-mono">
                      {book} {v.chapter}:{v.verse} ({v.translationId.toUpperCase()})
                    </span>
                  </div>
                  <p className={`verse-text leading-relaxed text-sm transition-all ${isDeselected ? 'line-through text-neutral-600' : 'text-neutral-200'}`}>
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
