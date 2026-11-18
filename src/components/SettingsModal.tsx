import {
  AlertCircle,
  Brain,
  Check,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Palette,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { isSpeechRecognitionSupported } from '../hooks/useSpeechRecognition';
import type { UIStrings } from '../i18n/translations';
import {
  BUBBLE_SCHEMES,
  DEFAULT_ASSISTANT_ACTION_COLOR,
  DEFAULT_DIALOGUE_COLOR,
  THEME_PALETTES,
} from '../themes/palettes';
import type {
  ApiProvider,
  BubbleSchemeId,
  ChatFontFamily,
  ChatTextSize,
  Language,
  OllamaModelTag,
  OllamaSettings,
  ThemeId,
  UserPersona,
  VisualStudioSettings,
} from '../types/chat';
import {
  DEFAULT_NUM_CTX,
  DEFAULT_NUM_PREDICT,
  DEFAULT_OLLAMA_URL,
  DEFAULT_OPENAI_URL,
  OPENAI_COMPAT_PRESETS,
  type OpenAICompatPresetId,
  detectOpenAIPresetId,
  fetchProviderModels,
  formatModelSize,
  normalizeBaseUrl,
  validateProviderBaseUrl,
} from '../utils/ollama';
import { hasOsSecretStorage } from '../utils/storage';
import { MessageContent } from './MessageContent';

interface SettingsModalProps {
  t: UIStrings;
  isOpen: boolean;
  settings: OllamaSettings;
  userPersona: UserPersona;
  focusSection?: 'general' | 'persona';
  themeId: ThemeId;
  bubbleSchemeId: BubbleSchemeId;
  visualSettings: VisualStudioSettings;
  language: Language;
  onChangeTheme: (themeId: ThemeId) => void;
  onChangeBubbleScheme: (schemeId: BubbleSchemeId) => void;
  onChangeVisualSettings: (next: VisualStudioSettings) => void;
  onChangeLanguage: (lang: Language) => void;
  onClose: () => void;
  onSave: (nextSettings: OllamaSettings, nextUserPersona: UserPersona) => void;
  onExportBackup: () => number;
  onImportBackup: (
    file: File
  ) => Promise<{ charCount: number; chatCount: number }>;
  onReplayGrandIntro: () => void;
}

type SettingsTabId = 'connection' | 'visual' | 'data';

const THEME_LIST: ThemeId[] = [
  'obsidian-violet',
  'midnight-crimson',
  'cyber-emerald',
];

const BUBBLE_SCHEME_LIST: BubbleSchemeId[] = [
  'indigo-violet',
  'crimson-rose',
  'cyber-emerald',
  'ocean-blue',
  'amber-gold',
  'minimalist-glass',
];

const TEXT_SIZE_ORDER: ChatTextSize[] = ['sm', 'md', 'lg', 'xl'];

type DiagState = 'checking' | 'pass' | 'warn' | 'fail';

interface DiagnosticReport {
  ollamaStatus: DiagState;
  ollamaCount: number;
  ollamaDetail?: string;
  secureContext: boolean;
  origin: string;
  speechSupported: boolean;
  pwaStatus: 'active' | 'ready' | 'unsupported';
  micPermission: 'granted' | 'prompt' | 'denied' | 'unknown';
}

export function SettingsModal({
  t,
  isOpen,
  settings,
  userPersona,
  focusSection = 'general',
  themeId,
  bubbleSchemeId,
  visualSettings,
  language,
  onChangeTheme,
  onChangeBubbleScheme,
  onChangeVisualSettings,
  onChangeLanguage,
  onClose,
  onSave,
  onExportBackup,
  onImportBackup,
  onReplayGrandIntro,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('connection');
  const [provider, setProvider] = useState<ApiProvider>(
    settings.provider ?? 'ollama'
  );
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [ollamaBaseUrlDraft, setOllamaBaseUrlDraft] = useState(
    settings.provider === 'openai'
      ? DEFAULT_OLLAMA_URL
      : settings.baseUrl || DEFAULT_OLLAMA_URL
  );
  const [openaiBaseUrlDraft, setOpenaiBaseUrlDraft] = useState(
    settings.openaiBaseUrl ||
      (settings.provider === 'openai' ? settings.baseUrl : DEFAULT_OPENAI_URL)
  );
  const [apiKey, setApiKey] = useState(settings.apiKey ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCustomPresetSelected, setIsCustomPresetSelected] = useState(false);
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel);
  const [availableModels, setAvailableModels] = useState<OllamaModelTag[]>(
    settings.availableModels
  );
  const [temperature, setTemperature] = useState(settings.temperature);
  const [numPredict, setNumPredict] = useState(
    settings.numPredict ?? DEFAULT_NUM_PREDICT
  );
  const [storyMemoryEnabled, setStoryMemoryEnabled] = useState(
    settings.storyMemoryEnabled !== false
  );
  const [personaName, setPersonaName] = useState(userPersona.name);
  const [personaAppearance, setPersonaAppearance] = useState(
    userPersona.appearance
  );
  const [personaBio, setPersonaBio] = useState(userPersona.bio);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccessMessage, setFetchSuccessMessage] = useState<string | null>(
    null
  );
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupNotice, setBackupNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const personaNameInputRef = useRef<HTMLInputElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [diag, setDiag] = useState<DiagnosticReport>({
    ollamaStatus: 'checking',
    ollamaCount: 0,
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    origin:
      typeof window !== 'undefined' ? window.location.origin : 'localhost',
    speechSupported: isSpeechRecognitionSupported(),
    pwaStatus: 'unsupported',
    micPermission: 'unknown',
  });

  const runDiagnostics = useCallback(
    async (
      targetProvider: ApiProvider,
      targetUrl: string,
      targetApiKey?: string
    ) => {
      setIsRunningDiag(true);

      const secureContext =
        typeof window !== 'undefined' ? window.isSecureContext : false;
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'localhost';
      const speechSupported = isSpeechRecognitionSupported();

      let pwaStatus: DiagnosticReport['pwaStatus'] = 'unsupported';
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        if (navigator.serviceWorker.controller) {
          pwaStatus = 'active';
        } else {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            pwaStatus = regs.length > 0 ? 'active' : 'ready';
          } catch {
            pwaStatus = 'ready';
          }
        }
      }

      let micPermission: DiagnosticReport['micPermission'] = 'unknown';
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const res = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          if (
            res.state === 'granted' ||
            res.state === 'prompt' ||
            res.state === 'denied'
          ) {
            micPermission = res.state;
          }
        } catch {
          micPermission = 'unknown';
        }
      }

      setDiag((prev) => ({
        ...prev,
        ollamaStatus: 'checking',
        secureContext,
        origin,
        speechSupported,
        pwaStatus,
        micPermission,
      }));

      const urlCheck = validateProviderBaseUrl(
        targetUrl,
        targetProvider === 'openai' ? DEFAULT_OPENAI_URL : DEFAULT_OLLAMA_URL
      );
      if (!urlCheck.valid) {
        setDiag({
          ollamaStatus: 'fail',
          ollamaCount: 0,
          ollamaDetail: urlCheck.error || t.invalidUrlProtocolError,
          secureContext,
          origin,
          speechSupported,
          pwaStatus,
          micPermission,
        });
        setIsRunningDiag(false);
        return;
      }

      try {
        const models = await fetchProviderModels(
          targetProvider,
          urlCheck.normalized,
          targetApiKey
        );
        setDiag({
          ollamaStatus: models.length > 0 ? 'pass' : 'warn',
          ollamaCount: models.length,
          secureContext,
          origin,
          speechSupported,
          pwaStatus,
          micPermission,
        });
      } catch (err) {
        setDiag({
          ollamaStatus: 'fail',
          ollamaCount: 0,
          ollamaDetail: err instanceof Error ? err.message : undefined,
          secureContext,
          origin,
          speechSupported,
          pwaStatus,
          micPermission,
        });
      } finally {
        setIsRunningDiag(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const initialProvider: ApiProvider =
      settings.provider === 'openai' ? 'openai' : 'ollama';
    const initialUrl =
      settings.baseUrl ||
      (initialProvider === 'openai' ? DEFAULT_OPENAI_URL : DEFAULT_OLLAMA_URL);
    const initialOpenaiUrl =
      settings.openaiBaseUrl ||
      (initialProvider === 'openai' ? initialUrl : DEFAULT_OPENAI_URL);
    const initialOllamaUrl =
      initialProvider === 'ollama' ? initialUrl : DEFAULT_OLLAMA_URL;

    setProvider(initialProvider);
    setBaseUrl(initialUrl);
    setOllamaBaseUrlDraft(initialOllamaUrl);
    setOpenaiBaseUrlDraft(initialOpenaiUrl);
    setApiKey(settings.apiKey ?? '');
    setShowApiKey(false);
    setIsCustomPresetSelected(
      initialProvider === 'openai' &&
        detectOpenAIPresetId(initialUrl) === 'custom'
    );
    setSelectedModel(settings.selectedModel);
    setAvailableModels(settings.availableModels);
    setTemperature(settings.temperature);
    setNumPredict(settings.numPredict ?? DEFAULT_NUM_PREDICT);
    setStoryMemoryEnabled(settings.storyMemoryEnabled !== false);
    setPersonaName(userPersona.name);
    setPersonaAppearance(userPersona.appearance);
    setPersonaBio(userPersona.bio);
    setFetchError(null);
    setFetchSuccessMessage(null);
    setBackupNotice(null);
    setActiveTab(focusSection === 'persona' ? 'data' : 'connection');
    void runDiagnostics(initialProvider, initialUrl, settings.apiKey);

    if (focusSection === 'persona') {
      const timer = window.setTimeout(() => {
        personaNameInputRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, settings, userPersona, focusSection, runDiagnostics]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectProvider = (nextProvider: ApiProvider) => {
    if (nextProvider === provider) return;

    let nextUrl: string;
    if (nextProvider === 'openai') {
      setOllamaBaseUrlDraft(normalizeBaseUrl(baseUrl, DEFAULT_OLLAMA_URL));
      nextUrl = openaiBaseUrlDraft || DEFAULT_OPENAI_URL;
      setIsCustomPresetSelected(detectOpenAIPresetId(nextUrl) === 'custom');
    } else {
      setOpenaiBaseUrlDraft(normalizeBaseUrl(baseUrl, DEFAULT_OPENAI_URL));
      nextUrl = ollamaBaseUrlDraft || DEFAULT_OLLAMA_URL;
    }

    setProvider(nextProvider);
    setBaseUrl(nextUrl);
    setFetchError(null);
    setFetchSuccessMessage(null);
    void runDiagnostics(nextProvider, nextUrl, apiKey);
  };

  const handleSelectPreset = (presetId: OpenAICompatPresetId) => {
    setFetchError(null);
    setFetchSuccessMessage(null);

    if (presetId === 'custom') {
      setIsCustomPresetSelected(true);
      window.requestAnimationFrame(() => {
        urlInputRef.current?.focus();
      });
      return;
    }

    const preset = OPENAI_COMPAT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setIsCustomPresetSelected(false);
    setBaseUrl(preset.baseUrl);
    setOpenaiBaseUrlDraft(preset.baseUrl);
  };

  const activePresetId: OpenAICompatPresetId = isCustomPresetSelected
    ? 'custom'
    : detectOpenAIPresetId(baseUrl);

  const handleFetchModels = async () => {
    setIsFetching(true);
    setFetchError(null);
    setFetchSuccessMessage(null);

    try {
      const fallbackUrl =
        provider === 'openai' ? DEFAULT_OPENAI_URL : DEFAULT_OLLAMA_URL;
      const urlCheck = validateProviderBaseUrl(baseUrl, fallbackUrl);
      if (!urlCheck.valid) {
        setFetchError(urlCheck.error || t.invalidUrlProtocolError);
        setDiag((prev) => ({
          ...prev,
          ollamaStatus: 'fail',
          ollamaCount: 0,
          ollamaDetail: urlCheck.error || t.invalidUrlProtocolError,
        }));
        return;
      }

      const normalized = urlCheck.normalized;
      setBaseUrl(normalized);
      if (provider === 'openai') {
        setOpenaiBaseUrlDraft(normalized);
      } else {
        setOllamaBaseUrlDraft(normalized);
      }

      const models = await fetchProviderModels(provider, normalized, apiKey);
      setAvailableModels(models);

      setDiag((prev) => ({
        ...prev,
        ollamaStatus: models.length > 0 ? 'pass' : 'warn',
        ollamaCount: models.length,
        ollamaDetail: undefined,
      }));

      if (models.length === 0) {
        setFetchSuccessMessage(
          provider === 'openai' ? t.openaiNoModelsMsg : t.noModelsInstalledMsg
        );
      } else {
        setFetchSuccessMessage(
          provider === 'openai'
            ? t.openaiModelsFoundMsg(models.length)
            : t.modelsFoundMsg(models.length)
        );
        const stillExists = models.some((m) => m.name === selectedModel);
        if (!selectedModel || !stillExists) {
          setSelectedModel(models[0].name);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.fetchErrorFallback;
      setFetchError(msg);
      setDiag((prev) => ({
        ...prev,
        ollamaStatus: 'fail',
        ollamaCount: 0,
        ollamaDetail: msg,
      }));
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const fallbackUrl =
      provider === 'openai' ? DEFAULT_OPENAI_URL : DEFAULT_OLLAMA_URL;
    const urlCheck = validateProviderBaseUrl(baseUrl, fallbackUrl);
    if (!urlCheck.valid) {
      setActiveTab('connection');
      setFetchError(urlCheck.error || t.invalidUrlProtocolError);
      return;
    }

    const normalizedCurrent = urlCheck.normalized;
    const savedOpenaiBaseUrl =
      provider === 'openai'
        ? normalizedCurrent
        : normalizeBaseUrl(openaiBaseUrlDraft, DEFAULT_OPENAI_URL);

    onSave(
      {
        provider,
        baseUrl: normalizedCurrent,
        openaiBaseUrl: savedOpenaiBaseUrl,
        apiKey: apiKey.trim(),
        selectedModel: selectedModel.trim(),
        availableModels,
        temperature,
        numPredict,
        numCtx: settings.numCtx ?? DEFAULT_NUM_CTX,
        storyMemoryEnabled,
      },
      {
        name: personaName.trim(),
        appearance: personaAppearance.trim(),
        bio: personaBio.trim(),
      }
    );
    onClose();
  };

  const handleExportClick = () => {
    setBackupNotice(null);
    const charCount = onExportBackup();
    setBackupNotice({
      type: 'success',
      message: t.backupExportSuccess(charCount),
    });
  };

  const handleImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImportingBackup(true);
    setBackupNotice(null);
    try {
      const result = await onImportBackup(file);
      setBackupNotice({
        type: 'success',
        message: t.backupImportSuccess(result.charCount, result.chatCount),
      });
    } catch {
      setBackupNotice({
        type: 'error',
        message: t.backupImportError,
      });
    } finally {
      setIsImportingBackup(false);
    }
  };

  const renderStatusDot = (state: DiagState) => {
    if (state === 'checking') {
      return (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--theme-accent)]" />
      );
    }
    if (state === 'pass') {
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
    }
    if (state === 'warn') {
      return <AlertCircle className="h-4 w-4 shrink-0 text-amber-300" />;
    }
    return <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />;
  };

  const micDiagState: DiagState =
    diag.micPermission === 'granted'
      ? 'pass'
      : diag.micPermission === 'denied'
        ? 'fail'
        : 'warn';

  const micDiagText =
    diag.micPermission === 'granted'
      ? t.diagMicGranted
      : diag.micPermission === 'denied'
        ? t.diagMicDenied
        : diag.micPermission === 'prompt'
          ? t.diagMicPrompt
          : t.diagMicUnknown;

  const pwaDiagState: DiagState =
    diag.pwaStatus === 'active'
      ? 'pass'
      : diag.pwaStatus === 'ready'
        ? 'warn'
        : 'fail';

  const pwaDiagText =
    diag.pwaStatus === 'active'
      ? t.diagPwaActive
      : diag.pwaStatus === 'ready'
        ? t.diagPwaReady
        : t.diagPwaUnsupported;

  const activeBubbleScheme =
    BUBBLE_SCHEMES[bubbleSchemeId] ?? BUBBLE_SCHEMES['indigo-violet'];
  const effectiveUserColor =
    visualSettings.customUserBubbleColor ||
    (activeBubbleScheme.userBaseHex === '#FFFFFF'
      ? '#71717A'
      : activeBubbleScheme.userBaseHex);
  const effectiveDialogueColor =
    visualSettings.customDialogueColor || DEFAULT_DIALOGUE_COLOR;
  const effectiveActionColor =
    visualSettings.customActionColor || DEFAULT_ASSISTANT_ACTION_COLOR;
  const hasCustomColorOverrides = Boolean(
    visualSettings.customUserBubbleColor ||
      visualSettings.customDialogueColor ||
      visualSettings.customActionColor
  );

  const textSizeIndex = Math.max(
    0,
    TEXT_SIZE_ORDER.indexOf(visualSettings.textSize)
  );

  const fontOptions: Array<{
    id: ChatFontFamily;
    label: string;
    sampleStyle: string;
  }> = [
    {
      id: 'sans',
      label: t.fontSansLabel,
      sampleStyle: '"Inter", "DM Sans", sans-serif',
    },
    {
      id: 'serif',
      label: t.fontSerifLabel,
      sampleStyle: 'Georgia, "Times New Roman", serif',
    },
    {
      id: 'mono',
      label: t.fontMonoLabel,
      sampleStyle: '"JetBrains Mono", ui-monospace, monospace',
    },
  ];

  const textSizeLabels: Record<ChatTextSize, string> = {
    sm: t.textSizeSmall,
    md: t.textSizeNormal,
    lg: t.textSizeLarge,
    xl: t.textSizeExtraLarge,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-modal-backdrop)] p-4 backdrop-blur-md transition-colors duration-700 ease-in-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ollama-settings-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass-strong)] text-[var(--theme-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_24px_80px_rgba(0,0,0,0.68)] backdrop-blur-2xl transition-colors duration-700 ease-in-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header + Language Switch + Tabs */}
        <div className="shrink-0 border-b border-[rgba(255,255,255,0.12)] px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="ollama-settings-title"
                className="font-display text-xl font-semibold text-white"
              >
                {t.settingsTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)] sm:text-sm">
                {t.settingsSubtitle}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                role="group"
                aria-label={t.languageLabel}
                className="inline-flex rounded-full border border-white/12 bg-black/45 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => onChangeLanguage('en')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    language === 'en'
                      ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                      : 'text-[var(--theme-muted)] hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLanguage('es')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    language === 'es'
                      ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                      : 'text-[var(--theme-muted)] hover:text-white'
                  }`}
                >
                  ES
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={t.dismiss}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 3 Clean Settings Tabs */}
          <div
            role="tablist"
            aria-label={t.settingsTitle}
            className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'connection'}
              onClick={() => setActiveTab('connection')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'connection'
                  ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                  : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Cpu className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.tabConnectionModel}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'visual'}
              onClick={() => setActiveTab('visual')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'visual'
                  ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                  : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Palette className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.tabVisualStudio}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'data'}
              onClick={() => setActiveTab('data')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'data'
                  ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                  : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Database className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.tabDataBackup}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {activeTab === 'connection' ? (
              <>
                {/* Provider Engine Selector */}
                <div>
                  <span className="mb-2 block text-xs font-medium text-white/85">
                    {t.providerLabel}
                  </span>
                  <div
                    role="group"
                    aria-label={t.providerLabel}
                    className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1"
                  >
                    <button
                      type="button"
                      aria-pressed={provider === 'ollama'}
                      onClick={() => handleSelectProvider('ollama')}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        provider === 'ollama'
                          ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                          : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {t.providerOllamaLabel}
                    </button>
                    <button
                      type="button"
                      aria-pressed={provider === 'openai'}
                      onClick={() => handleSelectProvider('openai')}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        provider === 'openai'
                          ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                          : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {t.providerOpenAILabel}
                    </button>
                  </div>

                  {provider === 'openai' ? (
                    <div className="mt-3">
                      <span className="mb-1.5 block text-[11px] font-medium text-[var(--theme-muted)]">
                        {t.openaiPresetsLabel}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {OPENAI_COMPAT_PRESETS.map((preset) => {
                          const isPresetActive = activePresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              aria-pressed={isPresetActive}
                              onClick={() => handleSelectPreset(preset.id)}
                              className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                                isPresetActive
                                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-white'
                                  : 'border-white/12 bg-black/35 text-[var(--theme-muted)] hover:border-white/25 hover:text-white'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          aria-pressed={activePresetId === 'custom'}
                          onClick={() => handleSelectPreset('custom')}
                          className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                            activePresetId === 'custom'
                              ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-white'
                              : 'border-white/12 bg-black/35 text-[var(--theme-muted)] hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {t.openaiPresetCustom}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Base URL & Fetch Models */}
                <div>
                  <label
                    htmlFor="ollama-url-input"
                    className="mb-1.5 block text-xs font-medium text-white/85"
                  >
                    {provider === 'openai'
                      ? t.openaiBaseUrlLabel
                      : t.ollamaUrlLabel}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      ref={urlInputRef}
                      id="ollama-url-input"
                      type="url"
                      value={baseUrl}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setBaseUrl(nextVal);
                        if (provider === 'openai') {
                          setOpenaiBaseUrlDraft(nextVal);
                          setIsCustomPresetSelected(
                            detectOpenAIPresetId(nextVal) === 'custom'
                          );
                        } else {
                          setOllamaBaseUrlDraft(nextVal);
                        }
                      }}
                      placeholder={
                        provider === 'openai'
                          ? DEFAULT_OPENAI_URL
                          : DEFAULT_OLLAMA_URL
                      }
                      className="h-11 flex-1 rounded-2xl border border-white/15 bg-black/40 px-4 font-mono text-sm text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleFetchModels}
                      disabled={isFetching}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-wait disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0"
                    >
                      {isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span>
                        {isFetching ? t.fetchingModels : t.fetchModels}
                      </span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--theme-muted)]">
                    {provider === 'openai'
                      ? t.openaiBaseUrlHint
                      : t.ollamaCorsHint}
                  </p>
                </div>

                {/* Optional API Key (OpenAI-Compatible Mode) */}
                {provider === 'openai' ? (
                  <div>
                    <label
                      htmlFor="openai-api-key-input"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/85"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                      <span>{t.apiKeyLabel}</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="openai-api-key-input"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t.apiKeyPlaceholder}
                        autoComplete="off"
                        spellCheck={false}
                        className="h-11 w-full rounded-2xl border border-white/15 bg-black/40 pr-11 pl-4 font-mono text-sm text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey((prev) => !prev)}
                        aria-label={showApiKey ? t.apiKeyHide : t.apiKeyShow}
                        title={showApiKey ? t.apiKeyHide : t.apiKeyShow}
                        className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--theme-muted)]">
                      <Lock className="h-3 w-3 shrink-0 text-[var(--theme-accent)]" />
                      <span>
                        {hasOsSecretStorage()
                          ? t.apiKeyHintElectron
                          : t.apiKeyHintBrowser}
                      </span>
                    </p>
                  </div>
                ) : null}

                {fetchError ? (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-2xl border border-rose-500/35 bg-rose-950/60 p-3.5 text-xs leading-relaxed text-rose-100"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                    <span>{fetchError}</span>
                  </div>
                ) : null}

                {fetchSuccessMessage ? (
                  <div
                    role="status"
                    className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/35 bg-emerald-950/55 p-3.5 text-xs leading-relaxed text-emerald-100"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{fetchSuccessMessage}</span>
                  </div>
                ) : null}

                {/* Model Selector */}
                <div>
                  <label
                    htmlFor="ollama-model-select"
                    className="mb-1.5 block text-xs font-medium text-white/85"
                  >
                    {t.activeModelLabel}
                  </label>
                  <select
                    id="ollama-model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/15 bg-black/45 px-4 font-mono text-sm text-white focus:border-[var(--theme-accent)] focus:outline-none"
                  >
                    {availableModels.length === 0 ? (
                      <option value="" className="bg-[#121218]">
                        {t.noModelsLoadedOption}
                      </option>
                    ) : null}
                    {selectedModel &&
                    availableModels.length > 0 &&
                    !availableModels.some((m) => m.name === selectedModel) ? (
                      <option value={selectedModel} className="bg-[#121218]">
                        {selectedModel} {t.customModelOptionSuffix}
                      </option>
                    ) : null}
                    {availableModels.map((model) => {
                      const paramSize = model.details?.parameter_size;
                      const fileSize = formatModelSize(model.size);
                      const meta = [paramSize, fileSize]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <option
                          key={model.name}
                          value={model.name}
                          className="bg-[#121218]"
                        >
                          {meta ? `${model.name} (${meta})` : model.name}
                        </option>
                      );
                    })}
                  </select>

                  <div className="mt-2.5">
                    <label
                      htmlFor="ollama-manual-model"
                      className="mb-1 block text-[11px] text-[var(--theme-muted)]"
                    >
                      {t.manualModelLabel}
                    </label>
                    <input
                      id="ollama-manual-model"
                      type="text"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder={
                        provider === 'openai'
                          ? t.openaiManualModelPlaceholder
                          : t.manualModelPlaceholder
                      }
                      className="h-10 w-full rounded-xl border border-white/12 bg-black/35 px-3.5 font-mono text-xs text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Temperature & Response Length Sliders */}
                <div className="grid gap-5 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <label
                        htmlFor="ollama-temp-range"
                        className="font-medium text-white/85"
                      >
                        {t.temperatureLabel}
                      </label>
                      <span className="font-mono tabular-nums text-[var(--theme-accent)]">
                        {temperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id="ollama-temp-range"
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={temperature}
                      onChange={(e) =>
                        setTemperature(parseFloat(e.target.value))
                      }
                      className="h-2 w-full cursor-pointer accent-[var(--theme-accent)]"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-[var(--theme-muted)]">
                      <span>{t.tempFocused}</span>
                      <span>{t.tempBalanced}</span>
                      <span>{t.tempExpressive}</span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <label
                        htmlFor="ollama-num-predict-range"
                        className="font-medium text-white/85"
                      >
                        {t.responseLengthLabel}
                      </label>
                      <span className="font-mono tabular-nums text-[var(--theme-accent)]">
                        {t.responseLengthValue(numPredict)}
                      </span>
                    </div>
                    <input
                      id="ollama-num-predict-range"
                      type="range"
                      min={150}
                      max={500}
                      step={10}
                      value={numPredict}
                      onChange={(e) =>
                        setNumPredict(parseInt(e.target.value, 10))
                      }
                      className="h-2 w-full cursor-pointer accent-[var(--theme-accent)]"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-[var(--theme-muted)]">
                      <span>{t.responseLengthConcise}</span>
                      <span>{t.responseLengthBalanced}</span>
                      <span>{t.responseLengthDetailed}</span>
                    </div>
                  </div>
                </div>

                {/* Silent Background Story Memory Toggle */}
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Brain
                        className="h-4 w-4 shrink-0 text-[var(--theme-accent)]"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-white">
                        {t.storyMemoryToggleLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
                      {t.storyMemoryToggleHint}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={storyMemoryEnabled}
                    aria-label={t.storyMemoryToggleLabel}
                    onClick={() => setStoryMemoryEnabled((prev) => !prev)}
                    className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] ${
                      storyMemoryEnabled
                        ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]'
                        : 'border-white/20 bg-black/50'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        storyMemoryEnabled ? 'translate-x-5.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* System & Security Check Diagnostic Panel */}
                <div className="rounded-2xl border border-[var(--theme-border)] bg-black/35 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className="h-4 w-4 text-[var(--theme-accent)]"
                        aria-hidden="true"
                      />
                      <h3 className="font-display text-sm font-semibold text-white">
                        {t.diagnosticsTitle}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void runDiagnostics(provider, baseUrl, apiKey)
                      }
                      disabled={isRunningDiag}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-60 whitespace-nowrap"
                    >
                      {isRunningDiag ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      <span>
                        {isRunningDiag
                          ? t.diagnosticsRunning
                          : t.diagnosticsRerun}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      {renderStatusDot(diag.ollamaStatus)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">
                          {provider === 'openai'
                            ? t.diagApiLabel
                            : t.diagOllamaLabel}
                        </div>
                        <div className="text-[var(--theme-muted)]">
                          {diag.ollamaStatus === 'checking'
                            ? t.diagOllamaChecking
                            : diag.ollamaStatus === 'pass'
                              ? t.diagOllamaConnected(diag.ollamaCount)
                              : diag.ollamaStatus === 'warn'
                                ? t.diagOllamaEmpty
                                : diag.ollamaDetail ||
                                  (provider === 'openai'
                                    ? t.diagApiFailed
                                    : t.diagOllamaFailed)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      {renderStatusDot(diag.secureContext ? 'pass' : 'fail')}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">
                          {t.diagSecureContextLabel}
                        </div>
                        <div className="text-[var(--theme-muted)]">
                          {diag.secureContext
                            ? t.diagSecureContextPass(diag.origin)
                            : t.diagSecureContextFail(diag.origin)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      {renderStatusDot(diag.speechSupported ? 'pass' : 'fail')}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">
                          {t.diagSpeechLabel}
                        </div>
                        <div className="text-[var(--theme-muted)]">
                          {diag.speechSupported
                            ? t.diagSpeechPass
                            : t.diagSpeechFail}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      {renderStatusDot(micDiagState)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">
                          {t.diagMicPermissionLabel}
                        </div>
                        <div className="text-[var(--theme-muted)]">
                          {micDiagText}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      {renderStatusDot(pwaDiagState)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">
                          {t.diagPwaLabel}
                        </div>
                        <div className="text-[var(--theme-muted)]">
                          {pwaDiagText}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 border-t border-white/10 pt-2.5 text-[11px] leading-relaxed text-[var(--theme-muted)]">
                    {t.diagLocalSslNote}
                  </p>
                </div>
              </>
            ) : null}

            {activeTab === 'visual' ? (
              <>
                {/* Live Chat & Glass Preview Stage */}
                <div
                  className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.12)] p-4"
                  style={{
                    background:
                      'radial-gradient(circle at 20% 20%, var(--theme-accent-soft), transparent 54%), radial-gradient(circle at 80% 75%, var(--theme-accent-soft), transparent 58%), var(--theme-bg)',
                  }}
                >
                  <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-[var(--theme-muted)]">
                    <span>{t.visualPreviewTitle}</span>
                    <span className="font-mono tabular-nums">
                      {visualSettings.glassOpacity}% ·{' '}
                      {textSizeLabels[visualSettings.textSize]}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div
                      className="max-w-[88%] rounded-[20px] rounded-tl-[6px] border px-3.5 py-2.5"
                      style={{
                        backgroundColor: 'var(--bubble-assistant-bg)',
                        borderColor: 'var(--bubble-assistant-border)',
                        backdropFilter:
                          'blur(var(--chat-glass-blur, 20px)) saturate(160%)',
                        WebkitBackdropFilter:
                          'blur(var(--chat-glass-blur, 20px)) saturate(160%)',
                        boxShadow:
                          'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 8px 32px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <MessageContent
                        content={t.visualPreviewAssistantMsg}
                        variant="assistant"
                      />
                    </div>

                    <div className="flex justify-end">
                      <div
                        className="max-w-[82%] rounded-[20px] rounded-tr-[6px] border px-3.5 py-2.5"
                        style={{
                          backgroundColor: 'var(--bubble-user-bg)',
                          borderColor: 'var(--bubble-user-border)',
                          backdropFilter:
                            'blur(var(--chat-glass-blur, 20px)) saturate(160%)',
                          WebkitBackdropFilter:
                            'blur(var(--chat-glass-blur, 20px)) saturate(160%)',
                          boxShadow:
                            'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 8px 32px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        <MessageContent
                          content={t.visualPreviewUserMsg}
                          variant="user"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Dark-Mode Theme Palettes */}
                <div>
                  <span className="mb-2.5 block text-xs font-medium text-white/85">
                    {t.darkPaletteLabel}
                  </span>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {THEME_LIST.map((id) => {
                      const palette = THEME_PALETTES[id];
                      const meta = t.themes[id];
                      const isSelected = themeId === id;

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onChangeTheme(id)}
                          aria-pressed={isSelected}
                          className={`group flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] ${
                            isSelected
                              ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                              : 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] hover:border-white/25 hover:bg-[var(--theme-glass-hover)]'
                          }`}
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {palette.swatches.map((hex, idx) => (
                                <span
                                  key={idx}
                                  className="h-4 w-4 rounded-full border border-white/20"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                            {isSelected ? (
                              <Check className="h-4 w-4 text-[var(--theme-accent)]" />
                            ) : null}
                          </div>
                          <div>
                            <div className="font-display text-xs font-semibold text-white">
                              {meta.name}
                            </div>
                            <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--theme-muted)]">
                              {meta.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6 Chat Bubble Color Schemes */}
                <div>
                  <span className="mb-2.5 block text-xs font-medium text-white/85">
                    {t.bubbleSchemeLabel}
                  </span>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {BUBBLE_SCHEME_LIST.map((id) => {
                      const scheme = BUBBLE_SCHEMES[id];
                      const meta = t.bubbleSchemes[id];
                      const isSelected = bubbleSchemeId === id;

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onChangeBubbleScheme(id)}
                          aria-pressed={isSelected}
                          className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] ${
                            isSelected
                              ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                              : 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] hover:border-white/25 hover:bg-[var(--theme-glass-hover)]'
                          }`}
                        >
                          <div className="mb-2.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-4 w-7 rounded-full border border-white/20"
                                style={{ backgroundColor: scheme.swatches[0] }}
                              />
                              <span
                                className="h-4 w-7 rounded-full border border-white/20"
                                style={{ backgroundColor: scheme.swatches[1] }}
                              />
                            </div>
                            {isSelected ? (
                              <Check className="h-4 w-4 text-[var(--theme-accent)]" />
                            ) : null}
                          </div>
                          <div>
                            <div className="font-display text-xs font-semibold text-white">
                              {meta.name}
                            </div>
                            <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--theme-muted)]">
                              {meta.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Family Selector */}
                <div>
                  <span className="mb-2.5 block text-xs font-medium text-white/85">
                    {t.fontFamilyLabel}
                  </span>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {fontOptions.map((fontOpt) => {
                      const isSelected =
                        visualSettings.fontFamily === fontOpt.id;
                      return (
                        <button
                          key={fontOpt.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() =>
                            onChangeVisualSettings({
                              ...visualSettings,
                              fontFamily: fontOpt.id,
                            })
                          }
                          className={`flex items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition-all ${
                            isSelected
                              ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                              : 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] text-[var(--theme-muted)] hover:border-white/25 hover:bg-[var(--theme-glass-hover)] hover:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div
                              className="text-base font-medium text-white"
                              style={{ fontFamily: fontOpt.sampleStyle }}
                            >
                              Aa Bb
                            </div>
                            <div className="mt-0.5 truncate text-[11px] font-medium">
                              {fontOpt.label}
                            </div>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chat Text Size & Glass Opacity Sliders */}
                <div className="grid gap-5 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] p-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <label
                        htmlFor="visual-text-size-range"
                        className="font-medium text-white/85"
                      >
                        {t.textSizeLabel}
                      </label>
                      <span className="font-mono text-[var(--theme-accent)]">
                        {textSizeLabels[visualSettings.textSize]}
                      </span>
                    </div>
                    <input
                      id="visual-text-size-range"
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={textSizeIndex}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10);
                        const nextSize = TEXT_SIZE_ORDER[idx] ?? 'md';
                        onChangeVisualSettings({
                          ...visualSettings,
                          textSize: nextSize,
                        });
                      }}
                      className="h-2 w-full cursor-pointer accent-[var(--theme-accent)]"
                    />
                    <div className="mt-1.5 flex justify-between text-[11px] text-[var(--theme-muted)]">
                      {TEXT_SIZE_ORDER.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() =>
                            onChangeVisualSettings({
                              ...visualSettings,
                              textSize: sz,
                            })
                          }
                          className={`transition-colors ${
                            visualSettings.textSize === sz
                              ? 'font-semibold text-[var(--theme-accent)]'
                              : 'hover:text-white'
                          }`}
                        >
                          {textSizeLabels[sz]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <label
                        htmlFor="visual-glass-opacity-range"
                        className="font-medium text-white/85"
                      >
                        {t.glassOpacityLabel}
                      </label>
                      <span className="font-mono tabular-nums text-[var(--theme-accent)]">
                        {visualSettings.glassOpacity}%
                      </span>
                    </div>
                    <input
                      id="visual-glass-opacity-range"
                      type="range"
                      min={20}
                      max={95}
                      step={1}
                      value={visualSettings.glassOpacity}
                      onChange={(e) =>
                        onChangeVisualSettings({
                          ...visualSettings,
                          glassOpacity: parseInt(e.target.value, 10),
                        })
                      }
                      className="h-2 w-full cursor-pointer accent-[var(--theme-accent)]"
                    />
                    <div className="mt-1.5 flex justify-between text-[11px] text-[var(--theme-muted)]">
                      <span>{t.glassOpacitySheer}</span>
                      <span>{t.glassOpacityBalanced}</span>
                      <span>{t.glassOpacitySolid}</span>
                    </div>
                  </div>
                </div>

                {/* Custom Color Pickers + Reset to Theme Default */}
                <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-white/85">
                      {t.customColorsLabel}
                    </span>
                    <button
                      type="button"
                      disabled={!hasCustomColorOverrides}
                      onClick={() =>
                        onChangeVisualSettings({
                          ...visualSettings,
                          customUserBubbleColor: undefined,
                          customDialogueColor: undefined,
                          customActionColor: undefined,
                        })
                      }
                      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.06] px-3 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{t.resetToThemeDefault}</span>
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="flex items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 cursor-pointer hover:border-white/25">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-white">
                          {t.userBubbleColorLabel}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] uppercase text-[var(--theme-muted)]">
                          {effectiveUserColor}
                        </div>
                      </div>
                      <input
                        type="color"
                        value={effectiveUserColor}
                        onChange={(e) =>
                          onChangeVisualSettings({
                            ...visualSettings,
                            customUserBubbleColor: e.target.value,
                          })
                        }
                        className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 cursor-pointer hover:border-white/25">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-white">
                          {t.dialogueColorLabel}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] uppercase text-[var(--theme-muted)]">
                          {effectiveDialogueColor}
                        </div>
                      </div>
                      <input
                        type="color"
                        value={effectiveDialogueColor}
                        onChange={(e) =>
                          onChangeVisualSettings({
                            ...visualSettings,
                            customDialogueColor: e.target.value,
                          })
                        }
                        className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 cursor-pointer hover:border-white/25">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-white">
                          {t.actionColorLabel}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] uppercase text-[var(--theme-muted)]">
                          {effectiveActionColor}
                        </div>
                      </div>
                      <input
                        type="color"
                        value={effectiveActionColor}
                        onChange={(e) =>
                          onChangeVisualSettings({
                            ...visualSettings,
                            customActionColor: e.target.value,
                          })
                        }
                        className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
                      />
                    </label>
                  </div>
                </div>

                {/* Grand Intro Showcase Replay */}
                <div className="rounded-2xl border border-[var(--theme-border)] bg-black/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                        {t.replayGrandIntroLabel}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
                        {t.replayGrandIntroHint}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onReplayGrandIntro}
                      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-cyan-400/35 bg-cyan-500/12 px-4 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-300/60 hover:bg-cyan-500/22 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>{t.replayGrandIntroButton}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === 'data' ? (
              <>
                {/* User Persona Profile */}
                <div className="rounded-2xl border border-[var(--theme-border)] bg-black/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User
                        className="h-4 w-4 text-[var(--theme-accent)]"
                        aria-hidden="true"
                      />
                      <h3 className="font-display text-sm font-semibold text-white">
                        {t.userPersonaSectionTitle}
                      </h3>
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        personaName.trim() ||
                        personaAppearance.trim() ||
                        personaBio.trim()
                          ? 'text-[var(--theme-accent)]'
                          : 'text-[var(--theme-muted)]'
                      }`}
                    >
                      {personaName.trim() ||
                      personaAppearance.trim() ||
                      personaBio.trim()
                        ? t.userPersonaActiveHint
                        : t.userPersonaEmptyHint}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
                    {t.userPersonaSectionSubtitle}
                  </p>

                  <div className="mt-3.5 space-y-3">
                    <div>
                      <label
                        htmlFor="user-persona-name"
                        className="mb-1 block text-xs font-medium text-white/85"
                      >
                        {t.userPersonaNameLabel}
                      </label>
                      <input
                        ref={personaNameInputRef}
                        id="user-persona-name"
                        type="text"
                        maxLength={80}
                        value={personaName}
                        onChange={(e) => setPersonaName(e.target.value)}
                        placeholder={t.userPersonaNamePlaceholder}
                        className="h-10 w-full rounded-xl border border-white/15 bg-black/40 px-3.5 text-sm text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="user-persona-appearance"
                        className="mb-1 block text-xs font-medium text-white/85"
                      >
                        {t.userPersonaAppearanceLabel}
                      </label>
                      <textarea
                        id="user-persona-appearance"
                        rows={2}
                        maxLength={500}
                        value={personaAppearance}
                        onChange={(e) => setPersonaAppearance(e.target.value)}
                        placeholder={t.userPersonaAppearancePlaceholder}
                        className="w-full resize-y rounded-xl border border-white/15 bg-black/40 p-3 text-sm leading-relaxed text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="user-persona-bio"
                        className="mb-1 block text-xs font-medium text-white/85"
                      >
                        {t.userPersonaBioLabel}
                      </label>
                      <textarea
                        id="user-persona-bio"
                        rows={3}
                        maxLength={700}
                        value={personaBio}
                        onChange={(e) => setPersonaBio(e.target.value)}
                        placeholder={t.userPersonaBioPlaceholder}
                        className="w-full resize-y rounded-xl border border-white/15 bg-black/40 p-3 text-sm leading-relaxed text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Data Backup & Transfer (.json) */}
                <div className="rounded-2xl border border-[var(--theme-border)] bg-black/35 p-4">
                  <h3 className="font-display text-sm font-semibold text-white">
                    {t.backupTitle}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
                    {t.backupSubtitle}
                  </p>

                  <input
                    ref={backupInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />

                  <div className="mt-3.5 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleExportClick}
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-white/10 px-4 text-xs font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                      <span>{t.exportBackupButton}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isImportingBackup}
                      onClick={() => backupInputRef.current?.click()}
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-black/40 px-4 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap"
                    >
                      {isImportingBackup ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                      )}
                      <span>{t.importBackupButton}</span>
                    </button>
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-relaxed text-[var(--theme-muted)]">
                    <Lock className="h-3 w-3 shrink-0 text-[var(--theme-accent)]" />
                    <span>{t.backupSecurityNote}</span>
                  </p>

                  {backupNotice ? (
                    <div
                      role={backupNotice.type === 'error' ? 'alert' : 'status'}
                      className={`mt-3 flex items-start gap-2.5 rounded-2xl border p-3 text-xs leading-relaxed ${
                        backupNotice.type === 'error'
                          ? 'border-rose-500/35 bg-rose-950/60 text-rose-100'
                          : 'border-emerald-500/35 bg-emerald-950/55 text-emerald-100'
                      }`}
                    >
                      {backupNotice.type === 'error' ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      )}
                      <span>{backupNotice.message}</span>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          {/* Modal Footer Actions & Authorship Watermark */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/25 px-6 py-4">
            <div className="flex items-center gap-2 select-none">
              <span className="text-[11px] font-medium tracking-wide text-white/40">
                {t.settingsWatermark}
              </span>
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--theme-accent)]/85">
                {t.appVersion}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-full px-5 text-sm font-medium text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="h-10 rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
                style={{
                  backgroundColor: 'var(--theme-accent)',
                  color: 'var(--theme-on-accent)',
                }}
              >
                {t.saveSettings}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
