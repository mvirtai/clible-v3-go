import { use, useActionState, useState, Suspense, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiService } from '@/services/api';
import { UserAvatar } from '@/components/layout/UserAvatar';
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
    ]);
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
  const { lang, setLang, strings } = useLanguage();
  const navigate = useNavigate();

  // Pure React 19 use(): Zero useEffect, zero manual loading flags
  const [initialSettings, translations] = use(getSettingsResource());
  const [settings, setSettings] = useState<UserSettings>(initialSettings);

  // React 19.2 useActionState for profile and preferences form action
  const [settingsState, settingsAction, isSettingsPending] = useActionState<SettingsFormState, FormData>(
    async (_prevState, formData) => {
      try {
        const displayName = (formData.get('displayName') as string) || '';
        const preferredLang = (formData.get('preferredLang') as string) || 'en';
        const themePreference = (formData.get('themePreference') as string) || 'system';
        const defaultTranslationId = (formData.get('defaultTranslationId') as string) || 'web';

        const updated = await apiService.updateUserSettings({
          displayName,
          preferredLang,
          themePreference,
          defaultTranslationId,
        });

        invalidateSettingsResource();
        setSettings(updated);

        // Instantly update active UI language if valid
        if (preferredLang === 'fi' || preferredLang === 'en') {
          setLang(preferredLang);
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
            <span>{strings.backToBroaderText || 'Back to workspace'}</span>
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
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-3">
                <UserAvatar name={settings?.displayName || userName} email={userEmail} size="lg" />
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
                  defaultValue={settings?.displayName || ''}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <span>{strings.backToBroaderText || 'Back to workspace'}</span>
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)]">
          <p className="text-sm text-[var(--muted)]">{strings.appBootLoading || 'Loading...'}</p>
        </div>
      }
    >
      <UserSettingsContent userEmail={user.email} />
    </Suspense>
  );
}