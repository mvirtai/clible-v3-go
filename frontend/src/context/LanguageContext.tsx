/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useSyncExternalStore } from 'react';
import type { UILanguage, Messages } from '../utils/i18n';
import { t } from '../utils/i18n';

/**
 * Supported AI response language codes.
 */
export type AILanguage = 'fi' | 'en' | 'auto';

/**
 * Language context value providing active UI language, AI response language, and localized dictionary.
 */
export interface LanguageContextValue {
  /** Currently active UI language code ('fi' | 'en'). */
  lang: UILanguage;
  /** Updates the active UI language and persists preference to local storage. */
  setLang: (l: UILanguage) => void;
  /** Currently active AI response language ('fi' | 'en' | 'auto'). */
  aiLang: AILanguage;
  /** Updates the active AI response language and persists preference to local storage. */
  setAiLang: (l: AILanguage) => void;
  /** Active localized string dictionary. */
  strings: Messages;
}

const STORAGE_KEY = 'app:lang';
const AI_STORAGE_KEY = 'app:ai_lang';

const defaultLang: UILanguage = 'fi';
const defaultAiLang: AILanguage = 'fi';

const LanguageContext = createContext<LanguageContextValue>({
  lang: defaultLang,
  setLang: () => {},
  aiLang: defaultAiLang,
  setAiLang: () => {},
  strings: t(defaultLang),
});

function getInitialLanguage(): UILanguage {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw === 'fi' || raw === 'en') {
      return raw as UILanguage;
    }
  } catch {
    // ignore localStorage errors in non-browser/restricted environments
  }
  return defaultLang;
}

function getInitialAiLanguage(): AILanguage {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(AI_STORAGE_KEY) : null;
    if (raw === 'fi' || raw === 'en' || raw === 'auto') {
      return raw as AILanguage;
    }
  } catch {
    // ignore localStorage errors in non-browser/restricted environments
  }
  return defaultAiLang;
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === AI_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function getLangSnapshot(): UILanguage {
  return getInitialLanguage();
}

function getAiLangSnapshot(): AILanguage {
  return getInitialAiLanguage();
}

function getServerLangSnapshot(): UILanguage {
  return defaultLang;
}

function getServerAiLangSnapshot(): AILanguage {
  return defaultAiLang;
}

/**
 * Manages UI language preference, AI response language, localStorage persistence, and dictionary distribution.
 *
 * Uses useSyncExternalStore for zero useEffect compliance with React 19.2 and the React Compiler.
 *
 * @param props - React provider properties including children nodes.
 * @returns Context provider element wrapping child components.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getLangSnapshot, getServerLangSnapshot);
  const aiLang = useSyncExternalStore(subscribe, getAiLangSnapshot, getServerAiLangSnapshot);

  const setLang = (l: UILanguage) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore localStorage write errors
    }
    notify();
  };

  const setAiLang = (l: AILanguage) => {
    try {
      localStorage.setItem(AI_STORAGE_KEY, l);
    } catch {
      // ignore localStorage write errors
    }
    notify();
  };

  // Pure derived dictionary based on active language (O(1) object lookup)
  const strings = t(lang);

  return (
    <LanguageContext value={{ lang, setLang, aiLang, setAiLang, strings }}>
      {children}
    </LanguageContext>
  );
}

/**
 * Custom hook to consume the current language context and translation dictionary.
 *
 * @returns Active language context value containing language state and localized strings.
 */
export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

