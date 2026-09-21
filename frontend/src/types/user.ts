/**
 * User account settings and UI/reading preferences.
 */
export interface UserSettings {
  id: string;
  email: string;
  displayName: string;
  name?: string;
  preferredLang: 'en' | 'fi';
  themePreference: 'system' | 'light' | 'dark';
  defaultTranslationId: string;
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
  preferredLang: string;
  themePreference: string;
  defaultTranslationId: string;
}