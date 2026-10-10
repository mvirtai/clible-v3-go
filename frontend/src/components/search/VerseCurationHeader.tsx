import type { Messages } from '../../utils/i18n';
import { Check, CheckCheck, RotateCcw } from 'lucide-react';

export type CurationFilter = 'all' | 'accepted' | 'rejected';

export interface VerseCurationHeaderProps {
  strings: Messages;
  filter: CurationFilter;
  onFilterChange: (filter: CurationFilter) => void;
  totalCount: number;
  acceptedCount: number;
  rejectedCount: number;
  onAcceptAll: () => void;
  onResetCuration: () => void;
  onCommitSelection?: () => void;
}

export function VerseCurationHeader({
  strings,
  filter,
  onFilterChange,
  totalCount,
  acceptedCount,
  rejectedCount,
  onAcceptAll,
  onResetCuration,
  onCommitSelection,
}: VerseCurationHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border-soft)]">
      {/* Välilehtivalitsimet */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === 'all'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--border-soft)]'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <span>{strings.curateAll}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--surface-2)] font-mono">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('accepted')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === 'accepted'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'text-[var(--muted)] hover:text-emerald-600'
          }`}
        >
          <span>{strings.curateAccepted}</span>
          {acceptedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 font-mono text-emerald-600 dark:text-emerald-400">
              {acceptedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('rejected')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === 'rejected'
              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
              : 'text-[var(--muted)] hover:text-rose-500'
          }`}
        >
          <span>{strings.curateRejected}</span>
          {rejectedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 font-mono text-rose-500">
              {rejectedCount}
            </span>
          )}
        </button>
      </div>

      {/* Pikatoiminnot */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {acceptedCount < totalCount && (
          <button
            type="button"
            onClick={onAcceptAll}
            className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1 cursor-pointer"
            title={strings.curateAcceptAll}
          >
            <CheckCheck size={13} className="text-emerald-500" />
            <span className="hidden xs:inline">{strings.curateAcceptAll}</span>
          </button>
        )}

        {(acceptedCount > 0 || rejectedCount > 0) && (
          <button
            type="button"
            onClick={onResetCuration}
            className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1 cursor-pointer"
            title={strings.curateReset}
          >
            <RotateCcw size={13} />
            <span className="hidden xs:inline">{strings.curateReset}</span>
          </button>
        )}

        {(acceptedCount > 0 || rejectedCount > 0) && onCommitSelection && (
          <button
            type="button"
            onClick={onCommitSelection}
            className="text-xs px-3 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ml-1"
            title={strings.curateCommitSelection}
          >
            <Check size={13} />
            <span>{strings.curateCommitSelection}</span>
          </button>
        )}
      </div>
    </div>
  );
}