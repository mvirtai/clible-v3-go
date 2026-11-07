import type { Messages } from '../../utils/i18n';
import type { SearchThemeCluster } from '../../types/aiSearch';
import { Layers, CheckCheck, X } from 'lucide-react';

export interface AiThemeFilterProps {
  strings: Messages;
  themes: SearchThemeCluster[];
  activeThemeId: string | null;
  onSelectTheme: (id: string | null) => void;
  recommendedCount: number;
  totalFilteredCount: number;
  rationale?: string;
  allowedBookIds?: string[];
  onApplyRecommendation: () => void;
  onClearRefinement?: () => void;
}

export function AiThemeFilter({
  strings,
  themes,
  activeThemeId,
  onSelectTheme,
  recommendedCount,
  totalFilteredCount,
  rationale,
  allowedBookIds,
  onApplyRecommendation,
  onClearRefinement,
}: AiThemeFilterProps) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] space-y-3">
      {/* Recommendation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {strings.aiRefineRecommendationTitle(recommendedCount, totalFilteredCount)}
            </span>
            {allowedBookIds && allowedBookIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-mono text-[11px]">
                {allowedBookIds.join(', ')}
              </span>
            )}
          </div>
          {rationale && (
            <p className="text-[var(--muted)] leading-relaxed">
              {rationale}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onApplyRecommendation}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          >
            <CheckCheck size={13} />
            <span>{strings.aiRefineApplySuggestion}</span>
          </button>
          {onClearRefinement && (
            <button
              type="button"
              onClick={onClearRefinement}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              aria-label={strings.aiRefineClearAria ?? 'Poista teemat'}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Theme Cluster Pills */}
      {themes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1 text-xs text-[var(--muted)] mr-1">
            <Layers size={13} />
            <span>{strings.aiRefineThemesLabel}:</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectTheme(null)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeThemeId === null
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {strings.aiRefineAllThemes}
          </button>

          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTheme(t.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                activeThemeId === t.id
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {t.title} ({t.verseIds.length})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
