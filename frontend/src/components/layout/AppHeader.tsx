import { useNavigate } from 'react-router-dom';
import { Terminal, Settings, Sun, Moon, LogOut, LogIn, UserPlus } from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { TranslationSelector } from '../translations/TranslationSelector';
import { useLanguage } from '../../context/LanguageContext';
import { APP_VERSION } from '@/utils/version';
import type { InstalledTranslation } from '../../types/bible';

export type ViewMode = 'reader' | 'analytics' | 'compare' | 'original' | 'notebooks';

export interface AppHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: { email: string } | null;
  onSignOut: () => void;
  showManager: boolean;
  onToggleManager: () => void;
  installedTranslations: InstalledTranslation[];
  selectedTranslation: string;
  onSelectTranslation: (id: string) => void;
}

/**
 * Top sticky header bar containing branding, theme toggle, translation selector,
 * user authentication info, guest mode indicator, and settings manager buttons.
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
  const navigate = useNavigate();

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
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

        {/* User & Global Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink">
          {user ? (
            <>
              <span className="text-xs max-md:hidden" style={{ color: 'var(--muted)' }}>
                {user.email}
              </span>
              <button
                onClick={onSignOut}
                aria-label={strings.signOutTitle}
                className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors btn-tactile hover:border-[var(--accent)] hover:text-[var(--text)] shrink-0 cursor-pointer"
                style={{
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--muted)',
                }}
              >
                <LogOut size={14} />
                <span className="max-md:hidden">{strings.signOutTitle}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium btn-tactile hover:text-[var(--text)] cursor-pointer"
                style={{ color: 'var(--muted)' }}
              >
                <LogIn size={13} />
                <span>{strings.loginButton}</span>
              </button>
              <button
                onClick={() => navigate('/register')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium btn-tactile hover:border-[var(--accent)] hover:text-[var(--text)] transition-colors cursor-pointer"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                }}
              >
                <UserPlus size={13} />
                <span>{strings.guestQuickSignup}</span>
              </button>
            </div>
          )}

          <button
            onClick={onToggleManager}
            className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors btn-tactile hover:border-[var(--accent)] shrink-0 cursor-pointer"
            style={{
              border: '1px solid var(--border)',
              background: showManager ? 'var(--accent-bg)' : 'transparent',
              color: showManager ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            <Settings size={14} />
            <span className="max-sm:hidden">{showManager ? strings.hideLabel : strings.translationsLabel}</span>
          </button>

          <LanguageSwitcher />
          <TranslationSelector
            selectedTranslation={selectedTranslation}
            onSelectTranslation={onSelectTranslation}
            translations={installedTranslations}
          />
        </div>
      </div>
    </header>
  );
}
