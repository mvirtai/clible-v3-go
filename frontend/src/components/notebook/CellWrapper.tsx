import React from 'react';
import type { CellType } from './types';
import { useLanguage } from '../../context/LanguageContext';

interface CellWrapperProps {
  cell: Cell;
  index: number;
  totalCells: number;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeType: (newType: CellType) => void;
  children: React.ReactNode;
}

export const CellWrapper: React.FC<CellWrapperProps> = ({
  cell,
  index,
  totalCells,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeType,
  children,
}) => {
  const { strings } = useLanguage();
  return (
    <div className="group relative border border-[var(--border-soft)] hover:border-amber-500/20 bg-[var(--surface-2)]/10 hover:bg-[var(--surface-2)]/20 rounded-xl p-4 transition-all duration-300">
      {/* Solun toimintopalkki (ilmestyy kun hiiri leijuu solun päällä) */}
      <div className="absolute -top-3 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[var(--surface)] border border-[var(--border-soft)] rounded-md px-1.5 py-0.5 shadow-md z-10">
        
        {/* Solutyypin valinta */}
        <select
          aria-label="Valitse solun tyyppi"
          value={cell.type}
          onChange={(e) => onChangeType(e.target.value as CellType)}
          className="bg-transparent text-[var(--muted)] text-[10px] font-medium focus:outline-none border-none cursor-pointer hover:text-amber-500"
        >
          <option value="markdown" className="bg-[var(--surface)] text-[var(--text)]">{strings.markdownOptionLabel}</option>
          <option value="code" className="bg-[var(--surface)] text-[var(--text)]">{strings.codeOptionLabel}</option>
        </select>

        <span className="w-px h-3 bg-[var(--border-soft)]" />

        {/* Siirto ylös */}
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 text-[var(--muted)] hover:text-amber-500 disabled:text-[var(--border-soft)] disabled:hover:text-[var(--border-soft)] transition-colors"
          title="Siirrä ylös"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>

        {/* Siirto alas */}
        <button
          onClick={onMoveDown}
          disabled={index === totalCells - 1}
          className="p-1 text-[var(--muted)] hover:text-amber-500 disabled:text-[var(--border-soft)] disabled:hover:text-[var(--border-soft)] transition-colors"
          title="Siirrä alas"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <span className="w-px h-3 bg-[var(--border-soft)]" />

        {/* Poisto */}
        <button
          onClick={onDelete}
          className="p-1 text-[var(--muted)] hover:text-red-500 transition-colors"
          title="Poista solu"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Solun varsinainen sisältö */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
};
