import type {
  BubbleSchemeId,
  Language,
  ThemeId,
} from '../types/chat';

export interface UIStrings {
  appTitle: string;
  skipIntro: string;
  grandIntroSkipHint: string;
  grandIntroMuteAudio: string;
  grandIntroUnmuteAudio: string;
  replayGrandIntroLabel: string;
  replayGrandIntroHint: string;
  replayGrandIntroButton: string;
  gallerySubtitle: (count: number) => string;
  newButton: string;
  searchPlaceholder: string;
  allTag: string;
  activeScene: string;
  msgSingular: string;
  msgPlural: string;
  noMatchingTitle: string;
  noMatchingSubtitle: string;
  ollamaThemeSettings: string;
  selectModelInSettings: string;
  expandGallery: string;
  returnSplitView: string;
  closeGallery: string;
  openGallery: string;
  showGallery: string;
  hideGallery: string;
  noModelSelected: string;
  hideBubbles: string;
  showBubbles: string;
  editCharacterTooltip: string;
  resetChatTooltip: string;
  resetButton: string;
  settingsButton: string;
  openSettings: string;
  dismiss: string;
  thinking: string;
  replyPlaceholder: (name: string) => string;
  listeningPlaceholder: string;
  micStart: string;
  micStop: string;
  micUnsupported: string;
  micPermissionDenied: string;
  micNoDevice: string;
  micBusy: string;
  micErrorReason: (code: string, detail?: string) => string;
  micOfflineFallback: string;
  micNoRecognizer: string;
  micGenericError: string;
  regenerateResponse: string;
  continueResponse: string;
  previousSwipe: string;
  nextSwipe: string;
  deleteMessage: string;
  editMessage: string;
  saveAndRegenerate: string;
  sendMessage: string;
  stopGenerating: string;
  composerHint: (url: string) => string;
  charCounter: (count: number, max: number) => string;
  installApp: string;
  installShort: string;
  installIOSTitle: string;
  installIOSStep1: string;
  installIOSStep2: string;
  gotIt: string;
  offlineMessage: string;
  settingsTitle: string;
  settingsSubtitle: string;
  languageLabel: string;
  englishLabel: string;
  spanishLabel: string;
  darkPaletteLabel: string;
  bubbleSchemeLabel: string;
  tabConnectionModel: string;
  tabVisualStudio: string;
  tabDataBackup: string;
  visualPreviewTitle: string;
  visualPreviewAssistantMsg: string;
  visualPreviewUserMsg: string;
  fontFamilyLabel: string;
  fontSansLabel: string;
  fontSerifLabel: string;
  fontMonoLabel: string;
  textSizeLabel: string;
  textSizeSmall: string;
  textSizeNormal: string;
  textSizeLarge: string;
  textSizeExtraLarge: string;
  customColorsLabel: string;
  resetToThemeDefault: string;
  userBubbleColorLabel: string;
  dialogueColorLabel: string;
  actionColorLabel: string;
  glassOpacityLabel: string;
  glassOpacitySheer: string;
  glassOpacityBalanced: string;
  glassOpacitySolid: string;
  providerLabel: string;
  providerOllamaLabel: string;
  providerOpenAILabel: string;
  openaiPresetsLabel: string;
  openaiPresetCustom: string;
  ollamaUrlLabel: string;
  openaiBaseUrlLabel: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyHint: string;
  apiKeyHintElectron: string;
  apiKeyHintBrowser: string;
  apiKeyShow: string;
  apiKeyHide: string;
  invalidUrlProtocolError: string;
  fetchModels: string;
  fetchingModels: string;
  ollamaCorsHint: string;
  openaiBaseUrlHint: string;
  activeModelLabel: string;
  noModelsLoadedOption: string;
  customModelOptionSuffix: string;
  manualModelLabel: string;
  manualModelPlaceholder: string;
  openaiManualModelPlaceholder: string;
  temperatureLabel: string;
  tempFocused: string;
  tempBalanced: string;
  tempExpressive: string;
  responseLengthLabel: string;
  responseLengthValue: (tokens: number) => string;
  responseLengthConcise: string;
  responseLengthBalanced: string;
  responseLengthDetailed: string;
  diagnosticsTitle: string;
  diagnosticsRerun: string;
  diagnosticsRunning: string;
  diagOllamaLabel: string;
  diagApiLabel: string;
  diagOllamaChecking: string;
  diagOllamaConnected: (count: number) => string;
  diagOllamaEmpty: string;
  diagOllamaFailed: string;
  diagApiFailed: string;
  diagSecureContextLabel: string;
  diagSecureContextPass: (origin: string) => string;
  diagSecureContextFail: (origin: string) => string;
  diagSpeechLabel: string;
  diagSpeechPass: string;
  diagSpeechFail: string;
  diagPwaLabel: string;
  diagPwaActive: string;
  diagPwaReady: string;
  diagPwaUnsupported: string;
  diagMicPermissionLabel: string;
  diagMicGranted: string;
  diagMicPrompt: string;
  diagMicDenied: string;
  diagMicUnknown: string;
  diagLocalSslNote: string;
  backupTitle: string;
  backupSubtitle: string;
  exportBackupButton: string;
  importBackupButton: string;
  backupExportSuccess: (charCount: number) => string;
  backupImportSuccess: (charCount: number, chatCount: number) => string;
  backupImportError: string;
  backupSecurityNote: string;
  userPersonaBadgeLabel: (name?: string) => string;
  userPersonaTooltip: string;
  userPersonaSectionTitle: string;
  userPersonaSectionSubtitle: string;
  userPersonaNameLabel: string;
  userPersonaNamePlaceholder: string;
  userPersonaAppearanceLabel: string;
  userPersonaAppearancePlaceholder: string;
  userPersonaBioLabel: string;
  userPersonaBioPlaceholder: string;
  userPersonaActiveHint: string;
  userPersonaEmptyHint: string;
  importCharacterCardButton: string;
  importCharacterCardShort: string;
  importCharacterCardSuccess: (name: string) => string;
  setupHelperTitle: string;
  setupHelperSubtitle: (url: string) => string;
  setupStep1Title: string;
  setupStep2Title: string;
  setupWindowsTip: string;
  setupMacTip: string;
  setupLinuxTip: string;
  copyCommand: string;
  setupRetryConnection: string;
  setupDismissLater: string;
  viewCharacterProfile: string;
  viewFullArt: string;
  wallpaperFitCover: string;
  wallpaperFitContain: string;
  profileChatButton: string;
  enterSceneButton: string;
  returnToSceneButton: string;
  profilePortraitTab: string;
  profileWallpaperTab: string;
  lightboxClose: string;
  lobbyBackButton: string;
  lobbyExitButton: string;
  lobbyGreetingDefault: string;
  lobbyGreetingNamed: (name: string) => string;
  lobbySubtitleMeta: (count: number, model: string) => string;
  createCharacterFullButton: string;
  cinemaModeEnter: string;
  cinemaModeExit: string;
  sceneMenuLabel: string;
  sceneMenuBackgroundFraming: string;
  sceneMenuParallaxDepth: string;
  storyMemoryMenuButton: string;
  storyMemoryActiveBadge: string;
  storyMemoryEmptyBadge: string;
  storyMemoryToggleLabel: string;
  storyMemoryToggleHint: string;
  storyMemoryModalTitle: string;
  storyMemoryModalSubtitle: (name: string) => string;
  storyMemoryAutoOn: string;
  storyMemoryAutoOff: string;
  storyMemorySummarizedCount: (count: number) => string;
  storyMemoryTextareaLabel: string;
  storyMemoryTextareaPlaceholder: string;
  storyMemoryRefreshButton: string;
  storyMemoryRefreshing: string;
  storyMemoryClearButton: string;
  storyMemorySaveButton: string;
  storyMemoryRefreshError: string;
  framingFillScreen: string;
  framingFullPortrait: string;
  parallaxOnLabel: string;
  parallaxOffLabel: string;
  standbyTitle: string;
  standbySubtitle: string;
  standbyResume: string;
  collapseComposer: string;
  expandComposer: string;
  collapseHeader: string;
  expandHeader: string;
  loadEarlierMessages: (count: number) => string;
  collapsedReplyLabel: (name: string) => string;
  outroSessionSaved: string;
  outroCraftedBy: string;
  reopenAtrium: string;
  appVersion: string;
  settingsWatermark: string;
  ollamaStatusChecking: string;
  ollamaStatusReady: string;
  ollamaStatusOffline: string;
  apiStatusReady: string;
  apiStatusSetup: string;
  cancel: string;
  saveSettings: string;
  noModelsInstalledMsg: string;
  openaiNoModelsMsg: string;
  modelsFoundMsg: (count: number) => string;
  openaiModelsFoundMsg: (count: number) => string;
  fetchErrorFallback: string;
  createCharacterTitle: string;
  editCharacterTitle: string;
  characterModalSubtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  roleLabel: string;
  rolePlaceholder: string;
  avatarCardImageLabel: string;
  wallpaperImageLabel: string;
  clear: string;
  useAvatar: string;
  uploadAvatar: string;
  uploadWallpaper: string;
  localImageSaved: string;
  localWallpaperSaved: string;
  avatarUrlPlaceholder: string;
  wallpaperUrlPlaceholder: string;
  tagsLabel: string;
  tagsPlaceholder: string;
  bioLabel: string;
  bioPlaceholder: string;
  greetingLabel: string;
  greetingPlaceholder: string;
  systemPromptLabel: string;
  systemPromptPlaceholder: string;
  fallbackIconLabel: string;
  fallbackToneLabel: string;
  deleteButton: string;
  saveChanges: string;
  createCharacterButton: string;
  selectModelBeforeSending: string;
  selectOpenAIModelBeforeSending: string;
  ollamaUnexpectedError: string;
  ollamaNoResponseFallback: string;
  storageLimitError: string;
  themes: Record<ThemeId, { name: string; subtitle: string }>;
  bubbleSchemes: Record<BubbleSchemeId, { name: string; subtitle: string }>;
}

export const TRANSLATIONS: Record<Language, UIStrings> = {
  en: {
    appTitle: 'Atrium',
    skipIntro: 'Skip',
    grandIntroSkipHint: 'Click anywhere to skip',
    grandIntroMuteAudio: 'Mute intro sound',
    grandIntroUnmuteAudio: 'Unmute intro sound',
    replayGrandIntroLabel: 'Cinematic Opening (Eclipse Astrolabe)',
    replayGrandIntroHint:
      'Plays automatically on first launch and once every 12 hours. Regular opens use the fast 2.5s Central Portal.',
    replayGrandIntroButton: 'Replay Grand Intro',
    gallerySubtitle: (count) => `Character gallery · ${count}`,
    newButton: 'New',
    searchPlaceholder: 'Search personas, genres, prompts...',
    allTag: 'All',
    activeScene: 'Active scene',
    msgSingular: 'msg',
    msgPlural: 'msgs',
    noMatchingTitle: 'No matching characters',
    noMatchingSubtitle: 'Adjust your search filter or create a new character card.',
    ollamaThemeSettings: 'Ollama & Theme Settings',
    selectModelInSettings: 'Select model in Settings',
    expandGallery: 'Expand character gallery',
    returnSplitView: 'Return to split chat view',
    closeGallery: 'Close character gallery',
    openGallery: 'Open character gallery',
    showGallery: 'Show character gallery',
    hideGallery: 'Hide character gallery',
    noModelSelected: 'No model selected',
    hideBubbles: 'Hide chat bubbles to view wallpaper',
    showBubbles: 'Show chat bubbles',
    editCharacterTooltip: 'Edit character & wallpaper',
    resetChatTooltip: 'Reset conversation',
    resetButton: 'Reset',
    settingsButton: 'Settings',
    openSettings: 'Open Settings',
    dismiss: 'Dismiss',
    thinking: 'Thinking',
    replyPlaceholder: (name) =>
      `Reply to ${name}... (*use asterisks for actions*)`,
    listeningPlaceholder: 'Listening (EN)... speak now',
    micStart: 'Start voice dictation (Tip: press Win + H on Windows if offline)',
    micStop: 'Stop voice dictation',
    micUnsupported:
      'SpeechRecognition is not available here — press Win + H for native Windows dictation',
    micPermissionDenied:
      'Microphone access denied. Allow microphone permission in your browser settings.',
    micNoDevice:
      'No microphone device detected in Windows or your system. Connect or enable an audio input device and try again.',
    micBusy:
      'Microphone is currently busy or unavailable in another application.',
    micErrorReason: (code, detail) =>
      detail
        ? `Speech service error (${code}): ${detail}`
        : `Speech service error: ${code}`,
    micOfflineFallback:
      'Speech service is unreachable offline — press Win + H to use Windows Voice Typing directly.',
    micNoRecognizer:
      'No Windows offline Speech Recognition language pack was found. Enable a speech language in Windows Time & Language settings.',
    micGenericError: 'Voice dictation ended or could not capture audio.',
    regenerateResponse: 'Regenerate',
    continueResponse: 'Continue',
    previousSwipe: 'Previous response variation',
    nextSwipe: 'Next response variation',
    deleteMessage: 'Delete',
    editMessage: 'Edit',
    saveAndRegenerate: 'Save & Regenerate',
    sendMessage: 'Send message',
    stopGenerating: 'Stop generating',
    composerHint: (url) =>
      `Enter to send · Shift + Enter for new line · ${url}`,
    charCounter: (count, max) =>
      `${count.toLocaleString()} / ${max.toLocaleString()}`,
    installApp: 'Install App',
    installShort: 'Install',
    installIOSTitle: 'Install Atrium on iOS',
    installIOSStep1: '1. Tap the Share button in Safari’s toolbar.',
    installIOSStep2: '2. Scroll down and tap Add to Home Screen.',
    gotIt: 'Got it',
    offlineMessage: 'Offline mode — cached conversations & local Ollama available',
    settingsTitle: 'Appearance & Ollama Settings',
    settingsSubtitle:
      'Switch language, themes, chat bubble styles, response limits, and run diagnostics.',
    languageLabel: 'Interface Language',
    englishLabel: 'English (EN)',
    spanishLabel: 'Español (ES)',
    darkPaletteLabel: 'Dark-Mode Color Palette',
    bubbleSchemeLabel: 'Chat Bubble Color Scheme',
    tabConnectionModel: 'Connection & Model',
    tabVisualStudio: 'Visual Studio',
    tabDataBackup: 'Data & Backup',
    visualPreviewTitle: 'Live Chat Preview',
    visualPreviewAssistantMsg:
      '*Leans against the obsidian balustrade, glancing over with a quiet smile.* Ready whenever you are.',
    visualPreviewUserMsg:
      '*Steps closer into the warm lantern light.* Let’s begin.',
    fontFamilyLabel: 'Chat Font Family',
    fontSansLabel: 'Modern Sans',
    fontSerifLabel: 'Literary Serif',
    fontMonoLabel: 'Console Mono',
    textSizeLabel: 'Chat Text Size',
    textSizeSmall: 'Small',
    textSizeNormal: 'Normal',
    textSizeLarge: 'Large',
    textSizeExtraLarge: 'Extra Large',
    customColorsLabel: 'Custom Bubble & Typography Colors',
    resetToThemeDefault: 'Reset to Theme Default',
    userBubbleColorLabel: 'User Bubble Accent',
    dialogueColorLabel: 'Spoken Dialogue Text',
    actionColorLabel: 'Italic *Action* Text',
    glassOpacityLabel: 'Bubble Glass Opacity',
    glassOpacitySheer: 'Sheer (20%)',
    glassOpacityBalanced: 'Balanced (66%)',
    glassOpacitySolid: 'Frosted (95%)',
    providerLabel: 'Inference Engine / API Provider',
    providerOllamaLabel: 'Ollama Local',
    providerOpenAILabel: 'OpenAI-Compatible API',
    openaiPresetsLabel: 'Quick Presets',
    openaiPresetCustom: 'Custom',
    ollamaUrlLabel: 'Ollama Base URL',
    openaiBaseUrlLabel: 'API Base URL',
    apiKeyLabel: 'API Key (Optional)',
    apiKeyPlaceholder: 'sk-... / AIza... / sk-ant-...',
    apiKeyHint:
      'Stored locally on your device only. Leave blank for local LM Studio or keyless endpoints.',
    apiKeyHintElectron:
      'Encrypted at rest via OS keychain / Windows DPAPI. Never included in JSON backups.',
    apiKeyHintBrowser:
      'Kept in session-only memory in standard browsers (never saved to browser disk or JSON backups).',
    apiKeyShow: 'Show API key',
    apiKeyHide: 'Hide API key',
    invalidUrlProtocolError:
      'Blocked invalid URL: only http:// and https:// endpoints are allowed.',
    fetchModels: 'Fetch Models',
    fetchingModels: 'Fetching...',
    ollamaCorsHint:
      'Queries /api/tags. If accessed from a hosted origin, start Ollama with OLLAMA_ORIGINS="*".',
    openaiBaseUrlHint:
      'Queries GET {baseUrl}/models and streams POST {baseUrl}/chat/completions. You can also type any model ID manually below.',
    activeModelLabel: 'Active Model',
    noModelsLoadedOption: 'No models loaded — click Fetch Models',
    customModelOptionSuffix: '(custom)',
    manualModelLabel: 'Or enter a model tag manually',
    manualModelPlaceholder: 'e.g. llama3.2:latest or mistral',
    openaiManualModelPlaceholder:
      'e.g. gemini-2.5-flash, claude-sonnet-4-20250514, or local model',
    temperatureLabel: 'Response Creativity (Temperature)',
    tempFocused: 'Focused (0.0)',
    tempBalanced: 'Balanced (0.8)',
    tempExpressive: 'Expressive (1.5)',
    responseLengthLabel: 'Max Response Length (num_predict · ctx 4096)',
    responseLengthValue: (tokens) => `${tokens} tokens`,
    responseLengthConcise: 'Concise (150)',
    responseLengthBalanced: 'Standard (300)',
    responseLengthDetailed: 'Detailed (500)',
    diagnosticsTitle: 'System & Security Check',
    diagnosticsRerun: 'Run Check',
    diagnosticsRunning: 'Checking...',
    diagOllamaLabel: 'Ollama Server (/api/tags)',
    diagApiLabel: 'API Endpoint (/models)',
    diagOllamaChecking: 'Testing connection...',
    diagOllamaConnected: (count) =>
      `Connected · ${count} ${count === 1 ? 'model' : 'models'} available`,
    diagOllamaEmpty: 'Connected, but 0 models found (pull a model first)',
    diagOllamaFailed: 'Unreachable or blocked by CORS',
    diagApiFailed:
      'Unreachable or /models restricted (manual model IDs still work)',
    diagSecureContextLabel: 'Secure Context (HTTPS / localhost)',
    diagSecureContextPass: (origin) => `Secure context active (${origin})`,
    diagSecureContextFail: (origin) =>
      `Insecure context (${origin}) — mic & SW require HTTPS or localhost`,
    diagSpeechLabel: 'Web Speech API (SpeechRecognition)',
    diagSpeechPass: 'Supported in this browser (EN / ES)',
    diagSpeechFail: 'Unavailable in this browser (try Chromium / Edge)',
    diagPwaLabel: 'PWA Service Worker',
    diagPwaActive: 'Service worker registered & controlling page',
    diagPwaReady: 'Service worker API supported (activates on build/load)',
    diagPwaUnsupported: 'Service worker unavailable in this context',
    diagMicPermissionLabel: 'Microphone Permission',
    diagMicGranted: 'Granted',
    diagMicPrompt: 'Will prompt on first click',
    diagMicDenied: 'Blocked — enable in browser site permissions',
    diagMicUnknown: 'Browser controls permission on mic click',
    diagLocalSslNote:
      'Localhost (http://localhost) is automatically treated as a Secure Context by modern browsers. For LAN IP access, enable VITE_LOCAL_HTTPS="true" with SSL_KEY_FILE & SSL_CERT_FILE in .env.',
    backupTitle: 'Data Backup & Transfer',
    backupSubtitle:
      'Export or import all custom characters, uploaded wallpapers, settings, and chat histories.',
    exportBackupButton: 'Export Backup (.json)',
    importBackupButton: 'Import Backup (.json)',
    backupExportSuccess: (charCount) =>
      `Backup downloaded (${charCount} characters exported).`,
    backupImportSuccess: (charCount, chatCount) =>
      `Backup restored: ${charCount} characters and ${chatCount} chat histories loaded.`,
    backupImportError:
      'Invalid backup file. Please select a valid Atrium .json backup.',
    backupSecurityNote:
      'Security note: Private API keys are strictly excluded and never exported into JSON backups.',
    userPersonaBadgeLabel: (name) => (name?.trim() ? name.trim() : 'Persona'),
    userPersonaTooltip: 'Edit your User Persona profile',
    userPersonaSectionTitle: 'User Persona (Roleplay Identity)',
    userPersonaSectionSubtitle:
      'Automatically injected into every Ollama system prompt so characters know who you are and what you look like.',
    userPersonaNameLabel: 'Your Name / Alias',
    userPersonaNamePlaceholder: 'e.g. Alex Mercer',
    userPersonaAppearanceLabel: 'Appearance / Physical Description',
    userPersonaAppearancePlaceholder:
      'Height, hair, eyes, clothing, scars, or distinctive traits...',
    userPersonaBioLabel: 'Personality / Roleplay Bio',
    userPersonaBioPlaceholder:
      'Background, temperament, skills, and how you interact in roleplay...',
    userPersonaActiveHint: 'Active in all chats',
    userPersonaEmptyHint: 'Optional — introduce yourself to characters',
    importCharacterCardButton: 'Import Character Card (.png)',
    importCharacterCardShort: 'Import .png',
    importCharacterCardSuccess: (name) =>
      `Loaded "${name}" from PNG character card metadata.`,
    setupHelperTitle: 'Connect Local Ollama',
    setupHelperSubtitle: (url) =>
      `Atrium runs locally in your browser and could not reach Ollama at ${url} yet. Follow these steps to start Ollama with browser access enabled:`,
    setupStep1Title: '1. Install Ollama & pull a model',
    setupStep2Title: '2. Allow browser CORS (OLLAMA_ORIGINS=*) & start',
    setupWindowsTip:
      'PowerShell: run the command above, or add OLLAMA_ORIGINS=* in Windows Environment Variables and restart the Ollama tray app.',
    setupMacTip:
      'Run launchctl setenv once and restart the Ollama app, or launch directly from Terminal with OLLAMA_ORIGINS="*".',
    setupLinuxTip:
      'If running Ollama as a systemd service, add Environment="OLLAMA_ORIGINS=*" under [Service] via systemctl edit ollama.',
    copyCommand: 'Copy command',
    setupRetryConnection: 'Retry Connection',
    setupDismissLater: 'Later',
    viewCharacterProfile: 'View character profile',
    viewFullArt: 'View full artwork',
    wallpaperFitCover: 'Background: Fill Screen (cover) — click for Fit Full Portrait',
    wallpaperFitContain: 'Background: Fit Full Portrait (contain) — click for Fill Screen',
    profileChatButton: 'Chat',
    enterSceneButton: 'Enter Scene',
    returnToSceneButton: 'Return to Scene',
    profilePortraitTab: 'Portrait',
    profileWallpaperTab: 'Stage Scene',
    lightboxClose: 'Back',
    lobbyBackButton: 'Lobby',
    lobbyExitButton: 'Exit',
    lobbyGreetingDefault: 'Choose a scene to begin',
    lobbyGreetingNamed: (name) => `Welcome back, ${name}`,
    lobbySubtitleMeta: (count, model) =>
      `${count} ${count === 1 ? 'character' : 'characters'} · ${model}`,
    createCharacterFullButton: 'Create Character',
    cinemaModeEnter: 'Cinema Mode (hide interface)',
    cinemaModeExit: 'Exit Cinema Mode',
    sceneMenuLabel: 'Scene menu',
    sceneMenuBackgroundFraming: 'Background Framing',
    sceneMenuParallaxDepth: 'Parallax Depth',
    storyMemoryMenuButton: 'View / Edit Story Memory',
    storyMemoryActiveBadge: 'Saved',
    storyMemoryEmptyBadge: 'Empty',
    storyMemoryToggleLabel: 'Silent Background Story Memory',
    storyMemoryToggleHint:
      'Automatically summarizes older turns every 20 messages into persistent IndexedDB memory so smaller local models keep long-term plot continuity.',
    storyMemoryModalTitle: 'Story Memory',
    storyMemoryModalSubtitle: (name) =>
      `Persistent long-term plot summary injected silently into ${name}’s system prompt.`,
    storyMemoryAutoOn: 'Auto-summary: On (every 20 msgs)',
    storyMemoryAutoOff: 'Auto-summary: Paused in Settings',
    storyMemorySummarizedCount: (count) =>
      count > 0
        ? `${count} earlier turns condensed`
        : 'No turns auto-condensed yet',
    storyMemoryTextareaLabel: 'What the character remembers',
    storyMemoryTextareaPlaceholder:
      'Key plot events, locations, promises, or details will appear here automatically every 20 messages—or write your own memory notes...',
    storyMemoryRefreshButton: 'Summarize Now',
    storyMemoryRefreshing: 'Summarizing...',
    storyMemoryClearButton: 'Clear Memory',
    storyMemorySaveButton: 'Save Memory',
    storyMemoryRefreshError:
      'Could not summarize right now. Verify your model connection in Settings.',
    framingFillScreen: 'Fill Screen (cover)',
    framingFullPortrait: 'Full Portrait (contain)',
    parallaxOnLabel: 'On',
    parallaxOffLabel: 'Off',
    standbyTitle: 'Atrium Standby',
    standbySubtitle:
      'All conversations, portraits, and personas are safely stored in your local IndexedDB.',
    standbyResume: 'Re-enter Atrium',
    collapseComposer: 'Minimize input bar',
    expandComposer: 'Expand input bar',
    collapseHeader: 'Hide top header',
    expandHeader: 'Show top header',
    loadEarlierMessages: (count) => `Load earlier messages (${count})`,
    collapsedReplyLabel: (name) => `Reply to ${name}...`,
    outroSessionSaved: 'Session saved locally in Atrium',
    outroCraftedBy: 'Crafted by Miko',
    reopenAtrium: 'Reopen Atrium',
    appVersion: 'v1.4.0 (Hardened)',
    settingsWatermark: 'Atrium Engine • Original Architecture by Miko',
    ollamaStatusChecking: 'Ollama...',
    ollamaStatusReady: 'Ollama Ready',
    ollamaStatusOffline: 'Ollama Offline · Setup',
    apiStatusReady: 'API Ready',
    apiStatusSetup: 'API · Select Model',
    cancel: 'Cancel',
    saveSettings: 'Save Settings',
    noModelsInstalledMsg:
      'Connected to Ollama, but no models are installed yet. Run "ollama pull llama3.2" in your terminal.',
    openaiNoModelsMsg:
      'Connected, but /models returned an empty list. Enter a model ID manually below.',
    modelsFoundMsg: (count) =>
      `Found ${count} ${count === 1 ? 'model' : 'models'} from /api/tags.`,
    openaiModelsFoundMsg: (count) =>
      `Found ${count} ${count === 1 ? 'model' : 'models'} from /models.`,
    fetchErrorFallback: 'Failed to fetch models from endpoint.',
    createCharacterTitle: 'Create Character',
    editCharacterTitle: 'Edit Character',
    characterModalSubtitle:
      'Upload custom local portraits, chat wallpaper, greeting, and prompt',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. Elena Rostova',
    roleLabel: 'Role / Archetype',
    rolePlaceholder: 'e.g. Airship Navigator',
    avatarCardImageLabel: 'Avatar Card Image',
    wallpaperImageLabel: 'Stage Wallpaper (16:9)',
    clear: 'Clear',
    useAvatar: 'Use avatar',
    uploadAvatar: 'Upload Avatar',
    uploadWallpaper: 'Upload Stage Scene',
    localImageSaved: 'Local image saved',
    localWallpaperSaved: 'Local stage scene saved',
    avatarUrlPlaceholder: 'Or paste image URL...',
    wallpaperUrlPlaceholder: 'Optional 16:9 stage scene URL...',
    tagsLabel: 'Tags (comma-separated)',
    tagsPlaceholder: 'Sci-Fi, Mystery, Slow Burn',
    bioLabel: 'Short Bio',
    bioPlaceholder: 'Concise card tagline',
    greetingLabel: 'First Greeting Message (shown at start of chat)',
    greetingPlaceholder: 'Opening scene and greeting spoken by the character...',
    systemPromptLabel: 'System Prompt (hidden from chat screen)',
    systemPromptPlaceholder:
      'Define personality, voice, setting, and roleplay instructions...',
    fallbackIconLabel: 'Fallback Icon',
    fallbackToneLabel: 'Fallback Tone',
    deleteButton: 'Delete',
    saveChanges: 'Save Changes',
    createCharacterButton: 'Create Character',
    selectModelBeforeSending:
      'Select an Ollama model in Settings before sending a message.',
    selectOpenAIModelBeforeSending:
      'Enter or select a model ID in Settings before sending a message.',
    ollamaUnexpectedError: 'Unexpected error communicating with the model API.',
    ollamaNoResponseFallback:
      'Could not receive a response from Ollama. Check your connection settings and try again.',
    storageLimitError:
      'Storage limit reached: remove or compress custom uploaded images so changes can be saved.',
    themes: {
      'obsidian-violet': {
        name: 'Obsidian Violet',
        subtitle: 'Deep obsidian canvas with luminous amethyst glass',
      },
      'midnight-crimson': {
        name: 'Midnight Crimson',
        subtitle: 'Smoked charcoal surfaces with velvet crimson glass',
      },
      'cyber-emerald': {
        name: 'Cyber Emerald',
        subtitle: 'Abyssal slate-black with translucent jade glass',
      },
    },
    bubbleSchemes: {
      'indigo-violet': {
        name: 'Indigo Violet',
        subtitle: 'Rich violet user glass with deep slate replies',
      },
      'crimson-rose': {
        name: 'Crimson Rose',
        subtitle: 'Velvet crimson user glass with warm obsidian replies',
      },
      'cyber-emerald': {
        name: 'Cyber Emerald',
        subtitle: 'Translucent jade user glass with dark pine replies',
      },
      'ocean-blue': {
        name: 'Ocean Blue',
        subtitle: 'Deep cobalt user glass with midnight navy replies',
      },
      'amber-gold': {
        name: 'Amber Gold',
        subtitle: 'Warm burnished amber user glass with espresso replies',
      },
      'minimalist-glass': {
        name: 'Minimalist Glass',
        subtitle: 'Neutral frosted graphite for maximum wallpaper focus',
      },
    },
  },
  es: {
    appTitle: 'Atrium',
    skipIntro: 'Saltar',
    grandIntroSkipHint: 'Haz clic para saltar',
    grandIntroMuteAudio: 'Silenciar sonido de intro',
    grandIntroUnmuteAudio: 'Activar sonido de intro',
    replayGrandIntroLabel: 'Apertura Cinematográfica (Eclipse Astrolabe)',
    replayGrandIntroHint:
      'Se reproduce automáticamente al instalar y una vez cada 12 horas. Los inicios diarios usan el Portal Central rápido de 2.5s.',
    replayGrandIntroButton: 'Repetir Grand Intro',
    gallerySubtitle: (count) => `Galería de personajes · ${count}`,
    newButton: 'Nuevo',
    searchPlaceholder: 'Buscar personajes, géneros, prompts...',
    allTag: 'Todos',
    activeScene: 'Escena activa',
    msgSingular: 'msj',
    msgPlural: 'msjs',
    noMatchingTitle: 'Sin personajes coincidentes',
    noMatchingSubtitle: 'Ajusta el filtro de búsqueda o crea una nueva tarjeta.',
    ollamaThemeSettings: 'Ajustes de Ollama y Tema',
    selectModelInSettings: 'Selecciona un modelo en Ajustes',
    expandGallery: 'Expandir galería de personajes',
    returnSplitView: 'Volver a vista dividida',
    closeGallery: 'Cerrar galería de personajes',
    openGallery: 'Abrir galería de personajes',
    showGallery: 'Mostrar galería de personajes',
    hideGallery: 'Ocultar galería de personajes',
    noModelSelected: 'Sin modelo seleccionado',
    hideBubbles: 'Ocultar burbujas para ver el fondo',
    showBubbles: 'Mostrar burbujas del chat',
    editCharacterTooltip: 'Editar personaje y fondo',
    resetChatTooltip: 'Reiniciar conversación',
    resetButton: 'Reiniciar',
    settingsButton: 'Ajustes',
    openSettings: 'Abrir Ajustes',
    dismiss: 'Cerrar',
    thinking: 'Pensando',
    replyPlaceholder: (name) =>
      `Responde a ${name}... (*usa asteriscos para acciones*)`,
    listeningPlaceholder: 'Escuchando (ES)... habla ahora',
    micStart: 'Iniciar dictado por voz (Consejo: pulsa Win + H en Windows si estás offline)',
    micStop: 'Detener dictado por voz',
    micUnsupported:
      'SpeechRecognition no está disponible aquí — pulsa Win + H para dictado nativo de Windows',
    micPermissionDenied:
      'Permiso de micrófono denegado. Habilítalo en los ajustes del navegador.',
    micNoDevice:
      'No se detectó ningún micrófono conectado o habilitado en Windows. Revisa tu dispositivo de entrada de audio e inténtalo de nuevo.',
    micBusy:
      'El micrófono está ocupado por otra aplicación o no se pudo iniciar.',
    micErrorReason: (code, detail) =>
      detail
        ? `Error del servicio de voz (${code}): ${detail}`
        : `Error del servicio de voz: ${code}`,
    micOfflineFallback:
      'Servicio de voz sin conexión — pulsa Win + H para usar el dictado nativo de Windows.',
    micNoRecognizer:
      'No se encontró un paquete de idioma de reconocimiento de voz en Windows. Activa un idioma de voz en Configuración > Hora e idioma.',
    micGenericError: 'El dictado finalizó o no pudo capturar audio.',
    regenerateResponse: 'Regenerar',
    continueResponse: 'Continuar',
    previousSwipe: 'Variación anterior',
    nextSwipe: 'Siguiente variación',
    deleteMessage: 'Eliminar',
    editMessage: 'Editar',
    saveAndRegenerate: 'Guardar y Regenerar',
    sendMessage: 'Enviar mensaje',
    stopGenerating: 'Detener generación',
    composerHint: (url) =>
      `Enter para enviar · Shift + Enter para nueva línea · ${url}`,
    charCounter: (count, max) =>
      `${count.toLocaleString()} / ${max.toLocaleString()}`,
    installApp: 'Instalar App',
    installShort: 'Instalar',
    installIOSTitle: 'Instalar Atrium en iOS',
    installIOSStep1: '1. Pulsa el botón Compartir en la barra de Safari.',
    installIOSStep2: '2. Baja y pulsa Añadir a pantalla de inicio.',
    gotIt: 'Entendido',
    offlineMessage:
      'Modo sin conexión — conversaciones guardadas y Ollama local disponibles',
    settingsTitle: 'Apariencia, Ollama y Diagnóstico',
    settingsSubtitle:
      'Cambia idioma, temas, burbujas, longitud de respuesta y verifica el sistema.',
    languageLabel: 'Idioma de la Interfaz',
    englishLabel: 'English (EN)',
    spanishLabel: 'Español (ES)',
    darkPaletteLabel: 'Paleta de Color Oscura',
    bubbleSchemeLabel: 'Esquema de Color de Burbujas',
    tabConnectionModel: 'Conexión y Modelo',
    tabVisualStudio: 'Estudio Visual',
    tabDataBackup: 'Datos y Copias',
    visualPreviewTitle: 'Vista Previa en Vivo',
    visualPreviewAssistantMsg:
      '*Se apoya en la baranda de obsidiana y te mira con una sonrisa serena.* Listo cuando tú quieras.',
    visualPreviewUserMsg:
      '*Se acerca hacia la cálida luz del farol.* Comencemos.',
    fontFamilyLabel: 'Tipografía del Chat',
    fontSansLabel: 'Sans Moderna',
    fontSerifLabel: 'Serif Literaria',
    fontMonoLabel: 'Consola Mono',
    textSizeLabel: 'Tamaño del Texto',
    textSizeSmall: 'Pequeño',
    textSizeNormal: 'Normal',
    textSizeLarge: 'Grande',
    textSizeExtraLarge: 'Extra Grande',
    customColorsLabel: 'Colores Personalizados de Burbuja y Texto',
    resetToThemeDefault: 'Restablecer al Tema',
    userBubbleColorLabel: 'Acento Burbuja Usuario',
    dialogueColorLabel: 'Texto de Diálogo',
    actionColorLabel: 'Texto de *Acción* Cursiva',
    glassOpacityLabel: 'Opacidad Cristal de Burbujas',
    glassOpacitySheer: 'Traslúcido (20%)',
    glassOpacityBalanced: 'Equilibrado (66%)',
    glassOpacitySolid: 'Esmerilado (95%)',
    providerLabel: 'Motor de Inferencia / Proveedor API',
    providerOllamaLabel: 'Ollama Local',
    providerOpenAILabel: 'API Compatible OpenAI',
    openaiPresetsLabel: 'Preajustes Rápidos',
    openaiPresetCustom: 'Personalizado',
    ollamaUrlLabel: 'URL Base de Ollama',
    openaiBaseUrlLabel: 'URL Base de la API',
    apiKeyLabel: 'Clave API (Opcional)',
    apiKeyPlaceholder: 'sk-... / AIza... / sk-ant-...',
    apiKeyHint:
      'Guardada solo localmente en tu dispositivo. Déjala vacía para LM Studio local o endpoints sin clave.',
    apiKeyHintElectron:
      'Cifrada en reposo mediante el llavero del sistema / DPAPI de Windows. Nunca se incluye en copias JSON.',
    apiKeyHintBrowser:
      'Mantenida solo en memoria de sesión en navegadores estándar (nunca se guarda en disco ni en copias JSON).',
    apiKeyShow: 'Mostrar clave API',
    apiKeyHide: 'Ocultar clave API',
    invalidUrlProtocolError:
      'URL bloqueada o inválida: solo se permiten endpoints http:// y https://.',
    fetchModels: 'Buscar Modelos',
    fetchingModels: 'Buscando...',
    ollamaCorsHint:
      'Consulta /api/tags. Si accedes desde otro origen, inicia Ollama con OLLAMA_ORIGINS="*".',
    openaiBaseUrlHint:
      'Consulta GET {baseUrl}/models y transmite POST {baseUrl}/chat/completions. También puedes escribir cualquier ID de modelo abajo.',
    activeModelLabel: 'Modelo Activo',
    noModelsLoadedOption: 'Sin modelos cargados — pulsa Buscar Modelos',
    customModelOptionSuffix: '(personalizado)',
    manualModelLabel: 'O escribe un nombre de modelo manualmente',
    manualModelPlaceholder: 'ej. llama3.2:latest o mistral',
    openaiManualModelPlaceholder:
      'ej. gemini-2.5-flash, claude-sonnet-4-20250514 o modelo local',
    temperatureLabel: 'Creatividad de Respuesta (Temperatura)',
    tempFocused: 'Preciso (0.0)',
    tempBalanced: 'Equilibrado (0.8)',
    tempExpressive: 'Equilibrado+ (1.5)',
    responseLengthLabel: 'Longitud Máxima de Respuesta (num_predict · ctx 4096)',
    responseLengthValue: (tokens) => `${tokens} tokens`,
    responseLengthConcise: 'Conciso (150)',
    responseLengthBalanced: 'Estándar (300)',
    responseLengthDetailed: 'Detallado (500)',
    diagnosticsTitle: 'Verificación de Sistema y Seguridad',
    diagnosticsRerun: 'Verificar',
    diagnosticsRunning: 'Verificando...',
    diagOllamaLabel: 'Servidor Ollama (/api/tags)',
    diagApiLabel: 'Endpoint API (/models)',
    diagOllamaChecking: 'Probando conexión...',
    diagOllamaConnected: (count) =>
      `Conectado · ${count} ${count === 1 ? 'modelo' : 'modelos'} disponibles`,
    diagOllamaEmpty: 'Conectado, pero sin modelos instalados',
    diagOllamaFailed: 'Inaccesible o bloqueado por CORS',
    diagApiFailed:
      'Inaccesible o /models restringido (puedes usar un ID manual)',
    diagSecureContextLabel: 'Contexto Seguro (HTTPS / localhost)',
    diagSecureContextPass: (origin) => `Contexto seguro activo (${origin})`,
    diagSecureContextFail: (origin) =>
      `Contexto no seguro (${origin}) — micrófono y SW requieren HTTPS o localhost`,
    diagSpeechLabel: 'Web Speech API (SpeechRecognition)',
    diagSpeechPass: 'Compatible en este navegador (ES / EN)',
    diagSpeechFail: 'No disponible en este navegador (prueba Chromium / Edge)',
    diagPwaLabel: 'Service Worker PWA',
    diagPwaActive: 'Service worker registrado y activo',
    diagPwaReady: 'API de Service Worker compatible (se activa al compilar)',
    diagPwaUnsupported: 'Service worker no disponible en este contexto',
    diagMicPermissionLabel: 'Permiso de Micrófono',
    diagMicGranted: 'Concedido',
    diagMicPrompt: 'Solicitará permiso al pulsar el micrófono',
    diagMicDenied: 'Bloqueado — habilítalo en permisos del sitio',
    diagMicUnknown: 'El navegador solicitará permiso al usarlo',
    diagLocalSslNote:
      'Localhost (http://localhost) se considera automáticamente un Contexto Seguro. Para acceso por IP en red local, activa VITE_LOCAL_HTTPS="true" con SSL_KEY_FILE y SSL_CERT_FILE en .env.',
    backupTitle: 'Copia de Seguridad y Transferencia',
    backupSubtitle:
      'Exporta o importa todos tus personajes personalizados, fondos subidos, ajustes e historiales de chat.',
    exportBackupButton: 'Exportar Copia (.json)',
    importBackupButton: 'Importar Copia (.json)',
    backupExportSuccess: (charCount) =>
      `Copia descargada (${charCount} personajes exportados).`,
    backupImportSuccess: (charCount, chatCount) =>
      `Copia restaurada: ${charCount} personajes y ${chatCount} historiales cargados.`,
    backupImportError:
      'Archivo de respaldo inválido. Selecciona un archivo .json válido de Atrium.',
    backupSecurityNote:
      'Nota de seguridad: Las claves API privadas se excluyen estrictamente y nunca se exportan en copias JSON.',
    userPersonaBadgeLabel: (name) => (name?.trim() ? name.trim() : 'Persona'),
    userPersonaTooltip: 'Editar tu perfil de Persona',
    userPersonaSectionTitle: 'Persona del Usuario (Identidad de Rol)',
    userPersonaSectionSubtitle:
      'Se inyecta automáticamente en cada system prompt de Ollama para que el personaje conozca quién eres y cómo luces.',
    userPersonaNameLabel: 'Tu Nombre / Alias',
    userPersonaNamePlaceholder: 'ej. Alex Mercer',
    userPersonaAppearanceLabel: 'Apariencia / Descripción Física',
    userPersonaAppearancePlaceholder:
      'Estatura, cabello, ojos, vestimenta, cicatrices o rasgos distintivos...',
    userPersonaBioLabel: 'Personalidad / Biografía de Rol',
    userPersonaBioPlaceholder:
      'Trasfondo, temperamento, habilidades y forma de actuar en el rol...',
    userPersonaActiveHint: 'Activo en todos los chats',
    userPersonaEmptyHint: 'Opcional — preséntate ante los personajes',
    importCharacterCardButton: 'Importar Tarjeta (.png)',
    importCharacterCardShort: 'Importar .png',
    importCharacterCardSuccess: (name) =>
      `Se cargó "${name}" desde los metadatos de la tarjeta PNG.`,
    setupHelperTitle: 'Conecta tu Ollama Local',
    setupHelperSubtitle: (url) =>
      `Atrium se ejecuta localmente en tu navegador y aún no pudo conectar con Ollama en ${url}. Sigue estos pasos para iniciarlo con acceso CORS:`,
    setupStep1Title: '1. Instala Ollama y descarga un modelo',
    setupStep2Title: '2. Habilita CORS (OLLAMA_ORIGINS=*) e inicia',
    setupWindowsTip:
      'PowerShell: ejecuta el comando arriba, o agrega OLLAMA_ORIGINS=* en las Variables de Entorno de Windows y reinicia Ollama.',
    setupMacTip:
      'Ejecuta launchctl setenv una vez y reinicia la app Ollama, o inícialo desde Terminal con OLLAMA_ORIGINS="*".',
    setupLinuxTip:
      'Si usas systemd, agrega Environment="OLLAMA_ORIGINS=*" bajo [Service] con systemctl edit ollama.',
    copyCommand: 'Copiar comando',
    setupRetryConnection: 'Reintentar Conexión',
    setupDismissLater: 'Más tarde',
    viewCharacterProfile: 'Ver perfil del personaje',
    viewFullArt: 'Ver arte completo',
    wallpaperFitCover: 'Fondo: Llenar Pantalla (cover) — clic para Ajustar Retrato Completo',
    wallpaperFitContain: 'Fondo: Retrato Completo (contain) — clic para Llenar Pantalla',
    profileChatButton: 'Chatear',
    enterSceneButton: 'Entrar a la Escena',
    returnToSceneButton: 'Volver a la Escena',
    profilePortraitTab: 'Retrato',
    profileWallpaperTab: 'Escenario',
    lightboxClose: 'Volver',
    lobbyBackButton: 'Lobby',
    lobbyExitButton: 'Salir',
    lobbyGreetingDefault: 'Elige una escena para comenzar',
    lobbyGreetingNamed: (name) => `Hola de nuevo, ${name}`,
    lobbySubtitleMeta: (count, model) =>
      `${count} ${count === 1 ? 'personaje' : 'personajes'} · ${model}`,
    createCharacterFullButton: 'Crear Personaje',
    cinemaModeEnter: 'Modo Cine (ocultar interfaz)',
    cinemaModeExit: 'Salir de Modo Cine',
    sceneMenuLabel: 'Menú de escena',
    sceneMenuBackgroundFraming: 'Encuadre del Fondo',
    sceneMenuParallaxDepth: 'Profundidad Parallax',
    storyMemoryMenuButton: 'Ver / Editar Memoria de Historia',
    storyMemoryActiveBadge: 'Guardada',
    storyMemoryEmptyBadge: 'Vacía',
    storyMemoryToggleLabel: 'Memoria de Historia Silenciosa',
    storyMemoryToggleHint:
      'Resume automáticamente los turnos antiguos cada 20 mensajes en IndexedDB para que los modelos locales pequeños nunca pierdan detalles de la trama.',
    storyMemoryModalTitle: 'Memoria de la Historia',
    storyMemoryModalSubtitle: (name) =>
      `Resumen persistente a largo plazo inyectado silenciosamente en el prompt de ${name}.`,
    storyMemoryAutoOn: 'Auto-resumen: Activo (cada 20 msjs)',
    storyMemoryAutoOff: 'Auto-resumen: Pausado en Ajustes',
    storyMemorySummarizedCount: (count) =>
      count > 0
        ? `${count} turnos anteriores condensados`
        : 'Aún no hay turnos autocondensados',
    storyMemoryTextareaLabel: 'Lo que recuerda el personaje',
    storyMemoryTextareaPlaceholder:
      'Los eventos clave, lugares, promesas y detalles aparecerán aquí automáticamente cada 20 mensajes—o escribe tus propias notas de memoria...',
    storyMemoryRefreshButton: 'Resumir Ahora',
    storyMemoryRefreshing: 'Resumiendo...',
    storyMemoryClearButton: 'Limpiar Memoria',
    storyMemorySaveButton: 'Guardar Memoria',
    storyMemoryRefreshError:
      'No se pudo generar el resumen ahora. Verifica tu modelo en Ajustes.',
    framingFillScreen: 'Llenar Pantalla (cover)',
    framingFullPortrait: 'Retrato Completo (contain)',
    parallaxOnLabel: 'Activo',
    parallaxOffLabel: 'Inactivo',
    standbyTitle: 'Atrium en Espera',
    standbySubtitle:
      'Todas tus conversaciones, retratos y personas están guardadas en tu IndexedDB local.',
    standbyResume: 'Volver a Atrium',
    collapseComposer: 'Minimizar barra de texto',
    expandComposer: 'Expandir barra de texto',
    collapseHeader: 'Ocultar barra superior',
    expandHeader: 'Mostrar barra superior',
    loadEarlierMessages: (count) => `Cargar mensajes anteriores (${count})`,
    collapsedReplyLabel: (name) => `Responder a ${name}...`,
    outroSessionSaved: 'Sesión guardada localmente en Atrium',
    outroCraftedBy: 'Crafted by Miko',
    reopenAtrium: 'Reabrir Atrium',
    appVersion: 'v1.4.0 (Hardened)',
    settingsWatermark: 'Atrium Engine • Original Architecture by Miko',
    ollamaStatusChecking: 'Ollama...',
    ollamaStatusReady: 'Ollama Listo',
    ollamaStatusOffline: 'Ollama Offline · Configurar',
    apiStatusReady: 'API Lista',
    apiStatusSetup: 'API · Elegir Modelo',
    cancel: 'Cancelar',
    saveSettings: 'Guardar Ajustes',
    noModelsInstalledMsg:
      'Conectado a Ollama, pero no hay modelos instalados. Ejecuta "ollama pull llama3.2" en tu terminal.',
    openaiNoModelsMsg:
      'Conectado, pero /models devolvió una lista vacía. Escribe un ID de modelo manualmente abajo.',
    modelsFoundMsg: (count) =>
      `Se ${count === 1 ? 'encontró' : 'encontraron'} ${count} ${count === 1 ? 'modelo' : 'modelos'} en /api/tags.`,
    openaiModelsFoundMsg: (count) =>
      `Se ${count === 1 ? 'encontró' : 'encontraron'} ${count} ${count === 1 ? 'modelo' : 'modelos'} en /models.`,
    fetchErrorFallback: 'Error al obtener los modelos desde el endpoint.',
    createCharacterTitle: 'Crear Personaje',
    editCharacterTitle: 'Editar Personaje',
    characterModalSubtitle:
      'Sube retratos locales, fondo de chat, saludo inicial y prompt',
    nameLabel: 'Nombre',
    namePlaceholder: 'ej. Elena Rostova',
    roleLabel: 'Rol / Arquetipo',
    rolePlaceholder: 'ej. Navegante de Dirigible',
    avatarCardImageLabel: 'Imagen de Tarjeta / Avatar',
    wallpaperImageLabel: 'Escenario Panorámico (16:9)',
    clear: 'Limpiar',
    useAvatar: 'Usar avatar',
    uploadAvatar: 'Subir Avatar',
    uploadWallpaper: 'Subir Escenario',
    localImageSaved: 'Imagen local guardada',
    localWallpaperSaved: 'Escenario local guardado',
    avatarUrlPlaceholder: 'O pega una URL de imagen...',
    wallpaperUrlPlaceholder: 'URL opcional de escenario 16:9...',
    tagsLabel: 'Etiquetas (separadas por comas)',
    tagsPlaceholder: 'Ciencia Ficción, Misterio, Drama',
    bioLabel: 'Biografía Corta',
    bioPlaceholder: 'Descripción breve para la tarjeta',
    greetingLabel: 'Primer Mensaje de Saludo (visible al iniciar el chat)',
    greetingPlaceholder: 'Escena inicial y saludo del personaje...',
    systemPromptLabel: 'System Prompt (oculto en la pantalla del chat)',
    systemPromptPlaceholder:
      'Define personalidad, voz, ambientación e instrucciones de rol...',
    fallbackIconLabel: 'Icono Alternativo',
    fallbackToneLabel: 'Tono Alternativo',
    deleteButton: 'Eliminar',
    saveChanges: 'Guardar Cambios',
    createCharacterButton: 'Crear Personaje',
    selectModelBeforeSending:
      'Selecciona un modelo de Ollama en Ajustes antes de enviar un mensaje.',
    selectOpenAIModelBeforeSending:
      'Escribe o selecciona un ID de modelo en Ajustes antes de enviar un mensaje.',
    ollamaUnexpectedError: 'Error inesperado al comunicarse con la API del modelo.',
    ollamaNoResponseFallback:
      'No se recibió respuesta de Ollama. Revisa la configuración de conexión e inténtalo de nuevo.',
    storageLimitError:
      'Límite de almacenamiento alcanzado: reduce o reemplaza imágenes subidas para guardar cambios.',
    themes: {
      'obsidian-violet': {
        name: 'Obsidiana Violeta',
        subtitle: 'Lienzo obsidiana profundo con cristal amatista luminoso',
      },
      'midnight-crimson': {
        name: 'Carmesí Medianoche',
        subtitle: 'Superficies carbón ahumado con cristal carmesí aterciopelado',
      },
      'cyber-emerald': {
        name: 'Esmeralda Cyber',
        subtitle: 'Negro pizarra abisal con cristal jade translúcido',
      },
    },
    bubbleSchemes: {
      'indigo-violet': {
        name: 'Índigo Violeta',
        subtitle: 'Cristal violeta intenso con respuestas en pizarra oscura',
      },
      'crimson-rose': {
        name: 'Rosa Carmesí',
        subtitle: 'Cristal carmesí aterciopelado con respuestas obsidiana',
      },
      'cyber-emerald': {
        name: 'Esmeralda Cyber',
        subtitle: 'Cristal jade translúcido con respuestas en verde profundo',
      },
      'ocean-blue': {
        name: 'Azul Océano',
        subtitle: 'Cristal cobalto profundo con respuestas azul medianoche',
      },
      'amber-gold': {
        name: 'Ámbar Dorado',
        subtitle: 'Cristal ámbar cálido con respuestas tono espresso',
      },
      'minimalist-glass': {
        name: 'Cristal Minimalista',
        subtitle: 'Grafito esmerilado neutro para destacar el fondo',
      },
    },
  },
};
