import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  Mic,
  MicOff,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  RotateCcw,
  Settings,
  Square,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  isNativeElectronSpeechSupported,
  useSpeechRecognition,
} from '../hooks/useSpeechRecognition';
import type { UIStrings } from '../i18n/translations';
import type {
  ApiProvider,
  Character,
  ChatMessage,
  Language,
  StoryMemoryEntry,
  UserPersona,
  WallpaperFitMode,
} from '../types/chat';
import { CharacterIcon } from './CharacterIcon';
import { MessageContent } from './MessageContent';

const MAX_INPUT_CHARS = 2000;
const MESSAGE_WINDOW_STEP = 50;

interface ChatWindowProps {
  t: UIStrings;
  language: Language;
  character: Character;
  messages: ChatMessage[];
  selectedModel: string;
  ollamaUrl: string;
  provider?: ApiProvider;
  userPersona: UserPersona;
  wallpaperFit: WallpaperFitMode;
  parallaxEnabled: boolean;
  isStreaming: boolean;
  errorMessage: string | null;
  onSendMessage: (content: string) => void;
  onRegenerateLastResponse: () => void;
  onContinueLastResponse: () => void;
  onSwipeMessage: (messageId: string, direction: 'prev' | 'next') => void;
  onDeleteMessage: (messageId: string) => void;
  onEditUserMessage: (messageId: string, newContent: string) => void;
  onStopStreaming: () => void;
  onClearChat: () => void;
  onReturnToLobby: () => void;
  onSetWallpaperFit: (mode: WallpaperFitMode) => void;
  onToggleParallax: () => void;
  onOpenSettings: () => void;
  onOpenUserPersona: () => void;
  onOpenCharacterProfile: () => void;
  storyMemory?: StoryMemoryEntry;
  onOpenStoryMemory: () => void;
  onDismissError: () => void;
}

function formatMessageTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

export function ChatWindow({
  t,
  language,
  character,
  messages,
  selectedModel,
  ollamaUrl,
  provider = 'ollama',
  userPersona,
  wallpaperFit,
  parallaxEnabled,
  isStreaming,
  errorMessage,
  onSendMessage,
  onRegenerateLastResponse,
  onContinueLastResponse,
  onSwipeMessage,
  onDeleteMessage,
  onEditUserMessage,
  onStopStreaming,
  onClearChat,
  onReturnToLobby,
  onSetWallpaperFit,
  onToggleParallax,
  onOpenSettings,
  onOpenUserPersona,
  onOpenCharacterProfile,
  storyMemory,
  onOpenStoryMemory,
  onDismissError,
}: ChatWindowProps) {
  const [draft, setDraft] = useState('');
  const [wallpaperFailed, setWallpaperFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [hideBubbles, setHideBubbles] = useState(false);
  const [isSceneMenuOpen, setIsSceneMenuOpen] = useState(false);
  const [isComposerCollapsed, setIsComposerCollapsed] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(MESSAGE_WINDOW_STEP);
  const [parallaxY, setParallaxY] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const voiceBaseDraftRef = useRef('');
  const pendingNativeDictationRef = useRef(false);
  const sceneMenuRef = useRef<HTMLDivElement | null>(null);
  const mouseParallaxRef = useRef<HTMLDivElement | null>(null);
  const rafParallaxRef = useRef<number | null>(null);

  const handleVoiceTranscript = useCallback((spoken: string) => {
    const base = voiceBaseDraftRef.current.trimEnd();
    const combined = base ? `${base} ${spoken}` : spoken;
    setDraft(combined.slice(0, MAX_INPUT_CHARS));
  }, []);

  const isNativeDesktopSpeech = isNativeElectronSpeechSupported();
  const micStartLabel = isNativeDesktopSpeech
    ? language === 'es'
      ? 'Abrir dictado por voz de Windows (Win + H)'
      : 'Trigger Windows Voice Typing (Win + H)'
    : t.micStart;

  const handleVoiceError = useCallback(
    (code: string, detailMessage?: string) => {
      if (code === 'unsupported') {
        setVoiceError(t.micUnsupported);
      } else if (code === 'network') {
        setVoiceError(t.micOfflineFallback);
      } else if (code === 'no-recognizer') {
        setVoiceError(t.micNoRecognizer);
      } else if (code === 'not-allowed' || code === 'service-not-allowed') {
        setVoiceError(`${t.micPermissionDenied} (${code})`);
      } else if (code === 'audio-capture' || code === 'no-device') {
        setVoiceError(`${t.micNoDevice} (${code})`);
      } else if (code === 'mic-busy') {
        setVoiceError(`${t.micBusy} (${code})`);
      } else {
        setVoiceError(t.micErrorReason(code, detailMessage));
      }
    },
    [t]
  );

  const {
    isSupported: isSpeechSupported,
    isListening,
    stop: stopListening,
    toggle: toggleListening,
  } = useSpeechRecognition({
    language,
    onTranscript: handleVoiceTranscript,
    onError: handleVoiceError,
  });

  const activeWallpaper = character.wallpaperUrl || character.imageUrl;

  useEffect(() => {
    setWallpaperFailed(false);
    setAvatarFailed(false);
    setParallaxY(0);
    setVoiceError(null);
    setEditingMessageId(null);
    setEditingDraft('');
    setIsSceneMenuOpen(false);
    setIsComposerCollapsed(false);
    setIsHeaderCollapsed(false);
    setVisibleCount(MESSAGE_WINDOW_STEP);
    stopListening();
  }, [character.id, character.imageUrl, character.wallpaperUrl, stopListening]);

  useEffect(() => {
    if (!hideBubbles && !editingMessageId) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [messages, character.id, hideBubbles, editingMessageId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || isComposerCollapsed) return;
    el.style.height = '34px';
    if (draft.length > 0) {
      const nextHeight = Math.min(Math.max(el.scrollHeight, 34), 156);
      el.style.height = `${nextHeight}px`;
    }
  }, [draft, isComposerCollapsed]);

  useEffect(() => {
    if (!hideBubbles && !isSceneMenuOpen) return;
    const handleEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSceneMenuOpen(false);
        setHideBubbles(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [hideBubbles, isSceneMenuOpen]);

  useEffect(() => {
    if (!isSceneMenuOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (
        sceneMenuRef.current &&
        !sceneMenuRef.current.contains(e.target as Node)
      ) {
        setIsSceneMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, [isSceneMenuOpen]);

  useEffect(() => {
    if (!parallaxEnabled && mouseParallaxRef.current) {
      mouseParallaxRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
    return () => {
      if (rafParallaxRef.current !== null) {
        window.cancelAnimationFrame(rafParallaxRef.current);
        rafParallaxRef.current = null;
      }
    };
  }, [parallaxEnabled]);

  const handleStageMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (!parallaxEnabled || !mouseParallaxRef.current) return;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const maxShift = 6;
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      const targetX = Math.max(
        -maxShift,
        Math.min(maxShift, Math.round(-nx * maxShift * 2 * 10) / 10)
      );
      const targetY = Math.max(
        -maxShift,
        Math.min(maxShift, Math.round(-ny * maxShift * 2 * 10) / 10)
      );

      if (rafParallaxRef.current !== null) {
        window.cancelAnimationFrame(rafParallaxRef.current);
      }
      rafParallaxRef.current = window.requestAnimationFrame(() => {
        if (mouseParallaxRef.current) {
          mouseParallaxRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
        }
      });
    },
    [parallaxEnabled]
  );

  const resetMouseParallax = useCallback(() => {
    if (rafParallaxRef.current !== null) {
      window.cancelAnimationFrame(rafParallaxRef.current);
      rafParallaxRef.current = null;
    }
    if (mouseParallaxRef.current) {
      mouseParallaxRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
  }, []);

  const handleFeedScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setParallaxY(0);
      return;
    }
    const progress = Math.min(1, Math.max(0, el.scrollTop / maxScroll));
    setParallaxY(Math.round(-progress * 20 * 10) / 10);
  };

  const focusComposerTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return false;
    el.focus();
    const len = el.value.length;
    if (typeof el.setSelectionRange === 'function') {
      el.setSelectionRange(len, len);
    }
    return true;
  }, []);

  useEffect(() => {
    if (isComposerCollapsed || !pendingNativeDictationRef.current) return;
    let cancelled = false;
    let rafId = 0;
    let attempts = 0;

    const tryFocusAndTrigger = () => {
      if (cancelled) return;
      if (focusComposerTextarea()) {
        pendingNativeDictationRef.current = false;
        toggleListening();
        return;
      }
      attempts += 1;
      if (attempts < 40) {
        rafId = window.requestAnimationFrame(tryFocusAndTrigger);
      } else {
        pendingNativeDictationRef.current = false;
      }
    };

    rafId = window.requestAnimationFrame(tryFocusAndTrigger);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [focusComposerTextarea, isComposerCollapsed, toggleListening]);

  const handleMicClick = () => {
    setVoiceError(null);
    if (isNativeDesktopSpeech) {
      focusComposerTextarea();
      window.requestAnimationFrame(() => {
        focusComposerTextarea();
        toggleListening();
      });
      return;
    }
    if (!isListening) {
      voiceBaseDraftRef.current = draft;
    }
    toggleListening();
  };

  const expandComposerAndFocus = () => {
    setIsComposerCollapsed(false);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleCollapsedMicClick = () => {
    setVoiceError(null);
    if (isNativeDesktopSpeech) {
      pendingNativeDictationRef.current = true;
      setIsComposerCollapsed(false);
      return;
    }
    setIsComposerCollapsed(false);
    handleMicClick();
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = draft.trim().slice(0, MAX_INPUT_CHARS);
    if (!trimmed || isStreaming) return;
    if (isListening) {
      stopListening();
    }
    setVoiceError(null);
    setDraft('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '34px';
    }
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startEditingMessage = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingDraft(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingDraft('');
  };

  const saveEditedMessage = (messageId: string) => {
    const trimmed = editingDraft.trim().slice(0, MAX_INPUT_CHARS);
    if (!trimmed || isStreaming) return;
    setEditingMessageId(null);
    setEditingDraft('');
    onEditUserMessage(messageId, trimmed);
  };

  const hasWallpaper = Boolean(activeWallpaper) && !wallpaperFailed;
  const hasAvatar = Boolean(character.imageUrl) && !avatarFailed;

  const hiddenOlderCount = Math.max(0, messages.length - visibleCount);
  const windowedMessages =
    hiddenOlderCount > 0 ? messages.slice(-visibleCount) : messages;

  const displayedMessages: ChatMessage[] =
    messages.length > 0
      ? windowedMessages
      : [
          {
            id: `greeting-${character.id}`,
            role: 'assistant',
            content:
              character.greeting ||
              `*${character.name} turns to meet your gaze.*`,
            createdAt: Date.now(),
          },
        ];

  const handleLoadEarlierMessages = () => {
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;
    setVisibleCount((prev) => prev + MESSAGE_WINDOW_STEP);
    if (container) {
      window.requestAnimationFrame(() => {
        const nextScrollHeight = container.scrollHeight;
        container.scrollTop =
          prevScrollTop + (nextScrollHeight - prevScrollHeight);
      });
    }
  };

  const lastMessage = messages[messages.length - 1];
  const hasPrecedingUserMessage = messages.some((m) => m.role === 'user');

  const charCountClass =
    draft.length >= MAX_INPUT_CHARS
      ? 'text-rose-300'
      : draft.length >= 1800
        ? 'text-amber-300'
        : 'text-white/55';

  return (
    <main
      onMouseMove={handleStageMouseMove}
      onMouseLeave={resetMouseParallax}
      className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      {/* Full-Screen Character Wallpaper with Scroll & Subtle Mouse Parallax */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div
          ref={mouseParallaxRef}
          className="h-full w-full will-change-transform transition-transform duration-300 ease-out"
          style={{ transform: 'translate3d(0px, 0px, 0)' }}
        >
          <AnimatePresence mode="wait">
            {hasWallpaper ? (
              <motion.div
                key={`${activeWallpaper}-${wallpaperFit}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: hideBubbles ? 1 : 0.82 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full w-full"
              >
                {wallpaperFit === 'contain' ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-28 blur-3xl"
                    style={{ backgroundImage: `url("${activeWallpaper}")` }}
                  />
                ) : null}
                <img
                  src={activeWallpaper}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setWallpaperFailed(true)}
                  className={`relative z-10 h-full w-full transition-transform duration-200 ease-out will-change-transform ${
                    wallpaperFit === 'contain'
                      ? 'object-contain object-center'
                      : 'object-cover object-top'
                  }`}
                  style={
                    wallpaperFit === 'contain'
                      ? {
                          objectPosition: 'center center',
                          transformOrigin: 'center center',
                          transform: `translate3d(0, ${Math.round(parallaxY * 0.4)}px, 0) scale(1.015)`,
                        }
                      : {
                          objectPosition: 'top center',
                          transformOrigin: 'top center',
                          transform: `translate3d(0, ${parallaxY}px, 0) scale(1.05)`,
                        }
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key={`fallback-${character.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full bg-[radial-gradient(circle_at_35%_25%,var(--theme-accent-soft),transparent_60%)]"
              />
            )}
          </AnimatePresence>
        </div>

        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundColor: 'var(--theme-scrim-tint)',
            opacity: hideBubbles ? 0.08 : 1,
          }}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60 transition-opacity duration-300 ${
            hideBubbles ? 'opacity-20' : 'opacity-100'
          }`}
        />
      </div>

      {/* Minimalist Two-Corner Spatial Top Bar (Collapsible) */}
      {isHeaderCollapsed ? (
        <div className="pointer-events-none absolute top-3 right-4 z-30 flex items-center gap-2 sm:right-6">
          <button
            type="button"
            onClick={() => {
              setIsSceneMenuOpen(false);
              setHideBubbles((prev) => !prev);
            }}
            aria-pressed={hideBubbles}
            aria-label={hideBubbles ? t.cinemaModeExit : t.cinemaModeEnter}
            title={hideBubbles ? t.cinemaModeExit : t.cinemaModeEnter}
            className={`pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl transition-colors focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] ${
              hideBubbles
                ? 'border-[var(--theme-accent)] bg-black/55 text-[var(--theme-accent)] shadow-lg'
                : 'border-white/14 bg-black/45 text-white/85 shadow-lg hover:bg-black/65 hover:text-white'
            }`}
          >
            {hideBubbles ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>

          {!hideBubbles ? (
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(false)}
              aria-label={t.expandHeader}
              title={t.expandHeader}
              className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-white/16 bg-black/50 px-3 text-xs font-medium text-white/85 shadow-[0_10px_28px_rgba(0,0,0,0.48)] backdrop-blur-2xl transition-colors hover:border-white/30 hover:bg-black/70 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
              style={{ backgroundColor: 'var(--theme-glass)' }}
            >
              <span className="max-w-[140px] truncate">{character.name}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/65" />
            </button>
          ) : null}
        </div>
      ) : (
        <header
          className={`relative z-30 flex shrink-0 items-center justify-between gap-4 px-4 py-3 transition-colors duration-300 sm:px-6 ${
            hideBubbles
              ? 'border-b border-transparent bg-transparent'
              : 'border-b border-white/10 bg-black/25 backdrop-blur-xl'
          }`}
        >
        {/* Top-Left: Lobby Pill + Clickable Avatar & Name with Pulsing Generation Aura */}
        <div
          className={`flex min-w-0 items-center gap-2.5 transition-opacity duration-200 ${
            hideBubbles ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={onReturnToLobby}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.06] px-3.5 text-xs font-semibold text-white/90 backdrop-blur-xl transition-colors hover:border-white/25 hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t.lobbyBackButton}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCharacterProfile}
            title={t.viewCharacterProfile}
            aria-label={`${t.viewCharacterProfile}: ${character.name}`}
            className="group flex min-w-0 items-center gap-3 rounded-2xl py-1 pr-2.5 pl-1 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
          >
            <div className="relative shrink-0">
              {isStreaming ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 rounded-[14px] bg-gradient-to-tr from-amber-300/85 via-amber-200/75 to-indigo-400/85 opacity-85 blur-[3px] animate-pulse"
                />
              ) : null}

              {hasAvatar ? (
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className={`relative z-10 h-10 w-10 shrink-0 rounded-xl border object-cover shadow transition-all group-hover:scale-[1.03] ${
                    isStreaming
                      ? 'border-amber-200/85 ring-2 ring-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.45),0_0_24px_rgba(99,102,241,0.4)]'
                      : 'border-white/15'
                  }`}
                />
              ) : (
                <CharacterIcon
                  icon={character.icon}
                  tone={character.tone}
                  size="sm"
                  className={`relative z-10 ${
                    isStreaming
                      ? 'ring-2 ring-amber-300/65 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
                      : ''
                  }`}
                />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate font-display text-[15px] font-semibold text-white transition-colors group-hover:text-[var(--theme-accent)]">
                {character.name}
              </h2>
              <p className="truncate text-xs text-[var(--theme-muted)]">
                <span>{character.role}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono">
                  {selectedModel || t.noModelSelected}
                </span>
              </p>
            </div>
          </button>
        </div>

        {/* Top-Right: Collapse Header, Cinema Mode (Eye) & Scene Menu (•••) */}
        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsSceneMenuOpen(false);
              setIsHeaderCollapsed(true);
            }}
            aria-label={t.collapseHeader}
            title={t.collapseHeader}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white/75 backdrop-blur-xl transition-all hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] ${
              hideBubbles ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSceneMenuOpen(false);
              setHideBubbles((prev) => !prev);
            }}
            aria-pressed={hideBubbles}
            aria-label={hideBubbles ? t.cinemaModeExit : t.cinemaModeEnter}
            title={hideBubbles ? t.cinemaModeExit : t.cinemaModeEnter}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition-colors focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] ${
              hideBubbles
                ? 'border-[var(--theme-accent)] bg-black/55 text-[var(--theme-accent)] shadow-lg'
                : 'border-white/14 bg-white/[0.06] text-white/85 hover:bg-white/[0.12] hover:text-white'
            }`}
          >
            {hideBubbles ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>

          <div
            ref={sceneMenuRef}
            className={`relative transition-opacity duration-200 ${
              hideBubbles ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsSceneMenuOpen((prev) => !prev)}
              aria-expanded={isSceneMenuOpen}
              aria-haspopup="menu"
              aria-label={t.sceneMenuLabel}
              title={t.sceneMenuLabel}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition-colors focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] ${
                isSceneMenuOpen
                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]'
                  : 'border-white/14 bg-white/[0.06] text-white/85 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {isSceneMenuOpen ? (
                <motion.div
                  role="menu"
                  aria-label={t.sceneMenuLabel}
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-2.5 w-72 origin-top-right rounded-[22px] border border-[var(--theme-border)] bg-[var(--theme-glass-strong)] p-2 text-[var(--theme-text)] shadow-[0_24px_64px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
                >
                  {/* 1. Background Framing */}
                  <div className="px-2.5 py-2">
                    <p className="mb-2 text-[11px] font-medium text-[var(--theme-muted)]">
                      {t.sceneMenuBackgroundFraming}
                    </p>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={wallpaperFit === 'cover'}
                        onClick={() => onSetWallpaperFit('cover')}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                          wallpaperFit === 'cover'
                            ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                            : 'text-[var(--theme-muted)] hover:text-white'
                        }`}
                      >
                        {t.framingFillScreen}
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={wallpaperFit === 'contain'}
                        onClick={() => onSetWallpaperFit('contain')}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                          wallpaperFit === 'contain'
                            ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                            : 'text-[var(--theme-muted)] hover:text-white'
                        }`}
                      >
                        {t.framingFullPortrait}
                      </button>
                    </div>
                  </div>

                  {/* 1b. Parallax Depth Toggle */}
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={parallaxEnabled}
                    onClick={onToggleParallax}
                    className="mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4 text-[var(--theme-accent)]" />
                      <span>{t.sceneMenuParallaxDepth}</span>
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        parallaxEnabled
                          ? 'text-[var(--theme-accent)]'
                          : 'text-[var(--theme-muted)]'
                      }`}
                    >
                      {parallaxEnabled ? t.parallaxOnLabel : t.parallaxOffLabel}
                    </span>
                  </button>

                  <div className="my-1.5 border-t border-white/10" />

                  {/* 2. User Persona */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsSceneMenuOpen(false);
                      onOpenUserPersona();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2.5">
                      <User className="h-4 w-4 text-[var(--theme-accent)]" />
                      <span>{t.userPersonaSectionTitle.split('(')[0].trim()}</span>
                    </span>
                    <span className="max-w-[96px] truncate text-[11px] text-[var(--theme-muted)]">
                      {userPersona.name.trim() ||
                        t.userPersonaBadgeLabel(userPersona.name)}
                    </span>
                  </button>

                  {/* 2b. View / Edit Story Memory */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsSceneMenuOpen(false);
                      onOpenStoryMemory();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Brain className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" />
                      <span className="truncate">{t.storyMemoryMenuButton}</span>
                    </span>
                    <span
                      className={`shrink-0 text-[11px] font-medium ${
                        storyMemory?.summary.trim()
                          ? 'text-[var(--theme-accent)]'
                          : 'text-[var(--theme-muted)]'
                      }`}
                    >
                      {storyMemory?.summary.trim()
                        ? t.storyMemoryActiveBadge
                        : t.storyMemoryEmptyBadge}
                    </span>
                  </button>

                  {/* 3. Reset Chat */}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={messages.length === 0 || isStreaming}
                    onClick={() => {
                      setIsSceneMenuOpen(false);
                      onClearChat();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4 text-[var(--theme-accent)]" />
                    <span>{t.resetChatTooltip}</span>
                  </button>

                  {/* 4. Settings */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsSceneMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
                  >
                    <Settings className="h-4 w-4 text-[var(--theme-accent)]" />
                    <span>{t.settingsButton}</span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </header>
      )}

      {/* Error Banner */}
      {errorMessage && !hideBubbles ? (
        <div
          role="alert"
          className="relative z-10 shrink-0 border-b border-rose-500/35 bg-rose-950/75 px-4 py-3 backdrop-blur-xl sm:px-6"
        >
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 text-sm text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <div className="min-w-0">
                <p className="font-medium">{errorMessage}</p>
                <p className="mt-0.5 text-xs text-rose-200/80">
                  <span className="font-mono">
                    {ollamaUrl.replace(/\/+$/, '')}
                    {provider === 'openai' ? '/chat/completions' : '/api/chat'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenSettings}
                className="rounded-full border border-rose-300/25 bg-rose-900/60 px-3.5 py-1.5 text-xs font-medium text-rose-50 transition-colors hover:bg-rose-800/75 whitespace-nowrap"
              >
                {t.openSettings}
              </button>
              <button
                type="button"
                onClick={onDismissError}
                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-white/10 whitespace-nowrap"
              >
                {t.dismiss}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Message Feed */}
      <motion.div
        ref={scrollContainerRef}
        onScroll={handleFeedScroll}
        animate={{ opacity: hideBubbles ? 0 : 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => {
          if (hideBubbles) setHideBubbles(false);
        }}
        className={`relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-6 ${
          hideBubbles ? 'cursor-pointer select-none' : ''
        }`}
      >
        <div
          className={`mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-5 ${
            hideBubbles ? 'pointer-events-none' : ''
          }`}
        >
          {hiddenOlderCount > 0 ? (
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={handleLoadEarlierMessages}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/40 px-4 py-1.5 text-xs font-medium text-white/80 shadow-lg backdrop-blur-xl transition-colors hover:border-[var(--theme-accent)]/50 hover:bg-black/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
              >
                <ChevronUp className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                <span>{t.loadEarlierMessages(hiddenOlderCount)}</span>
              </button>
            </div>
          ) : null}

          {displayedMessages.map((message) => {
            const isUser = message.role === 'user';
            const isGreetingOnly =
              messages.length === 0 && message.id.startsWith('greeting-');
            const isLatestAssistantMessage =
              !isUser &&
              !isGreetingOnly &&
              lastMessage?.id === message.id &&
              hasPrecedingUserMessage;
            const swipes =
              !isUser && Array.isArray(message.swipes)
                ? message.swipes
                : undefined;
            const totalSwipes = swipes ? swipes.length : 0;
            const activeSwipeIdx =
              totalSwipes > 0
                ? Math.min(
                    Math.max(message.activeSwipeIndex ?? totalSwipes - 1, 0),
                    totalSwipes - 1
                  )
                : 0;
            const hasMultipleSwipes = totalSwipes > 1;
            const canContinueLatest =
              isLatestAssistantMessage &&
              !message.isError &&
              message.content.trim().length > 0;
            const isEditingThis = isUser && editingMessageId === message.id;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className={`group flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser ? (
                  hasAvatar ? (
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      referrerPolicy="no-referrer"
                      className="mt-1 h-9 w-9 shrink-0 rounded-xl border border-white/20 object-cover shadow-md"
                    />
                  ) : (
                    <CharacterIcon
                      icon={character.icon}
                      tone={character.tone}
                      size="sm"
                      className="mt-1"
                    />
                  )
                ) : null}

                <div
                  className={`max-w-[85%] border sm:max-w-[76%] ${
                    isEditingThis ? 'w-full sm:w-[76%]' : ''
                  } ${
                    isUser
                      ? 'rounded-[24px] rounded-tr-[6px] px-4 py-3 text-white shadow-[0_10px_34px_rgba(0,0,0,0.4)]'
                      : message.isError
                        ? 'rounded-[24px] rounded-tl-[6px] border-rose-500/35 bg-rose-950/65 px-4 py-3.5 text-rose-100 shadow-[0_10px_34px_rgba(0,0,0,0.45)] backdrop-blur-xl'
                        : 'rounded-[24px] rounded-tl-[6px] px-4 py-3.5 text-[var(--theme-text)] shadow-[0_12px_36px_rgba(0,0,0,0.45)]'
                  }`}
                  style={
                    isUser
                      ? {
                          backgroundColor: 'var(--bubble-user-bg)',
                          borderColor: 'var(--bubble-user-border)',
                          backdropFilter: 'blur(var(--chat-glass-blur, 20px))',
                          WebkitBackdropFilter:
                            'blur(var(--chat-glass-blur, 20px))',
                        }
                      : !message.isError
                        ? {
                            backgroundColor: 'var(--bubble-assistant-bg)',
                            borderColor: 'var(--bubble-assistant-border)',
                            backdropFilter:
                              'blur(var(--chat-glass-blur, 20px))',
                            WebkitBackdropFilter:
                              'blur(var(--chat-glass-blur, 20px))',
                          }
                        : undefined
                  }
                >
                  {!isUser ? (
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-[var(--theme-muted)]">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-display font-semibold text-white">
                          {character.name}
                        </span>
                        {message.model ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate font-mono text-[11px]">
                              {message.model}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {isEditingThis ? (
                    <div className="space-y-2.5">
                      <textarea
                        autoFocus
                        rows={3}
                        maxLength={MAX_INPUT_CHARS}
                        value={editingDraft}
                        onChange={(e) =>
                          setEditingDraft(
                            e.target.value.slice(0, MAX_INPUT_CHARS)
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveEditedMessage(message.id);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditingMessage();
                          }
                        }}
                        className="w-full resize-none rounded-2xl border border-white/20 bg-black/45 p-3 text-[15px] leading-relaxed text-white focus:border-[var(--theme-accent)] focus:outline-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] tabular-nums text-white/60">
                          {t.charCounter(editingDraft.length, MAX_INPUT_CHARS)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelEditingMessage}
                            className="inline-flex h-8 items-center gap-1 rounded-full border border-white/15 bg-black/30 px-3 text-xs font-medium text-white/85 transition-colors hover:bg-black/50"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>{t.cancel}</span>
                          </button>
                          <button
                            type="button"
                            disabled={!editingDraft.trim() || isStreaming}
                            onClick={() => saveEditedMessage(message.id)}
                            className="inline-flex h-8 items-center gap-1 rounded-full px-3.5 text-xs font-semibold transition-colors disabled:opacity-45"
                            style={{
                              backgroundColor: 'var(--theme-accent)',
                              color: 'var(--theme-on-accent)',
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{t.saveAndRegenerate}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {message.content ? (
                        <MessageContent
                          content={message.content}
                          variant={isUser ? 'user' : 'assistant'}
                        />
                      ) : message.isStreaming ? (
                        <div className="flex items-center gap-1.5 py-1 text-sm text-[var(--theme-muted)]">
                          <span>{t.thinking}</span>
                          <span
                            className="inline-block h-3.5 w-0.5 animate-pulse"
                            style={{ backgroundColor: 'var(--theme-accent)' }}
                          />
                        </div>
                      ) : null}

                      {message.isStreaming && message.content ? (
                        <span
                          aria-hidden="true"
                          className="ml-1 inline-block h-3.5 w-0.5 align-middle animate-pulse"
                          style={{ backgroundColor: 'var(--theme-accent)' }}
                        />
                      ) : null}

                      {/* Footer row: Timestamp & Message Actions */}
                      {!isGreetingOnly && !message.isStreaming ? (
                        <div
                          className={`mt-2 flex items-center gap-2 ${
                            isUser ? 'justify-end' : 'justify-between'
                          }`}
                        >
                          {isUser ? (
                            <>
                              <div className="flex items-center gap-1 opacity-85 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                <button
                                  type="button"
                                  disabled={isStreaming}
                                  onClick={() => startEditingMessage(message)}
                                  aria-label={t.editMessage}
                                  title={t.editMessage}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/80 transition-colors hover:bg-black/45 hover:text-white disabled:opacity-40"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isStreaming}
                                  onClick={() => onDeleteMessage(message.id)}
                                  aria-label={t.deleteMessage}
                                  title={t.deleteMessage}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/80 transition-colors hover:border-rose-400/40 hover:bg-rose-950/60 hover:text-rose-200 disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <span className="text-[11px] tabular-nums text-white/75">
                                {formatMessageTime(message.createdAt)}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {isLatestAssistantMessage ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isStreaming}
                                      onClick={onRegenerateLastResponse}
                                      aria-label={t.regenerateResponse}
                                      title={t.regenerateResponse}
                                      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/12 bg-black/25 px-2.5 text-[11px] font-medium text-[var(--theme-muted)] transition-colors hover:border-[var(--theme-accent)]/50 hover:bg-black/45 hover:text-white disabled:opacity-40"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      <span>{t.regenerateResponse}</span>
                                    </button>
                                    {canContinueLatest ? (
                                      <button
                                        type="button"
                                        disabled={isStreaming}
                                        onClick={onContinueLastResponse}
                                        aria-label={t.continueResponse}
                                        title={t.continueResponse}
                                        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/12 bg-black/25 px-2.5 text-[11px] font-medium text-[var(--theme-muted)] transition-colors hover:border-[var(--theme-accent)]/50 hover:bg-black/45 hover:text-white disabled:opacity-40"
                                      >
                                        <ArrowRight className="h-3 w-3" />
                                        <span>{t.continueResponse}</span>
                                      </button>
                                    ) : null}
                                  </>
                                ) : null}
                                {hasMultipleSwipes ? (
                                  <div
                                    role="group"
                                    aria-label={`${activeSwipeIdx + 1} / ${totalSwipes}`}
                                    className="inline-flex h-7 items-center gap-0.5 rounded-full border border-white/12 bg-black/25 px-1 text-[11px] font-mono tabular-nums text-[var(--theme-muted)]"
                                  >
                                    <button
                                      type="button"
                                      disabled={
                                        isStreaming || activeSwipeIdx <= 0
                                      }
                                      onClick={() =>
                                        onSwipeMessage(message.id, 'prev')
                                      }
                                      aria-label={t.previousSwipe}
                                      title={t.previousSwipe}
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      <ChevronLeft className="h-3 w-3" />
                                    </button>
                                    <span className="px-1 text-white/80 select-none">
                                      {activeSwipeIdx + 1} / {totalSwipes}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={
                                        isStreaming ||
                                        activeSwipeIdx >= totalSwipes - 1
                                      }
                                      onClick={() =>
                                        onSwipeMessage(message.id, 'next')
                                      }
                                      aria-label={t.nextSwipe}
                                      title={t.nextSwipe}
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      <ChevronRight className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={isStreaming}
                                  onClick={() => onDeleteMessage(message.id)}
                                  aria-label={t.deleteMessage}
                                  title={t.deleteMessage}
                                  className="inline-flex h-7 items-center gap-1 rounded-full border border-white/12 bg-black/25 px-2.5 text-[11px] font-medium text-[var(--theme-muted)] transition-colors hover:border-rose-400/40 hover:bg-rose-950/60 hover:text-rose-200 disabled:opacity-40"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  {isLatestAssistantMessage ? (
                                    <span>{t.deleteMessage}</span>
                                  ) : null}
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-[var(--theme-muted)]/75">
                                {typeof message.tokensPerSecond === 'number' &&
                                message.tokensPerSecond > 0 ? (
                                  <>
                                    <span>
                                      {message.tokensPerSecond.toFixed(1)} t/s
                                    </span>
                                    <span aria-hidden="true">·</span>
                                  </>
                                ) : null}
                                <span>
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </motion.div>

      {/* Compact Collapsible Glassmorphic Composer Dock */}
      <motion.div
        animate={{
          opacity: hideBubbles ? 0 : 1,
          y: hideBubbles ? 16 : 0,
        }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-10 shrink-0 px-4 pt-1.5 pb-3 sm:px-6 sm:pb-4 ${
          hideBubbles ? 'pointer-events-none' : ''
        }`}
      >
        {voiceError ? (
          <div
            role="status"
            className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-950/75 px-4 py-2 text-xs text-amber-100 backdrop-blur-xl"
          >
            <span>{voiceError}</span>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="font-medium text-amber-200 hover:underline whitespace-nowrap"
            >
              {t.dismiss}
            </button>
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          {isComposerCollapsed ? (
            <motion.div
              key="composer-collapsed"
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-end"
            >
              <div
                className="flex w-fit max-w-full items-center gap-1 rounded-full border border-white/16 bg-black/50 p-1 pl-3.5 shadow-[0_10px_32px_rgba(0,0,0,0.52)] backdrop-blur-2xl"
                style={{ backgroundColor: 'var(--theme-glass)' }}
              >
                <button
                  type="button"
                  onClick={expandComposerAndFocus}
                  aria-label={t.expandComposer}
                  title={t.expandComposer}
                  className="flex min-w-0 items-center gap-2 py-1 pr-1.5 text-left text-xs font-medium text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
                >
                  <span className="max-w-[180px] truncate sm:max-w-[230px]">
                    {draft.trim()
                      ? draft.trim()
                      : t.collapsedReplyLabel(character.name)}
                  </span>
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 text-white/55" />
                </button>

                <button
                  type="button"
                  onClick={handleCollapsedMicClick}
                  disabled={!isSpeechSupported || isStreaming}
                  aria-pressed={isListening}
                  aria-label={
                    !isSpeechSupported
                      ? t.micUnsupported
                      : isListening
                        ? t.micStop
                        : micStartLabel
                  }
                  title={
                    !isSpeechSupported
                      ? t.micUnsupported
                      : isListening
                        ? t.micStop
                        : micStartLabel
                  }
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
                    isListening
                      ? 'border-rose-400/70 bg-rose-500/30 text-rose-100 ring-2 ring-rose-400/40'
                      : 'border-white/12 bg-black/30 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="composer-expanded"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <form
                onSubmit={handleSubmit}
                className="mx-auto flex min-h-[48px] max-w-3xl items-end gap-1.5 rounded-[24px] border border-white/14 bg-black/45 px-1.5 py-1.5 pl-4 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-colors focus-within:border-[var(--theme-accent)]/65"
                style={{ backgroundColor: 'var(--theme-glass)' }}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  maxLength={MAX_INPUT_CHARS}
                  value={draft}
                  onChange={(e) =>
                    setDraft(e.target.value.slice(0, MAX_INPUT_CHARS))
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? t.listeningPlaceholder
                      : t.replyPlaceholder(character.name)
                  }
                  aria-label={t.replyPlaceholder(character.name)}
                  style={{ height: '34px' }}
                  className="max-h-[156px] min-h-[34px] flex-1 resize-none bg-transparent py-[5px] text-[14.5px] leading-[22px] text-white placeholder-white/45 transition-[height] duration-150 ease-out focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => setIsComposerCollapsed(true)}
                  aria-label={t.collapseComposer}
                  title={t.collapseComposer}
                  className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={!isSpeechSupported || isStreaming}
                  aria-pressed={isListening}
                  aria-label={
                    !isSpeechSupported
                      ? t.micUnsupported
                      : isListening
                        ? t.micStop
                        : micStartLabel
                  }
                  title={
                    !isSpeechSupported
                      ? t.micUnsupported
                      : isListening
                        ? t.micStop
                        : micStartLabel
                  }
                  className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
                    isListening
                      ? 'border-rose-400/70 bg-rose-500/30 text-rose-100 ring-2 ring-rose-400/40'
                      : 'border-white/12 bg-black/30 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={onStopStreaming}
                    aria-label={t.stopGenerating}
                    title={t.stopGenerating}
                    className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-rose-400/35 bg-rose-950/75 text-rose-200 transition-colors hover:bg-rose-900/80 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label={t.sendMessage}
                    title={t.sendMessage}
                    className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
                    style={
                      draft.trim()
                        ? {
                            backgroundColor: 'var(--theme-accent)',
                            color: 'var(--theme-on-accent)',
                          }
                        : undefined
                    }
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
                  </button>
                )}
              </form>

              <div className="mx-auto mt-1.5 flex max-w-3xl items-center justify-between gap-3 px-3 text-[10.5px] leading-none">
                <span className="truncate text-white/45">
                  {t.composerHint(ollamaUrl)}
                </span>
                <span
                  className={`shrink-0 font-mono tabular-nums ${charCountClass}`}
                >
                  {t.charCounter(draft.length, MAX_INPUT_CHARS)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
