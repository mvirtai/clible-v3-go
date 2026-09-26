/**
 * User account settings and UI/reading preferences.
 */
export interface UserSettings {
  id: string;
  email: string;
  displayName: string;
  avatarId: string;
  name?: string;
  preferredLang: 'en' | 'fi';
  aiLanguage: 'fi' | 'en' | 'auto';
  themePreference: 'system' | 'light' | 'dark';
  defaultTranslationId: string;
  liturgicalViewMode?: 'drawers' | 'tabs';
  subscriptionTier: 'free' | 'supporter' | 'pro';
  subscriptionStatus: 'active' | 'cancelled' | 'canceled' | 'past_due' | 'incomplete';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for updating user profile and preferences.
 */
export interface UpdateUserSettingsPayload {
  displayName: string;
  avatarId?: string;
  preferredLang: string;
  aiLanguage?: string;
  themePreference: string;
  defaultTranslationId: string;
  liturgicalViewMode?: 'drawers' | 'tabs';
}