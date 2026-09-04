import { Cpu } from 'lucide-react';
import type { GeminiUsageMetadata } from '../../types/ai';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Properties for {@link GeminiUsage}.
 */
export interface GeminiUsageProps {
  /** Token usage statistics returned by the Google Gemini backend API. */
  usage?: GeminiUsageMetadata;
}

/**
 * Renders a compact, real-time token telemetry badge displaying prompt, completion, and total tokens.
 *
 * @param props - Component properties conforming to {@link GeminiUsageProps}.
 * @returns Accessible usage telemetry bar or null if no tokens were consumed.
 */
export function GeminiUsage({ usage }: GeminiUsageProps) {
  const { strings } = useLanguage();
  if (!usage || (usage.promptTokenCount === 0 && usage.candidatesTokenCount === 0)) {
    return null;
  }

  return (
    <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans text-muted-foreground/60 select-none">
      <div className="flex items-center gap-1.5 text-[var(--muted)]">
        <Cpu size={12} className="text-[var(--accent)] animate-pulse" />
        <span>{strings.geminiEngine}</span>
      </div>
      <div className="flex items-center gap-3 font-mono text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
          {strings.geminiPromptLabel} <strong className="font-semibold text-[var(--text-2)]">{usage.promptTokenCount}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
          {strings.geminiOutputLabel} <strong className="font-semibold text-[var(--text-2)]">{usage.candidatesTokenCount}</strong>
        </span>
        <span className="flex items-center gap-1 border-l border-[var(--border)] pl-3">
          {strings.geminiTotalLabel} <strong className="font-bold text-[var(--accent)]">{usage.totalTokenCount}</strong>
        </span>
      </div>
    </div>
  );
};

