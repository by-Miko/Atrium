import type { ApiProvider, OllamaModelTag } from '../types/chat';
import { getMobileLinkSessionToken } from './mobileSync';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_OPENAI_URL = 'http://localhost:1234/v1';
export const DEFAULT_NUM_PREDICT = 300;
export const DEFAULT_NUM_CTX = 4096;

export type OpenAICompatPresetId =
  | 'lmstudio'
  | 'google'
  | 'anthropic'
  | 'openrouter'
  | 'custom';

export interface OpenAICompatPreset {
  id: Exclude<OpenAICompatPresetId, 'custom'>;
  label: string;
  baseUrl: string;
}

export const OPENAI_COMPAT_PRESETS: OpenAICompatPreset[] = [
  {
    id: 'lmstudio',
    label: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
  },
  {
    id: 'google',
    label: 'Google AI Studio',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
];

export function detectOpenAIPresetId(rawUrl: string): OpenAICompatPresetId {
  const normalized = normalizeBaseUrl(rawUrl, DEFAULT_OPENAI_URL).toLowerCase();
  if (
    normalized === '/v1' ||
    normalized === 'http://127.0.0.1:1234/v1' ||
    normalized === 'http://[::1]:1234/v1'
  ) {
    return 'lmstudio';
  }
  const matched = OPENAI_COMPAT_PRESETS.find(
    (preset) => preset.baseUrl.toLowerCase() === normalized
  );
  return matched ? matched.id : 'custom';
}

export interface UrlValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

function isValidIpv4Host(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function isBlockedMetadataOrLinkLocalHost(rawHostname: string): boolean {
  const host = rawHostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === '0.0.0.0' ||
    host === 'metadata' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  if (isValidIpv4Host(host) && host.startsWith('169.254.')) {
    return true;
  }
  if (host.startsWith('fe80:')) {
    return true;
  }
  return false;
}

function isLocalOrPrivateHttpHost(rawHostname: string): boolean {
  const host = rawHostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '::1'
  ) {
    return true;
  }
  if (!isValidIpv4Host(host)) {
    return false;
  }
  const octets = host.split('.').map(Number);
  const [a, b] = octets;
  if (a === 127) return true; // Loopback 127.0.0.0/8
  if (a === 10) return true; // LAN 10.0.0.0/8
  if (a === 192 && b === 168) return true; // LAN 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // LAN 172.16.0.0/12
  if (a === 100) return true; // Tailscale / CGNAT 100.*
  return false;
}

export function isLocalLoopbackProviderUrl(rawUrl?: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (
    trimmed === '/api' ||
    trimmed === '/' ||
    trimmed === '/v1' ||
    trimmed === '/v1/'
  ) {
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

export function isPublicHttpsProviderUrl(rawUrl?: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('/')) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    if (isBlockedMetadataOrLinkLocalHost(parsed.hostname)) return false;
    if (isLocalOrPrivateHttpHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function validateProviderBaseUrl(
  rawUrl: string,
  fallback = DEFAULT_OLLAMA_URL
): UrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: true, normalized: fallback };
  }

  if (trimmed === '/api' || trimmed === '/') {
    return { valid: true, normalized: '/api' };
  }

  if (trimmed === '/v1' || trimmed === '/v1/') {
    return { valid: true, normalized: '/v1' };
  }

  if (/[\u0000-\u001F\u007F\s]/.test(trimmed)) {
    return {
      valid: false,
      normalized: '',
      error:
        'Invalid Base URL: whitespace or control characters are not permitted.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalized: '',
      error: 'Invalid Base URL: enter a complete http:// or https:// URL.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      normalized: '',
      error: `Blocked unsafe URL protocol "${parsed.protocol}". Only http:// and https:// endpoints are allowed.`,
    };
  }

  if (!parsed.hostname) {
    return {
      valid: false,
      normalized: '',
      error: 'Invalid Base URL: missing hostname.',
    };
  }

  if (isBlockedMetadataOrLinkLocalHost(parsed.hostname)) {
    return {
      valid: false,
      normalized: '',
      error:
        'Blocked unsafe endpoint: link-local and cloud metadata addresses (e.g. 169.254.169.254) are not permitted.',
    };
  }

  if (parsed.protocol === 'http:' && !isLocalOrPrivateHttpHost(parsed.hostname)) {
    return {
      valid: false,
      normalized: '',
      error:
        'Plain http:// is only permitted for localhost, LAN (192.168.*/10.*), or Tailscale (100.*) endpoints. Use https:// for remote APIs.',
    };
  }

  return {
    valid: true,
    normalized: trimmed.replace(/\/+$/, ''),
  };
}

export function assertValidProviderUrl(
  rawUrl: string,
  fallback = DEFAULT_OLLAMA_URL
): string {
  const result = validateProviderBaseUrl(rawUrl, fallback);
  if (!result.valid) {
    throw new Error(
      result.error || 'Only http:// and https:// endpoints are allowed.'
    );
  }
  return result.normalized;
}

export function normalizeBaseUrl(
  rawUrl: string,
  fallback = DEFAULT_OLLAMA_URL
): string {
  const result = validateProviderBaseUrl(rawUrl, fallback);
  return result.valid ? result.normalized : fallback;
}

export function normalizeOllamaUrl(rawUrl: string): string {
  return normalizeBaseUrl(rawUrl, DEFAULT_OLLAMA_URL);
}

function resolveOllamaEndpoint(
  normalizedBaseUrl: string,
  endpointPath: '/api/tags' | '/api/chat'
): string {
  if (normalizedBaseUrl === '/api') {
    return endpointPath;
  }
  return `${normalizedBaseUrl}${endpointPath}`;
}

function isRelativeOrSameOriginUrl(targetUrl: string): boolean {
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
    return true;
  }
  if (typeof window === 'undefined') return false;
  try {
    return (
      new URL(targetUrl, window.location.origin).origin ===
      window.location.origin
    );
  } catch {
    return false;
  }
}

function getMobileLinkRequestOptions(
  targetUrl: string,
  baseHeaders: Record<string, string> = {}
): {
  headers: Record<string, string>;
  credentials?: RequestCredentials;
} {
  if (!isRelativeOrSameOriginUrl(targetUrl)) {
    return { headers: baseHeaders };
  }
  const token = getMobileLinkSessionToken();
  return {
    credentials: 'same-origin',
    headers: token
      ? {
          ...baseHeaders,
          'X-Atrium-Link-Token': token,
        }
      : baseHeaders,
  };
}

export function formatModelSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

function buildOpenAIHeaders(
  baseUrl: string,
  apiKey?: string,
  includeJsonContentType = false
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const trimmedKey = apiKey?.trim();
  if (trimmedKey) {
    headers.Authorization = `Bearer ${trimmedKey}`;
  }
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    if (hostname === 'anthropic.com' || hostname.endsWith('.anthropic.com')) {
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }
  } catch {
    // ignore malformed URL
  }
  return headers;
}

async function extractHttpErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return '';
    try {
      const errBody = JSON.parse(text) as {
        error?: string | { message?: string };
        message?: string;
      };
      if (typeof errBody.error === 'string' && errBody.error) {
        return `: ${errBody.error}`;
      }
      if (
        errBody.error &&
        typeof errBody.error === 'object' &&
        typeof errBody.error.message === 'string' &&
        errBody.error.message
      ) {
        return `: ${errBody.error.message}`;
      }
      if (typeof errBody.message === 'string' && errBody.message) {
        return `: ${errBody.message}`;
      }
    } catch {
      // non-JSON response text
    }
    return `: ${text.slice(0, 220)}`;
  } catch {
    return '';
  }
}

export async function fetchOllamaModels(
  rawUrl: string,
  signal?: AbortSignal
): Promise<OllamaModelTag[]> {
  const baseUrl = assertValidProviderUrl(rawUrl, DEFAULT_OLLAMA_URL);
  const endpoint = resolveOllamaEndpoint(baseUrl, '/api/tags');
  const reqOpts = getMobileLinkRequestOptions(endpoint);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'GET',
      ...(reqOpts.credentials ? { credentials: reqOpts.credentials } : {}),
      ...(Object.keys(reqOpts.headers).length > 0
        ? { headers: reqOpts.headers }
        : {}),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new Error(
      `Could not reach ${baseUrl}. Ensure Ollama is running and CORS allows this origin (OLLAMA_ORIGINS="*").`
    );
  }

  if (!response.ok) {
    const detail = await extractHttpErrorDetail(response);
    throw new Error(`Ollama returned HTTP ${response.status}${detail}`);
  }

  const data = (await response.json()) as { models?: OllamaModelTag[] };
  const models = Array.isArray(data.models) ? data.models : [];

  return models.sort((a, b) => a.name.localeCompare(b.name));
}

interface OpenAIModelItem {
  id?: string;
  name?: string;
  owned_by?: string;
}

export async function fetchOpenAICompatibleModels(
  rawUrl: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<OllamaModelTag[]> {
  const baseUrl = assertValidProviderUrl(rawUrl, DEFAULT_OPENAI_URL);
  const endpoint = `${baseUrl}/models`;
  const reqOpts = getMobileLinkRequestOptions(
    endpoint,
    buildOpenAIHeaders(baseUrl, apiKey, false)
  );
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'GET',
      ...(reqOpts.credentials ? { credentials: reqOpts.credentials } : {}),
      headers: reqOpts.headers,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new Error(
      `Could not reach ${baseUrl}/models. Verify the Base URL, API key, and CORS settings, or enter a model ID manually.`
    );
  }

  if (!response.ok) {
    const detail = await extractHttpErrorDetail(response);
    throw new Error(`API returned HTTP ${response.status}${detail}`);
  }

  const payload = (await response.json()) as
    | { data?: OpenAIModelItem[]; models?: OpenAIModelItem[] }
    | OpenAIModelItem[];

  const rawList: OpenAIModelItem[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.models)
        ? payload.models
        : [];

  const seen = new Set<string>();
  const normalized: OllamaModelTag[] = [];

  for (const item of rawList) {
    const modelId = (item.id || item.name || '').trim();
    if (!modelId || seen.has(modelId)) continue;
    seen.add(modelId);
    normalized.push({
      name: modelId,
      model: modelId,
      details: item.owned_by ? { family: item.owned_by } : undefined,
    });
  }

  return normalized.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchProviderModels(
  provider: ApiProvider,
  rawUrl: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<OllamaModelTag[]> {
  if (provider === 'openai') {
    return fetchOpenAICompatibleModels(rawUrl, apiKey, signal);
  }
  return fetchOllamaModels(rawUrl, signal);
}

export interface StreamChatStats {
  tokensPerSecond?: number;
}

export interface StreamChatParams {
  provider?: ApiProvider;
  baseUrl: string;
  apiKey?: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature: number;
  numPredict?: number;
  numCtx?: number;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onDone?: (stats?: StreamChatStats) => void;
}

interface OllamaChatChunk {
  message?: {
    role?: string;
    content?: string;
  };
  done?: boolean;
  error?: string;
  eval_count?: number;
  eval_duration?: number;
}

export async function streamOllamaChat({
  baseUrl,
  model,
  messages,
  temperature,
  numPredict = DEFAULT_NUM_PREDICT,
  numCtx = DEFAULT_NUM_CTX,
  signal,
  onToken,
  onDone,
}: StreamChatParams): Promise<void> {
  const normalizedUrl = assertValidProviderUrl(baseUrl, DEFAULT_OLLAMA_URL);
  const endpoint = resolveOllamaEndpoint(normalizedUrl, '/api/chat');
  const reqOpts = getMobileLinkRequestOptions(endpoint, {
    'Content-Type': 'application/json',
  });
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      ...(reqOpts.credentials ? { credentials: reqOpts.credentials } : {}),
      headers: reqOpts.headers,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature,
          num_predict: numPredict,
          num_ctx: numCtx,
        },
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new Error(
      `Connection failed to ${endpoint}. Check that Ollama is running and OLLAMA_ORIGINS permits browser requests.`
    );
  }

  if (!response.ok) {
    const detail = await extractHttpErrorDetail(response);
    throw new Error(`Ollama chat error (HTTP ${response.status})${detail}`);
  }

  if (!response.body) {
    throw new Error('Ollama response stream was empty.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let firstTokenTime: number | null = null;
  let chunkCount = 0;

  const computeTokensPerSecond = (chunk?: OllamaChatChunk): number | undefined => {
    if (
      chunk &&
      typeof chunk.eval_count === 'number' &&
      chunk.eval_count > 0 &&
      typeof chunk.eval_duration === 'number' &&
      chunk.eval_duration > 0
    ) {
      const rate = chunk.eval_count / (chunk.eval_duration / 1e9);
      return Math.round(rate * 10) / 10;
    }
    if (firstTokenTime !== null && chunkCount > 1) {
      const elapsedSeconds = (performance.now() - firstTokenTime) / 1000;
      if (elapsedSeconds > 0.05) {
        return Math.round((chunkCount / elapsedSeconds) * 10) / 10;
      }
    }
    return undefined;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        let parsed: OllamaChatChunk;
        try {
          parsed = JSON.parse(line) as OllamaChatChunk;
        } catch {
          continue;
        }

        if (parsed.error) {
          throw new Error(parsed.error);
        }

        if (parsed.message?.content) {
          if (firstTokenTime === null) {
            firstTokenTime = performance.now();
          }
          chunkCount += 1;
          onToken(parsed.message.content);
        }

        if (parsed.done) {
          onDone?.({ tokensPerSecond: computeTokensPerSecond(parsed) });
          return;
        }
      }
    }

    const remaining = buffer.trim();
    let finalChunk: OllamaChatChunk | undefined;
    if (remaining) {
      try {
        const parsed = JSON.parse(remaining) as OllamaChatChunk;
        finalChunk = parsed;
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.message?.content) {
          if (firstTokenTime === null) {
            firstTokenTime = performance.now();
          }
          chunkCount += 1;
          onToken(parsed.message.content);
        }
      } catch (err) {
        if (err instanceof Error && err.message !== remaining) {
          throw err;
        }
      }
    }

    onDone?.({ tokensPerSecond: computeTokensPerSecond(finalChunk) });
  } finally {
    reader.releaseLock();
  }
}

interface OpenAISSEChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
      role?: string;
    };
    message?: {
      content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    completion_tokens?: number;
  };
  error?: string | { message?: string };
}

export async function streamOpenAICompatibleChat({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  numPredict = DEFAULT_NUM_PREDICT,
  signal,
  onToken,
  onDone,
}: StreamChatParams): Promise<void> {
  const normalizedUrl = assertValidProviderUrl(baseUrl, DEFAULT_OPENAI_URL);
  const endpoint = `${normalizedUrl}/chat/completions`;
  const reqOpts = getMobileLinkRequestOptions(
    endpoint,
    buildOpenAIHeaders(normalizedUrl, apiKey, true)
  );
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      ...(reqOpts.credentials ? { credentials: reqOpts.credentials } : {}),
      headers: reqOpts.headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: numPredict,
        stream: true,
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new Error(
      `Connection failed to ${normalizedUrl}/chat/completions. Check the Base URL, API key, network connectivity, and CORS settings.`
    );
  }

  if (!response.ok) {
    const detail = await extractHttpErrorDetail(response);
    throw new Error(`API chat error (HTTP ${response.status})${detail}`);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!response.body || (contentType.includes('application/json') && !contentType.includes('text/event-stream'))) {
    const data = (await response.json()) as OpenAISSEChunk;
    if (data.error) {
      throw new Error(
        typeof data.error === 'string'
          ? data.error
          : data.error.message || 'API returned an error.'
      );
    }
    const fullContent = data.choices?.[0]?.message?.content;
    if (fullContent) {
      onToken(fullContent);
    }
    onDone?.();
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let firstTokenTime: number | null = null;
  let chunkCount = 0;
  let usageCompletionTokens: number | undefined;

  const computeTokensPerSecond = (): number | undefined => {
    if (firstTokenTime === null) return undefined;
    const elapsedSeconds = (performance.now() - firstTokenTime) / 1000;
    if (elapsedSeconds <= 0.05) return undefined;

    if (typeof usageCompletionTokens === 'number' && usageCompletionTokens > 0) {
      return Math.round((usageCompletionTokens / elapsedSeconds) * 10) / 10;
    }
    if (chunkCount > 1) {
      return Math.round((chunkCount / elapsedSeconds) * 10) / 10;
    }
    return undefined;
  };

  const processLine = (rawLine: string): 'done' | 'continue' => {
    const line = rawLine.trim();
    if (!line || line.startsWith(':')) return 'continue';
    if (!line.startsWith('data:')) return 'continue';

    const dataPayload = line.slice(5).trim();
    if (!dataPayload) return 'continue';
    if (dataPayload === '[DONE]') {
      return 'done';
    }

    let parsed: OpenAISSEChunk;
    try {
      parsed = JSON.parse(dataPayload) as OpenAISSEChunk;
    } catch {
      return 'continue';
    }

    if (parsed.error) {
      throw new Error(
        typeof parsed.error === 'string'
          ? parsed.error
          : parsed.error.message || 'API stream returned an error.'
      );
    }

    if (typeof parsed.usage?.completion_tokens === 'number') {
      usageCompletionTokens = parsed.usage.completion_tokens;
    }

    const deltaContent = parsed.choices?.[0]?.delta?.content;
    if (typeof deltaContent === 'string' && deltaContent.length > 0) {
      if (firstTokenTime === null) {
        firstTokenTime = performance.now();
      }
      chunkCount += 1;
      onToken(deltaContent);
    }

    return 'continue';
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (processLine(line) === 'done') {
          onDone?.({ tokensPerSecond: computeTokensPerSecond() });
          return;
        }
      }
    }

    if (buffer.trim()) {
      processLine(buffer);
    }

    onDone?.({ tokensPerSecond: computeTokensPerSecond() });
  } finally {
    reader.releaseLock();
  }
}

export async function streamProviderChat(
  params: StreamChatParams
): Promise<void> {
  if ((params.provider ?? 'ollama') === 'openai') {
    return streamOpenAICompatibleChat(params);
  }
  return streamOllamaChat(params);
}

export interface SummarizeMemoryParams {
  provider?: ApiProvider;
  baseUrl: string;
  apiKey?: string;
  model: string;
  characterName: string;
  userName?: string;
  existingSummary?: string;
  turnsToSummarize: Array<{ role: 'user' | 'assistant'; content: string }>;
  numCtx?: number;
  signal?: AbortSignal;
}

export async function summarizeConversationMemory({
  provider = 'ollama',
  baseUrl,
  apiKey,
  model,
  characterName,
  userName,
  existingSummary,
  turnsToSummarize,
  numCtx = DEFAULT_NUM_CTX,
  signal,
}: SummarizeMemoryParams): Promise<string> {
  if (turnsToSummarize.length === 0 || !model.trim()) {
    return existingSummary?.trim() ?? '';
  }

  const userLabel = userName?.trim() || 'User';
  const transcript = turnsToSummarize
    .map(
      (turn) =>
        `${turn.role === 'user' ? userLabel : characterName}: ${turn.content.trim()}`
    )
    .join('\n\n')
    .slice(0, 8000);

  const systemInstruction =
    'You are a silent story-memory archivist for a roleplay session. Condense the provided events into a compact, factual memory note (under 180 words) in third person. Preserve key plot points, locations, promises, emotional shifts, items, and relationships. Output ONLY the updated memory summary with no preamble, headers, or meta-commentary.';

  const userInstruction = existingSummary?.trim()
    ? `Existing Story Memory:\n${existingSummary.trim()}\n\nNewer Turns to Merge:\n${transcript}\n\nProvide the updated, unified Story Memory:`
    : `Conversation Turns to Archive:\n${transcript}\n\nProvide the compact Story Memory:`;

  let collected = '';
  await streamProviderChat({
    provider,
    baseUrl,
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userInstruction },
    ],
    temperature: 0.25,
    numPredict: 260,
    numCtx,
    signal,
    onToken: (token) => {
      collected += token;
    },
  });

  return collected.trim();
}
