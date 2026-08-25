/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UILanguage, Messages } from '../utils/i18n';
import { t } from '../utils/i18n';

/**
 * Language context value providing active UI language and localized dictionary.
 */
export interface LanguageContextValue {
  /** Currently active UI language code ('fi' | 'en'). */
  lang: UILanguage;
  /** Updates the active UI language and persists preference to local storage. */
  setLang: (l: UILanguage) => void;
  /** Active localized string dictionary. */
  strings: Messages;
}

const STORAGE_KEY = 'app:lang';

const defaultLang: UILanguage = 'fi';

const LanguageContext = createContext<LanguageContextValue>({
  lang: defaultLang,
  setLang: () => {},
  strings: t(defaultLang),
});

/**
 * Manages UI language preference, localStorage persistence, and dictionary distribution.
 *
 * @param props - React provider properties including children nodes.
 * @returns Context provider element wrapping child components.
 */
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<UILanguage>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'fi' || raw === 'en') return raw as UILanguage;
    } catch {
      // ignore localStorage errors in non-browser/restricted environments
    }
    return defaultLang;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore localStorage write errors
    }
  }, [lang]);

  const setLang = (l: UILanguage) => setLangState(l);

  // Pure derived dictionary based on active language (O(1) object lookup)
  const strings = t(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, strings }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Custom hook to consume the current language context and translation dictionary.
 *
 * @returns Active language context value containing language state and localized strings.
 */
export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

