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
} from '../types/chat';
import {
  DEFAULT_NUM_CTX,
  DEFAULT_NUM_PREDICT,
  DEFAULT_OLLAMA_URL,
  DEFAULT_OPENAI_URL,
  normalizeBaseUrl,
} from './ollama';
import { hydrateVisualSettings } from './storage';

export interface AtriumBackupData {
  app: 'Atrium';
  version: 1;
  exportedAt: string;
  characters: Character[];
  activeCharacterId: string;
  conversations: Record<string, ChatMessage[]>;
  storyMemories?: Record<string, StoryMemoryEntry>;
  settings: Omit<OllamaSettings, 'apiKey'>;
  userPersona?: UserPersona;
  themeId: ThemeId;
  bubbleSchemeId: BubbleSchemeId;
  language: Language;
  visualSettings?: VisualStudioSettings;
}

const VALID_THEMES = new Set<ThemeId>([
  'obsidian-violet',
  'midnight-crimson',
  'cyber-emerald',
]);

const VALID_BUBBLE_SCHEMES = new Set<BubbleSchemeId>([
  'indigo-violet',
  'crimson-rose',
  'cyber-emerald',
  'ocean-blue',
  'amber-gold',
  'minimalist-glass',
]);

export function downloadAtriumBackup(
  payload: Omit<AtriumBackupData, 'app' | 'version' | 'exportedAt' | 'settings'> & {
    settings: OllamaSettings;
  }
): void {
  const { apiKey: _excludedApiKey, ...safeSettings } = payload.settings;
  const fullPayload: AtriumBackupData = {
    app: 'Atrium',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...payload,
    settings: safeSettings,
  };

  const json = JSON.stringify(fullPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `atrium-backup-${dateStamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ParsedBackupResult {
  characters: Character[];
  activeCharacterId: string;
  conversations: Record<string, ChatMessage[]>;
  storyMemories?: Record<string, StoryMemoryEntry>;
  settings?: OllamaSettings;
  userPersona?: UserPersona;
  themeId?: ThemeId;
  bubbleSchemeId?: BubbleSchemeId;
  language?: Language;
  visualSettings?: VisualStudioSettings;
  chatCount: number;
}

export async function parseAtriumBackupFile(file: File): Promise<ParsedBackupResult> {
  const rawText = await file.text();
  const parsed: unknown = JSON.parse(rawText);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid backup structure');
  }

  const record = parsed as Record<string, unknown>;

  if (!Array.isArray(record.characters) || record.characters.length === 0) {
    throw new Error('Backup contains no characters');
  }

  const characters: Character[] = [];
  for (const item of record.characters) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    if (typeof c.id !== 'string' || typeof c.name !== 'string') continue;
    characters.push({
      id: c.id,
      name: c.name,
      role: typeof c.role === 'string' ? c.role : '',
      bio: typeof c.bio === 'string' ? c.bio : '',
      greeting: typeof c.greeting === 'string' ? c.greeting : '',
      systemPrompt: typeof c.systemPrompt === 'string' ? c.systemPrompt : '',
      imageUrl: typeof c.imageUrl === 'string' ? c.imageUrl : undefined,
      wallpaperUrl:
        typeof c.wallpaperUrl === 'string' ? c.wallpaperUrl : undefined,
      tags: Array.isArray(c.tags)
        ? c.tags.filter((t): t is string => typeof t === 'string')
        : ['Roleplay'],
      icon:
        typeof c.icon === 'string'
          ? (c.icon as Character['icon'])
          : 'compass',
      tone:
        typeof c.tone === 'string' ? (c.tone as Character['tone']) : 'cobalt',
    });
  }

  if (characters.length === 0) {
    throw new Error('No valid characters found in backup');
  }

  const conversations: Record<string, ChatMessage[]> = {};
  let chatCount = 0;

  if (
    record.conversations &&
    typeof record.conversations === 'object' &&
    !Array.isArray(record.conversations)
  ) {
    for (const [charId, list] of Object.entries(
      record.conversations as Record<string, unknown>
    )) {
      if (!Array.isArray(list)) continue;
      const validMsgs: ChatMessage[] = [];
      for (const msg of list) {
        if (!msg || typeof msg !== 'object') continue;
        const m = msg as Record<string, unknown>;
        if (
          typeof m.id !== 'string' ||
          (m.role !== 'user' && m.role !== 'assistant') ||
          typeof m.content !== 'string'
        ) {
          continue;
        }
        const validSwipes = Array.isArray(m.swipes)
          ? m.swipes.filter((s): s is string => typeof s === 'string')
          : undefined;
        const hasSwipes = validSwipes && validSwipes.length > 0;
        const activeSwipeIndex = hasSwipes
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

        validMsgs.push({
          id: m.id,
          role: m.role,
          content: m.content,
          swipes: hasSwipes ? validSwipes : undefined,
          activeSwipeIndex,
          createdAt:
            typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
          model: typeof m.model === 'string' ? m.model : undefined,
          tokensPerSecond:
            typeof m.tokensPerSecond === 'number'
              ? m.tokensPerSecond
              : undefined,
          isStreaming: false,
          isError: Boolean(m.isError),
        });
      }
      conversations[charId] = validMsgs;
      if (validMsgs.length > 0) {
        chatCount += 1;
      }
    }
  }

  const rawActiveId =
    typeof record.activeCharacterId === 'string'
      ? record.activeCharacterId
      : '';
  const activeCharacterId = characters.some((c) => c.id === rawActiveId)
    ? rawActiveId
    : characters[0].id;

  let settings: OllamaSettings | undefined;
  if (record.settings && typeof record.settings === 'object') {
    const s = record.settings as Record<string, unknown>;
    const provider = s.provider === 'openai' ? 'openai' : 'ollama';
    const fallbackUrl =
      provider === 'openai' ? DEFAULT_OPENAI_URL : DEFAULT_OLLAMA_URL;
    settings = {
      provider,
      baseUrl: normalizeBaseUrl(
        typeof s.baseUrl === 'string' && s.baseUrl.trim()
          ? s.baseUrl
          : fallbackUrl,
        fallbackUrl
      ),
      openaiBaseUrl: normalizeBaseUrl(
        typeof s.openaiBaseUrl === 'string' && s.openaiBaseUrl.trim()
          ? s.openaiBaseUrl
          : DEFAULT_OPENAI_URL,
        DEFAULT_OPENAI_URL
      ),
      selectedModel:
        typeof s.selectedModel === 'string' ? s.selectedModel : '',
      availableModels: Array.isArray(s.availableModels)
        ? (s.availableModels as OllamaSettings['availableModels'])
        : [],
      temperature: typeof s.temperature === 'number' ? s.temperature : 0.8,
      numPredict:
        typeof s.numPredict === 'number' ? s.numPredict : DEFAULT_NUM_PREDICT,
      numCtx: typeof s.numCtx === 'number' ? s.numCtx : DEFAULT_NUM_CTX,
      storyMemoryEnabled: s.storyMemoryEnabled !== false,
    };
  }

  let storyMemories: Record<string, StoryMemoryEntry> | undefined;
  if (
    record.storyMemories &&
    typeof record.storyMemories === 'object' &&
    !Array.isArray(record.storyMemories)
  ) {
    storyMemories = {};
    for (const [charId, entry] of Object.entries(
      record.storyMemories as Record<string, unknown>
    )) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.summary === 'string' && e.summary.trim().length > 0) {
        storyMemories[charId] = {
          summary: e.summary,
          summarizedMessageCount:
            typeof e.summarizedMessageCount === 'number' &&
            e.summarizedMessageCount >= 0
              ? Math.floor(e.summarizedMessageCount)
              : 0,
          updatedAt:
            typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
        };
      }
    }
  }

  const themeId =
    typeof record.themeId === 'string' &&
    VALID_THEMES.has(record.themeId as ThemeId)
      ? (record.themeId as ThemeId)
      : undefined;

  const bubbleSchemeId =
    typeof record.bubbleSchemeId === 'string' &&
    VALID_BUBBLE_SCHEMES.has(record.bubbleSchemeId as BubbleSchemeId)
      ? (record.bubbleSchemeId as BubbleSchemeId)
      : undefined;

  const language =
    record.language === 'es' || record.language === 'en'
      ? record.language
      : undefined;

  let userPersona: UserPersona | undefined;
  if (
    record.userPersona &&
    typeof record.userPersona === 'object' &&
    !Array.isArray(record.userPersona)
  ) {
    const p = record.userPersona as Record<string, unknown>;
    userPersona = {
      name: typeof p.name === 'string' ? p.name : '',
      appearance: typeof p.appearance === 'string' ? p.appearance : '',
      bio: typeof p.bio === 'string' ? p.bio : '',
    };
  }

  let visualSettings: VisualStudioSettings | undefined;
  if (
    record.visualSettings &&
    typeof record.visualSettings === 'object' &&
    !Array.isArray(record.visualSettings)
  ) {
    visualSettings = hydrateVisualSettings(
      record.visualSettings as Partial<VisualStudioSettings>
    );
  }

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
    visualSettings,
    chatCount,
  };
}
