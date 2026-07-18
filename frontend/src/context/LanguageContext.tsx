import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { UILanguage, Messages } from '../utils/i18n';
import { t } from '../utils/i18n';

export interface LanguageContextValue {
  lang: UILanguage;
  setLang: (l: UILanguage) => void;
  strings: Messages;
}

const STORAGE_KEY = 'app:lang';

const defaultLang: UILanguage = 'en';

const LanguageContext = createContext<LanguageContextValue>({
  lang: defaultLang,
  setLang: () => {},
  strings: t(defaultLang),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<UILanguage>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'fi' || raw === 'en') return raw as UILanguage;
    } catch (err) {
      // ignore
    }
    return defaultLang;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      // ignore
    }
  }, [lang]);

  const setLang = (l: UILanguage) => setLangState(l);

  const strings = useMemo(() => t(lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, strings }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  return useContext(LanguageContext);
}
