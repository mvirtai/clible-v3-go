import { Terminal, Sun, Moon } from 'lucide-react';
import { TranslationSelector } from '../translations/TranslationSelector';
import { UserMenuDropdown } from './UserMenuDropdown';
import { useLanguage } from '../../context/LanguageContext';
import { APP_VERSION } from '@/utils/version';
import type { InstalledTranslation } from '../../types/bible';
import type { User } from '@/context/AuthContext';

export type ViewMode = 'reader' | 'search' | 'analytics' | 'compare' | 'original' | 'notebooks';

export interface AppHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: User | null;
  onSignOut: () => void;
  showManager: boolean;
  onToggleManager: () => void;
  installedTranslations: InstalledTranslation[];
  selectedTranslation: string;
  onSelectTranslation: (id: string) => void;
}

/**
 * Top sticky header bar containing branding, theme toggle, translation selector,
 * and the unified UserMenuDropdown.
 */
export function AppHeader({
  theme,
  onToggleTheme,
  user,
  onSignOut,
  showManager,
  onToggleManager,
  installedTranslations,
  selectedTranslation,
  onSelectTranslation,
}: AppHeaderProps) {
  const { strings } = useLanguage();

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        paddingTop: 'var(--safe-top)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-16 py-2.5 sm:py-0 flex items-center justify-between gap-2">
        {/* Logo & Theme Switch */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? strings.themeLightAria : strings.themeDarkAria}
            className="theme-toggle-btn cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun size={15} className="text-amber-400 animate-spin-slow" />
            ) : (
              <Moon size={15} className="text-slate-500" />
            )}
          </button>

          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}
          >
            <Terminal size={15} />
          </div>
          <h1
            className="text-sm sm:text-lg font-medium tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            Clible <span className="hidden sm:inline" style={{ color: 'var(--muted)', fontWeight: 400 }}>Workspace</span>
            <span className="ml-1 sm:ml-2 text-xs font-mono" style={{ color: 'var(--accent)' }}>v{APP_VERSION}</span>
          </h1>
        </div>

        {/* Translation Selector & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink">
          <TranslationSelector
            selectedTranslation={selectedTranslation}
            onSelectTranslation={onSelectTranslation}
            translations={installedTranslations}
          />
          <UserMenuDropdown
            user={user}
            onSignOut={onSignOut}
            showManager={showManager}
            onToggleManager={onToggleManager}
          />
        </div>
      </div>
    </header>
  );
}
