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
import { ImageLightbox } from './components/ImageLightbox';
import { IntroSplash } from './components/IntroSplash';
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
  BubbleSchemeId,
  Character,
  ChatMessage,
  Language,
  OllamaSettings,
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
  fetchProviderModels,
  streamProviderChat,
  summarizeConversationMemory,
} from './utils/ollama';
import {
  DEFAULT_OLLAMA_SETTINGS,
  DEFAULT_USER_PERSONA,
  STORAGE_KEYS,
  hydrateCharacters,
  idbSet,
  loadAllPersistedState,
  saveApiKeySecurely,
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

export default function App() {
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);
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
    DEFAULT_VISUAL_STUDIO_SETTINGS
  );
  const [isStorageReady, setIsStorageReady] = useState(false);

  const t = TRANSLATIONS[language];

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
  const [showIntro, setShowIntro] = useState(true);
  const [lobbyWillChange, setLobbyWillChange] = useState(true);
  const [ollamaStatus, setOllamaStatus] = useState<
    'checking' | 'connected' | 'offline'
  >('checking');
  const [showOllamaSetupHelper, setShowOllamaSetupHelper] = useState(false);
  const [isStoryMemoryOpen, setIsStoryMemoryOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const storyMemoriesRef = useRef(storyMemories);
  storyMemoriesRef.current = storyMemories;
  const summarizingCharIdsRef = useRef<Set<string>>(new Set());
  const lastSummaryAttemptCountRef = useRef<Record<string, number>>({});
  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
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

  const themeStyle = useMemo(
    () => getThemeCssVariables(themeId, bubbleSchemeId, visualSettings),
    [themeId, bubbleSchemeId, visualSettings]
  );

  useEffect(() => {
    let cancelled = false;
    const probeController = new AbortController();
    let probeTimeout: number | undefined;

    void (async () => {
      const loaded = await loadAllPersistedState();
      if (cancelled) return;

      setCharacters(loaded.characters);
      setActiveCharacterId(loaded.activeCharacterId);
      setConversations(loaded.conversations);
      setStoryMemories(loaded.storyMemories);
      setSettings(loaded.settings);
      setUserPersona(loaded.userPersona);
      setThemeId(loaded.themeId);
      setBubbleSchemeId(loaded.bubbleSchemeId);
      setLanguage(loaded.language);
      setWallpaperFit(loaded.wallpaperFit);
      setParallaxEnabled(loaded.parallaxEnabled);
      setVisualSettings(loaded.visualSettings);
      setIsStorageReady(true);

      probeTimeout = window.setTimeout(() => probeController.abort(), 3500);
      const initialProvider = loaded.settings.provider ?? 'ollama';
      try {
        const models = await fetchProviderModels(
          initialProvider,
          loaded.settings.baseUrl,
          loaded.settings.apiKey,
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
            loaded.settings.selectedModel.trim().length > 0
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
  }, []);

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
  }, [storyMemories, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.settings, stripSecretFromSettings(settings));
    void saveApiKeySecurely(settings.apiKey ?? '');
  }, [settings, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.userPersona, userPersona);
  }, [userPersona, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.theme, themeId);
  }, [themeId, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.bubbleScheme, bubbleSchemeId);
  }, [bubbleSchemeId, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.language, language);
  }, [language, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.wallpaperFit, wallpaperFit);
  }, [wallpaperFit, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.parallaxEnabled, parallaxEnabled);
  }, [parallaxEnabled, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    void idbSet(STORAGE_KEYS.visualSettings, visualSettings);
  }, [visualSettings, isStorageReady]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingCharacterId(null);
  }, []);

  const streamAssistantReply = useCallback(
    async (targetCharacter: Character, baseHistory: ChatMessage[]) => {
      const activeProvider = settings.provider ?? 'ollama';
      if (!settings.selectedModel.trim()) {
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
        model: settings.selectedModel,
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

      try {
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
          onToken: (token) => {
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
          },
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
            setShowOllamaSetupHelper(true);
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
    [settings, storyMemories, userPersona, t]
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
      if (activeProvider === 'ollama' && ollamaStatus === 'offline') {
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
      conversations,
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
    if (activeProvider === 'ollama' && ollamaStatus === 'offline') {
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
                model: settings.selectedModel,
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

    try {
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
        onToken: (token) => {
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
        },
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
          setShowOllamaSetupHelper(true);
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
    conversations,
    ollamaStatus,
    settings,
    stopStreaming,
    storyMemories,
    streamingCharacterId,
    t,
    userPersona,
  ]);

  const handleContinueLastResponse = useCallback(async () => {
    const activeProvider = settings.provider ?? 'ollama';
    if (activeProvider === 'ollama' && ollamaStatus === 'offline') {
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
                model: settings.selectedModel,
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

    try {
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
        onToken: (token) => {
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
        },
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
          setShowOllamaSetupHelper(true);
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
    conversations,
    ollamaStatus,
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
      if (activeProvider === 'ollama' && ollamaStatus === 'offline') {
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
      conversations,
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
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === savedChar.id);
      if (exists) {
        return prev.map((c) => (c.id === savedChar.id ? savedChar : c));
      }
      return [savedChar, ...prev];
    });
    setActiveCharacterId(savedChar.id);
  }, []);

  const handleDeleteCharacter = useCallback(
    (id: string) => {
      setCharacters((prev) => {
        if (prev.length <= 1) return prev;
        const filtered = prev.filter((c) => c.id !== id);
        if (activeCharacterId === id && filtered.length > 0) {
          setActiveCharacterId(filtered[0].id);
        }
        return filtered;
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
    async (file: File): Promise<{ charCount: number; chatCount: number }> => {
      const parsed = await parseAtriumBackupFile(file);
      if (streamingCharacterId) {
        stopStreaming();
      }
      const hydrated = hydrateCharacters(parsed.characters);
      setCharacters(hydrated);
      setActiveCharacterId(parsed.activeCharacterId);
      setConversations(parsed.conversations);
      if (parsed.storyMemories) {
        setStoryMemories(parsed.storyMemories);
      }
      if (parsed.settings) {
        setSettings((prev) => ({
          ...parsed.settings!,
          apiKey: prev.apiKey,
        }));
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
        setVisualSettings(parsed.visualSettings);
      }
      setErrorMessage(null);
      return {
        charCount: hydrated.length,
        chatCount: parsed.chatCount,
      };
    },
    [stopStreaming, streamingCharacterId]
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={themeStyle}
        className="flex h-dvh w-full overflow-hidden bg-[var(--theme-bg)] text-[var(--theme-text)] transition-colors duration-300"
      >
        <AnimatePresence mode="wait">
          {activeWorld === 'lobby' ? (
            <motion.div
              key="world-lobby"
              initial={
                showIntro
                  ? {
                      opacity: 0.35,
                      transform: 'translate3d(0, 10px, 0) scale3d(0.98, 0.98, 1)',
                    }
                  : {
                      opacity: 0,
                      transform:
                        'translate3d(0, 0, 0) scale3d(0.985, 0.985, 1)',
                    }
              }
              animate={
                showIntro
                  ? {
                      opacity: 0.35,
                      transform: 'translate3d(0, 10px, 0) scale3d(0.98, 0.98, 1)',
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
                duration: showIntro ? 0.34 : 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                willChange: lobbyWillChange ? 'transform, opacity' : 'auto',
              }}
              className="h-full w-full"
            >
              <AtriumLobby
                t={t}
                characters={characters}
                activeCharacterId={activeCharacter.id}
                selectedModel={settings.selectedModel}
                provider={settings.provider ?? 'ollama'}
                ollamaStatus={ollamaStatus}
                introDone={!showIntro}
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
                onOpenUserPersona={() => {
                  setSettingsFocusSection('persona');
                  setIsSettingsOpen(true);
                }}
                onOpenSettings={() => {
                  setSettingsFocusSection('general');
                  setIsSettingsOpen(true);
                }}
                onOpenOllamaSetup={() => setShowOllamaSetupHelper(true)}
                onExit={handleExitApp}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`world-chat-${activeCharacter.id}`}
              initial={{ opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.015 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full"
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
          }}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
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

        <OfflineIndicator t={t} />

        <AnimatePresence>
          {showIntro ? (
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
