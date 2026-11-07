import { useState } from 'react';
import type { Messages } from '../../utils/i18n';
import { Sparkles, Loader2, X } from 'lucide-react';

export interface AiRefinePanelProps {
  strings: Messages;
  isLoading: boolean;
  onRefine: (prompt: string) => void;
  onClose: () => void;
}

export function AiRefinePanel({
  strings,
  isLoading,
  onRefine,
  onClose,
}: AiRefinePanelProps) {
  const [prompt, setPrompt] = useState('');

  const suggestions = strings.aiRefineSuggestions ?? [
    'Focus only on key covenant inaugurations: Noah, Abraham, Moses, and the New Covenant',
    'Only New Testament references to the covenant',
    'Law and promise in the context of covenants',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onRefine(prompt.trim());
    }
  };

  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          <Sparkles size={14} />
          <span>{strings.aiRefineTitle}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-md cursor-pointer transition-colors"
          aria-label={strings.aiRefineCloseAria ?? 'Close'}
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={strings.aiRefinePlaceholder}
          aria-label={strings.aiRefineTitle}
          maxLength={500}
          rows={2}
          className="w-full text-xs p-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)] resize-none"
        />

        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-opacity"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{isLoading ? strings.aiRefineRunning : strings.aiRefineButton}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
