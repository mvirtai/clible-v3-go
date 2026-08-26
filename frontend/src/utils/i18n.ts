/**
 * Supported UI display languages.
 */
export type UILanguage = 'en' | 'fi';

/**
 * Interface mapping localized string keys to display text across supported languages.
 */
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
  translationManagementTitle: string;
  activeTranslationsTitle: string;
  availableTranslationsTitle: string;
  removeTranslationLabel: string;
  noTranslationsAdminHint: string;
  translationActivatedMsg: string;
  translationDeactivatedMsg: string;
  translationActivationFailed: string;
  translationDeactivationFailed: string;
  quickStart: string;
  notebookTitle: string;
  createNotebook: string;
  noTranslations: string;
  translationPlaceholder: string;
  readByReference: string;
  versePlaceholder: string;
  fetchButtonLabel: string;
  fetchVersesFailed: string;
  noVersesFound: string;
  backToBroaderText: string;
  aiAnalysisTitle: string;
  analyzePassage: string;
  aiReading: string;
  aiUnavailable: string;
  aiInsightFailed: string;
  deepDiveFailed: string;
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
  saveReaderView: string;
  cancelLabel: string;
  searchRecentHeader: string;
  searchClear: string;
  searchResultsTitle: string;
  searchNoResults: string;
  selectBookAria: string;
  foundMatches: string;
  matchesSuffix: string;
  needTwoTranslations: string;
  compareButtonLabel: string;
  compareReferenceLabel: string;
  compareReferencePlaceholder: string;
  compareLeftTranslation: string;
  compareRightTranslation: string;
  compareSharedTokens: string;
  aiCompareTitle: string;
  aiCompareHint: string;
  runAiCompare: string;
  aiComparingTranslations: string;
  averageSimilarity: string;
  rowsCompared: string;
  mostSimilarVerse: string;
  aiComparing: string;
  originalSetupTitle: string;
  originalSetupHint: string;
  originalAlreadyInstalled: string;
  originalInstallGreek: string;
  originalInstallHebrew: string;
  originalReferenceLabel: string;
  originalReferencePlaceholder: string;
  originalSelectOriginal: string;
  originalSelectTranslations: string;
  originalNeedTranslation: string;
  originalNeedTargets: string;
  originalRunButton: string;
  originalVersesHeading: string;
  compareVerseColumn: string;
  originalAnalysisHeading: string;
  originalStudyTitle: string;
  compareExport: string;
  originalLoading: string;
  originalNoResult: string;
  originalScopeLabel: string;
  originalVerseScope: string;
  originalChapterScope: string;
  originalBookScope: string;
  originalVerseScopeHint: string;
  originalChapterScopeHint: string;
  originalBookScopeHint: string;
  originalSaveToWorkspace: string;
  saveNamePlaceholder: string;
  newScopePlaceholder: string;
  codeCellPlaceholder: string;
  markdownCellPlaceholder: string;
  markdownEditTitle: string;
  markdownEmptyText: string;
  markdownCtrlEnterHint: string;
  noContentText: string;
  runLabel: string;
  runningLabel: string;
  cliOutputPrefix: string;
  freezeLabel: string;
  freezeDisabledTitle: string;
  freezeEnabledTitle: string;
  freezeUpTitle: string;
  freezeDownTitle: string;
  themesSuffix: string;
  noIdentifiedThemes: string;
  // Additional labels
  searchResultsForQuery: string;
  countResultsForSearch: string;
  countVersesForRef: string;
  countMatchSingular: string;
  countMatchPlural: string;
  defaultTranslationLabel: string;
  noResults: string;
  dynamicRefsFor: string;
  noRefsFound: string;
  suggestNoData: string;
  identifiedThemesLabel: string;
  geminiEngine: string;
  geminiPromptLabel: string;
  geminiOutputLabel: string;
  geminiTotalLabel: string;
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
  appendMarkdownCellLabel: string;
  appendCodeCellLabel: string;
  savedLabel: string;
  lastReadVerseLabel: string;
  saveAnalysisWorkspacePrompt: string;
  statTotalTokens: string;
  statUniqueTokens: string;
  statTtr: string;
  statAvgWordLength: string;
  wordFrequencyTitle: string;
  aiToneTitle: string;
  aiToneHint: string;
  analyticsFetchFailed: string;
  toneAnalysisFailed: string;
  createScopeFailed: string;
  deleteScopeFailed: string;
  deleteSearchFailed: string;
  deleteAnalysisFailed: string;
  renameScopeFailed: string;
  renameSearchFailed: string;
  renameAnalysisFailed: string;
  promptRenameScope: string;
  promptRenameSearch: string;
  promptRenameAnalysis: string;
  noNotebooksText: string;
  moveUpTitle: string;
  moveDownTitle: string;
  deleteCellTitle: string;
  registerTitle: string;
  registerSubtitle: string;
  registerButton: string;
  registeringLabel: string;
  loginTitle: string;
  loginSubtitle: string;
  loginButton: string;
  loggingIn: string;
  loginFailedMessage: string;
  registerFailedMessage: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  noAccountPrompt: string;
  alreadyHaveAccountPrompt: string;
  registerLink: string;
  loginLink: string;
  passwordRequirementsTitle: string;
  passwordReqMinLength: string;
  passwordReqUppercase: string;
  passwordReqNumber: string;
  passwordReqSpecial: string;
  passwordReqInvalid: string;
  passwordsDoNotMatch: string;
  cardEmptyNote: string;
  cardClickToAddCells: string;
  cardEmptyBadge: string;
  updatedAtLabel: string;
  backToList: string;
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
  cellWidthFull: string;
  cellWidthHalf: string;
  cellWidthThird: string;
  cellWidthTwoThirds: string;
  cellWidthSelectAria: string;
  cellTypeSelectAria: string;
  dragResizeTitle: string;

  resetNotebookSizes?: string;

  previousChapterLabel: string;
  nextChapterLabel: string;

  // Drag and Drop
  dragHandleTitle: string;
  compareSideBySideTitle: string;
  documentationLabel: string;

  // Language selection
  changeLanguage: string;
}

export const strings: Record<UILanguage, Messages> = {
  en: {
    changeLanguage: 'Change language',
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
    previousChapterLabel: 'Previous chapter',
    nextChapterLabel: 'Next chapter',

    noTranslationSelected: 'No translation selected',
    noTranslationHint: 'Open Translations in the header and install one.',
    installTranslation: 'Install a Translation',
    translationManagementTitle: 'Translation Management',
    activeTranslationsTitle: 'Active Translations',
    availableTranslationsTitle: 'Available Translations',
    removeTranslationLabel: 'Remove',
    noTranslationsAdminHint: 'No translations available. Please contact an administrator.',
    translationActivatedMsg: 'activated successfully!',
    translationDeactivatedMsg: 'deactivated.',
    translationActivationFailed: 'Activation failed. Please try again.',
    translationDeactivationFailed: 'Deactivation failed. Please try again.',
    quickStart: 'Install a translation, then try reading John 3:16 or search for "light" in the text search below.',
    readByReference: 'Read by Reference',
    versePlaceholder: 'John 3:16 · Joh. 3:16 · 1 Moos 1:1',
    fetchButtonLabel: 'Fetch',
    fetchVersesFailed: 'Failed to fetch verses. Check the reference (e.g. John 3:16, Joh. 3:16, 1 Genesis 1:1).',
    noVersesFound: 'No verses found.',
    backToBroaderText: 'Back to broader text',
    aiAnalysisTitle: 'AI Analysis (Gemini)',
    analyzePassage: 'Analyze Passage',
    aiReading: 'AI is reading the passage...',
    aiUnavailable: 'AI not available. Set GEMINI_API_KEY.',
    aiInsightFailed: 'Failed to fetch AI insights.',
    deepDiveFailed: 'Deep dive failed.',

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
    saveReaderView: 'Save this reading view to workspace',
    cancelLabel: 'Cancel',
    searchRecentHeader: 'Recent searches',
    searchClear: 'Clear',

    searchResultsTitle: 'Search Results',
    searchNoResults: 'No verses found for this search.',
    selectBookAria: 'Select book',
    foundMatches: 'Found',
    matchesSuffix: 'matches',
    needTwoTranslations: 'Install at least two translations to use the compare tool.',
    compareButtonLabel: 'Compare translations',
    compareReferenceLabel: 'Verse Reference',
    compareReferencePlaceholder: 'e.g. John 3:16 or Rom 8',
    compareLeftTranslation: 'Left Translation',
    compareRightTranslation: 'Right Translation',
    compareSharedTokens: 'Shared Words (Tokens)',
    aiCompareTitle: 'AI Translation Comparison (Gemini)',
    aiCompareHint: 'Compare linguistic, doctrinal, and theological differences with AI.',
    runAiCompare: 'Run AI Comparison',
    aiComparingTranslations: 'AI is analyzing and comparing translations...',
    averageSimilarity: 'Average similarity',
    rowsCompared: 'Rows compared',
    mostSimilarVerse: 'Most similar verse',
    aiComparing: 'AI is analyzing and comparing translations...',
    originalSetupTitle: 'Install Original Language Packs',
    originalSetupHint: 'To analyze original languages, you need Koine Greek (SBLGNT) or Biblical Hebrew (Aleppo Codex) source packs installed.',
    originalAlreadyInstalled: 'Installed',
    originalInstallGreek: 'Install SBLGNT Koine Greek',
    originalInstallHebrew: 'Install Aleppo Codex Hebrew',
    originalReferenceLabel: 'Bible Reference',
    originalReferencePlaceholder: 'E.g. John 3:16 or Genesis 1:1',
    originalSelectOriginal: 'Select Original Source Text',
    originalSelectTranslations: 'Select Comparative Translations (max 3)',
    originalNeedTranslation: 'Install at least one modern translation from the manager for comparative study.',
    originalNeedTargets: 'Select at least one modern translation to compare.',
    originalRunButton: 'Study Original Language with AI',
    originalVersesHeading: 'Text Alignment Map',
    compareVerseColumn: 'Verse',
    originalAnalysisHeading: 'AI Original Text Analysis',
    originalStudyTitle: 'Original Language & Translation Study',
    compareExport: 'Export Analysis',
    originalLoading: 'AI is analyzing original text and comparing translations...',
    originalNoResult: 'Enter a reference and run study to generate AI-backed insights.',
    originalScopeLabel: 'Study scope',
    originalVerseScope: 'Verse',
    originalChapterScope: 'Chapter',
    originalBookScope: 'Book',
    originalVerseScopeHint: 'Verse scope: a single verse or short range works best (e.g. "John 3:16-17").',
    originalChapterScopeHint: 'Chapter scope: use a reference like "John 3" without a verse number.',
    originalBookScopeHint: 'Book scope: use only a book name (e.g. "ROM", "GEN" or "John").',
    originalSaveToWorkspace: 'Save original language study to workspace',
    saveNamePlaceholder: 'Name for this saved item (e.g. John 3 glossary)...',
    newScopePlaceholder: 'Workspace name...',
    codeCellPlaceholder: '/read Joh 3:16 or /suggest or /refs Joh 3:16',
    markdownCellPlaceholder: 'Write notes here... You can reference verses using [John 3:16] or [Joh. 3:16]',
    markdownEditTitle: 'Double-click to edit',
    markdownEmptyText: 'Empty markdown cell. Double-click to add notes. You can reference verses with [John 3:16]',
    markdownCtrlEnterHint: 'Ctrl+Enter to finish',
    noContentText: '*No content*',
    runLabel: 'Run',
    runningLabel: 'Running...',
    cliOutputPrefix: 'CLI Output —',
    freezeLabel: 'Freeze',
    freezeDisabledTitle: 'Select at least one verse to freeze',
    freezeEnabledTitle: 'Convert selected verses to a Markdown cell',
    freezeUpTitle: 'Freeze to Markdown cell above',
    freezeDownTitle: 'Freeze to Markdown cell below',
    themesSuffix: 'themes',
    noIdentifiedThemes: 'No identified themes from selected cells.',
    searchResultsForQuery: 'Search results for',
    countResultsForSearch: 'Search results for query',
    countVersesForRef: 'Verses for reference',
    countMatchSingular: 'hit',
    countMatchPlural: 'hits',
    defaultTranslationLabel: 'Default translation',
    noResults: 'No results.',
    dynamicRefsFor: 'Dynamic cross-references for',
    noRefsFound: 'No cross-references found (the passage may contain only common words).',
    suggestNoData: 'Write more into Markdown cells first to get theme-specific suggestions.',
    identifiedThemesLabel: 'Identified themes:',
    geminiEngine: 'Gemini Engine',
    geminiPromptLabel: 'Prompt:',
    geminiOutputLabel: 'Output:',
    geminiTotalLabel: 'Total:',
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
    appendMarkdownCellLabel: '+ Add Markdown to end',
    appendCodeCellLabel: '+ Add Command to end',
    savedLabel: 'Saved',
    lastReadVerseLabel: 'Last read verse:',
    saveAnalysisWorkspacePrompt: 'Save this analysis to workspace?',
    statTotalTokens: 'Total Tokens',
    statUniqueTokens: 'Unique Words',
    statTtr: 'Type-Token Ratio (TTR %)',
    statAvgWordLength: 'Avg Word Length (Chars)',
    wordFrequencyTitle: 'Word Frequency',
    aiToneTitle: 'Tone & Style Analysis (Gemini)',
    aiToneHint: 'Analyze linguistic tone, themes, and theological nuance with AI.',
    analyticsFetchFailed: 'Failed to perform text analysis.',
    toneAnalysisFailed: 'Tone analysis failed.',
    // Workspace operation failure messages
    createScopeFailed: 'Workspace creation failed',
    deleteScopeFailed: 'Failed deleting workspace',
    deleteSearchFailed: 'Failed deleting saved search',
    deleteAnalysisFailed: 'Failed deleting analysis',
    renameScopeFailed: 'Failed to rename workspace',
    renameSearchFailed: 'Failed to rename search',
    renameAnalysisFailed: 'Failed to rename analysis',
    promptRenameScope: 'Enter a new name for the workspace:',
    promptRenameSearch: 'Enter a new name for the search:',
    promptRenameAnalysis: 'Enter a new name for the analysis:',
    noNotebooksText: 'No notebooks yet. Create one to get started!',
    moveUpTitle: 'Move up',
    moveDownTitle: 'Move down',
    deleteCellTitle: 'Delete cell',
    registerTitle: 'Create a new account',
    registerSubtitle: 'Sign up to start using Clible Workspace',
    registerButton: 'Register',
    registeringLabel: 'Registering...',
    loginTitle: 'Clible Workspace',
    loginSubtitle: 'Sign in to continue to your workspace',
    loginButton: 'Sign in',
    loggingIn: 'Signing in...',
    loginFailedMessage: 'Login failed. Please check your email and password.',
    registerFailedMessage: 'Registration failed. The email may already be in use.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm Password',
    noAccountPrompt: "Don't have an account?",
    alreadyHaveAccountPrompt: 'Already have an account?',
    registerLink: 'Register here',
    loginLink: 'Sign in',
    passwordRequirementsTitle: 'Password requirements:',
    passwordReqMinLength: 'At least 8 characters',
    passwordReqUppercase: 'At least one uppercase letter (A-Z)',
    passwordReqNumber: 'At least one number (0-9)',
    passwordReqSpecial: 'At least one special character',
    passwordReqInvalid: 'Password does not meet all security requirements.',
    passwordsDoNotMatch: 'Passwords do not match.',
    cardEmptyNote: 'Empty note...',
    cardClickToAddCells: 'Click to open notebook and add cells',
    cardEmptyBadge: 'Empty',
    updatedAtLabel: 'Updated',
    backToList: '← Back to list',
    chartBarTitle: 'Bar chart',
    chartCloudTitle: 'Word cloud',
    nextFocusTitle: 'Next focus',
    deepDiveToneTitle: 'Deep dive',
    deepDiveCompareTitle: 'Deep dive',
    englishLabel: 'English',
    finnishLabel: 'Finnish',
    renameScopeTitle: 'Rename workspace',
    editTitleLabel: 'Click to edit',
    cellWidthFull: 'Full (100%)',
    cellWidthHalf: 'Half (50%)',
    cellWidthThird: 'Third (33%)',
    cellWidthTwoThirds: 'Two Thirds (66%)',
    cellWidthSelectAria: 'Select cell width',
    cellTypeSelectAria: 'Select cell type',
    dragResizeTitle: 'Drag to resize cell width and height',

    // Drag and Drop
    dragHandleTitle: 'Drag to reorder cells',
    resetNotebookSizes: 'Reset sizes',
    compareSideBySideTitle: 'Side-by-side comparison for',
    documentationLabel: 'Docs',
  },
  fi: {
    changeLanguage: 'Vaihda kieli',
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
    previousChapterLabel: 'Edellinen luku',
    nextChapterLabel: 'Seuraava luku',

    noTranslationSelected: 'Ei valittua käännöstä',
    noTranslationHint: 'Avaa ylävalikon Käännökset ja asenna yksi.',
    installTranslation: 'Asenna käännös',
    translationManagementTitle: 'Käännösten hallinta',
    activeTranslationsTitle: 'Käytössä olevat käännökset',
    availableTranslationsTitle: 'Saatavilla olevat käännökset',
    removeTranslationLabel: 'Poista käytöstä',
    noTranslationsAdminHint: 'Ei saatavilla olevia käännöksiä. Ota yhteyttä ylläpitoon.',
    translationActivatedMsg: 'aktivoitu onnistuneesti!',
    translationDeactivatedMsg: 'poistettu käytöstä.',
    translationActivationFailed: 'Aktivointi epäonnistui. Yritä uudelleen.',
    translationDeactivationFailed: 'Käytöstä poisto epäonnistui. Yritä uudelleen.',
    quickStart: 'Asenna käännös, ja kokeile lukea esim. Joh. 3:16 tai hae sanaa "valo" tekstihakutoiminnolla.',
    readByReference: 'Lue viitteellä',
    versePlaceholder: 'Joh. 3:16 · John 3:16 · 1 Moos 1:1',
    fetchButtonLabel: 'Hae',
    fetchVersesFailed: 'Jakeiden haku epäonnistui. Tarkista viite (esim. Joh. 3:16, John 3:16, 1. Moos. 1:1).',
    noVersesFound: 'Ei jakeita löytynyt.',
    backToBroaderText: 'Takaisin laajempaan tekstiin',
    aiAnalysisTitle: 'Tekoäly-analyysi (Gemini)',
    analyzePassage: 'Analysoi tekstiä',
    aiReading: 'Tekoäly opiskelee tekstikohtaa...',
    aiUnavailable: 'Tekoäly ei ole käytettävissä. Aseta GEMINI_API_KEY.',
    aiInsightFailed: 'Tekoälyanalyysin haku epäonnistui.',
    deepDiveFailed: 'Syvällinen tutkimus epäonnistui.',

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
    saveReaderView: 'Tallenna tämä lukunäkymä työtilaan',
    cancelLabel: 'Peruuta',
    searchRecentHeader: 'Viimeisimmät haut',
    searchClear: 'Tyhjennä',

    searchResultsTitle: 'Hakutulokset',
    searchNoResults: 'Hakuun täsmääviä jakeita ei löytynyt.',
    selectBookAria: 'Valitse kirja',
    foundMatches: 'Löytyi',
    matchesSuffix: 'osumaa',
    needTwoTranslations: 'Asenna vähintään kaksi käännöstä vertailutyökalun käyttämiseksi.',
    compareButtonLabel: 'Vertaa käännöksiä',
    compareReferenceLabel: 'Jaeviite',
    compareReferencePlaceholder: 'esim. Joh. 3:16 tai Room. 8',
    compareLeftTranslation: 'Vasen käännös',
    compareRightTranslation: 'Oikea käännös',
    compareSharedTokens: 'Jaetut sanat (Tokens)',
    aiCompareTitle: 'AI-käännösvertailu (Gemini)',
    aiCompareHint: 'Vertaa valittujen käännösten kielellisiä, opillisia ja teologisia painotuseroja tekoälyn avulla.',
    runAiCompare: 'Suorita tekoälyvertailu',
    aiComparingTranslations: 'Tekoäly analysoi ja vertailee käännöksiä...',
    averageSimilarity: 'Keskimääräinen samankaltaisuus',
    rowsCompared: 'Rivejä vertailtu',
    mostSimilarVerse: 'Samankaltaisin jae',
    aiComparing: 'Tekoäly analysoi ja vertailee käännöksiä...',
    originalSetupTitle: 'Asenna alkukieliset käännöspaketit',
    originalSetupHint: 'Alkukielistä vertailua varten tarvitset kreikankielisen (SBLGNT) tai hepreankielisen (Aleppo Codex) lähdetekstin.',
    originalAlreadyInstalled: 'Asennettu',
    originalInstallGreek: 'Asenna SBLGNT Koine Greek',
    originalInstallHebrew: 'Asenna Aleppo Codex Hebrew',
    originalReferenceLabel: 'Raamatunkohta / Viite',
    originalReferencePlaceholder: 'Esim. Johannes 3:16 tai 1. Moos. 1:1',
    originalSelectOriginal: 'Valitse alkukielinen teksti',
    originalSelectTranslations: 'Valitse rinnakkaiset käännökset (maks. 3)',
    originalNeedTranslation: 'Asenna vähintään yksi moderni käännös hallintapaneelista rinnakkaisvertailua varten.',
    originalNeedTargets: 'Valitse vähintään yksi vertailukäännös.',
    originalRunButton: 'Tutki alkukieltä tekoälyllä',
    originalVersesHeading: 'Tekstien rinnakkaisasettelu',
    compareVerseColumn: 'Jae',
    originalAnalysisHeading: 'Tekoälyn alkukielianalyysi',
    originalStudyTitle: 'Alkukielen ja kääntämisen tutkimus',
    compareExport: 'Vie analyysi',
    originalLoading: 'Tekoäly analysoi alkutekstiä ja vertaa käännöksiä...',
    originalNoResult: 'Syötä jaeviite ja käynnistä haku saadaksesi tekoälypohjaisen analyysin.',
    originalScopeLabel: 'Tutkimuksen laajuus',
    originalVerseScope: 'Jae',
    originalChapterScope: 'Luku',
    originalBookScope: 'Kirja',
    originalVerseScopeHint: 'Jaehaku: yksittäinen jae tai jaealue toimii parhaiten (esim. "Joh 3:16-17").',
    originalChapterScopeHint: 'Lukuvertailu: käytä muotoa "Joh 3" tai "John 3" ilman jaenumeroa.',
    originalBookScopeHint: 'Kirjavertailu: käytä pelkkää kirjan nimeä (esim. "ROM", "GEN" tai "Joh").',
    originalSaveToWorkspace: 'Tallenna alkukielitutkimus työtilaan',
    saveNamePlaceholder: 'Nimi tälle tallennukselle (esim. Joh 3 sanasto)...',
    newScopePlaceholder: 'Työtilan nimi...',
    codeCellPlaceholder: '/read Joh 3:16 tai /suggest tai /refs Joh 3:16',
    markdownCellPlaceholder: 'Kirjoita muistiinpanoja tähän... Voit viitata jakeisiin muodolla [Joh. 3:16] tai [John 3:16]',
    markdownEditTitle: 'Kaksoisklikkaa muokataksesi',
    markdownEmptyText: 'Tyhjä markdown-solu. Kaksoisklikkaa lisätäksesi muistiinpanoja. Voit viitata jakeisiin esim. [Joh. 3:16]',
    markdownCtrlEnterHint: 'Ctrl+Enter valmis',
    noContentText: '*Ei sisältöä*',
    runLabel: 'Suorita',
    runningLabel: 'Suoritetaan...',
    cliOutputPrefix: 'CLI Output —',
    freezeLabel: 'Jäädytä',
    freezeDisabledTitle: 'Valitse vähintään yksi jae jäädyttääksesi',
    freezeEnabledTitle: 'Muunna valitut jakeet Markdown-soluksi',
    freezeUpTitle: 'Jäädytä Markdown-soluksi yläpuolelle',
    freezeDownTitle: 'Jäädytä Markdown-soluksi alapuolelle',
    themesSuffix: 'teemaa',
    noIdentifiedThemes: 'Ei tunnistettuja teemoja valituista soluista.',
    searchResultsForQuery: 'Hakutulokset haulle',
    countResultsForSearch: 'Hakutulokset kyselylle',
    countVersesForRef: 'Jakeet viitteelle',
    countMatchSingular: 'osuma',
    countMatchPlural: 'osumaa',
    defaultTranslationLabel: 'Oletuskäännös',
    noResults: 'Ei tuloksia.',
    dynamicRefsFor: 'Dynaamiset ristiinviitteet jakeelle',
    noRefsFound: 'Ei ristiinviitteitä löydetty (jae saattaa sisältää vain yleisiä sanoja).',
    suggestNoData: 'Kirjoita ensin enemmän Markdown-soluihin saadaksesi teemakohtaisia ehdotuksia.',
    identifiedThemesLabel: 'Tunnistetut teemat:',
    geminiEngine: 'Gemini Engine',
    geminiPromptLabel: 'Kehote:',
    geminiOutputLabel: 'Vastaus:',
    geminiTotalLabel: 'Yhteensä:',
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
    appendMarkdownCellLabel: '+ Lisää Markdown loppuun',
    appendCodeCellLabel: '+ Lisää CLI-solu loppuun',
    savedLabel: 'Tallennettu',
    lastReadVerseLabel: 'Viimeksi luettu jae:',
    saveAnalysisWorkspacePrompt: 'Haluatko tallentaa tämän analyysin työtilaan?',
    statTotalTokens: 'Sanoja yhteensä (Tokens)',
    statUniqueTokens: 'Uniikit sanat (Unique)',
    statTtr: 'Tyypin suhde (TTR %)',
    statAvgWordLength: 'Keskipituus (Merkkiä/sana)',
    wordFrequencyTitle: 'Sanatiheys',
    aiToneTitle: 'Sävy- ja tyylianalyysi (Gemini)',
    aiToneHint: 'Analysoi tekstijakson kielellistä sävyä, teemoja ja teologista tyyliä tekoälyn avulla.',
    analyticsFetchFailed: 'Tekstianalyysin suorittaminen epäonnistui.',
    toneAnalysisFailed: 'Sävyanalyysi epäonnistui.',
    // Workspace operation failure messages
    createScopeFailed: 'Työtilan luominen epäonnistui',
    deleteScopeFailed: 'Työtilan poistaminen epäonnistui',
    deleteSearchFailed: 'Haun poistaminen epäonnistui',
    deleteAnalysisFailed: 'Analyysin poistaminen epäonnistui',
    renameScopeFailed: 'Työtilan uudelleennimeäminen epäonnistui',
    renameSearchFailed: 'Haun nimeäminen uudelleen epäonnistui',
    renameAnalysisFailed: 'Analyysin nimeäminen uudelleen epäonnistui',
    promptRenameScope: 'Anna työtilalle uusi nimi:',
    promptRenameSearch: 'Anna haulle uusi nimi:',
    promptRenameAnalysis: 'Anna analyysille uusi nimi:',
    noNotebooksText: 'Ei vielä muistikirjoja. Luo uusi aloittaaksesi!',
    moveUpTitle: 'Siirrä ylös',
    moveDownTitle: 'Siirrä alas',
    deleteCellTitle: 'Poista solu',
    registerTitle: 'Luo uusi tili',
    registerSubtitle: 'Rekisteröidy käyttääksesi Clible Workspacea',
    registerButton: 'Rekisteröidy',
    registeringLabel: 'Rekisteröidytään...',
    loginTitle: 'Clible Workspace',
    loginSubtitle: 'Kirjaudu sisään jatkaaksesi työtilaasi',
    loginButton: 'Kirjaudu sisään',
    loggingIn: 'Kirjaudutaan...',
    loginFailedMessage: 'Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.',
    registerFailedMessage: 'Rekisteröityminen epäonnistui. Sähköposti saattaa olla jo käytössä.',
    emailLabel: 'Sähköposti',
    passwordLabel: 'Salasana',
    confirmPasswordLabel: 'Vahvista salasana',
    noAccountPrompt: 'Eikö sinulla ole tiliä?',
    alreadyHaveAccountPrompt: 'Onko sinulla jo tili?',
    registerLink: 'Rekisteröidy tästä',
    loginLink: 'Kirjaudu sisään',
    passwordRequirementsTitle: 'Salasanan vaatimukset:',
    passwordReqMinLength: 'Vähintään 8 merkkiä',
    passwordReqUppercase: 'Vähintään yksi iso kirjain (A-Z)',
    passwordReqNumber: 'Vähintään yksi numero (0-9)',
    passwordReqSpecial: 'Vähintään yksi erikoismerkki',
    passwordReqInvalid: 'Salasana ei täytä kaikkia turvavaatimuksia.',
    passwordsDoNotMatch: 'Salasanat eivät täsmää.',
    cardEmptyNote: 'Tyhjä muistiinpano...',
    cardClickToAddCells: 'Klikkaa avataksesi muistikirjan ja lisätäksesi soluja',
    cardEmptyBadge: 'Tyhjä',
    updatedAtLabel: 'Päivitetty',
    backToList: '← Takaisin listaukseen',
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
    cellWidthFull: 'Täysi (100%)',
    cellWidthHalf: 'Puolikas (50%)',
    cellWidthThird: 'Kolmannes (33%)',
    cellWidthTwoThirds: 'Kaksi kolmannesta (66%)',
    cellWidthSelectAria: 'Valitse solun leveys',
    cellTypeSelectAria: 'Valitse solun tyyppi',
    dragResizeTitle: 'Vedä muuttaaksesi solun leveyttä ja korkeutta',

    // Drag and Drop
    dragHandleTitle: 'Vedä solua uudelleen järjestämiseksi',
    resetNotebookSizes: 'Palauta koot',
    compareSideBySideTitle: 'Rinnakkaisvertailu viitteelle',
    documentationLabel: 'Dokumentaatio',
  }

};

/**
 * Returns the dictionary of translation strings for the given language.
 */
export function t(lang: UILanguage): Messages {
  return strings[lang];
}
