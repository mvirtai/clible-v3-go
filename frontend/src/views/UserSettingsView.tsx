import { use, useActionState, useState, useRef, Suspense, Component, type ReactNode, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiService } from '@/services/api';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { THEME_AVATARS } from '@/components/layout/avatars';
import type { UserSettings } from '@/types/user';
import type { InstalledTranslation } from '@/types/bible';

interface SettingsFormState {
  success: boolean;
  error: string | null;
}

interface PasswordFormState {
  success: boolean;
  error: string | null;
}

/**
 * Cached resource loader for user settings and translations.
 * Evaluated directly via React 19 `use()` without any useEffect hooks.
 */
let settingsResourcePromise: Promise<[UserSettings, InstalledTranslation[]]> | null = null;
function getSettingsResource(): Promise<[UserSettings, InstalledTranslation[]]> {
  if (!settingsResourcePromise) {
    settingsResourcePromise = Promise.all([
      apiService.getUserSettings(),
      apiService.getTranslations().then((all) => all.filter((t) => t.installed)),
    ]).catch((err) => {
      settingsResourcePromise = null;
      throw err;
    });
  }
  return settingsResourcePromise;
}

/**
 * Invalidates the cached settings promise after mutations to guarantee fresh data.
 */
function invalidateSettingsResource(): void {
  settingsResourcePromise = null;
}

/**
 * Inner view component rendered once suspense promise has resolved.
 */
function UserSettingsContent({ userEmail, userName }: { userEmail: string; userName?: string }): JSX.Element {
  const { lang, setLang, aiLang, setAiLang, strings } = useLanguage();
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  // Pure React 19 use(): Zero useEffect, zero manual loading flags
  const [initialSettings, translations] = use(getSettingsResource());
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(settings?.avatarId || 'initials');
  const [currentDisplayName, setCurrentDisplayName] = useState<string>(settings?.displayName || '');
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPicker = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPickerOpen(true);
  };

  const closePickerWithDelay = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsPickerOpen(false);
    }, 350);
  };

  // React 19.2 useActionState for profile and preferences form action
  const [settingsState, settingsAction, isSettingsPending] = useActionState<SettingsFormState, FormData>(
    async (_prevState, formData) => {
      try {
        const displayName = (formData.get('displayName') as string) || '';
        const avatarId = (formData.get('avatarId') as string) || 'initials';
        const preferredLang = (formData.get('preferredLang') as string) || 'en';
        const aiLanguage = (formData.get('aiLanguage') as 'fi' | 'en' | 'auto') || 'fi';
        const themePreference = (formData.get('themePreference') as string) || 'system';
        const defaultTranslationId = (formData.get('defaultTranslationId') as string) || 'web';
        const liturgicalViewMode = (formData.get('liturgicalViewMode') as 'drawers' | 'tabs') || 'drawers';

        const updated = await apiService.updateUserSettings({
          displayName,
          avatarId,
          preferredLang,
          aiLanguage,
          themePreference,
          defaultTranslationId,
          liturgicalViewMode,
        });

        if (updated.liturgicalViewMode) {
          localStorage.setItem('clible_liturgical_view_mode', updated.liturgicalViewMode);
        }

        invalidateSettingsResource();
        setSettings(updated);
        setSelectedAvatarId(updated.avatarId || 'initials');
        setCurrentDisplayName(updated.displayName || '');

        // Instantly update active AuthContext user so header avatar and profile across the app update immediately
        updateUser({
          displayName: updated.displayName,
          avatarId: updated.avatarId,
        });

        // Instantly update active UI language if valid
        if (preferredLang === 'fi' || preferredLang === 'en') {
          setLang(preferredLang);
        }

        // Instantly update active AI response language
        if (updated.aiLanguage) {
          setAiLang(updated.aiLanguage);
        }

        // Instantly sync theme to document root
        if (themePreference === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (themePreference === 'light') {
          document.documentElement.classList.remove('dark');
        }

        return { success: true, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : strings.errUnexpected;
        return { success: false, error: message };
      }
    },
    { success: false, error: null }
  );

  // React 19.2 useActionState for password change form action
  const [pwdState, pwdAction, isPwdPending] = useActionState<PasswordFormState, FormData>(
    async (_prevState, formData) => {
      try {
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;

        await apiService.updatePassword(currentPassword, newPassword);
        return { success: true, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : strings.errUnexpected;
        return { success: false, error: message };
      }
    },
    { success: false, error: null }
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation header back to workspace */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>{strings.returnToApp || 'Return to Clible'}</span>
          </button>
          <span className="text-xs font-mono text-[var(--muted)]">{userEmail}</span>
        </div>

        {/* View title and description */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{strings.settingsTitle}</h1>
          <p className="text-xs text-[var(--muted)] mt-1">{strings.settingsSubtitle}</p>
        </div>

        {/* 1. Profile and preferences form */}
        <form action={settingsAction} className="space-y-6">
          <input type="hidden" name="avatarId" value={selectedAvatarId} />

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-3">
                {/* Interactive Avatar with Hover/Click Popover */}
                <div
                  className="relative p-1 -m-1"
                  onMouseEnter={openPicker}
                  onMouseLeave={closePickerWithDelay}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (closeTimerRef.current) {
                        clearTimeout(closeTimerRef.current);
                        closeTimerRef.current = null;
                      }
                      setIsPickerOpen((prev) => !prev);
                    }}
                    aria-expanded={isPickerOpen}
                    aria-haspopup="dialog"
                    aria-label={strings.changeAvatarLabel}
                    className="relative group rounded-full cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)] p-0.5 transition-transform hover:scale-105"
                  >
                    <UserAvatar
                      name={currentDisplayName || userName}
                      email={userEmail}
                      avatarId={selectedAvatarId}
                      size="lg"
                    />
                    {/* Hover edit badge */}
                    <span
                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
                      title={strings.changeAvatarLabel}
                    >
                      <Camera size={16} />
                    </span>
                  </button>

                  {/* Popover dropdown panel with invisible hover bridge */}
                  {isPickerOpen && (
                    <div
                      role="dialog"
                      aria-label={strings.avatarSectionTitle}
                      className="absolute left-0 top-[calc(100%+4px)] z-30 w-72 sm:w-80 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-2.5 before:absolute before:-top-4 before:left-0 before:right-0 before:h-4 before:content-['']"
                      onMouseEnter={openPicker}
                      onMouseLeave={closePickerWithDelay}
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
                        <span className="text-xs font-semibold text-[var(--text)]">
                          {strings.avatarSectionTitle}
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">
                          {strings.changeAvatarLabel}
                        </span>
                      </div>

                      <div
                        role="radiogroup"
                        aria-label={strings.avatarSectionTitle}
                        className="grid grid-cols-4 sm:grid-cols-6 gap-2"
                      >
                        {/* Option 1: Monogram Initials */}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selectedAvatarId === 'initials'}
                          onClick={() => {
                            if (closeTimerRef.current) {
                              clearTimeout(closeTimerRef.current);
                              closeTimerRef.current = null;
                            }
                            setSelectedAvatarId('initials');
                            setIsPickerOpen(false);
                          }}
                          title={strings.avatarInitialsLabel}
                          aria-label={strings.avatarInitialsLabel}
                          className={`flex items-center justify-center p-1 rounded-full transition-transform hover:scale-110 cursor-pointer ${
                            selectedAvatarId === 'initials'
                              ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]'
                              : 'hover:opacity-90'
                          }`}
                        >
                          <UserAvatar
                            name={currentDisplayName || userName}
                            email={userEmail}
                            avatarId="initials"
                            size="md"
                          />
                        </button>

                        {/* Options 2-11: 10 Thematic SVG Icons */}
                        {THEME_AVATARS.map((avatar) => {
                          const isSelected = selectedAvatarId === avatar.id;
                          const title = lang === 'en' ? avatar.nameEn : avatar.nameFi;
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => {
                                if (closeTimerRef.current) {
                                  clearTimeout(closeTimerRef.current);
                                  closeTimerRef.current = null;
                                }
                                setSelectedAvatarId(avatar.id);
                                setIsPickerOpen(false);
                              }}
                              title={title}
                              aria-label={title}
                              className={`flex items-center justify-center p-1 rounded-full transition-transform hover:scale-110 cursor-pointer ${
                                isSelected
                                  ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]'
                                  : 'hover:opacity-90'
                              }`}
                            >
                              <UserAvatar
                                email={userEmail}
                                avatarId={avatar.id}
                                size="md"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)]">{strings.profileSectionTitle}</h2>
                  <p className="text-xs text-[var(--muted)]">{strings.profileSectionDesc}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border-soft)]">
                <ShieldCheck size={13} className="text-[var(--accent)]" />
                <span className="text-[11px] font-medium text-[var(--text)]">
                  {settings?.isVerified ? strings.statusVerified : strings.statusUnverified}
                </span>
              </div>
            </div>

            {/* Input fields for profile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="name-input" className="text-xs font-medium text-[var(--text)]">
                  {strings.displayNameLabel}
                </label>
                <input
                  id="name-input"
                  name="displayName"
                  type="text"
                  value={currentDisplayName}
                  onChange={(e) => setCurrentDisplayName(e.target.value)}
                  placeholder={strings.displayNamePlaceholder}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email-input" className="text-xs font-medium text-[var(--muted)]">
                  {strings.emailAddressLabel}
                </label>
                <input
                  id="email-input"
                  type="email"
                  disabled
                  value={userEmail}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)]/50 border border-[var(--border-soft)] text-[var(--muted)] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-soft)] space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">{strings.preferencesSectionTitle}</h3>
                <p className="text-xs text-[var(--muted)]">{strings.preferencesSectionDesc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Default Bible Translation */}
                <div className="space-y-1.5">
                  <label htmlFor="trans-select" className="text-xs font-medium text-[var(--text)]">
                    {strings.defaultTranslationLabel}
                  </label>
                  <select
                    id="trans-select"
                    name="defaultTranslationId"
                    defaultValue={settings?.defaultTranslationId || 'web'}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                  >
                    {translations.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* UI Language */}
                <div className="space-y-1.5">
                  <label htmlFor="lang-select" className="text-xs font-medium text-[var(--text)]">
                    {strings.uiLanguageLabel}
                  </label>
                  <select
                    id="lang-select"
                    name="preferredLang"
                    defaultValue={settings?.preferredLang || lang}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                  >
                    <option value="en">English (EN)</option>
                    <option value="fi">Suomi (FI)</option>
                  </select>
                </div>

                {/* AI Response Language */}
                <div className="space-y-1.5">
                  <label htmlFor="ai-lang-select" className="text-xs font-medium text-[var(--text)]">
                    {strings.aiLanguageLabel}
                  </label>
                  <select
                    id="ai-lang-select"
                    name="aiLanguage"
                    defaultValue={settings?.aiLanguage || aiLang}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                  >
                    <option value="fi">{strings.aiLanguageFinnish}</option>
                    <option value="en">{strings.aiLanguageEnglish}</option>
                    <option value="auto">{strings.aiLanguageAuto}</option>
                  </select>
                </div>

                {/* Theme Preference */}
                <div className="space-y-1.5">
                  <label htmlFor="theme-select" className="text-xs font-medium text-[var(--text)]">
                    {strings.themeLabel}
                  </label>
                  <select
                    id="theme-select"
                    name="themePreference"
                    defaultValue={settings?.themePreference || 'system'}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                  >
                    <option value="system">{strings.themeSystem}</option>
                    <option value="light">{strings.themeLight}</option>
                    <option value="dark">{strings.themeDark}</option>
                  </select>
                </div>

                {/* Church Year Default View */}
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                  <label htmlFor="liturgical-mode-select" className="text-xs font-medium text-[var(--text)]">
                    {strings.liturgicalViewModeSettingLabel}
                  </label>
                  <p className="text-[11px] text-[var(--muted)] pb-1">
                    {strings.liturgicalViewModeSettingDesc}
                  </p>
                  <select
                    id="liturgical-mode-select"
                    name="liturgicalViewMode"
                    defaultValue={settings?.liturgicalViewMode || (typeof localStorage !== 'undefined' ? localStorage.getItem('clible_liturgical_view_mode') as 'drawers' | 'tabs' : null) || 'drawers'}
                    className="w-full sm:max-w-md px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                  >
                    <option value="drawers">{strings.liturgicalViewModeDrawersOption}</option>
                    <option value="tabs">{strings.liturgicalViewModeTabsOption}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status alerts and submit button */}
            {settingsState.success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 size={14} />
                <span>{strings.saveSettingsSuccess}</span>
              </div>
            )}
            {settingsState.error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium">
                <AlertCircle size={14} />
                <span>{settingsState.error}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSettingsPending}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isSettingsPending ? strings.saving : strings.saveSettingsButton}
              </button>
            </div>
          </div>
        </form>

        {/* 2. Password change form */}
        <form action={pwdAction} className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-soft)]">
              <div className="p-2 rounded-xl bg-[var(--surface-2)] text-[var(--accent)]">
                <Lock size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">{strings.securitySectionTitle}</h2>
                <p className="text-xs text-[var(--muted)]">{strings.securitySectionDesc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="curr-pwd-input" className="text-xs font-medium text-[var(--text)]">
                  {strings.currentPasswordLabel}
                </label>
                <input
                  id="curr-pwd-input"
                  name="currentPassword"
                  type="password"
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-pwd-input" className="text-xs font-medium text-[var(--text)]">
                  {strings.newPasswordLabel}
                </label>
                <input
                  id="new-pwd-input"
                  name="newPassword"
                  type="password"
                  required
                  placeholder={strings.newPasswordHint}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            {pwdState.success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 size={14} />
                <span>{strings.changePasswordSuccess}</span>
              </div>
            )}
            {pwdState.error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium">
                <AlertCircle size={14} />
                <span>{pwdState.error}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPwdPending}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPwdPending ? strings.saving : strings.changePasswordButton}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SettingsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  reset = () => {
    invalidateSettingsResource();
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

/**
 * Root exported view providing Suspense boundaries and guest mode fallback.
 * Zero useEffect: Pure declarative React 19.2 architecture.
 */
export function UserSettingsView(): JSX.Element {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const navigate = useNavigate();

  // 1. Declarative guest mode: Unauthenticated guests see the invitation card immediately
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 sm:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>{strings.returnToApp || 'Back to workspace'}</span>
          </button>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
              <User size={24} />
            </div>
            <h1 className="text-xl font-bold">{strings.settingsTitle}</h1>
            <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
              {strings.guestSettingsPrompt}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] transition-all cursor-pointer"
              >
                {strings.loginButton || 'Log In'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] hover:opacity-90 text-white transition-all cursor-pointer"
              >
                {strings.createAccountButton}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Suspense boundary for authenticated user settings loading
  return (
    <SettingsErrorBoundary
      fallback={(err, reset) => (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 sm:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>{strings.returnToApp || 'Back to workspace'}</span>
            </button>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <h1 className="text-xl font-bold">{strings.errUnexpected}</h1>
              <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
                {err.message}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] hover:opacity-90 text-white transition-all cursor-pointer"
                >
                  {strings.retryButtonLabel || 'Yritä uudelleen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)]">
            <p className="text-sm text-[var(--muted)]">{strings.appBootLoading || 'Loading...'}</p>
          </div>
        }
      >
        <UserSettingsContent userEmail={user.email} />
      </Suspense>
    </SettingsErrorBoundary>
  );
}