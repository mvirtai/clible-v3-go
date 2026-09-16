import { useActionState, startTransition } from 'react';
import { Sparkles, X, Activity, Layers, Database, UserCheck, Users, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { apiService } from '../../services/api';
import type { AiUsageStats, AiUsageSummary } from '../../types/aiUsage';

export interface AiTokenUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  initialStats?: AiUsageStats | null;
  initialSummary?: AiUsageSummary | null;
}

export interface UsageActionState {
  days: number;
  userStats: AiUsageStats | null;
  summary: AiUsageSummary | null;
  error: string | null;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toLocaleString();
}

export function AiTokenUsageModal({
  isOpen,
  onClose,
  isAuthenticated,
  initialStats = null,
  initialSummary = null,
}: AiTokenUsageModalProps) {
  const { strings } = useLanguage();

  const [state, dispatchDays, isPending] = useActionState<UsageActionState, number>(
    async (_prevState, selectedDays) => {
      try {
        let uStats: AiUsageStats | null = null;
        if (isAuthenticated) {
          uStats = await apiService.getMyAiUsage(selectedDays);
        }
        const gSummary = await apiService.getGlobalAiUsageSummary(selectedDays);
        return {
          days: selectedDays,
          userStats: uStats,
          summary: gSummary,
          error: null,
        };
      } catch {
        return {
          days: selectedDays,
          userStats: null,
          summary: null,
          error: 'failed',
        };
      }
    },
    {
      days: 30,
      userStats: initialStats,
      summary: initialSummary,
      error: null,
    }
  );

  if (!isOpen) {
    return null;
  }

  const activeStats = isAuthenticated && state.userStats ? state.userStats : state.summary?.guestStats;
  const totalTokens = activeStats?.totalTokens ?? 0;
  const promptTokens = activeStats?.totalPromptTokens ?? 0;
  const candidatesTokens = activeStats?.totalCandTokens ?? 0;
  const cachedTokens = activeStats?.cachedTokens ?? 0;
  const totalCalls = activeStats?.totalCalls ?? 0;

  // Derived feature breakdown
  const featureList = state.summary?.byFeature ? Object.entries(state.summary.byFeature) : [];
  const globalTotalTokens = state.summary?.globalStats.totalTokens || 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-usage-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl transition-all border border-[var(--border)]"
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="ai-usage-title" className="text-base font-semibold tracking-tight">
                {strings.aiUsageTitle}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isAuthenticated ? strings.aiUsageUsers : strings.aiUsageGuest}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => startTransition(() => dispatchDays(state.days))}
              disabled={isPending}
              aria-label="Refresh"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={strings.aiUsageClose}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Time period selector */}
        <div className="flex items-center justify-center gap-1.5 my-4 p-1 rounded-xl bg-[var(--surface-2)]">
          {[
            { label: strings.aiUsageDays7, val: 7 },
            { label: strings.aiUsageDays30, val: 30 },
            { label: strings.aiUsageDays90, val: 90 },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => startTransition(() => dispatchDays(item.val))}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                state.days === item.val
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isPending && !state.summary && !state.userStats ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-[var(--muted)]">
            <Activity size={24} className="animate-spin text-[var(--accent)]" />
            <span>{strings.aiUsageLoading}</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Primary Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40">
                <span className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                  {strings.aiTokensTotal}
                </span>
                <span className="text-lg font-bold tracking-tight text-[var(--accent)] font-mono">
                  {formatTokens(totalTokens)}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40">
                <span className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                  {strings.aiTokensCalls}
                </span>
                <span className="text-lg font-bold tracking-tight text-[var(--text)] font-mono">
                  {totalCalls}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                  {strings.aiTokensCached}
                </span>
                <span className="text-lg font-bold tracking-tight text-[var(--text-2)] font-mono">
                  {formatTokens(cachedTokens)}
                </span>
              </div>
            </div>

            {/* Token Distribution (Prompt vs Candidates) */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  {strings.aiTokensPrompt}: {formatTokens(promptTokens)}
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {strings.aiTokensCandidates}: {formatTokens(candidatesTokens)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden flex">
                <div
                  style={{
                    width: `${totalTokens > 0 ? (promptTokens / totalTokens) * 100 : 50}%`,
                  }}
                  className="bg-blue-400/80 h-full transition-all duration-500"
                />
                <div
                  style={{
                    width: `${totalTokens > 0 ? (candidatesTokens / totalTokens) * 100 : 50}%`,
                  }}
                  className="bg-emerald-400/80 h-full transition-all duration-500"
                />
              </div>
            </div>

            {/* Global telemetry comparison */}
            {state.summary && (
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--muted)]">
                    <Database size={13} />
                    {strings.aiUsageGlobal}
                  </span>
                  <span className="font-mono font-bold text-[var(--text)]">
                    {formatTokens(state.summary.globalStats.totalTokens)} ({state.summary.globalStats.totalCalls} {strings.aiTokensCalls.toLowerCase()})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5 text-[var(--muted)]">
                    <UserCheck size={12} className="text-emerald-400" />
                    <span>{strings.aiUsageUsers}:</span>
                    <strong className="font-mono text-[var(--text)]">
                      {formatTokens(state.summary.userStats.totalTokens)}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--muted)]">
                    <Users size={12} className="text-amber-400" />
                    <span>{strings.aiUsageGuest}:</span>
                    <strong className="font-mono text-[var(--text)]">
                      {formatTokens(state.summary.guestStats.totalTokens)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Features breakdown */}
            {featureList.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[var(--text-2)] flex items-center gap-1.5">
                  <Layers size={13} />
                  {strings.aiUsageByFeature}
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {featureList.map(([feat, stat]) => {
                    const pct = Math.round((stat.totalTokens / globalTotalTokens) * 100);
                    return (
                      <div
                        key={feat}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[var(--surface-2)]/50"
                      >
                        <span className="font-mono text-[var(--muted)] capitalize">
                          {feat.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--muted)]">
                            {stat.totalCalls} calls
                          </span>
                          <span className="font-mono font-semibold text-[var(--text)]">
                            {formatTokens(stat.totalTokens)} ({pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-[var(--border)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors cursor-pointer"
          >
            {strings.aiUsageClose}
          </button>
        </div>
      </div>
    </div>
  );
}
