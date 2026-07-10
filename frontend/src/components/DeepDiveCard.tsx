import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { markdownComponents } from "../utils/markdownComponents";

interface DeepDiveCardProps {
  title: string;
  text: string;
  invert?: boolean;
  onClose: () => void;
}

export function DeepDiveCard({ title, text, invert = false, onClose }: DeepDiveCardProps) {
  if (!text.trim()) return null;
  return (
    <div
      className={`mt-4 rounded-3xl border p-5 shadow-sm transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
        invert
          ? "border-gray-800 bg-gray-950 text-white"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {title}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={invert ? "text-gray-400 hover:text-white cursor-pointer" : "text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className={invert ? "font-sans text-gray-200" : "font-sans text-[var(--text-2)]"}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={markdownComponents({ invert, insightLayout: !invert, toneLayout: invert })}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
