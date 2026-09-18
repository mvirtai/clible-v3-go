import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Settings,
  Globe,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { AiTokenUsageModal } from './AiTokenUsageModal';
import { useLanguage } from '@/context/LanguageContext';
import { apiService } from '@/services/api';
import type { AiUsageStats, AiUsageSummary } from '@/types/aiUsage';

export interface UserMenuDropdownProps {
  user: { email: string; name?: string } | null;
  onSignOut: () => void;
  showManager: boolean;
  onToggleManager: () => void;
}

export function UserMenuDropdown({
  user,
  onSignOut,
  showManager,
  onToggleManager,
}: UserMenuDropdownProps): JSX.Element {
  const { lang, setLang, strings } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // AI Usage Modal state
  const [showUsageModal, setShowUsageModal] = useState<boolean>(false);
  const [usageStats, setUsageStats] = useState<AiUsageStats | null>(null);
  const [usageSummary, setUsageSummary] = useState<AiUsageSummary | null>(null);

  const handleOpenUsage = async () => {
    setIsOpen(false);
    setShowUsageModal(true);
    try {
      if (user) {
        const stats = await apiService.getMyAiUsage(30);
        setUsageStats(stats);
      }
      const summary = await apiService.getGlobalAiUsageSummary(30);
      setUsageSummary(summary);
    } catch {
      // Ignored
    }
  };

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut();
  };

  return (
    <div className="relative inline-flex items-center">
      {/* 1. Clickable Avatar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={strings.userMenuAria}
        className="rounded-full p-0.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)]"
      >
        <UserAvatar name={user?.name} email={user?.email} size="md" />
      </button>

      {/* 2. Declarative outside click listener */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. Dropdown Menu Panel */}
      <div
        className={`
          absolute right-0 top-[calc(100%+10px)] z-50
          w-[360px] rounded-2xl p-1.5 pt-3
          bg-[var(--surface)] border border-[var(--border)]
          shadow-xl
          backdrop-blur-xl
          transform transition-all duration-200 ease-out
          ${
            isOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
              : 'opacity-0 translate-y-2 pointer-events-none scale-95'
          }
        `}
        role="menu"
        aria-orientation="vertical"
      >
        {/* User Info */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-2)]/60">
          <UserAvatar name={user?.name} email={user?.email} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate text-[var(--text)]">
              {user ? user.name || user.email : strings.userAccountGuest}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck
                size={11}
                className="text-[var(--accent)] shrink-0"
              />
              <span className="text-[10px] text-[var(--muted)] font-medium">
                {user ? strings.userAccountVerified : strings.userAccountGuest}
              </span>
            </div>
          </div>
        </div>

        <div className="my-1.5 border-t border-[var(--border-soft)]" />

        {/* Menu Items */}
        <div className="space-y-0.5">
          {/* AI Token kulutus */}
          <button
            type="button"
            onClick={handleOpenUsage}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <Sparkles size={14} className="text-[var(--accent)]" />
            <span>{strings.aiUsageTitle}</span>
          </button>

          {/* Käännösten hallinta */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onToggleManager();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <Settings size={14} className="text-[var(--muted)]" />
            <span>
              {showManager ? strings.hideLabel : strings.translationsLabel}
            </span>
          </button>
        </div>

        <div className="my-1.5 border-t border-[var(--border-soft)]" />

        {/* Language setting */}
        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <Globe size={13} />
            <span>{strings.userMenuLanguage}</span>
          </div>
          <div className="flex items-center rounded-lg bg-[var(--surface-2)] p-0.5 border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setLang('fi')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                lang === 'fi'
                  ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              FI
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="my-1.5 border-t border-[var(--border-soft)]" />

        {/* Uloskirjautuminen / Sisäänkirjautuminen */}
        {user ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>{strings.signOutTitle}</span>
          </button>
        ) : (
          <div className="space-y-1 p-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <LogIn size={13} />
              <span>{strings.loginButton}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/register');
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
            >
              <UserPlus size={13} />
              <span>{strings.guestQuickSignup}</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. AI Usage Modal (Mounts to document.body via createPortal) */}
      <AiTokenUsageModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
        isAuthenticated={!!user}
        initialStats={usageStats}
        initialSummary={usageSummary}
      />
    </div>
  );
}