import { useState, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Settings,
  Globe,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { AiTokenUsageModal } from './AiTokenUsageModal';
import { useLanguage } from '@/context/LanguageContext';
import type { User } from '@/context/AuthContext';
import { apiService } from '@/services/api';
import type { AiUsageStats } from '@/types/aiUsage';

export interface UserMenuDropdownProps {
  user: User | null;
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

  const handleOpenUsage = async () => {
    setIsOpen(false);
    setShowUsageModal(true);
    if (user) {
      try {
        const stats = await apiService.getMyAiUsage(30);
        setUsageStats(stats);
      } catch {
        // Handled within AiTokenUsageModal
      }
    }
  };

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut();
  };

  // Reusable Menu Content for both mobile bottom sheet and desktop dropdown
  const menuContent = (
    <>
      {/* Mobile Pull Handle & Close Bar */}
      <div className="sm:hidden flex items-center justify-between pb-2 px-1 relative">
        <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto my-1" />
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label={strings.aiUsageClose}
          className="absolute right-1 top-0 p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* User Info Card */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-2)]/60 shrink-0">
        <UserAvatar
          name={user?.displayName || user?.name}
          email={user?.email}
          avatarId={user?.avatarId}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate text-[var(--text)]">
            {user ? user.displayName || user.name || user.email : strings.userAccountGuest}
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

      <div className="my-1.5 border-t border-[var(--border-soft)] shrink-0" />

      {/* Menu Items (Touch-friendly height >= 44px) */}
      <div className="space-y-1">
        {/* AI Token kulutus */}
        <button
          type="button"
          onClick={handleOpenUsage}
          className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] transition-colors cursor-pointer text-left"
        >
          <Sparkles size={16} className="text-[var(--accent)] shrink-0" />
          <span className="truncate">{strings.aiUsageTitle}</span>
        </button>

        {/* Translation management */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            onToggleManager();
          }}
          className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] transition-colors cursor-pointer text-left"
        >
          <Settings size={16} className="text-[var(--muted)] shrink-0" />
          <span className="truncate">
            {showManager ? strings.hideLabel : strings.translationsLabel}
          </span>
        </button>

        {/* User profile and settings */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            navigate('/settings');
          }}
          className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] transition-colors cursor-pointer text-left"
        >
          <Settings size={16} className="text-[var(--accent)] shrink-0" />
          <span className="truncate">{strings.settingsTitle}</span>
        </button>
      </div>

      <div className="my-1.5 border-t border-[var(--border-soft)] shrink-0" />

      {/* Language setting */}
      <div className="flex items-center justify-between px-3 py-2 min-h-[44px] text-xs text-[var(--muted)] shrink-0">
        <div className="flex items-center gap-2">
          <Globe size={15} />
          <span>{strings.userMenuLanguage}</span>
        </div>
        <div className="flex items-center rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setLang('fi')}
            className={`min-h-[38px] px-3.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
            className={`min-h-[38px] px-3.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              lang === 'en'
                ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="my-1.5 border-t border-[var(--border-soft)] shrink-0" />

      {/* Uloskirjautuminen / Sisäänkirjautuminen */}
      {user ? (
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors cursor-pointer text-left shrink-0"
        >
          <LogOut size={16} className="shrink-0" />
          <span>{strings.signOutTitle}</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 pt-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate('/login');
            }}
            className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-[var(--surface-2)] hover:bg-[var(--border)] active:bg-[var(--surface-3)] text-[var(--text)] transition-colors cursor-pointer"
          >
            <LogIn size={15} />
            <span>{strings.loginButton}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate('/register');
            }}
            className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 active:opacity-100 transition-opacity cursor-pointer shadow-xs"
          >
            <UserPlus size={15} />
            <span>{strings.guestQuickSignup}</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="relative inline-flex items-center">
      {/* 1. Clickable Avatar Button (min 44x44px touch area) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={strings.userMenuAria}
        className="w-11 h-11 flex items-center justify-center rounded-full p-0.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)]"
      >
        <UserAvatar
          name={user?.displayName || user?.name}
          email={user?.email}
          avatarId={user?.avatarId}
          size="md"
        />
      </button>

      {/* 2. Desktop Dropdown (sm and larger, inside header flow) */}
      {isOpen && (
        <div
          className="hidden sm:block fixed inset-0 z-40 bg-transparent cursor-default"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        className={`
          hidden sm:block absolute right-0 top-[calc(100%+10px)] z-50
          w-80 rounded-2xl p-2
          bg-[var(--surface)] border border-[var(--border)]
          shadow-xl backdrop-blur-xl
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
        {menuContent}
      </div>

      {/* 3. Mobile Bottom Sheet (Portal to document.body, escaping header sticky stacking context) */}
      {isOpen &&
        createPortal(
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              aria-hidden="true"
              onClick={() => setIsOpen(false)}
            />
            {/* Bottom Sheet Modal */}
            <div
              className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] bg-[var(--surface)] border-t border-[var(--border)] shadow-2xl animate-in slide-in-from-bottom duration-250 ease-out"
              style={{ color: 'var(--text)' }}
              role="dialog"
              aria-modal="true"
              aria-label={strings.userMenuAria}
              onClick={(e) => e.stopPropagation()}
            >
              {menuContent}
            </div>
          </div>,
          document.body
        )}

      {/* 4. AI Usage Modal (Mounts to document.body via createPortal) */}
      <AiTokenUsageModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
        isAuthenticated={!!user}
        initialStats={usageStats}
      />
    </div>
  );
}