import { X, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { markdownComponents } from "../../utils/markdownComponents";
import type { GeminiUsageMetadata, NextFocusItem } from "../../types/ai";
import { GeminiUsage } from "./GeminiUsage";
import { DeepDiveBreadcrumb } from "./DeepDiveBreadcrumb";
import { NextFocusChips } from "../search/NextFocusChips";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Properties for {@link DeepDiveCard}.
 */
export interface DeepDiveCardProps {
  /** Header title or category label for the analysis card. */
  title: string;
  /** Markdown-formatted insight or analysis text content. */
  text: string;
  /** When true, renders an inverted high-contrast dark card style. */
  invert?: boolean;
  /** Callback fired when user dismisses the card. */
  onClose: () => void;
  /** Optional token usage and latency metadata from the Gemini API. */
  geminiUsageMetadata?: GeminiUsageMetadata;
  /** When true, only the header row is rendered. */
  collapsed?: boolean;
  /** Toggles collapsed state; if omitted, no toggle control is rendered. */
  onToggle?: () => void;
  /** Optional next focus suggestions returned by this deep dive. */
  nextFocus?: NextFocusItem[];
  /** Callback fired when user selects a next focus suggestion from this card. */
  onPickNextFocus?: (item: NextFocusItem) => void;
  /** Label of the currently loading next focus chip. */
  pendingLabel?: string | null;
  /** When true, disables next focus chip interactions. */
  disabled?: boolean;
  /** Hierarchical topic path from the root exploration to this card. */
  path?: string[];
}

/**
 * Renders an interactive markdown insight card with AI usage statistics and dismiss button.
 *
 * @param props - Component properties conforming to {@link DeepDiveCardProps}.
 * @returns Formatted insight card or null if text is empty.
 */
export function DeepDiveCard({
  title,
  text,
  invert = false,
  onClose,
  geminiUsageMetadata,
  collapsed = false,
  onToggle,
  nextFocus,
  onPickNextFocus,
  pendingLabel,
  disabled = false,
  path,
}: DeepDiveCardProps) {
  const { strings } = useLanguage();
  if (!text.trim()) return null;

  return (
    <div
      className={`mt-4 rounded-3xl border p-5 shadow-sm transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
        invert
          ? "border-gray-800 bg-gray-950 text-white"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
      }`}
    >
      <div className={`flex items-center justify-between gap-3 ${collapsed ? '' : 'mb-1'}`}>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
              aria-hidden="true"
            />
            <span>{title}</span>
          </button>
        ) : (
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {title}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className={invert ? "text-gray-400 hover:text-white cursor-pointer" : "text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"}
          aria-label={strings.hideLabel}
        >
          <X size={16} />
        </button>
      </div>

      {path && path.length > 0 && <DeepDiveBreadcrumb path={path} />}

      {!collapsed && (
        <>
          <div className={`${invert ? "font-sans text-gray-200" : "font-sans text-[var(--text-2)]"} ${path && path.length > 0 ? 'mt-2' : 'mt-3'}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={markdownComponents({ invert, insightLayout: !invert, toneLayout: invert })}
            >
              {text}
            </ReactMarkdown>
          </div>

          {onPickNextFocus && nextFocus && nextFocus.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <NextFocusChips
                title={strings.nextFocusTitle}
                items={nextFocus}
                onPick={onPickNextFocus}
                pendingLabel={pendingLabel}
                disabled={disabled}
              />
            </div>
          )}

          {geminiUsageMetadata && (
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <GeminiUsage usage={geminiUsageMetadata} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
