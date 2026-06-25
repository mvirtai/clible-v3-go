export type UILanguage = 'en' | 'fi';

export interface Messages {
  chooseTranslation: string;
  settingsTitle: string;
  signOutTitle: string;
  tabReader: string;
  tabAnalytics: string;
  appBootLoading: string;
  errFailedLoadTranslations: string;
  errSelectTranslationFirst: string;
  errSearchFailed: string;
  errUnexpected: string;
  readerEmptyTitle: string;
  readerEmptyHint: string;
  readerShare: string;
  readerExport: string;
  searchFindInScripture: string;
  searchVerseLookup: string;
  searchPlaceholderVerse: string;
  searchRecentHeader: string;
  searchClear: string;
  searchResultsTitle: string;
  searchNoResults: string;
}

export const strings: Record<UILanguage, Messages> = {
  en: {
    // App / Shell
    chooseTranslation: 'Choose translation',
    settingsTitle: 'Settings',
    signOutTitle: 'Sign out',
    tabReader: 'Reader',
    tabAnalytics: 'Analytics',
    appBootLoading: 'Loading...',

    // Errors
    errFailedLoadTranslations: 'Failed to load translations.',
    errSelectTranslationFirst: 'Select a translation first.',
    errSearchFailed: 'Search failed.',
    errUnexpected: 'An unexpected error occurred.',

    // ReaderView
    readerEmptyTitle: 'Ready for study',
    readerEmptyHint: 'Enter a verse to begin.',
    readerShare: 'Share',
    readerExport: 'Export',

    // SearchPanel
    searchFindInScripture: 'Find in Scripture',
    searchVerseLookup: 'Verse Lookup',
    searchPlaceholderVerse: 'Enter verse (e.g. John 3:16, Psalms 23)...',
    searchRecentHeader: 'Recent searches',
    searchClear: 'Clear',

    // SearchView
    searchResultsTitle: 'Search Results',
    searchNoResults: 'No verses found for this search.',
  },
  fi: {
    // App / Shell
    chooseTranslation: 'Valitse käännös',
    settingsTitle: 'Asetukset',
    signOutTitle: 'Kirjaudu ulos',
    tabReader: 'Lukija',
    tabAnalytics: 'Analytiikka',
    appBootLoading: 'Ladataan...',

    // Errors
    errFailedLoadTranslations: 'Käännösten lataaminen epäonnistui.',
    errSelectTranslationFirst: 'Valitse ensin käännös.',
    errSearchFailed: 'Haku epäonnistui.',
    errUnexpected: 'Odottamaton virhe tapahtui.',

    // ReaderView
    readerEmptyTitle: 'Valmis opiskeluun',
    readerEmptyHint: 'Syötä jaeviite aloittaaksesi.',
    readerShare: 'Jaa',
    readerExport: 'Vie',

    // SearchPanel
    searchFindInScripture: 'Etsi kirjoituksista',
    searchVerseLookup: 'Jaehaku',
    searchPlaceholderVerse: 'Syötä viite (esim. Johannes 3:16, Psalmit 23)...',
    searchRecentHeader: 'Viimeisimmät haut',
    searchClear: 'Tyhjennä',

    // SearchView
    searchResultsTitle: 'Hakutulokset',
    searchNoResults: 'Hakuun täsmääviä jakeita ei löytynyt.',
  },
};

/**
 * Returns the dictionary of translation strings for the given language.
 */
export function t(lang: UILanguage): Messages {
  return strings[lang];
}

