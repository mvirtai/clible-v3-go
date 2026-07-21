export type UILanguage = 'en' | 'fi';

export interface Messages {
  chooseTranslation: string;
  translationsLabel: string;
  hideLabel: string;
  settingsTitle: string;
  signOutTitle: string;
  tabReader: string;
  tabAnalytics: string;
  tabCompare: string;
  tabOriginal: string;
  tabNotebooks: string;
  appBootLoading: string;
  errFailedLoadTranslations: string;
  errSelectTranslationFirst: string;
  errSearchFailed: string;
  errUnexpected: string;
  readerEmptyTitle: string;
  readerEmptyHint: string;
  readerShare: string;
  readerExport: string;
  noTranslationSelected: string;
  noTranslationHint: string;
  installTranslation: string;
  quickStart: string;
  notebookTitle: string;
  createNotebook: string;
  noTranslations: string;
  translationPlaceholder: string;
  readByReference: string;
  versePlaceholder: string;
  fetchButtonLabel: string;
  noVersesFound: string;
  backToBroaderText: string;
  aiAnalysisTitle: string;
  analyzePassage: string;
  aiReading: string;
  searchFindInScripture: string;
  searchVerseLookup: string;
  searchPlaceholderVerse: string;
  regexLabel: string;
  searchScopeLabel: string;
  scopeAll: string;
  scopeOT: string;
  scopeNT: string;
  scopeBook: string;
  chooseBookPlaceholder: string;
  saveLabel: string;
  savingLabel: string;
  saveSuccess: string;
  saveFail: string;
  cancelLabel: string;
  searchRecentHeader: string;
  searchClear: string;
  searchResultsTitle: string;
  searchNoResults: string;
  needTwoTranslations: string;
  compareButtonLabel: string;
  averageSimilarity: string;
  rowsCompared: string;
  mostSimilarVerse: string;
  aiComparing: string;
  saveNamePlaceholder: string;
  compareReferencePlaceholder: string;
  newScopePlaceholder: string;
  codeCellPlaceholder: string;
  markdownCellPlaceholder: string;
  markdownEditTitle: string;
  markdownEmptyText: string;
  markdownCtrlEnterHint: string;
  runLabel: string;
  runningLabel: string;
  cliOutputPrefix: string;
  freezeLabel: string;
  freezeDisabledTitle: string;
  freezeEnabledTitle: string;
  // Additional labels
  searchResultsForQuery: string;
  noResults: string;
  dynamicRefsFor: string;
  noRefsFound: string;
  suggestNoData: string;
  identifiedThemesLabel: string;
  geminiEngine: string;
  loadingLabel: string;
  workspaceLabel: string;
  newScopeTitle: string;
  createLabel: string;
  selectWorkspacePlaceholder: string;
  renameTitlePrompt: string;
  deleteScopeConfirm: string;
  deleteSearchConfirm: string;
  deleteAnalysisConfirm: string;
  exactMatchesLabel: string;
  verseLabel: string;
  similarityLabel: string;
  markdownOptionLabel: string;
  codeOptionLabel: string;
  emptyNotebookText: string;
  addMarkdownCellLabel: string;
  addCodeCellLabel: string;
  lastReadVerseLabel: string;
  createScopeFailed: string;
  deleteScopeFailed: string;
  deleteSearchFailed: string;
  deleteAnalysisFailed: string;
  noNotebooksText: string;
  moveUpTitle: string;
  moveDownTitle: string;
  deleteCellTitle: string;
  registerTitle: string;
  registerButton: string;
  registeringLabel: string;
  chartBarTitle: string;
  chartCloudTitle: string;
  nextFocusTitle: string;
  deepDiveToneTitle: string;
  deepDiveCompareTitle: string;
  englishLabel: string;
  finnishLabel: string;
  renameScopeTitle: string;
  editTitleLabel: string;
  renameButtonTitle?: string;
  deleteButtonTitle?: string;
  savedSearchesTitle?: string;
  noSavedSearches?: string;
  savedAnalysesTitle?: string;
  noSavedAnalyses?: string;
  loadingNotebook?: string;
  errorHeading?: string;
  retryButtonLabel?: string;
  unnamedNotebook?: string;
}

export const strings: Record<UILanguage, Messages> = {
  en: {
    // App / Shell
        chooseTranslation: 'Choose translation',
        translationsLabel: 'Translations',
        hideLabel: 'Hide',
        settingsTitle: 'Settings',
        signOutTitle: 'Sign out',
        tabReader: 'Reader',
        tabAnalytics: 'Analytics',
        tabCompare: 'Compare',
        tabOriginal: 'Original',
        tabNotebooks: 'Notebooks',
        appBootLoading: 'Loading...',
            noTranslations: 'No translations',
            translationPlaceholder: 'Select translation...',
        notebookTitle: 'Notebooks',
        createNotebook: 'Create Notebook',

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

    noTranslationSelected: 'No translation selected',
    noTranslationHint: 'Open Translations in the header and install one.',
    installTranslation: 'Install a Translation',
    quickStart: 'Install a translation, then try reading John 3:16 or search for "light" in the text search below.',
    readByReference: 'Read by Reference',
    versePlaceholder: 'John 3:16 · Joh. 3:16 · 1 Moos 1:1',
    fetchButtonLabel: 'Fetch',
    noVersesFound: 'No verses found.',
    backToBroaderText: 'Back to broader text',
    aiAnalysisTitle: 'AI Analysis (Gemini)',
    analyzePassage: 'Analyze Passage',
    aiReading: 'AI is reading the passage...',

    // SearchPanel
    searchFindInScripture: 'Find in Scripture',
    searchVerseLookup: 'Verse Lookup',
    searchPlaceholderVerse: 'Enter verse (e.g. John 3:16, Psalms 23)...',
    regexLabel: 'Use regular expressions (Regex)',
    searchScopeLabel: 'Search scope',
    scopeAll: 'Entire Bible',
    scopeOT: 'Old Testament (OT)',
    scopeNT: 'New Testament (NT)',
    scopeBook: 'Specific book',
    chooseBookPlaceholder: '-- Choose book --',
    saveLabel: 'Save',
    savingLabel: 'Saving...',
    saveSuccess: 'Saved!',
    saveFail: 'Failed.',
    cancelLabel: 'Cancel',
    searchRecentHeader: 'Recent searches',
    searchClear: 'Clear',

    // SearchView
    searchResultsTitle: 'Search Results',
    searchNoResults: 'No verses found for this search.',
    needTwoTranslations: 'Install at least two translations to use the compare tool.',
    compareButtonLabel: 'Compare translations',
    averageSimilarity: 'Average similarity',
    rowsCompared: 'Rows compared',
    mostSimilarVerse: 'Most similar verse',
    aiComparing: 'AI is analyzing and comparing translations...',
    saveNamePlaceholder: 'Name for this saved item (e.g. John 3 glossary)...',
    compareReferencePlaceholder: 'e.g. John 3:16 or John 3:16-20',
    newScopePlaceholder: 'Workspace name...',
    codeCellPlaceholder: '/read Joh 3:16 or /suggest or /refs Joh 3:16',
    markdownCellPlaceholder: 'Write notes here... You can reference verses using [[John 3:16]] or [[Joh. 3:16]]',
    markdownEditTitle: 'Double-click to edit',
    markdownEmptyText: 'Empty markdown cell. Double-click to add notes. You can reference verses with [[John 3:16]]',
    markdownCtrlEnterHint: 'Ctrl+Enter to finish',
    runLabel: 'Run',
    runningLabel: 'Running...',
    cliOutputPrefix: 'CLI Output —',
    freezeLabel: 'Freeze',
    freezeDisabledTitle: 'Select at least one verse to freeze',
    freezeEnabledTitle: 'Convert selected verses to a Markdown cell below',
    searchResultsForQuery: 'Search results for',
    noResults: 'No results.',
    dynamicRefsFor: 'Dynamic cross-references for',
    noRefsFound: 'No cross-references found (the passage may contain only common words).',
    suggestNoData: 'Write more into Markdown cells first to get theme-specific suggestions.',
    identifiedThemesLabel: 'Identified themes:',
    geminiEngine: 'Gemini Engine',
    loadingLabel: 'Loading...',
    workspaceLabel: 'Workspace (Scope)',
    newScopeTitle: 'New workspace',
    createLabel: 'Create',
    selectWorkspacePlaceholder: '-- Select workspace --',
    renameTitlePrompt: 'Provide a new name',
    deleteScopeConfirm: 'Are you sure you want to delete this workspace and all saved items?',
    deleteSearchConfirm: 'Are you sure you want to delete this saved search?',
    deleteAnalysisConfirm: 'Are you sure you want to delete this analysis?',
    exactMatchesLabel: 'Exact Matches',
    verseLabel: 'Verse',
    similarityLabel: 'Sim',
    markdownOptionLabel: 'Markdown',
    codeOptionLabel: 'CLI Command',
    emptyNotebookText: 'This notebook has no cells yet.',
    addMarkdownCellLabel: '+ Add Markdown cell',
    addCodeCellLabel: '+ Add Code cell',
    lastReadVerseLabel: 'Last read verse:',
    // Workspace operation failure messages
    createScopeFailed: 'Workspace creation failed',
    deleteScopeFailed: 'Failed deleting workspace',
    deleteSearchFailed: 'Failed deleting saved search',
    deleteAnalysisFailed: 'Failed deleting analysis',
    noNotebooksText: 'No notebooks yet. Create one to get started!',
    moveUpTitle: 'Move up',
    moveDownTitle: 'Move down',
    deleteCellTitle: 'Delete cell',
    registerTitle: 'Create a new account',
    registerButton: 'Register',
    registeringLabel: 'Registering...',
    chartBarTitle: 'Bar chart',
    chartCloudTitle: 'Word cloud',
    nextFocusTitle: 'Next focus',
    deepDiveToneTitle: 'Deep dive',
    deepDiveCompareTitle: 'Deep dive',
    englishLabel: 'English',
    finnishLabel: 'Finnish',
    renameScopeTitle: 'Rename workspace',
    editTitleLabel: 'Click to edit',
  },
  fi: {
    // App / Shell
    chooseTranslation: 'Valitse käännös',
    translationsLabel: 'Käännökset',
    hideLabel: 'Piilota',
    settingsTitle: 'Asetukset',
    signOutTitle: 'Kirjaudu ulos',
    tabReader: 'Lukija',
    tabAnalytics: 'Analytiikka',
    tabCompare: 'Käännösvertailu',
    tabOriginal: 'Alkukieli',
    tabNotebooks: 'Muistikirjat',
    appBootLoading: 'Ladataan...',
    notebookTitle: 'Muistikirjat',
    createNotebook: 'Luo muistikirja',

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

    noTranslationSelected: 'Ei valittua käännöstä',
    noTranslationHint: 'Avaa ylävalikon Käännökset ja asenna yksi.',
    installTranslation: 'Asenna käännös',
    quickStart: 'Asenna käännös, ja kokeile lukea esim. Joh. 3:16 tai hae sanaa "valo" tekstihakutoiminnolla.',
    readByReference: 'Lue viitteellä',
    versePlaceholder: 'Joh. 3:16 · John 3:16 · 1 Moos 1:1',
    fetchButtonLabel: 'Hae',
    noVersesFound: 'Ei jakeita löytynyt.',
    backToBroaderText: 'Takaisin laajempaan tekstiin',
    aiAnalysisTitle: 'Tekoäly-analyysi (Gemini)',
    analyzePassage: 'Analysoi tekstiä',
    aiReading: 'Tekoäly opiskelee tekstikohtaa...',

    // SearchPanel
    searchFindInScripture: 'Etsi kirjoituksista',
    searchVerseLookup: 'Jaehaku',
    searchPlaceholderVerse: 'Syötä viite (esim. Johannes 3:16, Psalmit 23)...',
    regexLabel: 'Käytä säännöllisiä lausekkeita (Regex)',
    searchScopeLabel: 'Hakualue',
    scopeAll: 'Koko Raamattu',
    scopeOT: 'Vanha testamentti (VT)',
    scopeNT: 'Uusi testamentti (UT)',
    scopeBook: 'Tietty kirja',
    chooseBookPlaceholder: '-- Valitse kirja --',
    saveLabel: 'Tallenna',
    savingLabel: 'Tallennetaan...',
    saveSuccess: '✓ Tallennettu!',
    saveFail: '✗ Epäonnistui.',
    cancelLabel: 'Peruuta',
    searchRecentHeader: 'Viimeisimmät haut',
    searchClear: 'Tyhjennä',

    // SearchView
    searchResultsTitle: 'Hakutulokset',
    searchNoResults: 'Hakuun täsmääviä jakeita ei löytynyt.',
    needTwoTranslations: 'Asenna vähintään kaksi käännöstä vertailutyökalun käyttämiseksi.',
    compareButtonLabel: 'Vertaa käännöksiä',
    averageSimilarity: 'Keskimääräinen samankaltaisuus',
    rowsCompared: 'Rivejä vertailtu',
    mostSimilarVerse: 'Samankaltaisin jae',
    aiComparing: 'Tekoäly analysoi ja vertailee käännöksiä...',
    saveNamePlaceholder: 'Nimi tälle tallennukselle (esim. Joh 3 sanasto)...',
    compareReferencePlaceholder: 'esim. Joh 3:16 tai Joh 3:16-20',
    newScopePlaceholder: 'Työtilan nimi...',
    codeCellPlaceholder: '/read Joh 3:16 tai /suggest tai /refs Joh 3:16',
    markdownCellPlaceholder: 'Kirjoita muistiinpanoja tähän... Voit viitata jakeisiin muodolla [[Joh. 3:16]] tai [[John 3:16]]',
    markdownEditTitle: 'Kaksoisklikkaa muokataksesi',
    markdownEmptyText: 'Tyhjä markdown-solu. Kaksoisklikkaa lisätäksesi muistiinpanoja. Voit viitata jakeisiin esim. [[Joh. 3:16]]',
    markdownCtrlEnterHint: 'Ctrl+Enter valmis',
    runLabel: 'Suorita',
    runningLabel: 'Suoritetaan...',
    cliOutputPrefix: 'CLI Output —',
    freezeLabel: 'Jäädytä',
    freezeDisabledTitle: 'Valitse vähintään yksi jae jäädyttääksesi',
    freezeEnabledTitle: 'Muunna valitut jaet Markdown-soluksi alla',
    searchResultsForQuery: 'Hakutulokset haulle',
    noResults: 'Ei tuloksia.',
    dynamicRefsFor: 'Dynaamiset ristiinviitteet jakeelle',
    noRefsFound: 'Ei ristiinviitteitä löydetty (jae saattaa sisältää vain yleisiä sanoja).',
    suggestNoData: 'Kirjoita ensin enemmän Markdown-soluihin saadaksesi teemakohtaisia ehdotuksia.',
    identifiedThemesLabel: 'Tunnistetut teemat:',
    geminiEngine: 'Gemini Engine',
    loadingLabel: 'Ladataan...',
    workspaceLabel: 'Työtila (Scope)',
    newScopeTitle: 'Uusi työtila',
    createLabel: 'Luo',
    selectWorkspacePlaceholder: '-- Valitse työtila --',
    renameTitlePrompt: 'Anna uusi nimi',
    deleteScopeConfirm: 'Haluatko varmasti poistaa tämän työtilan ja kaikki sen tallennetut tulokset?',
    deleteSearchConfirm: 'Haluatko varmasti poistaa tämän haun?',
    deleteAnalysisConfirm: 'Haluatko varmasti poistaa tämän analyysin?',
    renameButtonTitle: 'Nimeä uudelleen',
    deleteButtonTitle: 'Poista',
    savedSearchesTitle: 'Tallennetut haut',
    noSavedSearches: 'Ei tallennettuja hakuja.',
    savedAnalysesTitle: 'Tallennetut analyysit',
    noSavedAnalyses: 'Ei tallennettuja analyysejä.',
    loadingNotebook: 'Ladataan muistikirjaa...',
    errorHeading: 'Hups! Jotain meni vikaan',
    retryButtonLabel: 'Yritä uudelleen',
    unnamedNotebook: 'Nimetön muistikirja',
    exactMatchesLabel: 'Täysin samat jakeet',
    verseLabel: 'Jae',
    similarityLabel: 'Suhde',
    markdownOptionLabel: 'Markdown',
    codeOptionLabel: 'CLI-komento',
    emptyNotebookText: 'Tässä muistikirjassa ei ole vielä soluja.',
    addMarkdownCellLabel: '+ Lisää Markdown-solu',
    addCodeCellLabel: '+ Lisää CLI-solu',
    lastReadVerseLabel: 'Viimeksi luettu jae:',
    // Workspace operation failure messages
    createScopeFailed: 'Työtilan luominen epäonnistui',
    deleteScopeFailed: 'Työtilan poistaminen epäonnistui',
    deleteSearchFailed: 'Haun poistaminen epäonnistui',
    deleteAnalysisFailed: 'Analyysin poistaminen epäonnistui',
    noNotebooksText: 'Ei vielä muistikirjoja. Luo uusi aloittaaksesi!',
    moveUpTitle: 'Siirrä ylös',
    moveDownTitle: 'Siirrä alas',
    deleteCellTitle: 'Poista solu',
    registerTitle: 'Luo uusi tili',
    registerButton: 'Rekisteröidy',
    registeringLabel: 'Rekisteröidytään...',
    noTranslations: 'Ei käännöksiä',
    translationPlaceholder: 'Valitse käännös...',
    chartBarTitle: 'Pylväskaavio',
    chartCloudTitle: 'Sanapilvi',
    nextFocusTitle: 'Seuraava painopiste',
    deepDiveToneTitle: 'Syvällinen tutkimus',
    deepDiveCompareTitle: 'Syvällinen tutkimus',
    englishLabel: 'Englanti',
    finnishLabel: 'Suomi',
    renameScopeTitle: 'Nimeä työtila uudelleen',
    editTitleLabel: 'Klikkaa muokataksesi',
  }

};

/**
 * Returns the dictionary of translation strings for the given language.
 */
export function t(lang: UILanguage): Messages {
  return strings[lang];
}

