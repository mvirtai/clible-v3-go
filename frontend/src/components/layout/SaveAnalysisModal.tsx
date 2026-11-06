import { useState } from 'react';
import type { SyntheticEvent, JSX } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Save, X, Loader2 } from 'lucide-react';

export interface SaveAnalysisModalProps {
  isOpen: boolean;
  defaultName: string;
  onSave: (name: string) => Promise<void> | void;
  onClose: () => void;
  isSaving?: boolean;
}

export function SaveAnalysisModal({
  isOpen,
  defaultName,
  onSave,
  onClose,
  isSaving = false,
}: SaveAnalysisModalProps): JSX.Element | null {
  const { strings } = useLanguage();
  const [name, setName] = useState<string>(defaultName);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const isValid = trimmed.length >= 2 && trimmed.length <= 40;

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!isValid || isSaving) return;
    await onSave(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-analysis-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isSaving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3
            id="save-analysis-modal-title"
            className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
            <span>{strings.saveAnalysisModalTitle}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label={strings.cancelLabel}
            className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="save-analysis-name-input"
              className="block text-xs font-medium text-[var(--muted)]"
            >
              {strings.saveAnalysisNameLabel}
            </label>
            <input
              id="save-analysis-name-input"
              type="text"
              autoFocus
              disabled={isSaving}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder={strings.saveNamePlaceholder}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
            <div className="flex justify-between items-center text-[10px] text-[var(--muted)]">
              <span>{strings.saveAnalysisLengthHint}</span>
              <span className={trimmed.length > 40 || trimmed.length < 2 ? 'text-amber-500 font-medium' : ''}>
                {trimmed.length}/40
              </span>
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              {strings.cancelLabel}
            </button>
            <button
              type="submit"
              disabled={!isValid || isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold btn-accent btn-tactile cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
              <span>{strings.saveLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
