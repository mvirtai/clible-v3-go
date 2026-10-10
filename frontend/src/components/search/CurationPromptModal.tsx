import type { Messages } from "@/utils/i18n";
import { HelpCircle, CheckCheck, Trash2, X } from "lucide-react";

interface CurationUnreviewedBannerProps {
    strings: Messages;
    unreviewedCount: number;
    onAcceptRemaining: () => void;
    onRejectRemaining: () => void;
    onCancel: () => void;
}

export function CurationUnreviewedBanner({
    strings,
    unreviewedCount,
    onAcceptRemaining,
    onRejectRemaining,
    onCancel,
}: CurationUnreviewedBannerProps) {
    return (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[var(--text)] space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>{strings.curateCommitConfirmTitle}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-md cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-[var(--text)] leading-relaxed">
        {strings.curateUnreviewedPrompt(unreviewedCount)}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onAcceptRemaining}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
        >
          <CheckCheck size={13} />
          <span>{strings.curateAcceptRemaining}</span>
          <span className="opacity-70 text-[10px] ml-1">(A)</span>
        </button>

        <button
          type="button"
          onClick={onRejectRemaining}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
        >
          <Trash2 size={13} />
          <span>{strings.curateRejectRemaining}</span>
          <span className="opacity-70 text-[10px] ml-1">(R)</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface)] border border-[var(--border-soft)] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer transition-colors"
        >
          {strings.curateCancelCommit}
        </button>
      </div>
    </div>
    )
}