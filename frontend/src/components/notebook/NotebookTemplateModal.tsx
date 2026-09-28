import {
  X,
  FileText,
  BookOpen,
  Search,
  Lightbulb,
  Heart,
  Flame,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { STUDY_TEMPLATES } from '@/data/studyTemplates';
import type { StudyMethodTemplate } from '@/types/studyMethods';

export interface NotebookTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: StudyMethodTemplate | null) => void;
}

const ICON_MAP = {
  BookOpen,
  Search,
  Lightbulb,
  Heart,
  Flame,
  Layers,
};

export function NotebookTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: NotebookTemplateModalProps) {
  const { strings } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-[var(--border-soft)] flex items-center justify-between shrink-0">
          <div>
            <h2
              id="template-modal-title"
              className="text-base sm:text-lg font-bold text-[var(--text)]"
            >
              {strings.chooseTemplateTitle}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              {strings.chooseTemplateSubtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            aria-label={strings.closeAria}
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Empty Notebook */}
          <div>
            <button
              onClick={() => onSelectTemplate(null)}
              className="w-full text-left p-4 rounded-xl border border-dashed border-[var(--border-soft)]
                                 hover:border-amber-500/50 bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] 
                                transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <FileText size={20} />
                </div>
              </div>
              <div>
                <h3
                  className="text-sm font-semibold text-[var(--text)]
                                        group-hover:text-amber-500 transition-colors"
                >
                  {strings.blankNotebookTitle}
                </h3>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {strings.blankNotebookDesc}
                </p>
              </div>
              <div className="p-2 text-[var(--muted)] group-hover:translate-x-0.5 transition-all group-hover:text-amber-500">
                <ArrowRight size={20} />
              </div>
            </button>
          </div>

          {/* Popular Templates */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
              {strings.studyTemplatePopularBadge}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STUDY_TEMPLATES.filter((t) => t.isPopular).map((tpl) => {
                const IconComponent = ICON_MAP[tpl.iconName] || BookOpen;
                const title =
                  (strings as unknown as Record<string, string>)[tpl.nameKey] || tpl.id;
                const desc =
                  (strings as unknown as Record<string, string>)[tpl.descKey] || '';
                const badge = tpl.badgeKey
                  ? (strings as unknown as Record<string, string>)[tpl.badgeKey]
                  : null;

                return (
                  <button
                    key={tpl.id}
                    onClick={() => onSelectTemplate(tpl)}
                    className="text-left p-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)] hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                          <IconComponent size={18} />
                        </div>
                        {badge && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border-soft)]">
                            {badge}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text)] group-hover:text-amber-500 transition-colors">
                        {title}
                      </h4>
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-3 leading-relaxed">
                        {desc}
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-[var(--border-soft)]/50 flex items-center justify-between text-[11px] text-[var(--muted)] group-hover:text-amber-500">
                      <span>{tpl.cells.length} solua</span>
                      <ArrowRight
                        size={13}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Others and future methods */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
              {strings.studyTemplateComingSoonBadge}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STUDY_TEMPLATES.filter((t) => !t.isPopular).map((tpl) => {
                const IconComponent = ICON_MAP[tpl.iconName] || BookOpen;
                const title = (strings as unknown as Record<string, string>)[tpl.nameKey] || tpl.id;
                const desc = (strings as unknown as Record<string, string>)[tpl.descKey] || '';

                return (
                  <button
                    key={tpl.id}
                    onClick={() => onSelectTemplate(tpl)}
                    className="text-left p-3.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)]/60 hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <IconComponent size={16} className="text-[var(--muted)] group-hover:text-amber-500 transition-colors" />
                        <h4 className="text-xs font-bold text-[var(--text)] group-hover:text-amber-500 transition-colors">
                          {title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[var(--muted)] line-clamp-2">
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
