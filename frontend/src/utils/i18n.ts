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
  tabSearch: string;
  searchHubTitle: string;
  searchHubSubtitle: string;
  searchModeLexical: string;
  searchModeSemantic: string; 
  readByReference: string;
  versePlaceholder: string;
  fetchButtonLabel: string;
  fetchVersesFailed: string;
  noVersesFound: string;
  backToBroaderText: string;
  aiAnalysisTitle: string;
  aiUsageTitle: string;
  aiTokensTotal: string;
  aiTokensPrompt: string;
  aiTokensCandidates: string;
  aiTokensCalls: string;
  aiTokensCached: string;
  aiUsageGuest: string;
  aiUsageUsers: string;
  aiUsageGlobal: string;
  aiUsageLoading: string;
  aiUsageByFeature: string;
  aiUsageClose: string;
  aiUsageRefresh: string;
  aiUsageDays30: string;
  aiUsageDays7: string;
  aiUsageDays90: string;
  userSettingsTitle: string;
  userAccountVerified: string;
  userAccountFree: string;
  userAccountGuest: string;
  userMenuAria: string;
  userMenuLanguage: string;
  userMenuTheme: string;
  userMenuDocumentation: string;
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
  countUnitVersesSingular: string;
  countUnitVersesPlural: string;
  countUnitChaptersSingular: string;
  countUnitChaptersPlural: string;
  countUnitBooksSingular: string;
  countUnitBooksPlural: string;
  countUnitWordsSingular: string;
  countUnitWordsPlural: string;
  countUnitUniqueWordsSingular: string;
  countUnitUniqueWordsPlural: string;
  countResultsForContext: string;
  statsTitle: string;
  ttrLabel: string;
  ttrExplanation: string;
  uniqueWordsLabel: string;
  totalWordsLabel: string;
  avgWordLengthLabel: string;
  characterCountLabel: string;
  topWordsTitle: string;
  frequencyLabel: string;
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
  islaOutputAbove: string;
  islaOutputBelow: string;
  islaOutputInline: string;
  islaRouteToNewCell: string;
  islaOutputRoutedNotice: string;
  islaEditorPlaceholder: string;
  islaExecuteAriaLabel: string;
  islaAutocompleteLabel: string;
  islaHoverExample: string;
  islaKeyNavigate: string;
  islaKeySelect: string;
  islaKeyClose: string;
  islaModeLabel: string;
  markdownModeLabel: string;
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
  termsNotice: string;
  termsAndPrivacy: string;
  registerFastBadge: string;
  cardEmptyNote: string;
  cardClickToAddCells: string;
  cardEmptyBadge: string;
  cardMoreCells: string;
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
  renameButtonTitle: string;
  deleteButtonTitle: string;
  savedSearchesTitle: string;
  noSavedSearches: string;
  savedAnalysesTitle: string;
  noSavedAnalyses: string;
  loadingNotebook: string;
  errorHeading: string;
  retryButtonLabel: string;
  unnamedNotebook: string;
  cellWidthFull: string;
  cellWidthHalf: string;
  cellWidthThird: string;
  cellWidthTwoThirds: string;
  cellWidthSelectAria: string;
  cellTypeSelectAria: string;
  dragResizeTitle: string;
  notebookDefaultTitle: string;
  resetNotebookSizes: string;

  previousChapterLabel: string;
  nextChapterLabel: string;

  // Drag and Drop
  dragHandleTitle: string;
  compareSideBySideTitle: string;
  documentationLabel: string;

  // Guest Mode & Email Verification
  workspacesTitle: string;
  guestMode: string;
  guestQuickSignup: string;
  continueAsGuest: string;
  guestWorkspaceNotice: string;
  guestAiNotice: string;
  verifyEmailTitle: string;
  verifyEmailSubtitle: string;
  verificationSuccess: string;
  enterVerificationCode: string;
  verifyingLabel: string;
  verifyButton: string;
  resendCodeLabel: string;
  resendCodeCooldown: string;
  themeLightAria: string;
  themeDarkAria: string;
  packageInstalledMsg: string;
  errOriginalTextNotFound: string;
  notebookTitleDefault: string;



  // Language selection
  changeLanguage: string;

  // Guest Ephemeral Notebooks (1h TTL)
  guestNotebookBannerTitle: string;
  guestNotebookBannerDesc: string;
  guestNotebookExpiresIn: string;
  guestNotebookExpiredNotice: string;
  guestNotebookSignUpCta: string;

  // AI Semantic Search
  semanticSearchPlaceholder: string;
  semanticSearchExamplesLabel: string;
  semanticSearchBtn: string;
  semanticSearching: string;
  semanticResolvedPassageTitle: string;
  semanticOpenInReader: string;
  semanticPlanTitle: string;
  semanticSummaryTitle: string;
  semanticHitsTitle: string;
  semanticNoHitsFound: string;
  semanticNoHitsHint: string;
  semanticSearchError: string;
  saveSemanticSearch: string;
  saveSemanticSearchTitle: string;
  saveSemanticSearchPlaceholder: string;
  saveSemanticSearchSuccess: string;
  saveSemanticSearchButton: string;
  savingSemanticSearch: string;

  // User Settings & Profile
  settingsSubtitle: string;
  profileSectionTitle: string;
  profileSectionDesc: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  emailAddressLabel: string;
  accountStatusLabel: string;
  statusVerified: string;
  statusUnverified: string;
  preferencesSectionTitle: string;
  preferencesSectionDesc: string;
  defaultTranslationDesc: string;
  uiLanguageLabel: string;
  themeLabel: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  securitySectionTitle: string;
  securitySectionDesc: string;
  currentPasswordLabel: string;
  newPasswordLabel: string;
  newPasswordHint: string;
  saveSettingsButton: string;
  saveSettingsSuccess: string;
  changePasswordButton: string;
  changePasswordSuccess: string;
  errCurrentPasswordWrong: string;
  errPasswordMismatch: string;
  guestSettingsPrompt: string;
  createAccountButton: string;
  saving: string;
  returnToApp: string;
  avatarSectionTitle: string;
  avatarSectionDesc: string;
  avatarInitialsLabel: string;
  changeAvatarLabel: string;
  decreaseFontSize: string;
  increaseFontSize: string;
}


export const strings: Record<UILanguage, Messages> = {
  en: {
    themeLightAria: 'Switch to light theme',
    themeDarkAria: 'Switch to dark theme',
    packageInstalledMsg: 'Package {id} installed successfully.',
    errOriginalTextNotFound: 'Original text not found for this reference.',
    changeLanguage: 'Change language',
    // App / Shell
        chooseTranslation: 'Choose translation',
        translationsLabel: 'Translations',
        hideLabel: 'Hide',
        settingsTitle: 'User Settings & Profile',
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

    // SearchHub
    tabSearch: 'Search',
    searchHubTitle: 'Bible Search Hub',
    searchHubSubtitle: 'Search biblical scriptures by keyword, regex, or conceptual themes.',
    searchModeLexical: 'Text & Regex Search',
    searchModeSemantic: 'Semantic AI Search',
    searchNoResults: 'No results found.', 

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
    aiUsageTitle: 'AI Token Usage',
    aiTokensTotal: 'Total Tokens',
    aiTokensPrompt: 'Prompt Tokens',
    aiTokensCandidates: 'Candidate Tokens',
    aiTokensCalls: 'API Calls',
    aiTokensCached: 'Cached Tokens',
    aiUsageGuest: 'Guest Users',
    aiUsageUsers: 'Authenticated Users',
    aiUsageGlobal: 'Global System',
    aiUsageLoading: 'Loading usage statistics...',
    aiUsageByFeature: 'Usage by Feature',
    aiUsageClose: 'Close',
    aiUsageRefresh: 'Refresh',
    aiUsageDays30: 'Past 30 days',
    aiUsageDays7: 'Past 7 days',
    aiUsageDays90: 'Past 90 days',
    userSettingsTitle: 'User Settings',
    userAccountVerified: 'Verified Account',
    userAccountFree: 'Free Account',
    userAccountGuest: 'Guest Explorer',
    userMenuAria: 'User Account Menu',
    userMenuLanguage: 'Language',
    userMenuTheme: 'Theme',
    userMenuDocumentation: 'Documentation',
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
    notebookDefaultTitle: 'New notebook',
    searchResultsTitle: 'Search Results',
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
    originalSetupHint: 'To analyze original languages, you need Koine Greek (SBLGNT) or Biblical Hebrew (Leningrad Codex) source packs installed.',
    originalAlreadyInstalled: 'Installed',
    originalInstallGreek: 'Install SBLGNT Koine Greek',
    originalInstallHebrew: 'Install Leningrad Codex Hebrew',
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
    countUnitVersesSingular: 'verse',
    countUnitVersesPlural: 'verses',
    countUnitChaptersSingular: 'chapter',
    countUnitChaptersPlural: 'chapters',
    countUnitBooksSingular: 'book',
    countUnitBooksPlural: 'books',
    countUnitWordsSingular: 'word',
    countUnitWordsPlural: 'words',
    countUnitUniqueWordsSingular: 'unique word',
    countUnitUniqueWordsPlural: 'unique words',
    countResultsForContext: 'From note context',
    statsTitle: 'Text Statistics',
    ttrLabel: 'Type-Token Ratio (TTR)',
    ttrExplanation: 'Lexical diversity ratio of unique words to total words',
    uniqueWordsLabel: 'Unique words',
    totalWordsLabel: 'Total words',
    avgWordLengthLabel: 'Avg. word length',
    characterCountLabel: 'Characters',
    topWordsTitle: 'Word Frequencies',
    frequencyLabel: 'occurrences',
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
    renameButtonTitle: 'Rename',
    deleteButtonTitle: 'Delete',
    savedSearchesTitle: 'Saved Searches',
    noSavedSearches: 'No saved searches.',
    savedAnalysesTitle: 'Saved Analyses',
    noSavedAnalyses: 'No saved analyses.',
    loadingNotebook: 'Loading notebook...',
    errorHeading: 'Oops! Something went wrong',
    retryButtonLabel: 'Try again',
    unnamedNotebook: 'Untitled notebook',
    exactMatchesLabel: 'Exact Matches',
    verseLabel: 'Verse',
    similarityLabel: 'Sim',
    markdownOptionLabel: 'Markdown',
    codeOptionLabel: 'Markdown',
    emptyNotebookText: 'This notebook has no cells yet.',
    addMarkdownCellLabel: '+ Add cell',
    addCodeCellLabel: '+ Add cell',
    islaOutputAbove: 'Cell above',
    islaOutputBelow: 'Cell below',
    islaOutputInline: 'This cell',
    islaRouteToNewCell: 'Create cell',
    islaOutputRoutedNotice: 'Result routed to a new cell',
    islaEditorPlaceholder: 'Type an ISLA command… (e.g. ! @Joh 3:16 =>)',
    islaExecuteAriaLabel: 'Execute ISLA command',
    islaAutocompleteLabel: 'ISLA autocomplete suggestions',
    islaHoverExample: 'e.g.',
    islaKeyNavigate: 'navigate',
    islaKeySelect: 'select',
    islaKeyClose: 'close',
    islaModeLabel: 'ISLA DSL',
    markdownModeLabel: 'Markdown',
    appendMarkdownCellLabel: '+ Add cell to end',
    appendCodeCellLabel: '+ Add cell to end',
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
    termsNotice: 'By creating an account, you agree to the',
    termsAndPrivacy: 'Terms of Service & Privacy Policy',
    registerFastBadge: 'Create a free account',
    cardEmptyNote: 'Empty note...',
    cardClickToAddCells: 'Click to open notebook and add cells',
    cardEmptyBadge: 'Empty',
    cardMoreCells: 'more cells...',
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

    // Guest Mode & Email Verification
    workspacesTitle: 'Workspaces',
    guestMode: 'Guest Mode',
    guestQuickSignup: 'Create account',
    continueAsGuest: 'Continue as guest',
    guestWorkspaceNotice: 'Cloud synchronization for workspaces and notebooks requires a free account.',
    guestAiNotice: 'Gemini AI deep dives require a free account.',
    verifyEmailTitle: 'Verify your email address',
    verifyEmailSubtitle: 'We sent a 6-digit verification code to',
    verificationSuccess: 'Email verified successfully!',
    enterVerificationCode: 'Enter 6-digit code',
    verifyingLabel: 'Verifying...',
    verifyButton: 'Verify Account',
    resendCodeLabel: 'Resend new code',
    resendCodeCooldown: 'You can request a new code in {seconds}s',
    notebookTitleDefault: 'New Notebook',

      // Guest Ephemeral Notebooks (1h TTL)
    guestNotebookBannerTitle: 'Temporary Guest Mode (1h)',
    guestNotebookBannerDesc: 'Your notebooks are stored in this browser for 1 hour. Create a free account to save them permanently to the cloud.',
    guestNotebookExpiresIn: 'Time remaining: {time}',
    guestNotebookExpiredNotice: 'The 1-hour guest notebook session has expired and temporary notebooks were reset.',
    guestNotebookSignUpCta: 'Create account',

    // AI Semantic Search
    semanticSearchPlaceholder: 'Ask or describe a topic in your own words...',
    semanticSearchExamplesLabel: 'Try queries:',
    semanticSearchBtn: 'Search with AI',
    semanticSearching: 'AI is analyzing theology & searching...',
    semanticResolvedPassageTitle: 'Identified Scripture Passage',
    semanticOpenInReader: 'Open in Reader',
    semanticPlanTitle: 'Search Strategy & Parameters',
    semanticSummaryTitle: 'Theological Synthesis',
    semanticHitsTitle: 'Discovered Verses',
    semanticNoHitsFound: 'No matching verses found for this semantic query in the selected translation.',
    semanticNoHitsHint: 'Tip: Try selecting another translation or rephrase using broader keywords.',
    semanticSearchError: 'Semantic search failed. Ensure backend has GEMINI_API_KEY set.',
    saveSemanticSearch: 'Save search to workspace',
    saveSemanticSearchTitle: 'Name this search',
    saveSemanticSearchPlaceholder: 'E.g. Jesus calms the storm...',
    saveSemanticSearchSuccess: 'Semantic search saved to workspace!',
    saveSemanticSearchButton: 'Save',
    savingSemanticSearch: 'Saving...',

    // User Settings & Profile
    settingsSubtitle: 'Manage your account details, reading preferences, and security.',
    profileSectionTitle: 'Profile Details',
    profileSectionDesc: 'Your name appears in the workspace and monogram.',
    displayNameLabel: 'Display Name',
    displayNamePlaceholder: 'E.g. Jane Doe',
    emailAddressLabel: 'Email Address',
    accountStatusLabel: 'Account Status',
    statusVerified: 'Verified Account',
    statusUnverified: 'Unverified (check your email)',
    preferencesSectionTitle: 'Reading Preferences & Appearance',
    preferencesSectionDesc: 'Configure your default Bible translation and application theme.',
    defaultTranslationDesc: 'Opened automatically in the reader view.',
    uiLanguageLabel: 'Interface Language',
    themeLabel: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    securitySectionTitle: 'Security & Password',
    securitySectionDesc: 'Change your account password.',
    currentPasswordLabel: 'Current Password',
    newPasswordLabel: 'New Password',
    newPasswordHint: 'At least 8 characters, uppercase letter, number, and special character.',
    saveSettingsButton: 'Save Settings',
    saveSettingsSuccess: 'Settings saved successfully!',
    changePasswordButton: 'Update Password',
    changePasswordSuccess: 'Password updated successfully!',
    errCurrentPasswordWrong: 'Current password is incorrect.',
    errPasswordMismatch: 'Passwords do not match or do not meet requirements.',
    guestSettingsPrompt: 'You are in guest mode. Create a free account to save your preferences to the cloud!',
    createAccountButton: 'Create Account',
    saving: 'Saving...',
    returnToApp: 'Back to workspace',
    avatarSectionTitle: 'Avatar & Symbol',
    avatarSectionDesc: 'Choose how you appear: your initials or a thematic biblical symbol.',
    avatarInitialsLabel: 'Initials',
    changeAvatarLabel: 'Change avatar',
    decreaseFontSize: 'Decrease font size',
    increaseFontSize: 'Increase font size'
  },
  fi: {
    changeLanguage: 'Vaihda kieli',
    // App / Shell
    chooseTranslation: 'Valitse käännös',
    translationsLabel: 'Käännökset',
    hideLabel: 'Piilota',
    settingsTitle: 'Käyttäjäasetukset ja profiili',
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

    // SearchHub
    tabSearch: 'Haku',
    searchHubTitle: 'Raamatun hakukeskus',
    searchHubSubtitle: 'Hae Raamatun tekstejä sanahaulla, säännöllisillä lausekkeilla tai teemallisesti.',
    searchModeLexical: 'Perinteinen tekstihaku',
    searchModeSemantic: 'Semanttinen AI-haku',

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
    aiUsageTitle: 'Tekoälyn token-kulutus',
    aiTokensTotal: 'Tokeneita yhteensä',
    aiTokensPrompt: 'Kehotetokent',
    aiTokensCandidates: 'Vastaustokenit',
    aiTokensCalls: 'Kutsukertoja',
    aiTokensCached: 'Välimuistissa',
    aiUsageGuest: 'Vieraskäyttäjät',
    aiUsageUsers: 'Kirjautuneet käyttäjät',
    aiUsageGlobal: 'Koko järjestelmä',
    aiUsageLoading: 'Ladataan käyttötilastoja...',
    aiUsageByFeature: 'Kulutus toiminnoittain',
    aiUsageClose: 'Sulje',
    aiUsageRefresh: 'Päivitä',
    aiUsageDays30: 'Viimeiset 30 päivää',
    aiUsageDays7: 'Viimeiset 7 päivää',
    aiUsageDays90: 'Viimeiset 90 päivää',
    userSettingsTitle: 'Käyttäjäasetukset',
    userAccountVerified: 'Vahvistettu tili',
    userAccountFree: 'Ilmainen tili',
    userAccountGuest: 'Vierailija',
    userMenuAria: 'Käyttäjävalikko',
    userMenuLanguage: 'Kieli',
    userMenuTheme: 'Teema',
    userMenuDocumentation: 'Dokumentaatio',
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
    originalSetupHint: 'Alkukielistä vertailua varten tarvitset kreikankielisen (SBLGNT) tai hepreankielisen (Leningrad Codex) lähdetekstin.',
    originalAlreadyInstalled: 'Asennettu',
    originalInstallGreek: 'Asenna SBLGNT Koine Greek',
    originalInstallHebrew: 'Asenna Leningrad Codex Hebrew',
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
    notebookDefaultTitle: 'Uusi muistikirja',
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
    countUnitVersesSingular: 'jae',
    countUnitVersesPlural: 'jaetta',
    countUnitChaptersSingular: 'luku',
    countUnitChaptersPlural: 'lukua',
    countUnitBooksSingular: 'kirja',
    countUnitBooksPlural: 'kirjaa',
    countUnitWordsSingular: 'sana',
    countUnitWordsPlural: 'sanaa',
    countUnitUniqueWordsSingular: 'uniikki sana',
    countUnitUniqueWordsPlural: 'uniikkia sanaa',
    countResultsForContext: 'Muistiinpanon kontekstista',
    statsTitle: 'Tekstitilastot',
    ttrLabel: 'Sanaston rikkaus (TTR)',
    ttrExplanation: 'Uniikkien sanojen osuus kaikista sanoista (Type-Token Ratio)',
    uniqueWordsLabel: 'Uniikkeja sanoja',
    totalWordsLabel: 'Sanoja yhteensä',
    avgWordLengthLabel: 'Sanan keskipituus',
    characterCountLabel: 'Merkkejä',
    topWordsTitle: 'Sanatiheydet',
    frequencyLabel: 'esiintymää',
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
    codeOptionLabel: 'Markdown',
    emptyNotebookText: 'Tässä muistikirjassa ei ole vielä soluja.',
    addMarkdownCellLabel: '+ Lisää solu',
    addCodeCellLabel: '+ Lisää solu',
    islaOutputAbove: 'Yläpuolelle',
    islaOutputBelow: 'Alapuolelle',
    islaOutputInline: 'Tähän soluun',
    islaRouteToNewCell: 'Luo solu',
    islaOutputRoutedNotice: 'Tulos reititetty uuteen soluun',
    islaEditorPlaceholder: 'Kirjoita ISLA-komento... (esim. ! @Joh 3:16 =>)',
    islaExecuteAriaLabel: 'Suorita ISLA-komento',
    islaAutocompleteLabel: 'ISLA-täydennykset',
    islaHoverExample: 'esim.',
    islaKeyNavigate: 'navigoi',
    islaKeySelect: 'valitse',
    islaKeyClose: 'sulje',
    islaModeLabel: 'ISLA DSL',
    markdownModeLabel: 'Markdown',
    appendMarkdownCellLabel: '+ Lisää solu loppuun',
    appendCodeCellLabel: '+ Lisää solu loppuun',
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
    termsNotice: 'Luomalla tilin hyväksyt',
    termsAndPrivacy: 'käyttöehdot ja tietosuojaselosteen',
    registerFastBadge: 'Luo ilmainen tili',
    cardEmptyNote: 'Tyhjä muistiinpano...',
    cardClickToAddCells: 'Klikkaa avataksesi muistikirjan ja lisätäksesi soluja',
    cardEmptyBadge: 'Tyhjä',
    cardMoreCells: 'muuta solua...',
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

    // Guest Mode & Email Verification
    workspacesTitle: 'Työtilat',
    guestMode: 'Vierastila',
    guestQuickSignup: 'Luo tili',
    continueAsGuest: 'Jatka vierailijana',
    guestWorkspaceNotice: 'Työtilojen ja muistiinpanojen pilvitallennus vaatii maksuttoman käyttäjätilin.',
    guestAiNotice: 'Gemini AI -syventävät analyysit vaativat maksuttoman tilin.',
    verifyEmailTitle: 'Vahvista sähköpostiosoitteesi',
    verifyEmailSubtitle: 'Lähetimme 6-numeroisen vahvistuskoodin osoitteeseen',
    verificationSuccess: 'Sähköposti vahvistettu onnistuneesti!',
    enterVerificationCode: 'Syötä 6-numeroinen koodi',
    verifyingLabel: 'Vahvistetaan...',
    verifyButton: 'Vahvista tili',
    resendCodeLabel: 'Lähetä uusi koodi',
    resendCodeCooldown: 'Voit pyytää uuden koodin {seconds}s kuluttua',
    themeLightAria: 'Käytä vaaleaa tilaa',
    themeDarkAria: 'Käytä pimeää tilaa',
    packageInstalledMsg: 'Paketti {id} asennettiin onnistuneesti.',
    errOriginalTextNotFound: 'Alkutekstiä ei löytynyt tälle viitteelle.',
    notebookTitleDefault: 'Uusi muistikirja',

    // Guest Ephemeral Notebooks (1h TTL)
    guestNotebookBannerTitle: 'Väliaikainen vierastila (1 h)',
    guestNotebookBannerDesc: 'Muistikirjasi säilyvät tässä selaimessa 1 tunnin ajan. Luo ilmainen tili tallentaaksesi ne pysyvästi pilveen.',
    guestNotebookExpiresIn: 'Aikaa jäljellä: {time}',
    guestNotebookExpiredNotice: 'Vierastilan 1 tunnin aikaraja on umpeutunut ja väliaikaiset muistikirjat on nollattu.',
    guestNotebookSignUpCta: 'Luo ilmainen tili',

    // AI Semantic Search
    semanticSearchPlaceholder: 'Kysy tai kuvaile aihetta omin sanoin...',
    semanticSearchExamplesLabel: 'Kokeile hakuja:',
    semanticSearchBtn: 'Hae tekoälyllä',
    semanticSearching: 'Tekoäly tulkitsee teemaa ja hakee jakeita...',
    semanticResolvedPassageTitle: 'Tulkittu raamatunkohta',
    semanticOpenInReader: 'Avaa lukunäkymässä',
    semanticPlanTitle: 'Hakusuunnitelma ja rajaus',
    semanticSummaryTitle: 'Teologinen yhteenveto',
    semanticHitsTitle: 'Löydetyt jakeet',
    semanticNoHitsFound: 'Valitusta käännöksestä ei löytynyt vastaavia jakeita.',
    semanticNoHitsHint: 'Vinkki: Kokeile toista käännöstä tai muotoile hakua yleisemmillä sanoilla.',
    semanticSearchError: 'Semanttinen haku epäonnistui. Varmista, että GEMINI_API_KEY on asetettu palvelimelle.',
    saveSemanticSearch: 'Tallenna haku työtilaan',
    saveSemanticSearchTitle: 'Anna haulle nimi',
    saveSemanticSearchPlaceholder: 'Esim. Jeesus tyynnyttää myrskyn...',
    saveSemanticSearchSuccess: 'Semanttinen haku tallennettu työtilaan!',
    saveSemanticSearchButton: 'Tallenna',
    savingSemanticSearch: 'Tallennetaan...',

    // Käyttäjäasetukset ja profiili
    settingsSubtitle: 'Hallitse tilitietojasi, lukupreferenssejäsi ja turvallisuutta.',
    profileSectionTitle: 'Profiilitiedot',
    profileSectionDesc: 'Nimesi näkyy työtilassa ja monogrammissa.',
    displayNameLabel: 'Näyttönimi',
    displayNamePlaceholder: 'Esim. Maria Meikäläinen',
    emailAddressLabel: 'Sähköpostiosoite',
    accountStatusLabel: 'Tilin tila',
    statusVerified: 'Vahvistettu tili',
    statusUnverified: 'Vahvistamaton (tarkista sähköposti)',
    preferencesSectionTitle: 'Lukupreferenssit ja ulkoasu',
    preferencesSectionDesc: 'Määritä oletusraamattu ja sovelluksen teema.',
    defaultTranslationDesc: 'Avataan automaattisesti lukunäkymässä.',
    uiLanguageLabel: 'Käyttöliittymän kieli',
    themeLabel: 'Ulkoasuteema',
    themeSystem: 'Järjestelmä',
    themeLight: 'Vaalea',
    themeDark: 'Tumma',
    securitySectionTitle: 'Turvallisuus ja salasana',
    securitySectionDesc: 'Vaihda tilisi salasana.',
    currentPasswordLabel: 'Nykyinen salasana',
    newPasswordLabel: 'Uusi salasana',
    newPasswordHint: 'Vähintään 8 merkkiä, iso kirjain, numero ja erikoismerkki.',
    saveSettingsButton: 'Tallenna asetukset',
    saveSettingsSuccess: 'Asetukset tallennettu onnistuneesti!',
    changePasswordButton: 'Päivitä salasana',
    changePasswordSuccess: 'Salasana vaihdettu onnistuneesti!',
    errCurrentPasswordWrong: 'Nykyinen salasana on virheellinen.',
    errPasswordMismatch: 'Salasanat eivät täsmää tai eivät täytä vaatimuksia.',
    guestSettingsPrompt: 'Olet vierastilassa. Luo ilmainen tili tallentaaksesi preferenssisi pilveen!',
    createAccountButton: 'Luo tili',
    saving: 'Tallennetaan...',
    returnToApp: 'Takaisin työtilaan',
    avatarSectionTitle: 'Avatar ja tunnuskuvake',
    avatarSectionDesc: 'Valitse miten näyt työtilassa: nimikirjaimina tai teemakuvakkeena.',
    avatarInitialsLabel: 'Nimikirjaimet',
    changeAvatarLabel: 'Vaihda avatar',
    decreaseFontSize: 'Pienennä tekstikokoa',
    increaseFontSize: 'Suurenna tekstikokoa'
  }

};

/**
 * Returns the dictionary of translation strings for the given language.
 */
export function t(lang: UILanguage): Messages {
  return strings[lang];
}
