import type { InstalledTranslation } from '../types/bible';
import type { UILanguage } from './i18n';

/**
 * Priority list of preferred translations for each supported UI language.
 */
export const PREFERRED_TRANSLATIONS: Record<UILanguage, string[]> = {
  fi: ['fin-1992', 'fin-biblia-33-38', 'fin-1776', 'web', 'kjv'],
  en: ['web', 'kjv', 'fin-1992', 'fin-biblia-33-38', 'fin-1776'],
};

/**
 * Resolves the optimal default Bible translation from a list of active translations
 * based on the active UI language.
 *
 * @param activeTranslations - List of translations currently installed/active for the user
 * @param lang - Current UI language ('fi' or 'en')
 * @returns The best matching translation ID, or empty string if no translations are available
 */
export function getDefaultTranslationForLanguage(
  activeTranslations: InstalledTranslation[],
  lang: UILanguage
): string {
  if (!activeTranslations || activeTranslations.length === 0) {
    return '';
  }

  const preferred = PREFERRED_TRANSLATIONS[lang] || PREFERRED_TRANSLATIONS.fi;

  // 1. Look for preferred translations in order of priority
  for (const preferredId of preferred) {
    const found = activeTranslations.find((t) => t.id === preferredId);
    if (found) {
      return found.id;
    }
  }

  // 2. Look for any translation that matches the target language code
  const sameLang = activeTranslations.find((t) => t.language === lang);
  if (sameLang) {
    return sameLang.id;
  }

  // 3. Fallback to the first available active translation
  return activeTranslations[0].id;
}
