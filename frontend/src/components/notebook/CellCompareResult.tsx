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
  selectable?: boolean;
}

export const CellCompareResult: React.FC<CellCompareResultProps> = ({
  data,
  deselectedVerseIds = {},
  onToggleVerse,
  selectable = false,
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
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Columns className="w-4 h-4 text-amber-600 dark:text-amber-500" />
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            {strings.compareSideBySideTitle}{' '}
            <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{data.reference}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 uppercase font-bold">
            {data.left?.translation || 'L'}
          </span>
          <span className="text-neutral-400 dark:text-neutral-500 font-bold">vs.</span>
          <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-800 dark:text-sky-300 uppercase font-bold">
            {data.right?.translation || 'R'}
          </span>
        </div>
      </div>

      {/* Parallel verses */}
      <div className="space-y-2.5">
        {rows.map((row, idx) => {
          const isLeftDeselected = row.left ? !!deselectedVerseIds[row.left.id] : false;
          const isRightDeselected = row.right ? !!deselectedVerseIds[row.right.id] : false;
          const isRowDeselected = selectable && ((row.left && isLeftDeselected) || (row.right && isRightDeselected));
          const book = bookCitationAbbrevFi(row.bookId);

          const handleToggle = () => {
            if (!selectable) return;
            if (row.left && onToggleVerse) onToggleVerse(row.left.id);
            if (row.right && onToggleVerse && row.right.id !== row.left?.id) onToggleVerse(row.right.id);
          };

          return (
            <div
              key={idx}
              onClick={selectable ? handleToggle : undefined}
              className={`p-3.5 rounded-xl border transition-all duration-200 ${
                selectable
                  ? `cursor-pointer select-none ${
                      isRowDeselected
                        ? 'opacity-40 bg-neutral-100/50 dark:bg-[var(--surface-2)]/40 border-neutral-200 dark:border-[var(--border-soft)]'
                        : 'bg-white dark:bg-[var(--surface-2)] hover:bg-neutral-50 dark:hover:bg-[var(--surface-2)]/80 border-neutral-200 dark:border-[var(--border)] shadow-xs'
                    }`
                  : 'bg-white/90 dark:bg-[var(--surface-2)] border-neutral-200 dark:border-[var(--border)] select-text shadow-xs'
              }`}
            >
              {/* Verse number */}
              <div className="flex items-center gap-2 mb-1.5">
                {selectable && (
                  <div className="flex items-center justify-center w-3.5 h-3.5 rounded border border-neutral-400 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-amber-500 flex-shrink-0">
                    {!isRowDeselected && <Check className="w-2.5 h-2.5" />}
                  </div>
                )}
                <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-500">
                  {book} {row.chapter}:{row.verseNumber}
                </span>
              </div>

              {/* 2-Column comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Left column */}
                <div className="border-l-2 border-amber-500/50 pl-2.5">
                  <div className="text-[10px] uppercase font-mono font-bold text-amber-700/80 dark:text-amber-400/80 mb-0.5">
                    {data.left?.translation?.toUpperCase()}
                  </div>
                  <p className={`verse-text leading-relaxed text-[1.0625rem] text-[var(--text)] whitespace-normal break-words ${isRowDeselected ? 'line-through opacity-50' : ''}`}>
                    {row.left?.text || <span className="italic text-neutral-400 dark:text-neutral-600">—</span>}
                  </p>
                </div>

                {/* Right column */}
                <div className="border-l-2 border-sky-500/50 pl-2.5">
                  <div className="text-[10px] uppercase font-mono font-bold text-sky-700/80 dark:text-sky-400/80 mb-0.5">
                    {data.right?.translation?.toUpperCase()}
                  </div>
                  <p className={`verse-text leading-relaxed text-[1.0625rem] text-[var(--text)] whitespace-normal break-words ${isRowDeselected ? 'line-through opacity-50' : ''}`}>
                    {row.right?.text || <span className="italic text-neutral-400 dark:text-neutral-600">—</span>}
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