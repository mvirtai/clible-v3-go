import type { JSX } from 'react/jsx-runtime';
import { getHoverDocumentation } from './islaIntellisense';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * Props for {@link ISLAHoverCard}.
 */
export interface ISLAHoverCardProps {
  /**
   * The ISLA keyword or method name to look up (e.g. `"search"`, `"count"`).
   * Pass `null` or `undefined` to hide the card.
   */
  keyword: string | null | undefined;
}

/**
 * Floating documentation tooltip card shown when the user hovers or navigates over an ISLA keyword.
 *
 * Calls {@link getHoverDocumentation} and renders the result in a styled tooltip.
 * Returns `null` when the keyword is unknown or missing.
 *
 * @param props - See {@link ISLAHoverCardProps}.
 * @returns A formatted tooltip card or null if no documentation matches.
 */
export function ISLAHoverCard({ keyword }: ISLAHoverCardProps): JSX.Element | null {
  const { lang, strings } = useLanguage();

  if (!keyword) return null;

  // Pure derived documentation lookup — no local state needed
  const doc = getHoverDocumentation(keyword, lang as 'fi' | 'en');
  if (!doc) return null;

  return (
    <div
      role="tooltip"
      aria-label={`${doc.label} documentation`}
      className={[
        'absolute bottom-full left-0 mb-2 z-50',
        'w-80 rounded-xl border border-amber-500/25',
        'bg-[var(--surface-2)] shadow-2xl backdrop-blur-md',
        'p-3.5 text-xs font-sans text-neutral-200',
        'animate-in fade-in zoom-in-95 duration-150',
      ].join(' ')}
    >
      {/* Header with keyword label and syntax signature */}
      <div className="flex items-baseline justify-between gap-2 border-b border-amber-500/15 pb-1.5 mb-2 font-mono">
        <span className="font-bold text-amber-400 text-sm">{doc.label}</span>
        <span className="text-[11px] text-neutral-400 truncate">{doc.syntax}</span>
      </div>

      {/* Description text */}
      <p className="mb-2.5 leading-relaxed text-neutral-300">{doc.description}</p>

      {/* Concrete usage example */}
      <div className="flex items-center gap-1.5 text-[11px] bg-black/20 dark:bg-black/40 rounded px-2 py-1 border border-white/5">
        <span className="text-neutral-400 font-medium shrink-0">{strings.islaHoverExample}</span>
        <code className="font-mono text-cyan-300 truncate">{doc.example}</code>
      </div>
    </div>
  );
}
