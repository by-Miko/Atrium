import { DEFAULT_CHARACTERS } from '../data/defaultCharacters';
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
} from '../types/chat';
import {
  DEFAULT_VISUAL_STUDIO_SETTINGS,
  isValidHexColor,
} from '../themes/palettes';
import {
  DEFAULT_NUM_CTX,
  DEFAULT_NUM_PREDICT,
  DEFAULT_OLLAMA_URL,
  DEFAULT_OPENAI_URL,
  normalizeBaseUrl,
} from './ollama';

export const STORAGE_KEYS = {
  characters: 'atrium.characters.v1',
  activeCharacterId: 'atrium.activeCharacterId.v1',
  conversations: 'atrium.conversations.v1',
  storyMemories: 'atrium.storyMemories.v1',
  settings: 'atrium.ollamaSettings.v1',
  encryptedApiKey: 'atrium.encryptedApiKey.v1',
  userPersona: 'atrium.userPersona.v1',
  theme: 'atrium.theme.v1',
  bubbleScheme: 'atrium.bubbleScheme.v1',
  language: 'atrium.language.v1',
  wallpaperFit: 'atrium.wallpaperFit.v1',
  parallaxEnabled: 'atrium.parallaxEnabled.v1',
  visualSettings: 'atrium.visualSettings.v1',
} as const;

const IDB_NAME = 'atrium-db';
const IDB_VERSION = 1;
const IDB_STORE = 'kv';
const MIGRATION_FLAG_KEY = 'atrium.idbMigrated.v1';

export const DEFAULT_USER_PERSONA: UserPersona = {
  name: '',
  appearance: '',
  bio: '',
};

export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  provider: 'ollama',
  baseUrl: DEFAULT_OLLAMA_URL,
  openaiBaseUrl: DEFAULT_OPENAI_URL,
  apiKey: '',
  selectedModel: '',
  availableModels: [],
  temperature: 0.8,
  numPredict: DEFAULT_NUM_PREDICT,
  numCtx: DEFAULT_NUM_CTX,
  storyMemoryEnabled: true,
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      };
    });
  }
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDatabase();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage only if IndexedDB is blocked in restricted contexts
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // ignore IndexedDB errors on cleanup
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function hasOsSecretStorage(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      window.electronAPI?.encryptSecret &&
      window.electronAPI?.decryptSecret
  );
}

export function stripSecretFromSettings(
  settings: OllamaSettings
): Omit<OllamaSettings, 'apiKey'> {
  const provider = settings.provider === 'openai' ? 'openai' : 'ollama';
  const { apiKey: _omitted, ...rest } = settings;
  return {
    ...rest,
    provider,
    baseUrl: normalizeBaseUrl(
      rest.baseUrl,
      provider === 'openai' ? DEFAULT_OPENAI_URL : DEFAULT_OLLAMA_URL
    ),
    openaiBaseUrl: normalizeBaseUrl(
      rest.openaiBaseUrl || DEFAULT_OPENAI_URL,
      DEFAULT_OPENAI_URL
    ),
  };
}

export async function saveApiKeySecurely(plaintext: string): Promise<boolean> {
  const trimmed = plaintext.trim();
  if (!trimmed) {
    await idbDelete(STORAGE_KEYS.encryptedApiKey);
    return true;
  }

  const encryptSecret =
    typeof window !== 'undefined' ? window.electronAPI?.encryptSecret : undefined;
  if (encryptSecret) {
    try {
      const res = await encryptSecret(trimmed);
      if (res?.ok && res.encrypted) {
        await idbSet(STORAGE_KEYS.encryptedApiKey, res.encrypted);
        return true;
      }
    } catch {
      // Fall through to session-only memory
    }
  }

  // Standard browser or unavailable OS keychain: keep in session memory only, never write plaintext to disk
  await idbDelete(STORAGE_KEYS.encryptedApiKey);
  return false;
}

async function loadApiKeySecurely(
  legacyPlaintext?: string
): Promise<{ apiKey: string; shouldScrubSettings: boolean }> {
  const storedCiphertext = await idbGet<string>(STORAGE_KEYS.encryptedApiKey);
  const decryptSecret =
    typeof window !== 'undefined' ? window.electronAPI?.decryptSecret : undefined;

  if (storedCiphertext && decryptSecret) {
    try {
      const res = await decryptSecret(storedCiphertext);
      if (res?.ok && typeof res.plaintext === 'string' && res.plaintext) {
        return {
          apiKey: res.plaintext,
          shouldScrubSettings: Boolean(legacyPlaintext),
        };
      }
    } catch {
      // ignore failed decryption
    }
  }

  const legacyTrimmed =
    typeof legacyPlaintext === 'string' ? legacyPlaintext.trim() : '';
  if (legacyTrimmed) {
    await saveApiKeySecurely(legacyTrimmed);
    return {
      apiKey: legacyTrimmed,
      shouldScrubSettings: true,
    };
  }

  return {
    apiKey: '',
    shouldScrubSettings: Boolean(legacyPlaintext !== undefined),
  };
}

function readLegacyLocalStorage<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function hydrateCharacters(saved: Character[] | undefined): Character[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_CHARACTERS;
  }
  const defaultsById = new Map(DEFAULT_CHARACTERS.map((c) => [c.id, c]));
  return saved.map((char) => {
    const fallback = defaultsById.get(char.id);
    return {
      ...char,
      imageUrl: char.imageUrl || fallback?.imageUrl,
      stageBackground: char.stageBackground || fallback?.stageBackground,
      wallpaperUrl: char.wallpaperUrl || fallback?.wallpaperUrl,
      greeting:
        char.greeting ||
        fallback?.greeting ||
        `*${char.name} looks up quietly.* How shall we begin?`,
      tags: Array.isArray(char.tags)
        ? char.tags
        : (fallback?.tags ?? ['Roleplay']),
    };
  });
}

export interface PersistedAppState {
  characters: Character[];
  activeCharacterId: string;
  conversations: Record<string, ChatMessage[]>;
  storyMemories: Record<string, StoryMemoryEntry>;
  settings: OllamaSettings;
  userPersona: UserPersona;
  themeId: ThemeId;
  bubbleSchemeId: BubbleSchemeId;
  language: Language;
  wallpaperFit: WallpaperFitMode;
  parallaxEnabled: boolean;
  visualSettings: VisualStudioSettings;
}

export function hydrateVisualSettings(
  raw: Partial<VisualStudioSettings> | undefined
): VisualStudioSettings {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_VISUAL_STUDIO_SETTINGS;
  }
  const fontFamily =
    raw.fontFamily === 'serif' || raw.fontFamily === 'mono'
      ? raw.fontFamily
      : 'sans';
  const textSize =
    raw.textSize === 'sm' || raw.textSize === 'lg' || raw.textSize === 'xl'
      ? raw.textSize
      : 'md';
  const glassOpacity =
    typeof raw.glassOpacity === 'number' && !Number.isNaN(raw.glassOpacity)
      ? Math.min(95, Math.max(20, Math.round(raw.glassOpacity)))
      : DEFAULT_VISUAL_STUDIO_SETTINGS.glassOpacity;

  return {
    fontFamily,
    textSize,
    glassOpacity,
    customUserBubbleColor: isValidHexColor(raw.customUserBubbleColor)
      ? raw.customUserBubbleColor
      : undefined,
    customDialogueColor: isValidHexColor(raw.customDialogueColor)
      ? raw.customDialogueColor
      : undefined,
    customActionColor: isValidHexColor(raw.customActionColor)
      ? raw.customActionColor
      : undefined,
  };
}

export async function loadAllPersistedState(): Promise<PersistedAppState> {
  const alreadyMigrated = await idbGet<boolean>(MIGRATION_FLAG_KEY);

  if (!alreadyMigrated) {
    const keysToMigrate = Object.values(STORAGE_KEYS);
    let migratedAny = false;

    for (const key of keysToMigrate) {
      const existingInIdb = await idbGet<unknown>(key);
      if (existingInIdb === undefined) {
        const legacyValue = readLegacyLocalStorage<unknown>(key);
        if (legacyValue !== undefined) {
          await idbSet(key, legacyValue);
          migratedAny = true;
        }
      }
    }

    await idbSet(MIGRATION_FLAG_KEY, true);

    if (migratedAny) {
      // Free the 5MB localStorage quota now that IndexedDB holds all state
      for (const key of keysToMigrate) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
    }
  }

  const [
    rawChars,
    rawActiveId,
    rawConversations,
    rawStoryMemories,
    rawSettings,
    rawPersona,
    rawTheme,
    rawBubble,
    rawLang,
    rawWallpaperFit,
    rawParallaxEnabled,
    rawVisualSettings,
  ] = await Promise.all([
    idbGet<Character[]>(STORAGE_KEYS.characters),
    idbGet<string>(STORAGE_KEYS.activeCharacterId),
    idbGet<Record<string, ChatMessage[]>>(STORAGE_KEYS.conversations),
    idbGet<Record<string, StoryMemoryEntry>>(STORAGE_KEYS.storyMemories),
    idbGet<Partial<OllamaSettings>>(STORAGE_KEYS.settings),
    idbGet<Partial<UserPersona>>(STORAGE_KEYS.userPersona),
    idbGet<ThemeId>(STORAGE_KEYS.theme),
    idbGet<BubbleSchemeId>(STORAGE_KEYS.bubbleScheme),
    idbGet<Language>(STORAGE_KEYS.language),
    idbGet<WallpaperFitMode>(STORAGE_KEYS.wallpaperFit),
    idbGet<boolean>(STORAGE_KEYS.parallaxEnabled),
    idbGet<Partial<VisualStudioSettings>>(STORAGE_KEYS.visualSettings),
  ]);

  const characters = hydrateCharacters(
    rawChars ?? readLegacyLocalStorage<Character[]>(STORAGE_KEYS.characters)
  );

  const savedActiveId =
    rawActiveId ??
    readLegacyLocalStorage<string>(STORAGE_KEYS.activeCharacterId);
  const activeCharacterId =
    savedActiveId && characters.some((c) => c.id === savedActiveId)
      ? savedActiveId
      : characters[0].id;

  const savedConversations =
    rawConversations ??
    readLegacyLocalStorage<Record<string, ChatMessage[]>>(
      STORAGE_KEYS.conversations
    );
  const conversations: Record<string, ChatMessage[]> = {};
  if (savedConversations && typeof savedConversations === 'object') {
    for (const [charId, msgs] of Object.entries(savedConversations)) {
      if (Array.isArray(msgs)) {
        conversations[charId] = msgs.map((m) => {
          const validSwipes = Array.isArray(m.swipes)
            ? m.swipes.filter((s): s is string => typeof s === 'string')
            : undefined;
          const hasSwipes = validSwipes && validSwipes.length > 0;
          const clampedIndex = hasSwipes
            ? Math.min(
                Math.max(
                  typeof m.activeSwipeIndex === 'number'
                    ? Math.floor(m.activeSwipeIndex)
                    : validSwipes.length - 1,
                  0
                ),
                validSwipes.length - 1
              )
            : undefined;

          return {
            ...m,
            content:
              hasSwipes && clampedIndex !== undefined
                ? validSwipes[clampedIndex]
                : m.content,
            swipes: hasSwipes ? validSwipes : undefined,
            activeSwipeIndex: clampedIndex,
            isStreaming: false,
          };
        });
      }
    }
  }

  const savedStoryMemories =
    rawStoryMemories ??
    readLegacyLocalStorage<Record<string, StoryMemoryEntry>>(
      STORAGE_KEYS.storyMemories
    );
  const storyMemories: Record<string, StoryMemoryEntry> = {};
  if (savedStoryMemories && typeof savedStoryMemories === 'object') {
    for (const [charId, entry] of Object.entries(savedStoryMemories)) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof entry.summary === 'string' &&
        entry.summary.trim().length > 0
      ) {
        storyMemories[charId] = {
          summary: entry.summary,
          summarizedMessageCount:
            typeof entry.summarizedMessageCount === 'number' &&
            entry.summarizedMessageCount >= 0
              ? Math.floor(entry.summarizedMessageCount)
              : 0,
          updatedAt:
            typeof entry.updatedAt === 'number' ? entry.updatedAt : Date.now(),
        };
      }
    }
  }

  const savedSettings =
    rawSettings ??
    readLegacyLocalStorage<Partial<OllamaSettings>>(STORAGE_KEYS.settings) ??
    {};
  const provider = savedSettings.provider === 'openai' ? 'openai' : 'ollama';
  const legacyPlaintextApiKey =
    typeof savedSettings.apiKey === 'string' ? savedSettings.apiKey : undefined;
  const { apiKey: decryptedApiKey, shouldScrubSettings } =
    await loadApiKeySecurely(legacyPlaintextApiKey);

  const settings: OllamaSettings = {
    provider,
    baseUrl: normalizeBaseUrl(
      savedSettings.baseUrl ||
        (provider === 'openai' ? DEFAULT_OPENAI_URL : DEFAULT_OLLAMA_URL),
      provider === 'openai' ? DEFAULT_OPENAI_URL : DEFAULT_OLLAMA_URL
    ),
    openaiBaseUrl: normalizeBaseUrl(
      typeof savedSettings.openaiBaseUrl === 'string' &&
        savedSettings.openaiBaseUrl.trim()
        ? savedSettings.openaiBaseUrl
        : provider === 'openai' && savedSettings.baseUrl
          ? savedSettings.baseUrl
          : DEFAULT_OPENAI_URL,
      DEFAULT_OPENAI_URL
    ),
    apiKey: decryptedApiKey,
    selectedModel: savedSettings.selectedModel || '',
    availableModels: Array.isArray(savedSettings.availableModels)
      ? savedSettings.availableModels
      : [],
    temperature:
      typeof savedSettings.temperature === 'number'
        ? savedSettings.temperature
        : 0.8,
    numPredict:
      typeof savedSettings.numPredict === 'number'
        ? savedSettings.numPredict
        : DEFAULT_NUM_PREDICT,
    numCtx:
      typeof savedSettings.numCtx === 'number'
        ? savedSettings.numCtx
        : DEFAULT_NUM_CTX,
    storyMemoryEnabled: savedSettings.storyMemoryEnabled !== false,
  };

  if (shouldScrubSettings) {
    void idbSet(STORAGE_KEYS.settings, stripSecretFromSettings(settings));
  }

  const savedPersona =
    rawPersona ??
    readLegacyLocalStorage<Partial<UserPersona>>(STORAGE_KEYS.userPersona) ??
    DEFAULT_USER_PERSONA;
  const userPersona: UserPersona = {
    name: typeof savedPersona.name === 'string' ? savedPersona.name : '',
    appearance:
      typeof savedPersona.appearance === 'string' ? savedPersona.appearance : '',
    bio: typeof savedPersona.bio === 'string' ? savedPersona.bio : '',
  };

  const savedTheme =
    rawTheme ?? readLegacyLocalStorage<ThemeId>(STORAGE_KEYS.theme);
  const themeId: ThemeId =
    savedTheme === 'obsidian-violet' ||
    savedTheme === 'midnight-crimson' ||
    savedTheme === 'cyber-emerald'
      ? savedTheme
      : 'obsidian-violet';

  const savedBubble =
    rawBubble ??
    readLegacyLocalStorage<BubbleSchemeId>(STORAGE_KEYS.bubbleScheme);
  const bubbleSchemeId: BubbleSchemeId =
    savedBubble === 'indigo-violet' ||
    savedBubble === 'crimson-rose' ||
    savedBubble === 'cyber-emerald' ||
    savedBubble === 'ocean-blue' ||
    savedBubble === 'amber-gold' ||
    savedBubble === 'minimalist-glass'
      ? savedBubble
      : 'indigo-violet';

  const savedLang =
    rawLang ?? readLegacyLocalStorage<Language>(STORAGE_KEYS.language);
  const language: Language = savedLang === 'es' ? 'es' : 'en';

  const wallpaperFit: WallpaperFitMode =
    rawWallpaperFit === 'contain' ? 'contain' : 'cover';

  const parallaxEnabled =
    typeof rawParallaxEnabled === 'boolean' ? rawParallaxEnabled : true;

  const visualSettings = hydrateVisualSettings(
    rawVisualSettings ??
      readLegacyLocalStorage<Partial<VisualStudioSettings>>(
        STORAGE_KEYS.visualSettings
      )
  );

  return {
    characters,
    activeCharacterId,
    conversations,
    storyMemories,
    settings,
    userPersona,
    themeId,
    bubbleSchemeId,
    language,
    wallpaperFit,
    parallaxEnabled,
    visualSettings,
  };
}
