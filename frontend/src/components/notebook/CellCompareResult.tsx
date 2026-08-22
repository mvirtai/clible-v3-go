import React from 'react';
import { Columns, Check } from 'lucide-react';
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

export interface CompareResultData {
  reference: string;
  left: {
    translation: string;
    verses: VerseItem[];
  };
  right: {
    translation: string;
    verses: VerseItem[];
  };
}

interface CellCompareResultProps {
  data: CompareResultData;
  deselectedVerseIds?: Record<string, boolean>;
  onToggleVerse?: (id: string) => void;
}

export const CellCompareResult: React.FC<CellCompareResultProps> = ({
  data,
  deselectedVerseIds = {},
  onToggleVerse,
}) => {
  const { strings } = useLanguage();
  const leftVerses = data.left?.verses || [];
  const rightVerses = data.right?.verses || [];

  // Merge by verse number for synchronized side-by-side alignment
  const maxRows = Math.max(leftVerses.length, rightVerses.length);
  const rows = Array.from({ length: maxRows }, (_, idx) => {
    const l = leftVerses[idx];
    const r = rightVerses[idx];
    return {
      verseNumber: l?.verse || r?.verse || idx + 1,
      bookId: l?.bookId || r?.bookId || '',
      chapter: l?.chapter || r?.chapter || 1,
      left: l,
      right: r,
    };
  });

  return (
    <div className="space-y-3 font-sans">
      {/* Header and translation badges */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Columns className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-neutral-300">
            {strings.compareSideBySideTitle}{' '}
            <span className="text-amber-400 font-mono">{data.reference}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 uppercase font-bold">
            {data.left?.translation || 'L'}
          </span>
          <span className="text-neutral-500">vs.</span>
          <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 uppercase font-bold">
            {data.right?.translation || 'R'}
          </span>
        </div>
      </div>

      {/* Parallel verses */}
      <div className="space-y-2">
        {rows.map((row, idx) => {
          const isLeftDeselected = row.left ? !!deselectedVerseIds[row.left.id] : false;
          const isRightDeselected = row.right ? !!deselectedVerseIds[row.right.id] : false;
          const isRowDeselected = (row.left && isLeftDeselected) || (row.right && isRightDeselected);
          const book = bookCitationAbbrevFi(row.bookId);

          const handleToggle = () => {
            if (row.left && onToggleVerse) onToggleVerse(row.left.id);
            if (row.right && onToggleVerse && row.right.id !== row.left?.id) onToggleVerse(row.right.id);
          };

          return (
            <div
              key={idx}
              onClick={handleToggle}
              className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer select-none ${
                isRowDeselected
                  ? 'opacity-40 bg-neutral-950/40 border-neutral-900'
                  : 'bg-neutral-900/50 hover:bg-neutral-900 border-neutral-800/80 hover:border-neutral-700'
              }`}
            >
              {/* Verse number */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded border border-neutral-700 bg-neutral-950 text-amber-500">
                  {!isRowDeselected && <Check className="w-2.5 h-2.5" />}
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-500">
                  {book} {row.chapter}:{row.verseNumber}
                </span>
              </div>

              {/* 2-Column comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Left column */}
                <div className="border-l-2 border-amber-500/40 pl-2.5">
                  <div className="text-[10px] uppercase font-mono text-neutral-500 mb-0.5">
                    {data.left?.translation?.toUpperCase()}
                  </div>
                  <p className={`verse-text leading-relaxed ${isRowDeselected ? 'line-through text-neutral-600' : 'text-neutral-200'}`}>
                    {row.left?.text || <span className="italic text-neutral-600">—</span>}
                  </p>
                </div>

                {/* Oikea palsta */}
                <div className="border-l-2 border-sky-500/40 pl-2.5">
                  <div className="text-[10px] uppercase font-mono text-neutral-500 mb-0.5">
                    {data.right?.translation?.toUpperCase()}
                  </div>
                  <p className={`verse-text leading-relaxed ${isRowDeselected ? 'line-through text-neutral-600' : 'text-neutral-300'}`}>
                    {row.right?.text || <span className="italic text-neutral-600">—</span>}
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