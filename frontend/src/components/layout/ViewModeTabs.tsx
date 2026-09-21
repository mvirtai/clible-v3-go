import { useState } from 'react';
import { BookOpen, Search, Activity, GitCompare, Languages, FileText, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { ViewMode } from './AppHeader';

/**
 * Props for the {@link ViewModeTabs} component.
 */
export interface ViewModeTabsProps {
  /** Currently active view mode */
  viewMode: ViewMode;
  /** Callback triggered when user selects a view mode */
  onSelectViewMode: (mode: ViewMode) => void;
  /** Callback triggered when resetting or selecting active notebook */
  onSelectNotebookId: (id: string | null) => void;
}

interface ViewOption {
  id: ViewMode;
  labelKey: 'tabReader' | 'tabSearch' | 'tabAnalytics' | 'tabCompare' | 'tabOriginal' | 'tabNotebooks';
  icon: typeof BookOpen;
}

const VIEW_OPTIONS: ViewOption[] = [
  { id: 'reader', labelKey: 'tabReader', icon: BookOpen },
  { id: 'search', labelKey: 'tabSearch', icon: Search },
  { id: 'analytics', labelKey: 'tabAnalytics', icon: Activity },
  { id: 'compare', labelKey: 'tabCompare', icon: GitCompare },
  { id: 'original', labelKey: 'tabOriginal', icon: Languages },
  { id: 'notebooks', labelKey: 'tabNotebooks', icon: FileText },
];

/**
 * Tab bar component for switching between main workspace views.
 * On mobile (< 640px): Compact dropdown selector that takes zero unnecessary vertical height.
 * On desktop (>= 640px): Clean horizontal pill strip.
 */
export function ViewModeTabs({
  viewMode,
  onSelectViewMode,
  onSelectNotebookId,
}: ViewModeTabsProps) {
  const { strings } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const activeOption = VIEW_OPTIONS.find((opt) => opt.id === viewMode) || VIEW_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  const handleSelect = (mode: ViewMode) => {
    onSelectViewMode(mode);
    if (mode === 'notebooks') {
      onSelectNotebookId(null);
    }
    setIsDropdownOpen(false);
  };

  return (
    <div className="mb-6 sm:mb-8">
      {/* ── Mobile View: Compact Dropdown Menu (< 640px) ── */}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-sm font-semibold shadow-xs btn-tactile cursor-pointer min-h-[44px]"
          aria-expanded={isDropdownOpen}
          aria-label={strings[activeOption.labelKey]}
        >
          <div className="flex items-center gap-2.5">
            <ActiveIcon size={18} className="text-[var(--accent)]" />
            <span className="text-[var(--text)]">{strings[activeOption.labelKey]}</span>
          </div>
          <ChevronDown
            size={16}
            className={`text-[var(--muted)] transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isDropdownOpen && (
          <>
            {/* Backdrop overlay for click-outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            {/* Dropdown sheet */}
            <div
              className="absolute left-0 right-0 top-full mt-1.5 z-50 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl animate-fade-in space-y-1"
              role="menu"
            >
              {VIEW_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = viewMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(opt.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
                      isSelected
                        ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                        : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <Icon size={17} className={isSelected ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
                    <span>{strings[opt.labelKey]}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Desktop View: Horizontal Pill Strip (>= 640px) ── */}
      <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl w-fit bg-[var(--surface-2)] border border-[var(--border-soft)] select-none">
        {VIEW_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = viewMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[44px] ${
                isSelected
                  ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span>{strings[opt.labelKey]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
