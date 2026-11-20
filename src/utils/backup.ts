import type {
  BubbleSchemeId,
  Character,
  CharacterIconId,
  CharacterTone,
  ChatMessage,
  Language,
  OllamaModelTag,
  OllamaSettings,
  StoryMemoryEntry,
  ThemeId,
  UserPersona,
  VisualStudioSettings,
} from '../types/chat';
import { sanitizeImageUrl } from './imageUpload';
import {
  DEFAULT_NUM_CTX,
  DEFAULT_NUM_PREDICT,
  DEFAULT_OLLAMA_URL,
  DEFAULT_OPENAI_URL,
  normalizeBaseUrl,
} from './ollama';
import { sanitizeRenderedText } from './sanitize';
import { hydrateVisualSettings } from './storage';

const MAX_BACKUP_FILE_BYTES = 25 * 1024 * 1024;
const MAX_BACKUP_CHARACTERS = 200;
const MAX_BACKUP_MESSAGES_PER_CHAR = 5000;
const MAX_BACKUP_SWIPES = 50;
const MAX_BACKUP_MODELS = 500;

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

const VALID_CHARACTER_ICONS = new Set<CharacterIconId>([
  'compass',
  'orbit',
  'flame',
  'anchor',
  'feather',
  'shield',
  'scroll',
  'eye',
]);

const VALID_CHARACTER_TONES = new Set<CharacterTone>([
  'cobalt',
  'amber',
  'emerald',
  'rose',
  'slate',
]);

function sanitizeAvailableModels(rawModels: unknown): OllamaModelTag[] {
  if (!Array.isArray(rawModels)) return [];
  const valid: OllamaModelTag[] = [];

  for (const item of rawModels) {
    if (valid.length >= MAX_BACKUP_MODELS) break;
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const m = item as Record<string, unknown>;
    const rawName =
      typeof m.name === 'string'
        ? sanitizeRenderedText(m.name).trim().slice(0, 200)
        : '';
    if (!rawName) continue;

    const rawDetails =
      m.details && typeof m.details === 'object' && !Array.isArray(m.details)
        ? (m.details as Record<string, unknown>)
        : undefined;

    valid.push({
      name: rawName,
      model:
        typeof m.model === 'string'
          ? sanitizeRenderedText(m.model).trim().slice(0, 200)
          : rawName,
      size:
        typeof m.size === 'number' && Number.isFinite(m.size) && m.size >= 0
          ? m.size
          : undefined,
      details: rawDetails
        ? {
            family:
              typeof rawDetails.family === 'string'
                ? sanitizeRenderedText(rawDetails.family).trim().slice(0, 80)
                : undefined,
            parameter_size:
              typeof rawDetails.parameter_size === 'string'
                ? sanitizeRenderedText(rawDetails.parameter_size)
                    .trim()
                    .slice(0, 40)
                : undefined,
            quantization_level:
              typeof rawDetails.quantization_level === 'string'
                ? sanitizeRenderedText(rawDetails.quantization_level)
                    .trim()
                    .slice(0, 40)
                : undefined,
          }
        : undefined,
    });
  }

  return valid;
}

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
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    throw new Error('Backup file exceeds the 25 MB maximum size limit.');
  }

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
  for (const item of record.characters.slice(0, MAX_BACKUP_CHARACTERS)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const c = item as Record<string, unknown>;
    if (typeof c.id !== 'string' || typeof c.name !== 'string') continue;
    const safeId = sanitizeRenderedText(c.id).trim().slice(0, 120);
    const safeName = sanitizeRenderedText(c.name).trim().slice(0, 120);
    if (!safeId || !safeName) continue;

    characters.push({
      id: safeId,
      name: safeName,
      role:
        typeof c.role === 'string'
          ? sanitizeRenderedText(c.role).trim().slice(0, 120)
          : '',
      bio:
        typeof c.bio === 'string'
          ? sanitizeRenderedText(c.bio).trim().slice(0, 1000)
          : '',
      greeting:
        typeof c.greeting === 'string'
          ? sanitizeRenderedText(c.greeting).slice(0, 8000)
          : '',
      systemPrompt:
        typeof c.systemPrompt === 'string'
          ? sanitizeRenderedText(c.systemPrompt).slice(0, 24000)
          : '',
      imageUrl: sanitizeImageUrl(c.imageUrl),
      stageBackground: sanitizeImageUrl(c.stageBackground),
      wallpaperUrl: sanitizeImageUrl(c.wallpaperUrl),
      tags: Array.isArray(c.tags)
        ? c.tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => sanitizeRenderedText(t).trim().slice(0, 40))
            .filter(Boolean)
            .slice(0, 8)
        : ['Roleplay'],
      icon:
        typeof c.icon === 'string' &&
        VALID_CHARACTER_ICONS.has(c.icon as CharacterIconId)
          ? (c.icon as CharacterIconId)
          : 'compass',
      tone:
        typeof c.tone === 'string' &&
        VALID_CHARACTER_TONES.has(c.tone as CharacterTone)
          ? (c.tone as CharacterTone)
          : 'cobalt',
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
      for (const msg of list.slice(-MAX_BACKUP_MESSAGES_PER_CHAR)) {
        if (!msg || typeof msg !== 'object' || Array.isArray(msg)) continue;
        const m = msg as Record<string, unknown>;
        if (
          typeof m.id !== 'string' ||
          (m.role !== 'user' && m.role !== 'assistant') ||
          typeof m.content !== 'string'
        ) {
          continue;
        }
        const validSwipes = Array.isArray(m.swipes)
          ? m.swipes
              .filter((s): s is string => typeof s === 'string')
              .slice(-MAX_BACKUP_SWIPES)
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
          id: sanitizeRenderedText(m.id).trim().slice(0, 120),
          role: m.role,
          content: m.content,
          swipes: hasSwipes ? validSwipes : undefined,
          activeSwipeIndex,
          createdAt:
            typeof m.createdAt === 'number' && Number.isFinite(m.createdAt)
              ? m.createdAt
              : Date.now(),
          model:
            typeof m.model === 'string'
              ? sanitizeRenderedText(m.model).trim().slice(0, 200)
              : undefined,
          tokensPerSecond:
            typeof m.tokensPerSecond === 'number' &&
            Number.isFinite(m.tokensPerSecond)
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
  if (record.settings && typeof record.settings === 'object' && !Array.isArray(record.settings)) {
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
        typeof s.selectedModel === 'string'
          ? sanitizeRenderedText(s.selectedModel).trim().slice(0, 200)
          : '',
      availableModels: sanitizeAvailableModels(s.availableModels),
      temperature:
        typeof s.temperature === 'number' && Number.isFinite(s.temperature)
          ? Math.min(2, Math.max(0, s.temperature))
          : 0.8,
      numPredict:
        typeof s.numPredict === 'number' && Number.isFinite(s.numPredict)
          ? Math.min(8192, Math.max(16, Math.round(s.numPredict)))
          : DEFAULT_NUM_PREDICT,
      numCtx:
        typeof s.numCtx === 'number' && Number.isFinite(s.numCtx)
          ? Math.min(131072, Math.max(512, Math.round(s.numCtx)))
          : DEFAULT_NUM_CTX,
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
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.summary === 'string' && e.summary.trim().length > 0) {
        storyMemories[charId] = {
          summary: sanitizeRenderedText(e.summary).slice(0, 4000),
          summarizedMessageCount:
            typeof e.summarizedMessageCount === 'number' &&
            Number.isFinite(e.summarizedMessageCount) &&
            e.summarizedMessageCount >= 0
              ? Math.floor(e.summarizedMessageCount)
              : 0,
          updatedAt:
            typeof e.updatedAt === 'number' && Number.isFinite(e.updatedAt)
              ? e.updatedAt
              : Date.now(),
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
      name:
        typeof p.name === 'string'
          ? sanitizeRenderedText(p.name).trim().slice(0, 80)
          : '',
      appearance:
        typeof p.appearance === 'string'
          ? sanitizeRenderedText(p.appearance).trim().slice(0, 500)
          : '',
      bio:
        typeof p.bio === 'string'
          ? sanitizeRenderedText(p.bio).trim().slice(0, 700)
          : '',
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
