import { useActionState, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Activity, RefreshCw, LogIn, Lock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { apiService } from '../../services/api';
import type { AiUsageStats } from '../../types/aiUsage';

export interface AiTokenUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  initialStats?: AiUsageStats | null;
}

export interface UsageActionState {
  days: number;
  userStats: AiUsageStats | null;
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
}: AiTokenUsageModalProps) {
  const { strings } = useLanguage();
  const navigate = useNavigate();

  const [state, dispatchDays, isPending] = useActionState<UsageActionState, number>(
    async (_prevState, selectedDays) => {
      if (!isAuthenticated) {
        return {
          days: selectedDays,
          userStats: null,
          error: null,
        };
      }
      try {
        const uStats = await apiService.getMyAiUsage(selectedDays);
        return {
          days: selectedDays,
          userStats: uStats,
          error: null,
        };
      } catch {
        return {
          days: selectedDays,
          userStats: null,
          error: 'failed',
        };
      }
    },
    {
      days: 30,
      userStats: initialStats,
      error: null,
    }
  );

  if (!isOpen) {
    return null;
  }

  const activeStats = isAuthenticated ? state.userStats : null;
  const totalTokens = activeStats?.totalTokens ?? 0;
  const promptTokens = activeStats?.totalPromptTokens ?? 0;
  const candidatesTokens = activeStats?.totalCandidatesTokens ?? 0;
  const cachedTokens = activeStats?.cachedTokens ?? 0;
  const totalCalls = activeStats?.totalCalls ?? 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-usage-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl p-4 sm:p-6 shadow-2xl transition-all border border-[var(--border)] overflow-hidden"
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="ai-usage-title" className="text-sm sm:text-base font-semibold tracking-tight">
                {isAuthenticated ? strings.aiUsagePersonalTitle : strings.aiUsageTitle}
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--muted)]">
                {isAuthenticated ? strings.aiUsageUsers : strings.aiUsageGuest}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => startTransition(() => dispatchDays(state.days))}
                disabled={isPending}
                aria-label={strings.aiUsageRefresh}
                className="p-2 sm:p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer disabled:opacity-50 min-h-[38px] min-w-[38px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
              >
                <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={strings.aiUsageClose}
              className="p-2 sm:p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer min-h-[38px] min-w-[38px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto flex-1 py-3 sm:py-4 pr-0.5 space-y-4">
          {!isAuthenticated ? (
            /* Guest Prompt View */
            <div className="py-6 sm:py-8 px-3 sm:px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
              >
                <Lock size={22} className="text-[var(--accent)]" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {strings.aiUsagePersonalTitle}
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {strings.aiUsageGuestPrompt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/login');
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-95 transition-all cursor-pointer shadow-sm active:scale-98 min-h-[44px]"
              >
                <LogIn size={15} />
                <span>{strings.aiUsageGuestAction}</span>
              </button>
            </div>
          ) : (
            /* Authenticated User Stats */
            <>
              {/* Time period selector */}
              <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-[var(--surface-2)]">
                {[
                  { label: strings.aiUsageDays7, val: 7 },
                  { label: strings.aiUsageDays30, val: 30 },
                  { label: strings.aiUsageDays90, val: 90 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => startTransition(() => dispatchDays(item.val))}
                    className={`flex-1 min-h-[40px] py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                      state.days === item.val
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {isPending && !state.userStats ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-[var(--muted)]">
                  <Activity size={24} className="animate-spin text-[var(--accent)]" />
                  <span>{strings.aiUsageLoading}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Primary Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border)] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl sm:rounded-full text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors cursor-pointer min-h-[38px] flex items-center justify-center"
          >
            {strings.aiUsageClose}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
