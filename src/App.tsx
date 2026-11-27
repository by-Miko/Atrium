/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AtriumLobby } from './components/AtriumLobby';
import { CharacterModal } from './components/CharacterModal';
import { CharacterProfileModal } from './components/CharacterProfileModal';
import { ChatWindow } from './components/ChatWindow';
import { GrandIntroSplash } from './components/GrandIntroSplash';
import { ImageLightbox } from './components/ImageLightbox';
import { IntroSplash } from './components/IntroSplash';
import { MobileLinkModal } from './components/MobileLinkModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OllamaSetupHelper } from './components/OllamaSetupHelper';
import { OutroSplash } from './components/OutroSplash';
import { SettingsModal } from './components/SettingsModal';
import { StoryMemoryModal } from './components/StoryMemoryModal';
import { DEFAULT_CHARACTERS } from './data/defaultCharacters';
import { TRANSLATIONS } from './i18n/translations';
import {
  DEFAULT_VISUAL_STUDIO_SETTINGS,
  getThemeCssVariables,
} from './themes/palettes';
import type {
  ApiProvider,
  BubbleSchemeId,
  Character,
  ChatMessage,
  Language,
  MobileLinkStatus,
  MobilePairingProfile,
  MobileSyncStatePayload,
  OllamaSettings,
  PocketAiLocalModelRecord,
  PocketAiLoopbackPreset,
  PocketAiMode,
  PocketAiModelSpec,
  PocketAiRuntimeState,
  SmartRouteType,
  StoryMemoryEntry,
  ThemeId,
  UserPersona,
  VisualStudioSettings,
  WallpaperFitMode,
} from './types/chat';
import {
  downloadAtriumBackup,
  parseAtriumBackupFile,
} from './utils/backup';
import {
  createInitialPocketAiRuntimeState,
  downloadAndVerifyPocketAiModel,
  inspectDeviceMemoryTier,
  loadInstalledPocketAiModels,
  loadNativePocketAiModel,
  saveInstalledPocketAiModels,
  savePocketAiConfig,
  unloadNativePocketAiModel,
  verifyAndImportLocalGgufFile,
  type PocketAiDownloadProgress,
} from './utils/mobileLocalAi';
import {
  bootstrapMobileLinkSession,
  buildMobileSyncPayload,
  clearMobileLinkSessionToken,
  computeMobileSyncContentFingerprint,
  computeMobileSyncSignature,
  computeMobileSyncStateHash,
  fetchMobileSyncState,
  getActiveMobileLinkOrigin,
  getMobileLinkEventsUrl,
  isLocalLoopbackUrl,
  isPublicHttpsApiUrl,
  loadMobilePairingProfile,
  postMobileSyncState,
  resolveBestMobileLinkRoute,
  saveMobilePairingProfile,
  serializeNormalizedSyncPayload,
  setActiveMobileLinkOrigin,
  setMobileLinkClientActive,
  type SmartRouteResolution,
} from './utils/mobileSync';
import {
  DEFAULT_OLLAMA_URL,
  DEFAULT_OPENAI_URL,
  fetchProviderModels,
  streamProviderChat,
  summarizeConversationMemory,
} from './utils/ollama';
import { isMobileOrAndroidRuntime } from './utils/platform';
import {
  DEFAULT_OLLAMA_SETTINGS,
  DEFAULT_USER_PERSONA,
  STORAGE_KEYS,
  applyCharacterOrder,
  hydrateCharacters,
  hydrateVisualSettings,
  idbSet,
  loadAllPersistedState,
  loadMobileSyncUpdatedAt,
  loadSavedCharacterOrder,
  loadSavedLobbyBackdropMode,
  saveApiKeySecurely,
  saveCharacterOrder,
  saveLanguagePreference,
  saveLobbyBackdropMode,
  saveMobileSyncUpdatedAt,
  stripSecretFromSettings,
} from './utils/storage';

function buildSystemPromptWithPersona(
  baseSystemPrompt: string,
  persona: UserPersona
): string {
  const name = persona.name.trim();
  const appearance = persona.appearance.trim();
  const bio = persona.bio.trim();

  if (!name && !appearance && !bio) {
    return baseSystemPrompt;
  }

  const lines: string[] = [
    '[User Persona — The user you are roleplaying with]',
  ];
  if (name) {
    lines.push(`Name: ${name}`);
  }
  if (appearance) {
    lines.push(`Physical Appearance: ${appearance}`);
  }
  if (bio) {
    lines.push(`Personality & Roleplay Bio: ${bio}`);
  }
  lines.push(
    'Incorporate awareness of the user’s name, physical appearance, and background naturally when relevant, while staying strictly in character.'
  );

  return `${baseSystemPrompt.trim()}\n\n${lines.join('\n')}`;
}

function buildEffectiveSystemPrompt(
  baseSystemPrompt: string,
  persona: UserPersona,
  storyMemory?: StoryMemoryEntry,
  storyMemoryEnabled = true
): string {
  const withPersona = buildSystemPromptWithPersona(baseSystemPrompt, persona);
  const summary = storyMemory?.summary.trim();
  if (!storyMemoryEnabled || !summary) {
    return withPersona;
  }

  return `${withPersona.trim()}\n\n[Long-Term Story Memory — Key events & context from earlier in this roleplay]\n${summary}`;
}

const RECENT_VERBATIM_WINDOW = 8;
const SUMMARY_INTERVAL_MESSAGES = 20;

function selectContextMessages(
  history: ChatMessage[],
  storyMemory?: StoryMemoryEntry,
  storyMemoryEnabled = true
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const valid = history.filter(
    (m) => !m.isError && m.content.trim().length > 0
  );
  if (
    !storyMemoryEnabled ||
    !storyMemory?.summary.trim() ||
    storyMemory.summarizedMessageCount <= 0 ||
    valid.length <= RECENT_VERBATIM_WINDOW
  ) {
    return valid.map((m) => ({ role: m.role, content: m.content }));
  }

  const startIndex = Math.max(
    0,
    Math.min(
      storyMemory.summarizedMessageCount,
      valid.length - RECENT_VERBATIM_WINDOW
    )
  );
  return valid.slice(startIndex).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function makeMessageId(): string {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const GRAND_INTRO_STORAGE_KEY = 'atrium_grand_intro_last_played_at';
const GRAND_INTRO_INTERVAL_MS = 12 * 60 * 60 * 1000;

const EMPTY_MOBILE_LINK_STATUS: MobileLinkStatus = {
  active: false,
  port: null,
  token: null,
  urls: { lan: [], tailscale: [] },
  lanUrl: null,
  vpnUrl: null,
  vpnProvider: null,
  vpnProviders: [],
  connectedClients: 0,
  lastSyncAt: null,
};

function serializeSyncBody(
  payload: Omit<MobileSyncStatePayload, 'updatedAt'>
): string {
  return computeMobileSyncStateHash(payload);
}

function resolveInitialIntroMode(): 'grand' | 'quick' {
  try {
    const raw = window.localStorage.getItem(GRAND_INTRO_STORAGE_KEY);
    if (!raw) return 'grand';
    const lastPlayedAt = Number(raw);
    if (!Number.isFinite(lastPlayedAt) || lastPlayedAt <= 0) {
      return 'grand';
    }
    return Date.now() - lastPlayedAt >= GRAND_INTRO_INTERVAL_MS
      ? 'grand'
      : 'quick';
  } catch {
    return 'grand';
  }
}

export default function App() {
  const [characterOrder, setCharacterOrder] = useState<string[]>(() =>
    loadSavedCharacterOrder()
  );
  const [characters, setCharacters] = useState<Character[]>(() =>
    applyCharacterOrder(DEFAULT_CHARACTERS, loadSavedCharacterOrder())
  );
  const [activeCharacterId, setActiveCharacterId] = useState<string>(
    DEFAULT_CHARACTERS[0].id
  );
  const [conversations, setConversations] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [storyMemories, setStoryMemories] = useState<
    Record<string, StoryMemoryEntry>
  >({});
  const [settings, setSettings] = useState<OllamaSettings>(
    DEFAULT_OLLAMA_SETTINGS
  );
  const [userPersona, setUserPersona] =
    useState<UserPersona>(DEFAULT_USER_PERSONA);
  const [themeId, setThemeId] = useState<ThemeId>('obsidian-violet');
  const [bubbleSchemeId, setBubbleSchemeId] =
    useState<BubbleSchemeId>('indigo-violet');
  const [language, setLanguage] = useState<Language>('en');
  const [wallpaperFit, setWallpaperFit] = useState<WallpaperFitMode>('cover');
  const [parallaxEnabled, setParallaxEnabled] = useState(true);
  const [visualSettings, setVisualSettings] = useState<VisualStudioSettings>(
    () => ({
      ...DEFAULT_VISUAL_STUDIO_SETTINGS,
      lobbyBackdropMode: loadSavedLobbyBackdropMode(),
    })
  );
  const [isStorageReady, setIsStorageReady] = useState(false);

  const [activeWorld, setActiveWorld] = useState<'lobby' | 'chat'>('lobby');
  const [showOutro, setShowOutro] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsFocusSection, setSettingsFocusSection] = useState<
    'general' | 'persona'
  >('general');
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(
    null
  );
  const [profileCharacter, setProfileCharacter] = useState<Character | null>(
    null
  );
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);
  const [streamingCharacterId, setStreamingCharacterId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [introMode, setIntroMode] = useState<'grand' | 'quick' | null>(() =>
    resolveInitialIntroMode()
  );
  const showIntro = introMode !== null;
  const [lobbyWillChange, setLobbyWillChange] = useState(true);
  const [ollamaStatus, setOllamaStatus] = useState<
    'checking' | 'connected' | 'offline'
  >('checking');
  const [showOllamaSetupHelper, setShowOllamaSetupHelper] = useState(false);
  const [isStoryMemoryOpen, setIsStoryMemoryOpen] = useState(false);

  const [initialMobileLinkSession] = useState(() =>
    bootstrapMobileLinkSession()
  );
  const isElectronHost =
    typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
  const isMobileClientRuntime = !isElectronHost && isMobileOrAndroidRuntime();
  const [isMobileLinkClient, setIsMobileLinkClient] = useState<boolean>(
    () =>
      !isElectronHost &&
      Boolean(
        initialMobileLinkSession.hadUrlToken || initialMobileLinkSession.token
      )
  );
  const [mobilePairingProfile, setMobilePairingProfile] =
    useState<MobilePairingProfile | null>(() =>
      !isElectronHost ? loadMobilePairingProfile() : null
    );
  const [activeSmartRoute, setActiveSmartRoute] =
    useState<SmartRouteType | null>(() =>
      !isElectronHost ? loadMobilePairingProfile()?.activeRouteType ?? null : null
    );
  const [mobileLinkStatus, setMobileLinkStatus] = useState<MobileLinkStatus>(
    EMPTY_MOBILE_LINK_STATUS
  );
  const [isMobileLinkModalOpen, setIsMobileLinkModalOpen] = useState(false);

  const [pocketAiState, setPocketAiState] = useState<PocketAiRuntimeState>(() =>
    createInitialPocketAiRuntimeState()
  );
  const [installedPocketModels, setInstalledPocketModels] = useState<
    PocketAiLocalModelRecord[]
  >([]);
  const [pocketDownloadingModelId, setPocketDownloadingModelId] = useState<
    string | null
  >(null);
  const [pocketDownloadProgress, setPocketDownloadProgress] =
    useState<PocketAiDownloadProgress | null>(null);
  const [pocketLocalAiError, setPocketLocalAiError] = useState<string | null>(
    null
  );

  const t = TRANSLATIONS[language];

  const abortControllerRef = useRef<AbortController | null>(null);
  const pocketDownloadAbortRef = useRef<AbortController | null>(null);
  const backgroundUnloadTimerRef = useRef<number | null>(null);
  const charactersRef = useRef(characters);
  charactersRef.current = characters;
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const storyMemoriesRef = useRef(storyMemories);
  storyMemoriesRef.current = storyMemories;
  const summarizingCharIdsRef = useRef<Set<string>>(new Set());
  const lastSummaryAttemptCountRef = useRef<Record<string, number>>({});
  const syncUpdatedAtRef = useRef<number>(0);
  const hasHydratedForSyncRef = useRef<boolean>(false);
  const isApplyingRemoteSyncRef = useRef<boolean>(false);
  const remoteSyncResetTimerRef = useRef<number | null>(null);
  const pendingPushTimerRef = useRef<number | null>(null);
  const isSyncRequestInFlightRef = useRef<boolean>(false);
  const lastSyncedBodyJsonRef = useRef<string>('');
  const lastAppliedRemoteSignatureRef = useRef<string>('');
  const lastSyncedFingerprintRef = useRef<string>('');
  const lastAppliedPayloadRef = useRef<string>('');
  const isSettingsOpenRef = useRef<boolean>(isSettingsOpen);
  isSettingsOpenRef.current = isSettingsOpen;
  const streamingCharIdRef = useRef<string | null>(null);
  streamingCharIdRef.current = streamingCharacterId;
  const mobilePairingProfileRef = useRef(mobilePairingProfile);
  mobilePairingProfileRef.current = mobilePairingProfile;
  const isMobileLinkClientRef = useRef(isMobileLinkClient);
  isMobileLinkClientRef.current = isMobileLinkClient;
  const pocketAiStateRef = useRef(pocketAiState);
  pocketAiStateRef.current = pocketAiState;

  useEffect(() => {
    if (introMode === 'grand') {
      try {
        window.localStorage.setItem(
          GRAND_INTRO_STORAGE_KEY,
          String(Date.now())
        );
      } catch {
        // Ignore storage write errors in restricted contexts
      }
    }
  }, [introMode]);

  const handleIntroComplete = useCallback(() => {
    setIntroMode(null);
  }, []);

  const handleReplayGrandIntro = useCallback(() => {
    setIsSettingsOpen(false);
    setIntroMode('grand');
  }, []);

  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === activeCharacterId) ?? characters[0],
    [characters, activeCharacterId]
  );

  const activeMessages = useMemo(
    () => conversations[activeCharacter.id] ?? [],
    [conversations, activeCharacter.id]
  );

  const messageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [charId, msgs] of Object.entries(conversations)) {
      counts[charId] = msgs.length;
    }
    return counts;
  }, [conversations]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingCharacterId(null);
  }, []);

  const themeStyle = useMemo(
    () => getThemeCssVariables(themeId, bubbleSchemeId, visualSettings),
    [bubbleSchemeId, themeId, visualSettings]
  );

  const applyRemoteSyncSnapshot = useCallback(
    (remote: MobileSyncStatePayload, clientMode: boolean) => {
      if (remote.updatedAt <= syncUpdatedAtRef.current) {
        return;
      }

      const remoteSignature = computeMobileSyncSignature(remote);
      if (remoteSignature === lastAppliedRemoteSignatureRef.current) {
        return;
      }

      const normalizedRemoteJson = serializeNormalizedSyncPayload(remote);
      if (
        lastAppliedPayloadRef.current &&
        normalizedRemoteJson === lastAppliedPayloadRef.current
      ) {
        lastAppliedRemoteSignatureRef.current = remoteSignature;
        syncUpdatedAtRef.current = Math.max(
          syncUpdatedAtRef.current,
          remote.updatedAt
        );
        return;
      }

      const remoteHash = computeMobileSyncStateHash(remote);
      if (
        lastSyncedBodyJsonRef.current &&
        remoteHash === lastSyncedBodyJsonRef.current
      ) {
        lastAppliedPayloadRef.current = normalizedRemoteJson;
        lastAppliedRemoteSignatureRef.current = remoteSignature;
        syncUpdatedAtRef.current = remote.updatedAt;
        return;
      }

      const cur = latestSyncSnapshotDataRef.current;
      const localPreview = buildMobileSyncPayload({
        updatedAt: syncUpdatedAtRef.current,
        characters: cur.characters,
        conversations: cur.conversations,
        storyMemories: cur.storyMemories,
        preferences: {
          activeCharacterId: cur.activeCharacterId,
          characterOrder: cur.characterOrder,
          userPersona: cur.userPersona,
          themeId: cur.themeId,
          bubbleSchemeId: cur.bubbleSchemeId,
          language: cur.language,
          wallpaperFit: cur.wallpaperFit,
          parallaxEnabled: cur.parallaxEnabled,
          visualSettings: cur.visualSettings,
          settings: cur.settings,
        },
      });

      const ignoreSettings = isSettingsOpenRef.current;
      const localFingerprint = computeMobileSyncContentFingerprint(localPreview, {
        ignoreSettingsAndPersona: ignoreSettings,
      });
      const remoteFingerprint = computeMobileSyncContentFingerprint(remote, {
        ignoreSettingsAndPersona: ignoreSettings,
      });

      if (localFingerprint === remoteFingerprint) {
        lastAppliedPayloadRef.current = normalizedRemoteJson;
        lastAppliedRemoteSignatureRef.current = remoteSignature;
        lastSyncedFingerprintRef.current = localFingerprint;
        syncUpdatedAtRef.current = remote.updatedAt;
        return;
      }

      if (pendingPushTimerRef.current !== null) {
        window.clearTimeout(pendingPushTimerRef.current);
        pendingPushTimerRef.current = null;
      }

      isApplyingRemoteSyncRef.current = true;
      if (remoteSyncResetTimerRef.current !== null) {
        window.clearTimeout(remoteSyncResetTimerRef.current);
      }
      remoteSyncResetTimerRef.current = window.setTimeout(() => {
        isApplyingRemoteSyncRef.current = false;
        remoteSyncResetTimerRef.current = null;
      }, 150);

      lastAppliedPayloadRef.current = normalizedRemoteJson;
      lastAppliedRemoteSignatureRef.current = remoteSignature;
      lastSyncedFingerprintRef.current = remoteFingerprint;
      syncUpdatedAtRef.current = remote.updatedAt;
      void saveMobileSyncUpdatedAt(remote.updatedAt);

      const prefs = remote.preferences ?? {};
      const remoteOrder = Array.isArray(prefs.characterOrder)
        ? prefs.characterOrder.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0
          )
        : null;
      const effectiveOrder =
        remoteOrder && remoteOrder.length > 0
          ? remoteOrder
          : loadSavedCharacterOrder();
      if (remoteOrder && remoteOrder.length > 0) {
        setCharacterOrder(remoteOrder);
        saveCharacterOrder(remoteOrder);
      }

      const nextChars =
        Array.isArray(remote.characters) && remote.characters.length > 0
          ? hydrateCharacters(remote.characters)
          : null;
      if (nextChars) {
        setCharacters(applyCharacterOrder(nextChars, effectiveOrder));
      } else if (effectiveOrder.length > 0) {
        setCharacters((prev) => applyCharacterOrder(prev, effectiveOrder));
      }

      if (
        typeof prefs.activeCharacterId === 'string' &&
        prefs.activeCharacterId
      ) {
        const candidatePool = nextChars ?? charactersRef.current;
        if (candidatePool.some((c) => c.id === prefs.activeCharacterId)) {
          setActiveCharacterId(prefs.activeCharacterId);
        }
      }

      if (remote.chats && typeof remote.chats === 'object') {
        const sanitizedChats: Record<string, ChatMessage[]> = {};
        for (const [charId, msgs] of Object.entries(remote.chats)) {
          if (!Array.isArray(msgs)) continue;
          sanitizedChats[charId] = msgs.map((m) =>
            m.isStreaming ? { ...m, isStreaming: false } : m
          );
        }
        setConversations(sanitizedChats);
      }

      if (remote.storyMemory && typeof remote.storyMemory === 'object') {
        setStoryMemories(remote.storyMemory);
      }

      if (
        !isSettingsOpenRef.current &&
        prefs.userPersona &&
        typeof prefs.userPersona === 'object'
      ) {
        setUserPersona({
          name:
            typeof prefs.userPersona.name === 'string'
              ? prefs.userPersona.name
              : '',
          appearance:
            typeof prefs.userPersona.appearance === 'string'
              ? prefs.userPersona.appearance
              : '',
          bio:
            typeof prefs.userPersona.bio === 'string'
              ? prefs.userPersona.bio
              : '',
        });
      }

      if (
        prefs.themeId === 'obsidian-violet' ||
        prefs.themeId === 'midnight-crimson' ||
        prefs.themeId === 'cyber-emerald'
      ) {
        setThemeId(prefs.themeId);
      }

      if (
        prefs.bubbleSchemeId === 'indigo-violet' ||
        prefs.bubbleSchemeId === 'crimson-rose' ||
        prefs.bubbleSchemeId === 'cyber-emerald' ||
        prefs.bubbleSchemeId === 'ocean-blue' ||
        prefs.bubbleSchemeId === 'amber-gold' ||
        prefs.bubbleSchemeId === 'minimalist-glass'
      ) {
        setBubbleSchemeId(prefs.bubbleSchemeId);
      }

      if (prefs.language === 'en' || prefs.language === 'es') {
        setLanguage(prefs.language);
      }

      if (
        prefs.wallpaperFit === 'cover' ||
        prefs.wallpaperFit === 'contain'
      ) {
        setWallpaperFit(prefs.wallpaperFit);
      }

      if (typeof prefs.parallaxEnabled === 'boolean') {
        setParallaxEnabled(prefs.parallaxEnabled);
      }

      if (prefs.visualSettings && typeof prefs.visualSettings === 'object') {
        setVisualSettings(hydrateVisualSettings(prefs.visualSettings));
      }

      // Never overwrite user's selected Ollama model or settings while SettingsModal is open
      if (!isSettingsOpenRef.current) {
        if (prefs.settings && typeof prefs.settings === 'object') {
          const remoteSettings = prefs.settings;
          const remoteProvider =
            remoteSettings.provider === 'openai' ? 'openai' : 'ollama';
          const remoteOpenaiUrl =
            typeof remoteSettings.openaiBaseUrl === 'string'
              ? remoteSettings.openaiBaseUrl.trim().replace(/\/+$/, '')
              : undefined;
          const remoteIsLoopback = isLocalLoopbackUrl(remoteOpenaiUrl);
          const remoteIsPublicHttps = isPublicHttpsApiUrl(remoteOpenaiUrl);

          setSettings((prev) => {
            let nextProvider = prev.provider;
            let nextBaseUrl = prev.baseUrl;
            let nextOpenaiBaseUrl = prev.openaiBaseUrl;

            if (clientMode) {
              nextProvider = remoteProvider;
              if (remoteProvider === 'openai') {
                nextBaseUrl = remoteIsPublicHttps ? remoteOpenaiUrl! : '/v1';
              } else {
                nextBaseUrl = '/api';
              }
              if (remoteIsLoopback && remoteOpenaiUrl) {
                nextOpenaiBaseUrl =
                  remoteOpenaiUrl === '/v1'
                    ? 'http://127.0.0.1:1234/v1'
                    : remoteOpenaiUrl;
              } else if (remoteIsPublicHttps && remoteOpenaiUrl) {
                nextOpenaiBaseUrl = remoteOpenaiUrl;
              }
            } else {
              if (remoteProvider !== prev.provider) {
                nextProvider = remoteProvider;
                if (remoteProvider === 'ollama') {
                  nextBaseUrl = DEFAULT_OLLAMA_URL;
                } else if (remoteIsPublicHttps && remoteOpenaiUrl) {
                  nextBaseUrl = remoteOpenaiUrl;
                  nextOpenaiBaseUrl = remoteOpenaiUrl;
                } else if (remoteIsLoopback && remoteOpenaiUrl) {
                  const targetOpenaiUrl =
                    isLocalLoopbackUrl(prev.openaiBaseUrl) &&
                    prev.openaiBaseUrl &&
                    remoteOpenaiUrl === 'http://127.0.0.1:1234/v1'
                      ? prev.openaiBaseUrl
                      : remoteOpenaiUrl;
                  nextBaseUrl = targetOpenaiUrl;
                  nextOpenaiBaseUrl = targetOpenaiUrl;
                } else {
                  nextBaseUrl = prev.openaiBaseUrl || DEFAULT_OPENAI_URL;
                }
              } else if (
                remoteProvider === 'openai' &&
                remoteIsPublicHttps &&
                remoteOpenaiUrl &&
                remoteOpenaiUrl !== prev.baseUrl
              ) {
                nextBaseUrl = remoteOpenaiUrl;
                nextOpenaiBaseUrl = remoteOpenaiUrl;
              } else if (
                remoteProvider === 'openai' &&
                remoteIsLoopback &&
                remoteOpenaiUrl &&
                remoteOpenaiUrl !== 'http://127.0.0.1:1234/v1' &&
                remoteOpenaiUrl !== prev.baseUrl
              ) {
                nextBaseUrl = remoteOpenaiUrl;
                nextOpenaiBaseUrl = remoteOpenaiUrl;
              }
            }

            return {
              ...prev,
              provider: nextProvider,
              baseUrl: nextBaseUrl,
              selectedModel:
                typeof remoteSettings.selectedModel === 'string' &&
                remoteSettings.selectedModel.trim()
                  ? remoteSettings.selectedModel
                  : prev.selectedModel,
              availableModels:
                Array.isArray(remoteSettings.availableModels) &&
                remoteSettings.availableModels.length > 0
                  ? remoteSettings.availableModels
                  : prev.availableModels,
              temperature:
                typeof remoteSettings.temperature === 'number'
                  ? remoteSettings.temperature
                  : prev.temperature,
              numPredict:
                typeof remoteSettings.numPredict === 'number'
                  ? remoteSettings.numPredict
                  : prev.numPredict,
              numCtx:
                typeof remoteSettings.numCtx === 'number'
                  ? remoteSettings.numCtx
                  : prev.numCtx,
              storyMemoryEnabled:
                typeof remoteSettings.storyMemoryEnabled === 'boolean'
                  ? remoteSettings.storyMemoryEnabled
                  : prev.storyMemoryEnabled,
              // Strictly preserve local/session apiKey
              apiKey: prev.apiKey,
              openaiBaseUrl: nextOpenaiBaseUrl,
            };
          });
        } else if (clientMode) {
          setSettings((prev) => ({
            ...prev,
            provider: 'ollama',
            baseUrl: '/api',
          }));
        }
      }

      lastSyncedBodyJsonRef.current = remoteHash;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const probeController = new AbortController();
    let probeTimeout: number | undefined;

    void (async () => {
      const [persistedSyncTs, loaded] = await Promise.all([
        loadMobileSyncUpdatedAt(),
        loadAllPersistedState(),
      ]);
      if (cancelled) return;
      syncUpdatedAtRef.current = persistedSyncTs;

      let clientModeActive =
        !isElectronHost &&
        Boolean(
          initialMobileLinkSession.hadUrlToken || initialMobileLinkSession.token
        );
      let startupRemoteSnapshot: MobileSyncStatePayload | null = null;

      if (!isElectronHost) {
        const savedProfile = loadMobilePairingProfile();
        if (savedProfile && initialMobileLinkSession.token) {
          try {
            const resolution = await resolveBestMobileLinkRoute(
              savedProfile,
              initialMobileLinkSession.token
            );
            if (cancelled) return;
            if (resolution) {
              setMobilePairingProfile(resolution.profile);
              setActiveSmartRoute(resolution.routeType);
              clientModeActive = true;
              startupRemoteSnapshot = await fetchMobileSyncState(
                resolution.origin,
                initialMobileLinkSession.token,
                probeController.signal
              );
              if (cancelled) return;
            }
          } catch {
            // Fall back to direct origin probe below
          }
        }

        if (
          !startupRemoteSnapshot &&
          typeof window !== 'undefined' &&
          (clientModeActive || window.location.protocol.startsWith('http'))
        ) {
          try {
            startupRemoteSnapshot = await fetchMobileSyncState(
              '',
              initialMobileLinkSession.token,
              probeController.signal
            );
            if (cancelled) return;
            if (startupRemoteSnapshot !== null) {
              clientModeActive = true;
            }
          } catch {
            // Not running behind an authenticated Mobile Link host
          }
        }
      }

      if (clientModeActive) {
        setMobileLinkClientActive(true);
        setIsMobileLinkClient(true);
      }

      if (isMobileClientRuntime) {
        void Promise.all([
          inspectDeviceMemoryTier(),
          loadInstalledPocketAiModels(),
        ]).then(([memInfo, savedPocketModels]) => {
          if (cancelled) return;
          setPocketAiState((prev) => ({
            ...prev,
            deviceMemoryGb: memInfo.deviceMemoryGb,
            memoryMeasured: memInfo.measured,
            recommendedTier: memInfo.recommendedTier,
            autoUnloadDelaySec: memInfo.autoUnloadDelaySec,
          }));
          setInstalledPocketModels(savedPocketModels);
        });
      }

      const effectiveClientSettings =
        clientModeActive && startupRemoteSnapshot?.preferences?.settings
          ? {
              ...loaded.settings,
              ...startupRemoteSnapshot.preferences.settings,
            }
          : loaded.settings;
      const effectiveProvider =
        effectiveClientSettings.provider === 'openai' ? 'openai' : 'ollama';
      const candidateOpenaiUrl = (
        effectiveClientSettings.openaiBaseUrl ??
        (effectiveProvider === 'openai'
          ? effectiveClientSettings.baseUrl
          : undefined)
      )
        ?.trim()
        .replace(/\/+$/, '');
      const isLoopbackOpenai = isLocalLoopbackUrl(candidateOpenaiUrl);
      const isPublicHttpsOpenai = isPublicHttpsApiUrl(candidateOpenaiUrl);

      const initialSettings = clientModeActive
        ? {
            ...loaded.settings,
            provider: effectiveProvider as 'ollama' | 'openai',
            baseUrl:
              effectiveProvider === 'openai'
                ? isPublicHttpsOpenai && candidateOpenaiUrl
                  ? candidateOpenaiUrl
                  : '/v1'
                : '/api',
            ...(isLoopbackOpenai && candidateOpenaiUrl
              ? {
                  openaiBaseUrl:
                    candidateOpenaiUrl === '/v1'
                      ? 'http://127.0.0.1:1234/v1'
                      : candidateOpenaiUrl,
                }
              : isPublicHttpsOpenai && candidateOpenaiUrl
                ? { openaiBaseUrl: candidateOpenaiUrl }
                : {}),
          }
        : loaded.settings;

      const persistedOrder = loadSavedCharacterOrder();
      const orderedLoadedChars = applyCharacterOrder(
        loaded.characters,
        persistedOrder
      );
      setCharacters(orderedLoadedChars);
      setCharacterOrder(
        persistedOrder.length > 0
          ? persistedOrder
          : orderedLoadedChars.map((c) => c.id)
      );
      setActiveCharacterId(loaded.activeCharacterId);
      setConversations(loaded.conversations);
      setStoryMemories(loaded.storyMemories);
      setSettings(initialSettings);
      setUserPersona(loaded.userPersona);
      setThemeId(loaded.themeId);
      setBubbleSchemeId(loaded.bubbleSchemeId);
      setLanguage(loaded.language);
      setWallpaperFit(loaded.wallpaperFit);
      setParallaxEnabled(loaded.parallaxEnabled);
      setVisualSettings(loaded.visualSettings);

      if (
        clientModeActive &&
        startupRemoteSnapshot &&
        startupRemoteSnapshot.updatedAt > syncUpdatedAtRef.current
      ) {
        applyRemoteSyncSnapshot(startupRemoteSnapshot, true);
      }

      setIsStorageReady(true);

      if (isElectronHost && window.electronAPI?.getMobileLinkStatus) {
        void window.electronAPI
          .getMobileLinkStatus()
          .then((statusPayload) => {
            if (!cancelled && statusPayload) {
              setMobileLinkStatus(statusPayload);
            }
          })
          .catch(() => {
            // ignore
          });
      }

      probeTimeout = window.setTimeout(() => probeController.abort(), 3500);
      const initialProvider = initialSettings.provider ?? 'ollama';
      try {
        const models = await fetchProviderModels(
          initialProvider,
          initialSettings.baseUrl,
          initialSettings.apiKey,
          probeController.signal
        );
        if (cancelled) return;
        setOllamaStatus('connected');
        if (models.length > 0) {
          setSettings((prev) => ({
            ...prev,
            availableModels: models,
            selectedModel: prev.selectedModel || models[0].name,
          }));
        }
      } catch {
        if (!cancelled) {
          if (
            initialProvider === 'openai' &&
            initialSettings.selectedModel.trim().length > 0
          ) {
            setOllamaStatus('connected');
          } else {
            setOllamaStatus('offline');
          }
        }
      } finally {
        if (probeTimeout !== undefined) {
          window.clearTimeout(probeTimeout);
        }
      }
    })();

    return () => {
      cancelled = true;
      probeController.abort();
      if (probeTimeout !== undefined) {
        window.clearTimeout(probeTimeout);
      }
    };
  }, [
    applyRemoteSyncSnapshot,
    initialMobileLinkSession,
    isElectronHost,
    isMobileClientRuntime,
  ]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.characters, characters);
  }, [characters, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.activeCharacterId, activeCharacter.id);
  }, [activeCharacter.id, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    const cleaned: Record<string, ChatMessage[]> = {};
    for (const [charId, msgs] of Object.entries(conversations)) {
      cleaned[charId] = msgs.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m
      );
    }
    void idbSet(STORAGE_KEYS.conversations, cleaned);
  }, [conversations, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.storyMemories, storyMemories);
  }, [isStorageReady, storyMemories]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.settings, stripSecretFromSettings(settings));
    void saveApiKeySecurely(settings.apiKey ?? '');
  }, [isStorageReady, settings]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.userPersona, userPersona);
  }, [isStorageReady, userPersona]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.theme, themeId);
  }, [isStorageReady, themeId]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.bubbleScheme, bubbleSchemeId);
  }, [bubbleSchemeId, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.language, language);
    saveLanguagePreference(language);
  }, [isStorageReady, language]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.wallpaperFit, wallpaperFit);
  }, [isStorageReady, wallpaperFit]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.parallaxEnabled, parallaxEnabled);
  }, [isStorageReady, parallaxEnabled]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.visualSettings, visualSettings);
    saveLobbyBackdropMode(
      visualSettings.lobbyBackdropMode === 'obsidian-static'
        ? 'obsidian-static'
        : 'orbital-clouds'
    );
  }, [isStorageReady, visualSettings]);

  const latestSyncSnapshotDataRef = useRef({
    characters,
    characterOrder,
    activeCharacterId: activeCharacter.id,
    conversations,
    storyMemories,
    userPersona,
    themeId,
    bubbleSchemeId,
    language,
    wallpaperFit,
    parallaxEnabled,
    visualSettings,
    settings,
  });
  latestSyncSnapshotDataRef.current = {
    characters,
    characterOrder,
    activeCharacterId: activeCharacter.id,
    conversations,
    storyMemories,
    userPersona,
    themeId,
    bubbleSchemeId,
    language,
    wallpaperFit,
    parallaxEnabled,
    visualSettings,
    settings,
  };

  // Desktop Electron Host: initial sync handshake whenever Mobile Link server activates
  useEffect(() => {
    if (
      !isStorageReady ||
      !isElectronHost ||
      !mobileLinkStatus.active ||
      !mobileLinkStatus.port ||
      !mobileLinkStatus.token
    ) {
      return;
    }

    let cancelled = false;
    const relayOrigin = `http://127.0.0.1:${mobileLinkStatus.port}`;
    const relayToken = mobileLinkStatus.token;

    void (async () => {
      try {
        const remote = await fetchMobileSyncState(relayOrigin, relayToken);
        if (cancelled) return;

        if (
          remote &&
          remote.updatedAt > syncUpdatedAtRef.current &&
          !streamingCharIdRef.current
        ) {
          applyRemoteSyncSnapshot(remote, false);
          return;
        }

        if (
          !remote ||
          remote.updatedAt === 0 ||
          syncUpdatedAtRef.current > remote.updatedAt
        ) {
          if (syncUpdatedAtRef.current === 0) {
            syncUpdatedAtRef.current = Date.now();
            void saveMobileSyncUpdatedAt(syncUpdatedAtRef.current);
          }
          const cur = latestSyncSnapshotDataRef.current;
          const payload = buildMobileSyncPayload({
            updatedAt: syncUpdatedAtRef.current,
            characters: cur.characters,
            conversations: cur.conversations,
            storyMemories: cur.storyMemories,
            preferences: {
              activeCharacterId: cur.activeCharacterId,
              characterOrder: cur.characterOrder,
              userPersona: cur.userPersona,
              themeId: cur.themeId,
              bubbleSchemeId: cur.bubbleSchemeId,
              language: cur.language,
              wallpaperFit: cur.wallpaperFit,
              parallaxEnabled: cur.parallaxEnabled,
              visualSettings: cur.visualSettings,
              settings: cur.settings,
            },
          });
          lastSyncedBodyJsonRef.current = serializeSyncBody(payload);
          lastAppliedPayloadRef.current =
            serializeNormalizedSyncPayload(payload);
          await postMobileSyncState(payload, relayOrigin, relayToken);
        }
      } catch {
        // Ignore transient sync handshake errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    applyRemoteSyncSnapshot,
    isElectronHost,
    isStorageReady,
    mobileLinkStatus.active,
    mobileLinkStatus.port,
    mobileLinkStatus.token,
  ]);

  // Debounced sync push on genuine local mutations (skips streaming & echoed remote snapshots)
  useEffect(() => {
    if (!isStorageReady) return;
    if (!hasHydratedForSyncRef.current) {
      hasHydratedForSyncRef.current = true;
      return;
    }
    if (streamingCharacterId !== null) return;

    if (isApplyingRemoteSyncRef.current) {
      isApplyingRemoteSyncRef.current = false;
      if (remoteSyncResetTimerRef.current !== null) {
        window.clearTimeout(remoteSyncResetTimerRef.current);
        remoteSyncResetTimerRef.current = null;
      }
      return;
    }

    const canSyncAsClient = isMobileLinkClient;
    const canSyncAsHost =
      isElectronHost &&
      mobileLinkStatus.active &&
      Boolean(mobileLinkStatus.port) &&
      Boolean(mobileLinkStatus.token);

    if (!canSyncAsClient && !canSyncAsHost) return;

    const relayOrigin = canSyncAsClient
      ? ''
      : `http://127.0.0.1:${mobileLinkStatus.port}`;
    const relayToken = canSyncAsClient ? null : mobileLinkStatus.token;

    if (pendingPushTimerRef.current !== null) {
      window.clearTimeout(pendingPushTimerRef.current);
    }

    pendingPushTimerRef.current = window.setTimeout(() => {
      pendingPushTimerRef.current = null;
      if (
        isApplyingRemoteSyncRef.current ||
        streamingCharIdRef.current !== null ||
        isSyncRequestInFlightRef.current
      ) {
        return;
      }

      const cur = latestSyncSnapshotDataRef.current;
      const previewPayload = buildMobileSyncPayload({
        updatedAt: syncUpdatedAtRef.current,
        characters: cur.characters,
        conversations: cur.conversations,
        storyMemories: cur.storyMemories,
        preferences: {
          activeCharacterId: cur.activeCharacterId,
          characterOrder: cur.characterOrder,
          userPersona: cur.userPersona,
          themeId: cur.themeId,
          bubbleSchemeId: cur.bubbleSchemeId,
          language: cur.language,
          wallpaperFit: cur.wallpaperFit,
          parallaxEnabled: cur.parallaxEnabled,
          visualSettings: cur.visualSettings,
          settings: cur.settings,
        },
      });
      const bodyJson = serializeSyncBody(previewPayload);
      const bodyFingerprint =
        computeMobileSyncContentFingerprint(previewPayload);
      if (
        bodyJson === lastSyncedBodyJsonRef.current ||
        (lastSyncedFingerprintRef.current &&
          bodyFingerprint === lastSyncedFingerprintRef.current)
      ) {
        return;
      }

      const nextUpdatedAt = Math.max(
        Date.now(),
        syncUpdatedAtRef.current + 1
      );
      syncUpdatedAtRef.current = nextUpdatedAt;
      void saveMobileSyncUpdatedAt(nextUpdatedAt);

      const finalPayload: MobileSyncStatePayload = {
        ...previewPayload,
        updatedAt: nextUpdatedAt,
      };

      isSyncRequestInFlightRef.current = true;
      void postMobileSyncState(finalPayload, relayOrigin, relayToken)
        .then((res) => {
          if (res?.ok) {
            lastSyncedBodyJsonRef.current = bodyJson;
            lastSyncedFingerprintRef.current = bodyFingerprint;
            lastAppliedPayloadRef.current =
              serializeNormalizedSyncPayload(previewPayload);
            if (res.updatedAt > syncUpdatedAtRef.current) {
              syncUpdatedAtRef.current = res.updatedAt;
              void saveMobileSyncUpdatedAt(res.updatedAt);
            }
          }
        })
        .catch(() => {
          // Ignore transient network errors while pushing sync state
        })
        .finally(() => {
          isSyncRequestInFlightRef.current = false;
        });
    }, 400);

    return () => {
      if (pendingPushTimerRef.current !== null) {
        window.clearTimeout(pendingPushTimerRef.current);
        pendingPushTimerRef.current = null;
      }
    };
  }, [
    activeCharacter.id,
    bubbleSchemeId,
    characterOrder,
    characters,
    conversations,
    isElectronHost,
    isMobileLinkClient,
    isStorageReady,
    language,
    mobileLinkStatus.active,
    mobileLinkStatus.port,
    mobileLinkStatus.token,
    parallaxEnabled,
    settings,
    storyMemories,
    streamingCharacterId,
    themeId,
    userPersona,
    visualSettings,
    wallpaperFit,
  ]);

  // Immediate sync helper (e.g. when saving SettingsModal model selection)
  const pushSyncStateNow = useCallback(
    (overrides?: {
      settings?: OllamaSettings;
      userPersona?: UserPersona;
    }) => {
      if (!isStorageReady) return;
      const canSyncAsClient = isMobileLinkClient;
      const canSyncAsHost =
        isElectronHost &&
        mobileLinkStatus.active &&
        Boolean(mobileLinkStatus.port) &&
        Boolean(mobileLinkStatus.token);

      if (!canSyncAsClient && !canSyncAsHost) return;

      if (pendingPushTimerRef.current !== null) {
        window.clearTimeout(pendingPushTimerRef.current);
        pendingPushTimerRef.current = null;
      }

      const relayOrigin = canSyncAsClient
        ? ''
        : `http://127.0.0.1:${mobileLinkStatus.port}`;
      const relayToken = canSyncAsClient ? null : mobileLinkStatus.token;
      const cur = latestSyncSnapshotDataRef.current;

      const nextUpdatedAt = Math.max(
        Date.now(),
        syncUpdatedAtRef.current + 1
      );
      syncUpdatedAtRef.current = nextUpdatedAt;
      void saveMobileSyncUpdatedAt(nextUpdatedAt);

      const finalPayload = buildMobileSyncPayload({
        updatedAt: nextUpdatedAt,
        characters: cur.characters,
        conversations: cur.conversations,
        storyMemories: cur.storyMemories,
        preferences: {
          activeCharacterId: cur.activeCharacterId,
          characterOrder: cur.characterOrder,
          userPersona: overrides?.userPersona ?? cur.userPersona,
          themeId: cur.themeId,
          bubbleSchemeId: cur.bubbleSchemeId,
          language: cur.language,
          wallpaperFit: cur.wallpaperFit,
          parallaxEnabled: cur.parallaxEnabled,
          visualSettings: cur.visualSettings,
          settings: overrides?.settings ?? cur.settings,
        },
      });

      const bodyHash = serializeSyncBody(finalPayload);
      lastSyncedBodyJsonRef.current = bodyHash;
      lastSyncedFingerprintRef.current =
        computeMobileSyncContentFingerprint(finalPayload);
      lastAppliedPayloadRef.current =
        serializeNormalizedSyncPayload(finalPayload);
      lastAppliedRemoteSignatureRef.current =
        computeMobileSyncSignature(finalPayload);

      isSyncRequestInFlightRef.current = true;
      void postMobileSyncState(finalPayload, relayOrigin, relayToken)
        .then((res) => {
          if (res?.ok && res.updatedAt > syncUpdatedAtRef.current) {
            syncUpdatedAtRef.current = res.updatedAt;
            lastAppliedRemoteSignatureRef.current = `${res.updatedAt}:${bodyHash}`;
            void saveMobileSyncUpdatedAt(res.updatedAt);
          }
        })
        .catch(() => {
          // Ignore transient network errors while pushing sync state
        })
        .finally(() => {
          isSyncRequestInFlightRef.current = false;
        });
    },
    [
      isElectronHost,
      isMobileLinkClient,
      isStorageReady,
      mobileLinkStatus.active,
      mobileLinkStatus.port,
      mobileLinkStatus.token,
    ]
  );

  // Live background sync polling (Desktop Host & Mobile Link Client; paused while streaming)
  useEffect(() => {
    if (!isStorageReady || streamingCharacterId !== null) return;

    const canSyncAsClient = isMobileLinkClient;
    const canSyncAsHost =
      isElectronHost &&
      mobileLinkStatus.active &&
      Boolean(mobileLinkStatus.port) &&
      Boolean(mobileLinkStatus.token);

    if (!canSyncAsClient && !canSyncAsHost) return;

    const relayOrigin = canSyncAsClient
      ? ''
      : `http://127.0.0.1:${mobileLinkStatus.port}`;
    const relayToken = canSyncAsClient ? null : mobileLinkStatus.token;

    const pollTimer = window.setInterval(() => {
      if (
        document.visibilityState === 'hidden' ||
        streamingCharIdRef.current !== null ||
        isSyncRequestInFlightRef.current
      ) {
        return;
      }

      isSyncRequestInFlightRef.current = true;
      void fetchMobileSyncState(relayOrigin, relayToken)
        .then((remote) => {
          if (!remote || streamingCharIdRef.current !== null) {
            return;
          }
          if (remote.updatedAt <= syncUpdatedAtRef.current) {
            return;
          }
          const remoteSig = computeMobileSyncSignature(remote);
          if (remoteSig === lastAppliedRemoteSignatureRef.current) {
            return;
          }
          const normalizedRemoteJson = serializeNormalizedSyncPayload(remote);
          if (
            lastAppliedPayloadRef.current &&
            normalizedRemoteJson === lastAppliedPayloadRef.current
          ) {
            lastAppliedRemoteSignatureRef.current = remoteSig;
            syncUpdatedAtRef.current = remote.updatedAt;
            return;
          }
          applyRemoteSyncSnapshot(remote, canSyncAsClient);
        })
        .catch(() => {
          // Ignore transient poll errors
        })
        .finally(() => {
          isSyncRequestInFlightRef.current = false;
        });
    }, 8000);

    return () => window.clearInterval(pollTimer);
  }, [
    applyRemoteSyncSnapshot,
    isElectronHost,
    isMobileLinkClient,
    isStorageReady,
    mobileLinkStatus.active,
    mobileLinkStatus.port,
    mobileLinkStatus.token,
    streamingCharacterId,
  ]);

  // Persistent SSE connection for Mobile Link clients (same-origin PWA; cross-origin Capacitor uses polling + foreground race)
  useEffect(() => {
    if (
      !isStorageReady ||
      !isMobileLinkClient ||
      isElectronHost ||
      Boolean(getActiveMobileLinkOrigin()) ||
      typeof EventSource === 'undefined'
    ) {
      return;
    }

    const eventSource = new EventSource(getMobileLinkEventsUrl());

    const handleRemoteSyncEvent = (event: MessageEvent<string>) => {
      if (
        document.visibilityState === 'hidden' ||
        streamingCharIdRef.current !== null ||
        isSyncRequestInFlightRef.current
      ) {
        return;
      }

      let remoteUpdatedAt = 0;
      try {
        const parsed = JSON.parse(event.data) as { updatedAt?: number };
        if (typeof parsed?.updatedAt === 'number') {
          remoteUpdatedAt = parsed.updatedAt;
        }
      } catch {
        return;
      }

      if (remoteUpdatedAt <= syncUpdatedAtRef.current) {
        return;
      }

      isSyncRequestInFlightRef.current = true;
      void fetchMobileSyncState('')
        .then((remote) => {
          if (!remote || streamingCharIdRef.current !== null) {
            return;
          }
          if (remote.updatedAt <= syncUpdatedAtRef.current) {
            return;
          }
          const remoteSig = computeMobileSyncSignature(remote);
          if (remoteSig === lastAppliedRemoteSignatureRef.current) {
            return;
          }
          const normalizedRemoteJson = serializeNormalizedSyncPayload(remote);
          if (
            lastAppliedPayloadRef.current &&
            normalizedRemoteJson === lastAppliedPayloadRef.current
          ) {
            lastAppliedRemoteSignatureRef.current = remoteSig;
            syncUpdatedAtRef.current = remote.updatedAt;
            return;
          }
          applyRemoteSyncSnapshot(remote, true);
        })
        .catch(() => {
          // Ignore transient SSE-triggered fetch errors; polling handles recovery
        })
        .finally(() => {
          isSyncRequestInFlightRef.current = false;
        });
    };

    eventSource.addEventListener(
      'sync',
      handleRemoteSyncEvent as EventListener
    );

    return () => {
      eventSource.removeEventListener(
        'sync',
        handleRemoteSyncEvent as EventListener
      );
      eventSource.close();
    };
  }, [applyRemoteSyncSnapshot, isElectronHost, isMobileLinkClient, isStorageReady]);

  // Thermal Protection & Background RAM Guard + Smart Dual-Route foreground probe
  useEffect(() => {
    if (typeof document === 'undefined' || isElectronHost) return;

    const handleEnterBackground = () => {
      if (streamingCharIdRef.current !== null) {
        stopStreaming();
      }
      if (pocketDownloadAbortRef.current) {
        pocketDownloadAbortRef.current.abort();
        pocketDownloadAbortRef.current = null;
        setPocketDownloadingModelId(null);
        setPocketDownloadProgress(null);
      }
      if (pocketAiStateRef.current.isModelLoaded) {
        if (backgroundUnloadTimerRef.current !== null) {
          window.clearTimeout(backgroundUnloadTimerRef.current);
        }
        const delayMs = pocketAiStateRef.current.autoUnloadDelaySec * 1000;
        backgroundUnloadTimerRef.current = window.setTimeout(() => {
          backgroundUnloadTimerRef.current = null;
          void unloadNativePocketAiModel();
          setPocketAiState((prev) =>
            prev.isModelLoaded
              ? {
                  ...prev,
                  isModelLoaded: false,
                  activeModelId: null,
                  activeModelName: null,
                  estimatedActiveRamMb: 0,
                  lastAutoUnloadAt: Date.now(),
                }
              : prev
          );
        }, delayMs);
      }
    };

    const handleReturnForeground = () => {
      if (backgroundUnloadTimerRef.current !== null) {
        window.clearTimeout(backgroundUnloadTimerRef.current);
        backgroundUnloadTimerRef.current = null;
      }
      if (isMobileLinkClientRef.current && mobilePairingProfileRef.current) {
        void resolveBestMobileLinkRoute(mobilePairingProfileRef.current).then(
          (res) => {
            if (!res) return;
            setMobilePairingProfile(res.profile);
            setActiveSmartRoute(res.routeType);
            void fetchMobileSyncState(res.origin)
              .then((remote) => {
                if (remote && streamingCharIdRef.current === null) {
                  applyRemoteSyncSnapshot(remote, true);
                }
              })
              .catch(() => {});
          }
        );
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleEnterBackground();
      } else {
        handleReturnForeground();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    let appStateHandle: { remove: () => Promise<void> | void } | undefined;
    const appPlugin = window.Capacitor?.Plugins?.App;
    if (appPlugin?.addListener) {
      const maybePromise = appPlugin.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          handleEnterBackground();
        } else {
          handleReturnForeground();
        }
      });
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        void (maybePromise as Promise<{ remove: () => Promise<void> | void }>).then(
          (handle) => {
            appStateHandle = handle;
          }
        );
      } else {
        appStateHandle = maybePromise as { remove: () => Promise<void> | void };
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void appStateHandle?.remove?.();
      if (backgroundUnloadTimerRef.current !== null) {
        window.clearTimeout(backgroundUnloadTimerRef.current);
        backgroundUnloadTimerRef.current = null;
      }
    };
  }, [applyRemoteSyncSnapshot, isElectronHost, stopStreaming]);

  const handlePairClientSuccess = useCallback(
    async (resolution: SmartRouteResolution) => {
      setMobilePairingProfile(resolution.profile);
      setActiveSmartRoute(resolution.routeType);
      setMobileLinkClientActive(true);
      setIsMobileLinkClient(true);
      setErrorMessage(null);
      try {
        const remote = await fetchMobileSyncState(resolution.origin);
        if (remote) {
          applyRemoteSyncSnapshot(remote, true);
        }
        const provider = settings.provider ?? 'ollama';
        if (provider === 'ollama' || settings.baseUrl === '/v1') {
          const models = await fetchProviderModels(
            provider,
            provider === 'ollama' ? '/api' : '/v1',
            settings.apiKey
          );
          setOllamaStatus('connected');
          if (models.length > 0) {
            setSettings((prev) => ({
              ...prev,
              availableModels: models,
              selectedModel: prev.selectedModel || models[0].name,
            }));
          }
        }
      } catch {
        // Polling & foreground reconnect handle recovery
      }
    },
    [applyRemoteSyncSnapshot, settings.apiKey, settings.baseUrl, settings.provider]
  );

  const handleReconnectDualRoute =
    useCallback(async (): Promise<SmartRouteResolution | null> => {
      const profile = mobilePairingProfileRef.current;
      if (!profile) return null;
      const resolution = await resolveBestMobileLinkRoute(profile);
      if (!resolution) return null;
      setMobilePairingProfile(resolution.profile);
      setActiveSmartRoute(resolution.routeType);
      try {
        const remote = await fetchMobileSyncState(resolution.origin);
        if (remote && streamingCharIdRef.current === null) {
          applyRemoteSyncSnapshot(remote, true);
        }
      } catch {
        // ignore transient sync fetch errors
      }
      return resolution;
    }, [applyRemoteSyncSnapshot]);

  const handleDisconnectClient = useCallback(() => {
    clearMobileLinkSessionToken();
    setActiveMobileLinkOrigin('');
    setMobileLinkClientActive(false);
    saveMobilePairingProfile(null);
    setMobilePairingProfile(null);
    setActiveSmartRoute(null);
    setIsMobileLinkClient(false);
  }, []);

  const handleChangePocketAiMode = useCallback((mode: PocketAiMode) => {
    setPocketLocalAiError(null);
    setPocketAiState((prev) => {
      savePocketAiConfig({ mode, loopbackPreset: prev.loopbackPreset });
      return { ...prev, mode };
    });
  }, []);

  const handleCancelPocketAiDownload = useCallback(() => {
    if (pocketDownloadAbortRef.current) {
      pocketDownloadAbortRef.current.abort();
      pocketDownloadAbortRef.current = null;
    }
    setPocketDownloadingModelId(null);
    setPocketDownloadProgress(null);
  }, []);

  const handleDownloadPocketAiModel = useCallback(
    async (spec: PocketAiModelSpec) => {
      if (pocketDownloadAbortRef.current) {
        pocketDownloadAbortRef.current.abort();
      }
      const controller = new AbortController();
      pocketDownloadAbortRef.current = controller;
      setPocketLocalAiError(null);
      setPocketDownloadingModelId(spec.id);
      setPocketDownloadProgress({
        receivedBytes: 0,
        totalBytes: spec.downloadSizeMb * 1024 * 1024,
        percent: 0,
        verifiedHeader: false,
      });

      try {
        const record = await downloadAndVerifyPocketAiModel(
          spec,
          (progress) => setPocketDownloadProgress(progress),
          controller.signal
        );
        setInstalledPocketModels((prev) => {
          const next = [record, ...prev.filter((item) => item.id !== record.id)];
          void saveInstalledPocketAiModels(next);
          return next;
        });
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setPocketLocalAiError(
            err instanceof Error ? err.message : 'Model download failed.'
          );
        }
      } finally {
        if (pocketDownloadAbortRef.current === controller) {
          pocketDownloadAbortRef.current = null;
        }
        setPocketDownloadingModelId(null);
        setPocketDownloadProgress(null);
      }
    },
    []
  );

  const handleImportPocketAiGguf = useCallback(async (file: File) => {
    setPocketLocalAiError(null);
    try {
      const record = await verifyAndImportLocalGgufFile(file);
      setInstalledPocketModels((prev) => {
        const next = [record, ...prev.filter((item) => item.id !== record.id)];
        void saveInstalledPocketAiModels(next);
        return next;
      });
    } catch (err) {
      setPocketLocalAiError(
        err instanceof Error ? err.message : 'Invalid GGUF file.'
      );
    }
  }, []);

  const handleLoadPocketAiModel = useCallback(
    async (model: PocketAiLocalModelRecord) => {
      setPocketLocalAiError(null);
      try {
        const res = await loadNativePocketAiModel(model, settings.numCtx);
        setPocketAiState((prev) => {
          savePocketAiConfig({
            mode: 'embedded-gguf',
            loopbackPreset: prev.loopbackPreset,
          });
          return {
            ...prev,
            mode: 'embedded-gguf',
            activeModelId: model.id,
            activeModelName: model.name,
            isModelLoaded: true,
            estimatedActiveRamMb: res.estimatedRamMb,
            lastAutoUnloadAt: null,
          };
        });
        setErrorMessage(null);
      } catch (err) {
        setPocketLocalAiError(
          err instanceof Error ? err.message : 'Failed to load model.'
        );
      }
    },
    [settings.numCtx]
  );

  const handleUnloadPocketAiModel = useCallback(async () => {
    await unloadNativePocketAiModel();
    setPocketAiState((prev) => ({
      ...prev,
      isModelLoaded: false,
      activeModelId: null,
      activeModelName: null,
      estimatedActiveRamMb: 0,
    }));
  }, []);

  const handleRemovePocketAiModel = useCallback((modelId: string) => {
    setInstalledPocketModels((prev) => {
      const next = prev.filter((item) => item.id !== modelId);
      void saveInstalledPocketAiModels(next);
      return next;
    });
    if (pocketAiStateRef.current.activeModelId === modelId) {
      void unloadNativePocketAiModel();
      setPocketAiState((prev) => ({
        ...prev,
        isModelLoaded: false,
        activeModelId: null,
        activeModelName: null,
        estimatedActiveRamMb: 0,
      }));
    }
  }, []);

  const handleSelectPocketLoopback = useCallback(
    (provider: ApiProvider, baseUrl: string, preset: PocketAiLoopbackPreset) => {
      setPocketLocalAiError(null);
      setPocketAiState((prev) => {
        savePocketAiConfig({
          mode: 'local-loopback',
          loopbackPreset: preset,
        });
        return {
          ...prev,
          mode: 'local-loopback',
          loopbackPreset: preset,
        };
      });
      setSettings((prev) => ({
        ...prev,
        provider,
        baseUrl,
        ...(provider === 'openai' ? { openaiBaseUrl: baseUrl } : {}),
      }));
      void fetchProviderModels(provider, baseUrl, settings.apiKey)
        .then((models) => {
          setOllamaStatus('connected');
          if (models.length > 0) {
            setSettings((prev) => ({
              ...prev,
              availableModels: models,
              selectedModel: prev.selectedModel || models[0].name,
            }));
          }
        })
        .catch(() => {
          setOllamaStatus('offline');
        });
    },
    [settings.apiKey]
  );

  const isCloudApiConfigured =
    (settings.provider ?? 'ollama') === 'openai' &&
    Boolean(settings.selectedModel.trim()) &&
    (Boolean(settings.apiKey?.trim()) || isPublicHttpsApiUrl(settings.baseUrl));

  const isMobileOfflineUnlinked =
    isMobileClientRuntime && !isMobileLinkClient && !isCloudApiConfigured;

  const canUseNativePocketAi =
    isMobileClientRuntime &&
    pocketAiState.mode === 'embedded-gguf' &&
    pocketAiState.isModelLoaded &&
    Boolean(pocketAiState.activeModelId) &&
    Boolean(window.Capacitor?.Plugins?.AtriumLocalAi?.generateChat);

  const showPocketAiOfflineCard =
    isMobileOfflineUnlinked &&
    ollamaStatus !== 'connected' &&
    !pocketAiState.isModelLoaded;

  const streamAssistantReply = useCallback(
    async (targetCharacter: Character, baseHistory: ChatMessage[]) => {
      const activeProvider = settings.provider ?? 'ollama';
      const activeModelLabel = canUseNativePocketAi
        ? pocketAiState.activeModelName || pocketAiState.activeModelId || 'Pocket AI'
        : settings.selectedModel;

      if (!canUseNativePocketAi && !settings.selectedModel.trim()) {
        setErrorMessage(
          activeProvider === 'openai'
            ? t.selectOpenAIModelBeforeSending
            : t.selectModelBeforeSending
        );
        setIsSettingsOpen(true);
        return;
      }

      setErrorMessage(null);

      const assistantMsgId = makeMessageId();
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        swipes: [''],
        activeSwipeIndex: 0,
        createdAt: Date.now(),
        model: activeModelLabel,
        isStreaming: true,
      };

      const storyMemoryEnabled = settings.storyMemoryEnabled !== false;
      const activeMemory = storyMemories[targetCharacter.id];
      const systemContent = buildEffectiveSystemPrompt(
        targetCharacter.systemPrompt,
        userPersona,
        activeMemory,
        storyMemoryEnabled
      );

      const ollamaMessages = [
        { role: 'system' as const, content: systemContent },
        ...selectContextMessages(baseHistory, activeMemory, storyMemoryEnabled),
      ];

      setConversations((prev) => ({
        ...prev,
        [targetCharacter.id]: [...baseHistory, assistantPlaceholder],
      }));

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setStreamingCharacterId(targetCharacter.id);

      const appendTokenToAssistant = (token: string) => {
        if (!token) return;
        setConversations((prev) => {
          const list = prev[targetCharacter.id] ?? [];
          return {
            ...prev,
            [targetCharacter.id]: list.map((m) => {
              if (m.id !== assistantMsgId) return m;
              const nextContent = m.content + token;
              const nextSwipes =
                Array.isArray(m.swipes) && m.swipes.length > 0
                  ? [...m.swipes]
                  : [nextContent];
              const idx = m.activeSwipeIndex ?? 0;
              nextSwipes[idx] = nextContent;
              return {
                ...m,
                content: nextContent,
                swipes: nextSwipes,
              };
            }),
          };
        });
      };

      try {
        const nativeAiPlugin = window.Capacitor?.Plugins?.AtriumLocalAi;
        if (canUseNativePocketAi && nativeAiPlugin?.generateChat && pocketAiState.activeModelId) {
          let streamedViaNativeEvents = false;
          let tokenListenerHandle: { remove: () => Promise<void> | void } | undefined;
          if (nativeAiPlugin.addListener) {
            const maybeHandle = await nativeAiPlugin.addListener('token', (payload) => {
              if (controller.signal.aborted) return;
              const tok = typeof payload.token === 'string' ? payload.token : '';
              if (tok) {
                streamedViaNativeEvents = true;
                appendTokenToAssistant(tok);
              }
            });
            tokenListenerHandle = maybeHandle;
          }
          try {
            const result = await nativeAiPlugin.generateChat({
              modelId: pocketAiState.activeModelId,
              messages: ollamaMessages,
              temperature: settings.temperature,
              maxTokens: settings.numPredict,
            });
            if (controller.signal.aborted) {
              throw new DOMException('Aborted', 'AbortError');
            }
            if (result?.error) {
              throw new Error(result.error);
            }
            if (!streamedViaNativeEvents && typeof result?.text === 'string') {
              appendTokenToAssistant(result.text);
            }
            setConversations((prev) => {
              const list = prev[targetCharacter.id] ?? [];
              return {
                ...prev,
                [targetCharacter.id]: list.map((m) =>
                  m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                ),
              };
            });
          } finally {
            await tokenListenerHandle?.remove?.();
          }
        } else {
          await streamProviderChat({
            provider: activeProvider,
            baseUrl: settings.baseUrl,
            apiKey: settings.apiKey,
            model: settings.selectedModel,
            messages: ollamaMessages,
            temperature: settings.temperature,
            numPredict: settings.numPredict,
            numCtx: settings.numCtx,
            signal: controller.signal,
            onToken: appendTokenToAssistant,
            onDone: (stats) => {
              setOllamaStatus('connected');
              setConversations((prev) => {
                const list = prev[targetCharacter.id] ?? [];
                return {
                  ...prev,
                  [targetCharacter.id]: list.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          isStreaming: false,
                          tokensPerSecond: stats?.tokensPerSecond,
                        }
                      : m
                  ),
                };
              });
            },
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setConversations((prev) => {
            const list = prev[targetCharacter.id] ?? [];
            return {
              ...prev,
              [targetCharacter.id]: list
                .map((m) =>
                  m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                )
                .filter(
                  (m) => m.id !== assistantMsgId || m.content.trim().length > 0
                ),
            };
          });
        } else {
          const message =
            err instanceof Error ? err.message : t.ollamaUnexpectedError;
          setErrorMessage(message);
          if (
            activeProvider === 'ollama' &&
            message.toLowerCase().includes('connection failed')
          ) {
            setOllamaStatus('offline');
            if (!isMobileClientRuntime) {
              setShowOllamaSetupHelper(true);
            }
          }
          setConversations((prev) => {
            const list = prev[targetCharacter.id] ?? [];
            return {
              ...prev,
              [targetCharacter.id]: list.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: m.content || t.ollamaNoResponseFallback,
                      isStreaming: false,
                      isError: !m.content,
                    }
                  : m
              ),
            };
          });
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setStreamingCharacterId(null);
        setConversations((prev) => {
          const list = prev[targetCharacter.id] ?? [];
          return {
            ...prev,
            [targetCharacter.id]: list.map((m) =>
              m.id === assistantMsgId ? { ...m, isStreaming: false } : m
            ),
          };
        });
      }
    },
    [
      canUseNativePocketAi,
      isMobileClientRuntime,
      pocketAiState.activeModelId,
      pocketAiState.activeModelName,
      settings,
      storyMemories,
      userPersona,
      t,
    ]
  );

  const handleSelectCharacter = useCallback(
    (id: string) => {
      if (id === activeCharacter.id) return;
      if (streamingCharacterId) {
        stopStreaming();
      }
      setErrorMessage(null);
      setActiveCharacterId(id);
    },
    [activeCharacter.id, streamingCharacterId, stopStreaming]
  );

  const handleReturnToLobby = useCallback(() => {
    if (streamingCharacterId) {
      stopStreaming();
    }
    setErrorMessage(null);
    setActiveWorld('lobby');
  }, [stopStreaming, streamingCharacterId]);

  const handleExitApp = useCallback(() => {
    if (streamingCharacterId) {
      stopStreaming();
    }
    setShowOutro(true);
  }, [stopStreaming, streamingCharacterId]);

  const handleClearChat = useCallback(() => {
    if (streamingCharacterId === activeCharacter.id) {
      stopStreaming();
    }
    setErrorMessage(null);
    delete lastSummaryAttemptCountRef.current[activeCharacter.id];
    setConversations((prev) => ({
      ...prev,
      [activeCharacter.id]: [],
    }));
    setStoryMemories((prev) => {
      if (!prev[activeCharacter.id]) return prev;
      const next = { ...prev };
      delete next[activeCharacter.id];
      return next;
    });
  }, [activeCharacter.id, streamingCharacterId, stopStreaming]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const activeProvider = settings.provider ?? 'ollama';
      if (!canUseNativePocketAi) {
        if (activeProvider === 'ollama' && ollamaStatus === 'offline') {
          if (isMobileOfflineUnlinked) {
            setSettingsFocusSection('general');
            setIsSettingsOpen(true);
            return;
          }
          setShowOllamaSetupHelper(true);
          return;
        }

        if (!settings.selectedModel.trim()) {
          setErrorMessage(
            activeProvider === 'openai'
              ? t.selectOpenAIModelBeforeSending
              : t.selectModelBeforeSending
          );
          setIsSettingsOpen(true);
          return;
        }
      }

      const priorHistory = conversations[activeCharacter.id] ?? [];
      const seededGreeting: ChatMessage[] =
        priorHistory.length === 0 && activeCharacter.greeting
          ? [
              {
                id: makeMessageId(),
                role: 'assistant',
                content: activeCharacter.greeting,
                createdAt: Date.now() - 1,
              },
            ]
          : [];

      const userMsg: ChatMessage = {
        id: makeMessageId(),
        role: 'user',
        content,
        createdAt: Date.now(),
      };

      const nextBaseHistory = [...priorHistory, ...seededGreeting, userMsg];
      await streamAssistantReply(activeCharacter, nextBaseHistory);
    },
    [
      activeCharacter,
      canUseNativePocketAi,
      conversations,
      isMobileOfflineUnlinked,
      ollamaStatus,
      settings.provider,
      settings.selectedModel,
      streamAssistantReply,
      t.selectModelBeforeSending,
      t.selectOpenAIModelBeforeSending,
    ]
  );

  const handleRegenerateLastResponse = useCallback(async () => {
    const activeProvider = settings.provider ?? 'ollama';
    if (!canUseNativePocketAi) {
      if (activeProvider === 'ollama' && ollamaStatus === 'offline') {
        if (isMobileOfflineUnlinked) {
          setSettingsFocusSection('general');
          setIsSettingsOpen(true);
          return;
        }
        setShowOllamaSetupHelper(true);
        return;
      }

      if (!settings.selectedModel.trim()) {
        setErrorMessage(
          activeProvider === 'openai'
            ? t.selectOpenAIModelBeforeSending
            : t.selectModelBeforeSending
        );
        setIsSettingsOpen(true);
        return;
      }
    }

    if (streamingCharacterId === activeCharacter.id) {
      stopStreaming();
    }
    const history = conversations[activeCharacter.id] ?? [];
    if (history.length === 0) return;

    const lastMsg = history[history.length - 1];
    if (lastMsg.role !== 'assistant') return;

    const baseHistory = history.slice(0, -1);
    if (!baseHistory.some((m) => m.role === 'user')) return;

    const targetCharacter = activeCharacter;
    const targetMsgId = lastMsg.id;

    const previousSwipes = lastMsg.isError
      ? []
      : Array.isArray(lastMsg.swipes) && lastMsg.swipes.length > 0
        ? lastMsg.swipes
        : lastMsg.content.trim().length > 0
          ? [lastMsg.content]
          : [];
    const previousSwipeIndex =
      previousSwipes.length > 0
        ? Math.min(
            Math.max(
              lastMsg.activeSwipeIndex ?? previousSwipes.length - 1,
              0
            ),
            previousSwipes.length - 1
          )
        : 0;
    const nextSwipeIndex = previousSwipes.length;
    const nextSwipes = [...previousSwipes, ''];

    setErrorMessage(null);

    const storyMemoryEnabled = settings.storyMemoryEnabled !== false;
    const activeMemory = storyMemories[targetCharacter.id];
    const systemContent = buildEffectiveSystemPrompt(
      targetCharacter.systemPrompt,
      userPersona,
      activeMemory,
      storyMemoryEnabled
    );
    const apiMessages = [
      { role: 'system' as const, content: systemContent },
      ...selectContextMessages(baseHistory, activeMemory, storyMemoryEnabled),
    ];

    const activeModelLabel = canUseNativePocketAi
      ? pocketAiState.activeModelName || pocketAiState.activeModelId || 'Pocket AI'
      : settings.selectedModel;

    setConversations((prev) => {
      const list = prev[targetCharacter.id] ?? [];
      return {
        ...prev,
        [targetCharacter.id]: list.map((m) =>
          m.id === targetMsgId
            ? {
                ...m,
                content: '',
                swipes: nextSwipes,
                activeSwipeIndex: nextSwipeIndex,
                createdAt: Date.now(),
                model: activeModelLabel,
                tokensPerSecond: undefined,
                isStreaming: true,
                isError: false,
              }
            : m
        ),
      };
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStreamingCharacterId(targetCharacter.id);
    let accumulated = '';

    const appendRegenToken = (token: string) => {
      if (!token) return;
      accumulated += token;
      const snapshot = accumulated;
      setConversations((prev) => {
        const list = prev[targetCharacter.id] ?? [];
        return {
          ...prev,
          [targetCharacter.id]: list.map((m) => {
            if (m.id !== targetMsgId) return m;
            const swipesCopy =
              Array.isArray(m.swipes) && m.swipes.length > nextSwipeIndex
                ? [...m.swipes]
                : [...nextSwipes];
            swipesCopy[nextSwipeIndex] = snapshot;
            return {
              ...m,
              content: snapshot,
              swipes: swipesCopy,
              activeSwipeIndex: nextSwipeIndex,
            };
          }),
        };
      });
    };

    try {
      const nativeAiPlugin = window.Capacitor?.Plugins?.AtriumLocalAi;
      if (canUseNativePocketAi && nativeAiPlugin?.generateChat && pocketAiState.activeModelId) {
        let streamedViaNativeEvents = false;
        let tokenListenerHandle: { remove: () => Promise<void> | void } | undefined;
        if (nativeAiPlugin.addListener) {
          tokenListenerHandle = await nativeAiPlugin.addListener('token', (payload) => {
            if (controller.signal.aborted) return;
            const tok = typeof payload.token === 'string' ? payload.token : '';
            if (tok) {
              streamedViaNativeEvents = true;
              appendRegenToken(tok);
            }
          });
        }
        try {
          const result = await nativeAiPlugin.generateChat({
            modelId: pocketAiState.activeModelId,
            messages: apiMessages,
            temperature: settings.temperature,
            maxTokens: settings.numPredict,
          });
          if (controller.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          if (result?.error) {
            throw new Error(result.error);
          }
          if (!streamedViaNativeEvents && typeof result?.text === 'string') {
            appendRegenToken(result.text);
          }
          setConversations((prev) => {
            const list = prev[targetCharacter.id] ?? [];
            return {
              ...prev,
              [targetCharacter.id]: list.map((m) =>
                m.id === targetMsgId ? { ...m, isStreaming: false } : m
              ),
            };
          });
        } finally {
          await tokenListenerHandle?.remove?.();
        }
      } else {
        await streamProviderChat({
          provider: activeProvider,
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.selectedModel,
          messages: apiMessages,
          temperature: settings.temperature,
          numPredict: settings.numPredict,
          numCtx: settings.numCtx,
          signal: controller.signal,
          onToken: appendRegenToken,
          onDone: (stats) => {
            setOllamaStatus('connected');
            setConversations((prev) => {
              const list = prev[targetCharacter.id] ?? [];
              return {
                ...prev,
                [targetCharacter.id]: list.map((m) =>
                  m.id === targetMsgId
                    ? {
                        ...m,
                        isStreaming: false,
                        tokensPerSecond: stats?.tokensPerSecond,
                      }
                    : m
                ),
              };
            });
          },
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setConversations((prev) => {
          const list = prev[targetCharacter.id] ?? [];
          if (accumulated.trim().length > 0) {
            return {
              ...prev,
              [targetCharacter.id]: list.map((m) =>
                m.id === targetMsgId ? { ...m, isStreaming: false } : m
              ),
            };
          }
          if (previousSwipes.length > 0) {
            return {
              ...prev,
              [targetCharacter.id]: list.map((m) =>
                m.id === targetMsgId
                  ? {
                      ...m,
                      content: previousSwipes[previousSwipeIndex],
                      swipes: previousSwipes,
                      activeSwipeIndex: previousSwipeIndex,
                      isStreaming: false,
                      isError: false,
                    }
                  : m
              ),
            };
          }
          return {
            ...prev,
            [targetCharacter.id]: list.filter((m) => m.id !== targetMsgId),
          };
        });
      } else {
        const message =
          err instanceof Error ? err.message : t.ollamaUnexpectedError;
        setErrorMessage(message);
        if (
          activeProvider === 'ollama' &&
          message.toLowerCase().includes('connection failed')
        ) {
          setOllamaStatus('offline');
          if (!isMobileClientRuntime) {
            setShowOllamaSetupHelper(true);
          }
        }
        setConversations((prev) => {
          const list = prev[targetCharacter.id] ?? [];
          if (accumulated.trim().length === 0 && previousSwipes.length > 0) {
            return {
              ...prev,
              [targetCharacter.id]: list.map((m) =>
                m.id === targetMsgId
                  ? {
                      ...m,
                      content: previousSwipes[previousSwipeIndex],
                      swipes: previousSwipes,
                      activeSwipeIndex: previousSwipeIndex,
                      isStreaming: false,
                      isError: false,
                    }
                  : m
              ),
            };
          }
          return {
            ...prev,
            [targetCharacter.id]: list.map((m) => {
              if (m.id !== targetMsgId) return m;
              const fallback = accumulated || t.ollamaNoResponseFallback;
              const swipesCopy =
                accumulated.trim().length > 0
                  ? m.swipes
                  : previousSwipes.length > 0
                    ? previousSwipes
                    : undefined;
              return {
                ...m,
                content: fallback,
                swipes: swipesCopy,
                activeSwipeIndex:
                  swipesCopy && swipesCopy.length > 0
                    ? Math.min(nextSwipeIndex, swipesCopy.length - 1)
                    : undefined,
                isStreaming: false,
                isError: !accumulated,
              };
            }),
          };
        });
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setStreamingCharacterId(null);
      setConversations((prev) => {
        const list = prev[targetCharacter.id] ?? [];
        return {
          ...prev,
          [targetCharacter.id]: list.map((m) =>
            m.id === targetMsgId ? { ...m, isStreaming: false } : m
          ),
        };
      });
    }
  }, [
    activeCharacter,
    canUseNativePocketAi,
    conversations,
    isMobileClientRuntime,
    isMobileOfflineUnlinked,
    ollamaStatus,
    pocketAiState.activeModelId,
    pocketAiState.activeModelName,
    settings,
    stopStreaming,
    storyMemories,
    streamingCharacterId,
    t,
    userPersona,
  ]);

  const handleContinueLastResponse = useCallback(async () => {
    const activeProvider = settings.provider ?? 'ollama';
    if (!canUseNativePocketAi) {
      if (activeProvider === 'ollama' && ollamaStatus === 'offline') {
        if (isMobileOfflineUnlinked) {
          setSettingsFocusSection('general');
          setIsSettingsOpen(true);
          return;
        }
        setShowOllamaSetupHelper(true);
        return;
      }

      if (!settings.selectedModel.trim()) {
        setErrorMessage(
          activeProvider === 'openai'
            ? t.selectOpenAIModelBeforeSending
            : t.selectModelBeforeSending
        );
        setIsSettingsOpen(true);
        return;
      }
    }

    if (streamingCharacterId === activeCharacter.id) {
      stopStreaming();
    }

    const history = conversations[activeCharacter.id] ?? [];
    if (history.length === 0) return;

    const lastMsg = history[history.length - 1];
    if (
      lastMsg.role !== 'assistant' ||
      lastMsg.isError ||
      !lastMsg.content.trim()
    ) {
      return;
    }

    const targetCharacter = activeCharacter;
    const targetMsgId = lastMsg.id;
    const existingContent = lastMsg.content;
    const baseSwipes =
      Array.isArray(lastMsg.swipes) && lastMsg.swipes.length > 0
        ? [...lastMsg.swipes]
        : [existingContent];
    const targetSwipeIndex = Math.min(
      Math.max(lastMsg.activeSwipeIndex ?? baseSwipes.length - 1, 0),
      baseSwipes.length - 1
    );

    setErrorMessage(null);

    const storyMemoryEnabled = settings.storyMemoryEnabled !== false;
    const activeMemory = storyMemories[targetCharacter.id];
    const systemContent = buildEffectiveSystemPrompt(
      targetCharacter.systemPrompt,
      userPersona,
      activeMemory,
      storyMemoryEnabled
    );
    const priorMessages = selectContextMessages(
      history.slice(0, -1),
      activeMemory,
      storyMemoryEnabled
    );

    const apiMessages = [
      { role: 'system' as const, content: systemContent },
      ...priorMessages,
      { role: 'assistant' as const, content: existingContent },
      {
        role: 'user' as const,
        content:
          '[Continue your immediately preceding response seamlessly from the exact point where it stopped. Do not repeat what you already wrote, do not summarize, and do not add meta-commentary—simply continue in character.]',
      },
    ];

    const activeModelLabel = canUseNativePocketAi
      ? pocketAiState.activeModelName || pocketAiState.activeModelId || 'Pocket AI'
      : settings.selectedModel;

    setConversations((prev) => {
      const list = prev[targetCharacter.id] ?? [];
      return {
        ...prev,
        [targetCharacter.id]: list.map((m) =>
          m.id === targetMsgId
            ? {
                ...m,
                swipes: baseSwipes,
                activeSwipeIndex: targetSwipeIndex,
                model: activeModelLabel,
                isStreaming: true,
              }
            : m
        ),
      };
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStreamingCharacterId(targetCharacter.id);
    let appended = '';

    const appendContinueToken = (token: string) => {
      if (!token) return;
      if (
        appended.length === 0 &&
        existingContent.length > 0 &&
        !/\s$/.test(existingContent) &&
        !/^[\s.,!?;:'"”’*)\]\-—…]/.test(token)
      ) {
        appended += ` ${token}`;
      } else {
        appended += token;
      }
      const combined = existingContent + appended;
      setConversations((prev) => {
        const list = prev[targetCharacter.id] ?? [];
        return {
          ...prev,
          [targetCharacter.id]: list.map((m) => {
            if (m.id !== targetMsgId) return m;
            const swipesCopy =
              Array.isArray(m.swipes) && m.swipes.length > targetSwipeIndex
                ? [...m.swipes]
                : [...baseSwipes];
            swipesCopy[targetSwipeIndex] = combined;
            return {
              ...m,
              content: combined,
              swipes: swipesCopy,
              activeSwipeIndex: targetSwipeIndex,
            };
          }),
        };
      });
    };

    try {
      const nativeAiPlugin = window.Capacitor?.Plugins?.AtriumLocalAi;
      if (canUseNativePocketAi && nativeAiPlugin?.generateChat && pocketAiState.activeModelId) {
        let streamedViaNativeEvents = false;
        let tokenListenerHandle: { remove: () => Promise<void> | void } | undefined;
        if (nativeAiPlugin.addListener) {
          tokenListenerHandle = await nativeAiPlugin.addListener('token', (payload) => {
            if (controller.signal.aborted) return;
            const tok = typeof payload.token === 'string' ? payload.token : '';
            if (tok) {
              streamedViaNativeEvents = true;
              appendContinueToken(tok);
            }
          });
        }
        try {
          const result = await nativeAiPlugin.generateChat({
            modelId: pocketAiState.activeModelId,
            messages: apiMessages,
            temperature: settings.temperature,
            maxTokens: settings.numPredict,
          });
          if (controller.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          if (result?.error) {
            throw new Error(result.error);
          }
          if (!streamedViaNativeEvents && typeof result?.text === 'string') {
            appendContinueToken(result.text);
          }
          setConversations((prev) => {
            const list = prev[targetCharacter.id] ?? [];
            return {
              ...prev,
              [targetCharacter.id]: list.map((m) =>
                m.id === targetMsgId ? { ...m, isStreaming: false } : m
              ),
            };
          });
        } finally {
          await tokenListenerHandle?.remove?.();
        }
      } else {
        await streamProviderChat({
          provider: activeProvider,
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.selectedModel,
          messages: apiMessages,
          temperature: settings.temperature,
          numPredict: settings.numPredict,
          numCtx: settings.numCtx,
          signal: controller.signal,
          onToken: appendContinueToken,
          onDone: (stats) => {
            setOllamaStatus('connected');
            setConversations((prev) => {
              const list = prev[targetCharacter.id] ?? [];
              return {
                ...prev,
                [targetCharacter.id]: list.map((m) =>
                  m.id === targetMsgId
                    ? {
                        ...m,
                        isStreaming: false,
                        tokensPerSecond: stats?.tokensPerSecond,
                      }
                    : m
                ),
              };
            });
          },
        });
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        const message =
          err instanceof Error ? err.message : t.ollamaUnexpectedError;
        setErrorMessage(message);
        if (
          activeProvider === 'ollama' &&
          message.toLowerCase().includes('connection failed')
        ) {
          setOllamaStatus('offline');
          if (!isMobileClientRuntime) {
            setShowOllamaSetupHelper(true);
          }
        }
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setStreamingCharacterId(null);
      setConversations((prev) => {
        const list = prev[targetCharacter.id] ?? [];
        return {
          ...prev,
          [targetCharacter.id]: list.map((m) =>
            m.id === targetMsgId ? { ...m, isStreaming: false } : m
          ),
        };
      });
    }
  }, [
    activeCharacter,
    canUseNativePocketAi,
    conversations,
    isMobileClientRuntime,
    isMobileOfflineUnlinked,
    ollamaStatus,
    pocketAiState.activeModelId,
    pocketAiState.activeModelName,
    settings,
    stopStreaming,
    storyMemories,
    streamingCharacterId,
    t,
    userPersona,
  ]);

  // Silent Background Story Memory: auto-condense older turns every 20 messages
  useEffect(() => {
    if (!isStorageReady) return;
    if (settings.storyMemoryEnabled === false) return;
    if (streamingCharacterId !== null) return;
    if (!settings.selectedModel.trim()) return;

    const char = activeCharacter;
    const charId = char.id;
    const history = conversations[charId] ?? [];
    const validMsgs = history.filter(
      (m) => !m.isError && !m.isStreaming && m.content.trim().length > 0
    );

    const existingMemory = storyMemories[charId];
    const alreadySummarized = existingMemory?.summarizedMessageCount ?? 0;

    if (
      validMsgs.length < SUMMARY_INTERVAL_MESSAGES ||
      validMsgs.length - alreadySummarized < SUMMARY_INTERVAL_MESSAGES
    ) {
      return;
    }

    if (summarizingCharIdsRef.current.has(charId)) {
      return;
    }
    if (lastSummaryAttemptCountRef.current[charId] === validMsgs.length) {
      return;
    }

    const newCutoff = Math.max(
      alreadySummarized,
      validMsgs.length - RECENT_VERBATIM_WINDOW
    );
    const turnsToSummarize = validMsgs.slice(alreadySummarized, newCutoff);
    if (turnsToSummarize.length === 0) {
      return;
    }

    lastSummaryAttemptCountRef.current[charId] = validMsgs.length;
    summarizingCharIdsRef.current.add(charId);
    const expectedUpdatedAt = existingMemory?.updatedAt ?? 0;
    const controller = new AbortController();

    void (async () => {
      try {
        const nextSummary = await summarizeConversationMemory({
          provider: settings.provider ?? 'ollama',
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.selectedModel,
          characterName: char.name,
          userName: userPersona.name,
          existingSummary: existingMemory?.summary,
          turnsToSummarize: turnsToSummarize.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          numCtx: settings.numCtx,
          signal: controller.signal,
        });

        if (!nextSummary) return;

        const latestMemoryUpdatedAt =
          storyMemoriesRef.current[charId]?.updatedAt ?? 0;
        const latestMsgsCount =
          conversationsRef.current[charId]?.filter(
            (m) => !m.isError && m.content.trim().length > 0
          ).length ?? 0;

        if (
          latestMemoryUpdatedAt === expectedUpdatedAt &&
          latestMsgsCount >= newCutoff
        ) {
          setStoryMemories((prev) => ({
            ...prev,
            [charId]: {
              summary: nextSummary,
              summarizedMessageCount: newCutoff,
              updatedAt: Date.now(),
            },
          }));
        }
      } catch {
        // Silent background summarization must never disrupt active chat
      } finally {
        summarizingCharIdsRef.current.delete(charId);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [
    activeCharacter,
    conversations,
    isStorageReady,
    settings.apiKey,
    settings.baseUrl,
    settings.numCtx,
    settings.provider,
    settings.selectedModel,
    settings.storyMemoryEnabled,
    storyMemories,
    streamingCharacterId,
    userPersona.name,
  ]);

  const handleSaveStoryMemory = useCallback(
    (summaryText: string) => {
      const charId = activeCharacter.id;
      const trimmed = summaryText.trim();
      if (!trimmed) {
        setStoryMemories((prev) => {
          if (!prev[charId]) return prev;
          const next = { ...prev };
          delete next[charId];
          return next;
        });
        return;
      }

      setStoryMemories((prev) => ({
        ...prev,
        [charId]: {
          summary: trimmed,
          summarizedMessageCount: prev[charId]?.summarizedMessageCount ?? 0,
          updatedAt: Date.now(),
        },
      }));
    },
    [activeCharacter.id]
  );

  const handleClearStoryMemory = useCallback(() => {
    const charId = activeCharacter.id;
    delete lastSummaryAttemptCountRef.current[charId];
    setStoryMemories((prev) => {
      if (!prev[charId]) return prev;
      const next = { ...prev };
      delete next[charId];
      return next;
    });
  }, [activeCharacter.id]);

  const handleRefreshStoryMemory = useCallback(async (): Promise<
    string | null
  > => {
    const char = activeCharacter;
    const charId = char.id;
    const validMsgs = (conversations[charId] ?? []).filter(
      (m) => !m.isError && !m.isStreaming && m.content.trim().length > 0
    );
    if (validMsgs.length === 0 || !settings.selectedModel.trim()) {
      return null;
    }

    const cutoff =
      validMsgs.length > RECENT_VERBATIM_WINDOW
        ? validMsgs.length - RECENT_VERBATIM_WINDOW
        : validMsgs.length;
    const turns = validMsgs.slice(0, cutoff);

    try {
      const generated = await summarizeConversationMemory({
        provider: settings.provider ?? 'ollama',
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.selectedModel,
        characterName: char.name,
        userName: userPersona.name,
        turnsToSummarize: turns.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        numCtx: settings.numCtx,
      });

      if (!generated) return null;

      setStoryMemories((prev) => ({
        ...prev,
        [charId]: {
          summary: generated,
          summarizedMessageCount: cutoff,
          updatedAt: Date.now(),
        },
      }));
      return generated;
    } catch {
      return null;
    }
  }, [activeCharacter, conversations, settings, userPersona.name]);

  const handleSwipeMessage = useCallback(
    (messageId: string, direction: 'prev' | 'next') => {
      if (streamingCharacterId === activeCharacter.id) return;
      setConversations((prev) => {
        const list = prev[activeCharacter.id] ?? [];
        return {
          ...prev,
          [activeCharacter.id]: list.map((m) => {
            if (m.id !== messageId) return m;
            if (!Array.isArray(m.swipes) || m.swipes.length <= 1) return m;
            const currentIdx = Math.min(
              Math.max(m.activeSwipeIndex ?? m.swipes.length - 1, 0),
              m.swipes.length - 1
            );
            const nextIdx =
              direction === 'prev'
                ? Math.max(0, currentIdx - 1)
                : Math.min(m.swipes.length - 1, currentIdx + 1);
            if (nextIdx === currentIdx) return m;
            return {
              ...m,
              activeSwipeIndex: nextIdx,
              content: m.swipes[nextIdx],
              isError: false,
            };
          }),
        };
      });
    },
    [activeCharacter.id, streamingCharacterId]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (streamingCharacterId === activeCharacter.id) {
        stopStreaming();
      }
      setConversations((prev) => {
        const list = prev[activeCharacter.id] ?? [];
        return {
          ...prev,
          [activeCharacter.id]: list.filter((m) => m.id !== messageId),
        };
      });
    },
    [activeCharacter.id, stopStreaming, streamingCharacterId]
  );

  const handleEditUserMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const activeProvider = settings.provider ?? 'ollama';
      if (!canUseNativePocketAi) {
        if (activeProvider === 'ollama' && ollamaStatus === 'offline') {
          if (isMobileOfflineUnlinked) {
            setSettingsFocusSection('general');
            setIsSettingsOpen(true);
            return;
          }
          setShowOllamaSetupHelper(true);
          return;
        }

        if (!settings.selectedModel.trim()) {
          setErrorMessage(
            activeProvider === 'openai'
              ? t.selectOpenAIModelBeforeSending
              : t.selectModelBeforeSending
          );
          setIsSettingsOpen(true);
          return;
        }
      }

      if (streamingCharacterId === activeCharacter.id) {
        stopStreaming();
      }

      const history = conversations[activeCharacter.id] ?? [];
      const targetIndex = history.findIndex((m) => m.id === messageId);
      if (targetIndex === -1) return;

      const truncated = history.slice(0, targetIndex + 1).map((m, idx) =>
        idx === targetIndex
          ? { ...m, content: newContent, createdAt: Date.now() }
          : m
      );

      await streamAssistantReply(activeCharacter, truncated);
    },
    [
      activeCharacter,
      canUseNativePocketAi,
      conversations,
      isMobileOfflineUnlinked,
      ollamaStatus,
      settings.provider,
      settings.selectedModel,
      stopStreaming,
      streamAssistantReply,
      streamingCharacterId,
      t.selectModelBeforeSending,
      t.selectOpenAIModelBeforeSending,
    ]
  );

  const handleSaveCharacter = useCallback((savedChar: Character) => {
    const storedOrder = loadSavedCharacterOrder();
    const baseOrder =
      storedOrder.length > 0
        ? storedOrder
        : charactersRef.current.map((c) => c.id);
    const nextOrder = baseOrder.includes(savedChar.id)
      ? baseOrder
      : [savedChar.id, ...baseOrder];

    saveCharacterOrder(nextOrder);
    setCharacterOrder(nextOrder);
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === savedChar.id);
      const updated = exists
        ? prev.map((c) => (c.id === savedChar.id ? savedChar : c))
        : [savedChar, ...prev];
      return applyCharacterOrder(updated, nextOrder);
    });
    setActiveCharacterId(savedChar.id);
  }, []);

  const handleReorderCharacters = useCallback((orderedIds: string[]) => {
    const cleanOrder = orderedIds.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0
    );
    saveCharacterOrder(cleanOrder);
    setCharacterOrder(cleanOrder);
    setCharacters((prev) => applyCharacterOrder(prev, cleanOrder));
  }, []);

  const handleDeleteCharacter = useCallback(
    (id: string) => {
      const storedOrder = loadSavedCharacterOrder();
      const baseOrder =
        storedOrder.length > 0
          ? storedOrder
          : charactersRef.current.map((c) => c.id);
      const nextOrder = baseOrder.filter((entryId) => entryId !== id);
      saveCharacterOrder(nextOrder);
      setCharacterOrder(nextOrder);

      setCharacters((prev) => {
        if (prev.length <= 1) return prev;
        const filtered = prev.filter((c) => c.id !== id);
        if (activeCharacterId === id && filtered.length > 0) {
          setActiveCharacterId(filtered[0].id);
        }
        return applyCharacterOrder(filtered, nextOrder);
      });
      setConversations((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setStoryMemories((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [activeCharacterId]
  );

  const handleExportBackup = useCallback((): number => {
    downloadAtriumBackup({
      characters,
      activeCharacterId: activeCharacter.id,
      conversations,
      storyMemories,
      settings,
      userPersona,
      themeId,
      bubbleSchemeId,
      language,
      visualSettings,
    });
    return characters.length;
  }, [
    activeCharacter.id,
    bubbleSchemeId,
    characters,
    conversations,
    language,
    settings,
    storyMemories,
    themeId,
    userPersona,
    visualSettings,
  ]);

  const handleImportBackup = useCallback(
    async (
      file: File
    ): Promise<{
      charCount: number;
      chatCount: number;
      apiKeyCleared: boolean;
    }> => {
      const parsed = await parseAtriumBackupFile(file);
      if (streamingCharacterId) {
        stopStreaming();
      }
      const hydrated = hydrateCharacters(parsed.characters);
      setCharacters(hydrated);
      const importedOrder = hydrated.map((c) => c.id);
      setCharacterOrder(importedOrder);
      saveCharacterOrder(importedOrder);
      setActiveCharacterId(parsed.activeCharacterId);
      setConversations(parsed.conversations);
      if (parsed.storyMemories) {
        setStoryMemories(parsed.storyMemories);
      }
      let apiKeyCleared = false;
      if (parsed.settings) {
        const normalizeEndpoint = (url: string | undefined) =>
          (url ?? '').trim().replace(/\/+$/, '').toLowerCase();
        const endpointChanged =
          normalizeEndpoint(parsed.settings.baseUrl) !==
            normalizeEndpoint(settings.baseUrl) ||
          normalizeEndpoint(parsed.settings.openaiBaseUrl) !==
            normalizeEndpoint(settings.openaiBaseUrl);

        if (endpointChanged) {
          if (Boolean(settings.apiKey?.trim())) {
            apiKeyCleared = true;
          }
          setSettings({
            ...parsed.settings,
            apiKey: '',
          });
        } else {
          setSettings((prev) => ({
            ...parsed.settings!,
            apiKey: prev.apiKey,
          }));
        }
      }
      if (parsed.userPersona) {
        setUserPersona(parsed.userPersona);
      }
      if (parsed.themeId) {
        setThemeId(parsed.themeId);
      }
      if (parsed.bubbleSchemeId) {
        setBubbleSchemeId(parsed.bubbleSchemeId);
      }
      if (parsed.language) {
        setLanguage(parsed.language);
      }
      if (parsed.visualSettings) {
        setVisualSettings(hydrateVisualSettings(parsed.visualSettings));
      }
      setErrorMessage(null);
      return {
        charCount: hydrated.length,
        chatCount: parsed.chatCount,
        apiKeyCleared,
      };
    },
    [settings.apiKey, settings.baseUrl, settings.openaiBaseUrl, stopStreaming, streamingCharacterId]
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={themeStyle}
        className="m-0 flex h-dvh w-screen overflow-hidden bg-[var(--theme-bg)] p-0 text-[var(--theme-text)] transition-colors duration-300"
      >
        <AnimatePresence mode="wait">
          {activeWorld === 'lobby' ? (
            <motion.div
              key="world-lobby"
              initial={
                introMode === 'quick'
                  ? {
                      opacity: 0.35,
                      transform:
                        'translate3d(0, 10px, 0) scale3d(0.98, 0.98, 1)',
                    }
                  : introMode === 'grand'
                    ? {
                        opacity: 1,
                        transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
                      }
                    : {
                        opacity: 0,
                        transform:
                          'translate3d(0, 0, 0) scale3d(0.985, 0.985, 1)',
                      }
              }
              animate={
                introMode === 'quick'
                  ? {
                      opacity: 0.35,
                      transform:
                        'translate3d(0, 10px, 0) scale3d(0.98, 0.98, 1)',
                    }
                  : {
                      opacity: 1,
                      transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
                    }
              }
              exit={{
                opacity: 0,
                transform: 'translate3d(0, 0, 0) scale3d(0.985, 0.985, 1)',
              }}
              onAnimationStart={() => setLobbyWillChange(true)}
              onAnimationComplete={() => {
                if (!showIntro) {
                  setLobbyWillChange(false);
                }
              }}
              transition={{
                duration: introMode === 'quick' ? 0.34 : 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                willChange:
                  lobbyWillChange && introMode !== 'grand'
                    ? 'transform, opacity'
                    : 'auto',
                pointerEvents: showIntro ? 'none' : 'auto',
              }}
              className="h-full w-full"
            >
              <AtriumLobby
                t={t}
                language={language}
                onChangeLanguage={setLanguage}
                characters={characters}
                activeCharacterId={activeCharacter.id}
                selectedModel={settings.selectedModel}
                provider={settings.provider ?? 'ollama'}
                ollamaStatus={ollamaStatus}
                introDone={introMode !== 'quick'}
                userPersona={userPersona}
                messageCounts={messageCounts}
                onEnterScene={(char) => {
                  handleSelectCharacter(char.id);
                  setActiveWorld('chat');
                }}
                onOpenCharacterProfile={(char) => setProfileCharacter(char)}
                onCreateCharacter={() => {
                  setEditingCharacter(null);
                  setIsCharacterModalOpen(true);
                }}
                onImportCharacter={(imported) => {
                  handleSaveCharacter(imported);
                }}
                onEditCharacter={(char) => {
                  setEditingCharacter(char);
                  setIsCharacterModalOpen(true);
                }}
                onReorderCharacters={handleReorderCharacters}
                onOpenUserPersona={() => {
                  setSettingsFocusSection('persona');
                  setIsSettingsOpen(true);
                }}
                onOpenSettings={() => {
                  setSettingsFocusSection('general');
                  setIsSettingsOpen(true);
                }}
                onOpenOllamaSetup={() => {
                  if (isMobileOfflineUnlinked) {
                    setSettingsFocusSection('general');
                    setIsSettingsOpen(true);
                    return;
                  }
                  setShowOllamaSetupHelper(true);
                }}
                mobileLinkActive={mobileLinkStatus.active}
                isMobileClientConnected={isMobileLinkClient}
                activeRouteType={activeSmartRoute}
                onOpenMobileLink={
                  (isElectronHost && window.electronAPI?.startMobileLink) ||
                  isMobileClientRuntime ||
                  isMobileLinkClient
                    ? () => setIsMobileLinkModalOpen(true)
                    : undefined
                }
                backdropMode={
                  visualSettings.lobbyBackdropMode ?? 'orbital-clouds'
                }
                onExit={handleExitApp}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`world-chat-${activeCharacter.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="m-0 h-full w-full p-0"
            >
              <ChatWindow
                t={t}
                language={language}
                character={activeCharacter}
                messages={activeMessages}
                selectedModel={settings.selectedModel}
                ollamaUrl={settings.baseUrl}
                provider={settings.provider ?? 'ollama'}
                userPersona={userPersona}
                wallpaperFit={wallpaperFit}
                parallaxEnabled={parallaxEnabled}
                isStreaming={streamingCharacterId === activeCharacter.id}
                errorMessage={errorMessage}
                onSendMessage={handleSendMessage}
                onRegenerateLastResponse={handleRegenerateLastResponse}
                onContinueLastResponse={handleContinueLastResponse}
                onSwipeMessage={handleSwipeMessage}
                onDeleteMessage={handleDeleteMessage}
                onEditUserMessage={handleEditUserMessage}
                onStopStreaming={stopStreaming}
                onClearChat={handleClearChat}
                onReturnToLobby={handleReturnToLobby}
                onSetWallpaperFit={setWallpaperFit}
                onToggleParallax={() => setParallaxEnabled((prev) => !prev)}
                onOpenSettings={() => {
                  setSettingsFocusSection('general');
                  setIsSettingsOpen(true);
                }}
                onOpenUserPersona={() => {
                  setSettingsFocusSection('persona');
                  setIsSettingsOpen(true);
                }}
                onOpenCharacterProfile={() =>
                  setProfileCharacter(activeCharacter)
                }
                storyMemory={storyMemories[activeCharacter.id]}
                onOpenStoryMemory={() => setIsStoryMemoryOpen(true)}
                onDismissError={() => setErrorMessage(null)}
                showPocketAiOfflineCard={showPocketAiOfflineCard}
                pocketAiState={pocketAiState}
                activeRouteType={activeSmartRoute}
                isMobileClientConnected={isMobileLinkClient}
                onOpenPocketAiSetup={() => {
                  setSettingsFocusSection('general');
                  setIsSettingsOpen(true);
                }}
                onOpenMobileLinkPairing={() => setIsMobileLinkModalOpen(true)}
                onUnloadPocketAiModel={() => {
                  void handleUnloadPocketAiModel();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <SettingsModal
          t={t}
          isOpen={isSettingsOpen}
          settings={settings}
          userPersona={userPersona}
          focusSection={settingsFocusSection}
          themeId={themeId}
          bubbleSchemeId={bubbleSchemeId}
          visualSettings={visualSettings}
          language={language}
          onChangeTheme={setThemeId}
          onChangeBubbleScheme={setBubbleSchemeId}
          onChangeVisualSettings={setVisualSettings}
          onChangeLanguage={setLanguage}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(next, nextPersona) => {
            setSettings(next);
            setUserPersona(nextPersona);
            setErrorMessage(null);
            if ((next.provider ?? 'ollama') === 'openai') {
              setOllamaStatus(
                next.selectedModel.trim() || next.availableModels.length > 0
                  ? 'connected'
                  : 'offline'
              );
            } else if (next.availableModels.length > 0) {
              setOllamaStatus('connected');
            }
            pushSyncStateNow({ settings: next, userPersona: nextPersona });
          }}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onReplayGrandIntro={handleReplayGrandIntro}
          showPocketAi={isMobileClientRuntime}
          pocketAiState={pocketAiState}
          installedPocketModels={installedPocketModels}
          pocketDownloadingModelId={pocketDownloadingModelId}
          pocketDownloadProgress={pocketDownloadProgress}
          pocketLocalAiError={pocketLocalAiError}
          onDismissPocketAiError={() => setPocketLocalAiError(null)}
          onChangePocketAiMode={handleChangePocketAiMode}
          onDownloadPocketAiModel={handleDownloadPocketAiModel}
          onCancelPocketAiDownload={handleCancelPocketAiDownload}
          onImportPocketAiGguf={handleImportPocketAiGguf}
          onLoadPocketAiModel={handleLoadPocketAiModel}
          onUnloadPocketAiModel={handleUnloadPocketAiModel}
          onRemovePocketAiModel={handleRemovePocketAiModel}
          onSelectPocketLoopback={handleSelectPocketLoopback}
        />

        <StoryMemoryModal
          t={t}
          isOpen={isStoryMemoryOpen}
          character={activeCharacter}
          memory={storyMemories[activeCharacter.id]}
          autoMemoryEnabled={settings.storyMemoryEnabled !== false}
          canSummarizeNow={
            activeMessages.filter(
              (m) => !m.isError && m.content.trim().length > 0
            ).length >= 2 && settings.selectedModel.trim().length > 0
          }
          isStreaming={streamingCharacterId === activeCharacter.id}
          onClose={() => setIsStoryMemoryOpen(false)}
          onSave={handleSaveStoryMemory}
          onClear={handleClearStoryMemory}
          onRefreshSummary={handleRefreshStoryMemory}
        />

        <CharacterModal
          t={t}
          isOpen={isCharacterModalOpen}
          editingCharacter={editingCharacter}
          canDelete={characters.length > 1}
          onClose={() => setIsCharacterModalOpen(false)}
          onSave={handleSaveCharacter}
          onDelete={handleDeleteCharacter}
        />

        <CharacterProfileModal
          t={t}
          character={profileCharacter}
          primaryActionLabel={
            activeWorld === 'chat' &&
            profileCharacter?.id === activeCharacter.id
              ? t.returnToSceneButton
              : t.enterSceneButton
          }
          onClose={() => setProfileCharacter(null)}
          onChat={(charId) => {
            handleSelectCharacter(charId);
            setActiveWorld('chat');
          }}
          onEdit={(char) => {
            setEditingCharacter(char);
            setIsCharacterModalOpen(true);
          }}
          onOpenLightbox={(url, alt) => setLightboxImage({ url, alt })}
        />

        <ImageLightbox
          imageUrl={lightboxImage?.url ?? null}
          altText={lightboxImage?.alt}
          closeLabel={t.lightboxClose}
          onClose={() => setLightboxImage(null)}
        />

        <OllamaSetupHelper
          t={t}
          isOpen={showOllamaSetupHelper && !showIntro}
          ollamaUrl={settings.baseUrl}
          onDismiss={() => setShowOllamaSetupHelper(false)}
          onOpenSettings={() => {
            setShowOllamaSetupHelper(false);
            setSettingsFocusSection('general');
            setIsSettingsOpen(true);
          }}
          onConnected={(models) => {
            setOllamaStatus('connected');
            setSettings((prev) => ({
              ...prev,
              availableModels: models,
              selectedModel: prev.selectedModel || models[0]?.name || '',
            }));
            setShowOllamaSetupHelper(false);
          }}
        />

        <MobileLinkModal
          t={t}
          isOpen={isMobileLinkModalOpen}
          language={language}
          status={mobileLinkStatus}
          onStatusChange={setMobileLinkStatus}
          pairingProfile={mobilePairingProfile}
          isClientConnected={isMobileLinkClient}
          onPairClientSuccess={handlePairClientSuccess}
          onReconnectDualRoute={handleReconnectDualRoute}
          onDisconnectClient={handleDisconnectClient}
          onClose={() => setIsMobileLinkModalOpen(false)}
        />

        <OfflineIndicator t={t} />

        <AnimatePresence>
          {introMode === 'grand' ? (
            <GrandIntroSplash
              key="grand-intro-splash"
              skipHintLabel={t.grandIntroSkipHint}
              muteLabel={t.grandIntroMuteAudio}
              unmuteLabel={t.grandIntroUnmuteAudio}
              onComplete={handleIntroComplete}
            />
          ) : introMode === 'quick' ? (
            <IntroSplash
              key="intro-splash"
              skipLabel={t.skipIntro}
              onComplete={handleIntroComplete}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showOutro ? (
            <OutroSplash
              key="outro-splash"
              sessionSavedLabel={t.outroSessionSaved}
              craftedByLabel={t.outroCraftedBy}
              reopenLabel={t.reopenAtrium}
              onReopen={() => setShowOutro(false)}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
