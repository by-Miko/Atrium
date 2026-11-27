import type {
  Character,
  ChatMessage,
  MobileSyncPreferences,
  MobileSyncStatePayload,
  OllamaSettings,
  StoryMemoryEntry,
} from '../types/chat';
import { sanitizeImageUrl } from './imageUpload';

export const MOBILE_LINK_TOKEN_SESSION_KEY = 'atrium.mobileLink.token.v1';

let mobileLinkClientActive = false;

export function setMobileLinkClientActive(active: boolean): void {
  mobileLinkClientActive = Boolean(active);
}

export function isMobileLinkClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.electronAPI?.isElectron) return false;
  if (mobileLinkClientActive) return true;
  if (getMobileLinkSessionToken()) return true;
  try {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('ml_token')) {
      return true;
    }
  } catch {
    // ignore malformed URL
  }
  return false;
}

export function isLocalLoopbackUrl(rawUrl?: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed === '/api' || trimmed === '/v1' || trimmed === '/v1/') {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export function isLocalLmStudioUrl(rawUrl?: string): boolean {
  if (!isLocalLoopbackUrl(rawUrl)) return false;
  const trimmed = rawUrl!.trim();
  if (trimmed === '/v1' || trimmed === '/v1/') return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.port === '1234';
  } catch {
    return false;
  }
}

export function isPublicHttpsApiUrl(rawUrl?: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('/')) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      !host ||
      host === '0.0.0.0' ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === 'metadata' ||
      host === '::1' ||
      host.startsWith('fe80:')
    ) {
      return false;
    }
    const parts = host.split('.');
    if (
      parts.length === 4 &&
      parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
    ) {
      const [a, b] = parts.map(Number);
      if (
        a === 127 ||
        a === 10 ||
        a === 100 ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function resolveSafeSyncedOpenAiBaseUrl(
  settings?: Partial<Pick<OllamaSettings, 'provider' | 'baseUrl' | 'openaiBaseUrl'>>
): string | undefined {
  if (!settings) return undefined;
  const candidate =
    settings.provider === 'openai' &&
    settings.baseUrl &&
    settings.baseUrl !== '/v1'
      ? settings.baseUrl
      : settings.openaiBaseUrl ||
        (settings.baseUrl === '/v1' ? 'http://127.0.0.1:1234/v1' : undefined);
  if (!candidate) return undefined;
  if (isLocalLoopbackUrl(candidate)) {
    const trimmed = candidate.trim().replace(/\/+$/, '');
    return trimmed === '/v1' ? 'http://127.0.0.1:1234/v1' : trimmed;
  }
  if (isPublicHttpsApiUrl(candidate)) {
    return candidate.trim().replace(/\/+$/, '');
  }
  return undefined;
}

export function getMobileLinkSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.sessionStorage.getItem(MOBILE_LINK_TOKEN_SESSION_KEY);
    return token && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function setMobileLinkSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = token.trim();
  if (!trimmed) return;
  try {
    window.sessionStorage.setItem(MOBILE_LINK_TOKEN_SESSION_KEY, trimmed);
  } catch {
    // ignore sessionStorage errors in restricted browsing contexts
  }
}

export function clearMobileLinkSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(MOBILE_LINK_TOKEN_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Captures `?ml_token=...` into tab-scoped sessionStorage (never localStorage)
 * and strips the query parameter immediately from the address bar.
 */
export function bootstrapMobileLinkSession(): {
  hadUrlToken: boolean;
  token: string | null;
} {
  if (typeof window === 'undefined') {
    return { hadUrlToken: false, token: null };
  }

  try {
    const currentUrl = new URL(window.location.href);
    const urlToken = currentUrl.searchParams.get('ml_token')?.trim();
    if (urlToken) {
      setMobileLinkSessionToken(urlToken);
      setMobileLinkClientActive(true);
      currentUrl.searchParams.delete('ml_token');
      const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      window.history.replaceState(window.history.state, '', nextUrl || '/');
      return { hadUrlToken: true, token: urlToken };
    }
  } catch {
    // ignore malformed URL
  }

  const existingToken = getMobileLinkSessionToken();
  if (existingToken) {
    setMobileLinkClientActive(true);
  }

  return {
    hadUrlToken: false,
    token: existingToken,
  };
}

function stableFnvHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(36)}:${(h2 >>> 0).toString(36)}:${input.length}`;
}

function canonicalizeSyncValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(canonicalizeSyncValue);
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      out[key] = canonicalizeSyncValue(val);
    }
  }
  return out;
}

export function serializeNormalizedSyncPayload(
  payload: Pick<
    MobileSyncStatePayload,
    'characters' | 'chats' | 'storyMemory' | 'preferences'
  >
): string {
  const cleanedChats: Record<string, ChatMessage[]> = {};
  for (const [charId, msgs] of Object.entries(payload.chats ?? {})) {
    if (!Array.isArray(msgs)) continue;
    cleanedChats[charId] = msgs.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false } : m
    );
  }

  const rawSettings = payload.preferences?.settings;
  const safeNormalizedOpenaiUrl = resolveSafeSyncedOpenAiBaseUrl(rawSettings);
  const normalizedPreferences = payload.preferences
    ? {
        ...payload.preferences,
        ...(rawSettings
          ? {
              settings: {
                provider: rawSettings.provider === 'openai' ? 'openai' : 'ollama',
                ...(safeNormalizedOpenaiUrl
                  ? { openaiBaseUrl: safeNormalizedOpenaiUrl }
                  : {}),
                selectedModel: rawSettings.selectedModel ?? '',
                availableModels: Array.isArray(rawSettings.availableModels)
                  ? rawSettings.availableModels
                  : [],
                temperature: rawSettings.temperature,
                numPredict: rawSettings.numPredict,
                numCtx: rawSettings.numCtx,
                storyMemoryEnabled: rawSettings.storyMemoryEnabled !== false,
              },
            }
          : {}),
      }
    : {};

  const canonical = canonicalizeSyncValue({
    characters: sanitizeCharactersForSync(payload.characters ?? []),
    chats: cleanedChats,
    storyMemory: payload.storyMemory ?? {},
    preferences: normalizedPreferences,
  });

  return JSON.stringify(canonical);
}

export function computeMobileSyncStateHash(
  payload: Pick<
    MobileSyncStatePayload,
    'characters' | 'chats' | 'storyMemory' | 'preferences'
  >
): string {
  return stableFnvHash(serializeNormalizedSyncPayload(payload));
}

export function computeMobileSyncSignature(
  payload: MobileSyncStatePayload
): string {
  return `${payload.updatedAt}:${computeMobileSyncStateHash(payload)}`;
}

export function computeMobileSyncContentFingerprint(
  payload: Pick<
    MobileSyncStatePayload,
    'characters' | 'chats' | 'storyMemory' | 'preferences'
  >,
  options?: { ignoreSettingsAndPersona?: boolean }
): string {
  const normalizedChars = sanitizeCharactersForSync(payload.characters ?? []).map(
    (char) => ({
      id: char.id,
      name: char.name,
      role: char.role,
      bioLen: char.bio.length,
      bioHash: stableFnvHash(char.bio),
      greetingLen: char.greeting.length,
      greetingHash: stableFnvHash(char.greeting),
      promptLen: char.systemPrompt.length,
      promptHash: stableFnvHash(char.systemPrompt),
      imageUrl: char.imageUrl ?? '',
      stageBackground: char.stageBackground ?? '',
      wallpaperUrl: char.wallpaperUrl ?? '',
      tags: Array.isArray(char.tags) ? char.tags : [],
      icon: char.icon,
      tone: char.tone,
    })
  );

  const chatEntries: Record<
    string,
    {
      count: number;
      lastId: string;
      messages: Array<[string, string, number, number, number, string]>;
    }
  > = {};

  const chatKeys = Object.keys(payload.chats ?? {}).sort();
  for (const charId of chatKeys) {
    const msgs = payload.chats?.[charId];
    if (!Array.isArray(msgs)) continue;
    const lastMsg = msgs[msgs.length - 1];
    chatEntries[charId] = {
      count: msgs.length,
      lastId: lastMsg?.id ?? '',
      messages: msgs.map((m) => [
        m.id,
        m.role,
        m.content.length,
        m.activeSwipeIndex ?? 0,
        Array.isArray(m.swipes) ? m.swipes.length : 0,
        stableFnvHash(m.content),
      ]),
    };
  }

  const prefs = payload.preferences ?? {};
  const rawSettings = prefs.settings;
  const normalizedPrefs: Record<string, unknown> = {
    activeCharacterId: prefs.activeCharacterId ?? '',
    themeId: prefs.themeId ?? '',
    bubbleSchemeId: prefs.bubbleSchemeId ?? '',
    language: prefs.language ?? '',
    wallpaperFit: prefs.wallpaperFit ?? '',
    parallaxEnabled:
      typeof prefs.parallaxEnabled === 'boolean' ? prefs.parallaxEnabled : null,
    visualSettings: prefs.visualSettings ?? null,
  };

  if (!options?.ignoreSettingsAndPersona) {
    const safeFingerprintOpenaiUrl =
      resolveSafeSyncedOpenAiBaseUrl(rawSettings);
    normalizedPrefs.userPersona = prefs.userPersona ?? null;
    normalizedPrefs.selectedModel = rawSettings?.selectedModel ?? '';
    normalizedPrefs.settings = rawSettings
      ? {
          provider: rawSettings.provider === 'openai' ? 'openai' : 'ollama',
          ...(safeFingerprintOpenaiUrl
            ? { openaiBaseUrl: safeFingerprintOpenaiUrl }
            : {}),
          selectedModel: rawSettings.selectedModel ?? '',
          modelNames: Array.isArray(rawSettings.availableModels)
            ? rawSettings.availableModels.map((m) => m.name)
            : [],
          temperature: rawSettings.temperature,
          numPredict: rawSettings.numPredict,
          numCtx: rawSettings.numCtx,
          storyMemoryEnabled: rawSettings.storyMemoryEnabled !== false,
        }
      : null;
  }

  const canonical = canonicalizeSyncValue({
    characters: normalizedChars,
    chats: chatEntries,
    storyMemory: payload.storyMemory ?? {},
    preferences: normalizedPrefs,
  });

  return stableFnvHash(JSON.stringify(canonical));
}

export function normalizeAssetUrlForSync(
  rawUrl: string | undefined
): string | undefined {
  const safe = sanitizeImageUrl(rawUrl);
  if (!safe) return undefined;

  if (safe.startsWith('file:')) {
    const assetsIdx = safe.lastIndexOf('/assets/');
    if (assetsIdx !== -1) {
      return `.${safe.slice(assetsIdx)}`;
    }
    return undefined;
  }

  return safe;
}

export function sanitizeCharactersForSync(characters: Character[]): Character[] {
  return characters.map((char) => ({
    ...char,
    imageUrl: normalizeAssetUrlForSync(char.imageUrl),
    stageBackground: normalizeAssetUrlForSync(char.stageBackground),
    wallpaperUrl: normalizeAssetUrlForSync(char.wallpaperUrl),
  }));
}

export function buildMobileSyncPayload(params: {
  updatedAt: number;
  characters: Character[];
  conversations: Record<string, ChatMessage[]>;
  storyMemories: Record<string, StoryMemoryEntry>;
  preferences: Omit<MobileSyncPreferences, 'settings'> & {
    settings?: OllamaSettings;
  };
}): MobileSyncStatePayload {
  const cleanedChats: Record<string, ChatMessage[]> = {};
  for (const [charId, msgs] of Object.entries(params.conversations)) {
    if (!Array.isArray(msgs)) continue;
    cleanedChats[charId] = msgs.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false } : m
    );
  }

  // Strictly omit apiKey, device-local baseUrl, and any non-local external URLs from sync relay
  const rawSettings = params.preferences.settings;
  const safeOpenaiUrl = resolveSafeSyncedOpenAiBaseUrl(rawSettings);
  const safeSettingsPrefs: MobileSyncPreferences['settings'] = rawSettings
    ? {
        provider: rawSettings.provider === 'openai' ? 'openai' : 'ollama',
        ...(safeOpenaiUrl ? { openaiBaseUrl: safeOpenaiUrl } : {}),
        selectedModel: rawSettings.selectedModel,
        availableModels: Array.isArray(rawSettings.availableModels)
          ? rawSettings.availableModels
          : [],
        temperature: rawSettings.temperature,
        numPredict: rawSettings.numPredict,
        numCtx: rawSettings.numCtx,
        storyMemoryEnabled: rawSettings.storyMemoryEnabled !== false,
      }
    : undefined;

  const { settings: _ignoredSettings, ...restPrefs } = params.preferences;

  return {
    updatedAt: params.updatedAt,
    characters: sanitizeCharactersForSync(params.characters),
    chats: cleanedChats,
    storyMemory: params.storyMemories,
    preferences: {
      ...restPrefs,
      ...(safeSettingsPrefs ? { settings: safeSettingsPrefs } : {}),
    },
  };
}

export async function fetchMobileSyncState(
  baseOrigin = '',
  token?: string | null,
  signal?: AbortSignal
): Promise<MobileSyncStatePayload | null> {
  const resolvedToken = token ?? getMobileLinkSessionToken();
  const headers: Record<string, string> = {};
  if (resolvedToken) {
    headers['X-Atrium-Link-Token'] = resolvedToken;
  }

  const endpoint = `${baseOrigin.replace(/\/+$/, '')}/mobile-sync/state`;
  const response = await fetch(endpoint, {
    method: 'GET',
    credentials: 'same-origin',
    headers,
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  const data = (await response.json()) as Partial<MobileSyncStatePayload>;
  if (!data || typeof data !== 'object' || typeof data.updatedAt !== 'number') {
    return null;
  }

  return {
    updatedAt: data.updatedAt,
    characters: Array.isArray(data.characters) ? data.characters : [],
    chats:
      data.chats && typeof data.chats === 'object' && !Array.isArray(data.chats)
        ? data.chats
        : {},
    storyMemory:
      data.storyMemory &&
      typeof data.storyMemory === 'object' &&
      !Array.isArray(data.storyMemory)
        ? data.storyMemory
        : {},
    preferences:
      data.preferences &&
      typeof data.preferences === 'object' &&
      !Array.isArray(data.preferences)
        ? data.preferences
        : {},
  };
}

export async function postMobileSyncState(
  payload: MobileSyncStatePayload,
  baseOrigin = '',
  token?: string | null,
  signal?: AbortSignal
): Promise<{ ok: boolean; updatedAt: number } | null> {
  const resolvedToken = token ?? getMobileLinkSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (resolvedToken) {
    headers['X-Atrium-Link-Token'] = resolvedToken;
  }

  const endpoint = `${baseOrigin.replace(/\/+$/, '')}/mobile-sync/state`;
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { ok?: boolean; updatedAt?: number };
  if (typeof data?.updatedAt !== 'number') {
    return null;
  }
  return {
    ok: Boolean(data.ok),
    updatedAt: data.updatedAt,
  };
}
