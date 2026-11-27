import type {
  MemoryTierId,
  PocketAiLocalModelRecord,
  PocketAiLoopbackPreset,
  PocketAiMode,
  PocketAiModelSpec,
  PocketAiRuntimeState,
} from '../types/chat';
import { idbGet, idbSet } from './storage';

export const POCKET_AI_CONFIG_KEY = 'atrium_pocket_ai_config_v1';
export const POCKET_AI_MODELS_IDB_KEY = 'atrium.pocketAiModels.v1';

// 4-byte "GGUF" magic bytes: 0x47 0x47 0x55 0x46
const GGUF_MAGIC_BYTES = [0x47, 0x47, 0x55, 0x46] as const;

export const POCKET_AI_LOOPBACK_ENDPOINTS: Record<
  PocketAiLoopbackPreset,
  {
    provider: 'ollama' | 'openai';
    baseUrl: string;
    label: string;
    port: number;
  }
> = {
  ollama: {
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    label: 'Ollama Loopback (127.0.0.1:11434)',
    port: 11434,
  },
  'llama-cpp': {
    provider: 'openai',
    baseUrl: 'http://127.0.0.1:8080/v1',
    label: 'llama.cpp Server (127.0.0.1:8080/v1)',
    port: 8080,
  },
};

export const POCKET_AI_CATALOG: PocketAiModelSpec[] = [
  {
    id: 'qwen2.5-1.5b-instruct-q4_k_m',
    name: 'Qwen 2.5 1.5B Instruct',
    paramsLabel: '1.5B',
    quantization: 'Q4_K_M',
    downloadSizeMb: 1120,
    estimatedRamMb: 1450,
    tier: 'compact',
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    descriptionEn:
      'Ultra-lightweight roleplay & dialogue model tuned for 4–6 GB RAM phones.',
    descriptionEs:
      'Modelo ultraligero de rol y diálogo optimizado para teléfonos de 4–6 GB RAM.',
  },
  {
    id: 'gemma-2-2b-it-q4_k_m',
    name: 'Gemma 2 2B Instruct',
    paramsLabel: '2B',
    quantization: 'Q4_K_M',
    downloadSizeMb: 1580,
    estimatedRamMb: 1950,
    tier: 'compact',
    downloadUrl:
      'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    descriptionEn:
      'Crisp literary phrasing with low thermal footprint on mid-range SoCs.',
    descriptionEs:
      'Redacción narrativa nítida con bajo consumo térmico en procesadores medios.',
  },
  {
    id: 'qwen2.5-3b-instruct-q4_k_m',
    name: 'Qwen 2.5 3B Instruct',
    paramsLabel: '3B',
    quantization: 'Q4_K_M',
    downloadSizeMb: 2050,
    estimatedRamMb: 2550,
    tier: 'performance',
    downloadUrl:
      'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    descriptionEn:
      'Strong long-context roleplay memory for 8–12+ GB RAM flagship devices.',
    descriptionEs:
      'Excelente retención de contexto para dispositivos de 8–12+ GB RAM.',
  },
  {
    id: 'llama-3.2-3b-instruct-q4_k_m',
    name: 'Llama 3.2 3B Instruct',
    paramsLabel: '3B',
    quantization: 'Q4_K_M',
    downloadSizeMb: 2020,
    estimatedRamMb: 2480,
    tier: 'performance',
    downloadUrl:
      'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    descriptionEn:
      'Natural conversational pacing and fast token throughput on Snapdragon/Dimensity.',
    descriptionEs:
      'Ritmo conversacional natural y alta velocidad de tokens en Snapdragon/Dimensity.',
  },
];

export function validateGgufMagicHeader(bytes: ArrayBuffer | Uint8Array): boolean {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < 4) return false;
  return (
    view[0] === GGUF_MAGIC_BYTES[0] &&
    view[1] === GGUF_MAGIC_BYTES[1] &&
    view[2] === GGUF_MAGIC_BYTES[2] &&
    view[3] === GGUF_MAGIC_BYTES[3]
  );
}

export function isAllowedHuggingFaceUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'huggingface.co' ||
      host.endsWith('.huggingface.co') ||
      host === 'hf.co' ||
      host.endsWith('.hf.co')
    );
  } catch {
    return false;
  }
}

export function resolveMemoryTier(deviceMemoryGb: number): {
  tier: MemoryTierId;
  autoUnloadDelaySec: number;
} {
  if (deviceMemoryGb <= 6) {
    return {
      tier: 'compact',
      autoUnloadDelaySec: 10,
    };
  }
  return {
    tier: 'performance',
    autoUnloadDelaySec: 30,
  };
}

export function readSyncDeviceMemory(): {
  deviceMemoryGb: number;
  measured: boolean;
} {
  if (typeof navigator !== 'undefined') {
    const navWithMem = navigator as Navigator & { deviceMemory?: number };
    if (
      typeof navWithMem.deviceMemory === 'number' &&
      Number.isFinite(navWithMem.deviceMemory) &&
      navWithMem.deviceMemory > 0
    ) {
      return {
        deviceMemoryGb: navWithMem.deviceMemory,
        measured: true,
      };
    }
  }
  return {
    deviceMemoryGb: 6,
    measured: false,
  };
}

export async function inspectDeviceMemoryTier(): Promise<{
  deviceMemoryGb: number;
  measured: boolean;
  recommendedTier: MemoryTierId;
  autoUnloadDelaySec: number;
}> {
  const nativeMemFn =
    typeof window !== 'undefined'
      ? window.Capacitor?.Plugins?.AtriumLocalAi?.getDeviceMemoryGb
      : undefined;
  if (nativeMemFn) {
    try {
      const result = await nativeMemFn();
      if (
        typeof result?.totalGb === 'number' &&
        Number.isFinite(result.totalGb) &&
        result.totalGb > 0
      ) {
        const rounded = Math.round(result.totalGb * 10) / 10;
        const resolved = resolveMemoryTier(rounded);
        return {
          deviceMemoryGb: rounded,
          measured: true,
          recommendedTier: resolved.tier,
          autoUnloadDelaySec: resolved.autoUnloadDelaySec,
        };
      }
    } catch {
      // fall through to browser navigator.deviceMemory
    }
  }

  const sync = readSyncDeviceMemory();
  const resolved = resolveMemoryTier(sync.deviceMemoryGb);
  return {
    deviceMemoryGb: sync.deviceMemoryGb,
    measured: sync.measured,
    recommendedTier: resolved.tier,
    autoUnloadDelaySec: resolved.autoUnloadDelaySec,
  };
}

export function isNativePocketAiBridgeAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const plugin = window.Capacitor?.Plugins?.AtriumLocalAi;
  return Boolean(
    plugin &&
      (typeof plugin.loadModel === 'function' ||
        typeof plugin.generateChat === 'function')
  );
}

export function loadSavedPocketAiConfig(): {
  mode: PocketAiMode;
  loopbackPreset: PocketAiLoopbackPreset;
} {
  if (typeof window === 'undefined') {
    return { mode: 'embedded-gguf', loopbackPreset: 'ollama' };
  }
  try {
    const raw = window.localStorage.getItem(POCKET_AI_CONFIG_KEY);
    if (!raw) {
      return { mode: 'embedded-gguf', loopbackPreset: 'ollama' };
    }
    const parsed = JSON.parse(raw) as {
      mode?: string;
      loopbackPreset?: string;
    };
    return {
      mode:
        parsed.mode === 'local-loopback' ? 'local-loopback' : 'embedded-gguf',
      loopbackPreset:
        parsed.loopbackPreset === 'llama-cpp' ? 'llama-cpp' : 'ollama',
    };
  } catch {
    return { mode: 'embedded-gguf', loopbackPreset: 'ollama' };
  }
}

export function savePocketAiConfig(config: {
  mode: PocketAiMode;
  loopbackPreset: PocketAiLoopbackPreset;
}): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POCKET_AI_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
}

export async function loadInstalledPocketAiModels(): Promise<
  PocketAiLocalModelRecord[]
> {
  const saved = await idbGet<PocketAiLocalModelRecord[]>(
    POCKET_AI_MODELS_IDB_KEY
  );
  if (!Array.isArray(saved)) return [];
  return saved.filter(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.filename === 'string' &&
      item.verifiedGguf === true
  );
}

export async function saveInstalledPocketAiModels(
  models: PocketAiLocalModelRecord[]
): Promise<void> {
  await idbSet(POCKET_AI_MODELS_IDB_KEY, models);
}

export async function verifyAndImportLocalGgufFile(
  file: File
): Promise<PocketAiLocalModelRecord> {
  if (!file || file.size < 64) {
    throw new Error('Selected file is too small to be a valid GGUF model.');
  }
  const headerBuf = await file.slice(0, 4).arrayBuffer();
  if (!validateGgufMagicHeader(headerBuf)) {
    throw new Error(
      'Invalid GGUF binary: missing 4-byte "GGUF" magic header (0x47 0x47 0x55 0x46).'
    );
  }

  const sizeMb = Math.round(file.size / (1024 * 1024));
  const estimatedRamMb = Math.max(512, Math.round(sizeMb * 1.25));
  const cleanName = file.name.replace(/\.gguf$/i, '');

  return {
    id: `local-${cleanName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`,
    name: cleanName,
    filename: file.name,
    sizeBytes: file.size,
    estimatedRamMb,
    source: 'imported',
    verifiedGguf: true,
    addedAt: Date.now(),
  };
}

export interface PocketAiDownloadProgress {
  receivedBytes: number;
  totalBytes: number;
  percent: number;
  verifiedHeader: boolean;
}

export async function downloadAndVerifyPocketAiModel(
  spec: PocketAiModelSpec,
  onProgress: (progress: PocketAiDownloadProgress) => void,
  signal?: AbortSignal
): Promise<PocketAiLocalModelRecord> {
  if (!isAllowedHuggingFaceUrl(spec.downloadUrl)) {
    throw new Error(
      'Blocked unsafe model download URL. Only https://huggingface.co URLs are permitted.'
    );
  }

  const nativePlugin =
    typeof window !== 'undefined'
      ? window.Capacitor?.Plugins?.AtriumLocalAi
      : undefined;

  if (nativePlugin?.downloadModel) {
    let listenerHandle: { remove: () => Promise<void> | void } | undefined;
    if (nativePlugin.addListener) {
      listenerHandle = await nativePlugin.addListener(
        'downloadProgress',
        (payload) => {
          const received =
            typeof payload.receivedBytes === 'number' ? payload.receivedBytes : 0;
          const total =
            typeof payload.totalBytes === 'number' && payload.totalBytes > 0
              ? payload.totalBytes
              : spec.downloadSizeMb * 1024 * 1024;
          const percent = Math.min(
            100,
            Math.max(0, Math.round((received / total) * 100))
          );
          onProgress({
            receivedBytes: received,
            totalBytes: total,
            percent,
            verifiedHeader: true,
          });
        }
      );
    }

    try {
      const res = await nativePlugin.downloadModel({
        id: spec.id,
        url: spec.downloadUrl,
        filename: spec.filename,
      });
      if (!res?.ok) {
        throw new Error(res?.error || 'Native GGUF download failed.');
      }
      return {
        id: spec.id,
        name: spec.name,
        filename: spec.filename,
        sizeBytes:
          typeof res.sizeBytes === 'number'
            ? res.sizeBytes
            : spec.downloadSizeMb * 1024 * 1024,
        estimatedRamMb: spec.estimatedRamMb,
        source: 'native',
        verifiedGguf: true,
        addedAt: Date.now(),
      };
    } finally {
      await listenerHandle?.remove?.();
    }
  }

  const response = await fetch(spec.downloadUrl, {
    method: 'GET',
    mode: 'cors',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Hugging Face download failed (HTTP ${response.status}).`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const expectedTotal =
    contentLengthHeader && Number.isFinite(Number(contentLengthHeader))
      ? Number(contentLengthHeader)
      : spec.downloadSizeMb * 1024 * 1024;

  if (!response.body) {
    throw new Error('Download stream unavailable in this browser.');
  }

  const reader = response.body.getReader();
  let receivedBytes = 0;
  let verifiedHeader = false;
  const headerChunks: Uint8Array[] = [];
  let headerBytesCount = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      receivedBytes += value.byteLength;

      if (!verifiedHeader) {
        headerChunks.push(value);
        headerBytesCount += value.byteLength;
        if (headerBytesCount >= 4) {
          const combined = new Uint8Array(4);
          let offset = 0;
          for (const chunk of headerChunks) {
            const take = Math.min(4 - offset, chunk.byteLength);
            combined.set(chunk.subarray(0, take), offset);
            offset += take;
            if (offset >= 4) break;
          }
          if (!validateGgufMagicHeader(combined)) {
            await reader.cancel().catch(() => {});
            throw new Error(
              'Download rejected: remote file is missing the 4-byte GGUF magic header.'
            );
          }
          verifiedHeader = true;
          headerChunks.length = 0;
        }
      }

      const percent = Math.min(
        100,
        Math.max(0, Math.round((receivedBytes / Math.max(1, expectedTotal)) * 100))
      );
      onProgress({
        receivedBytes,
        totalBytes: expectedTotal,
        percent,
        verifiedHeader,
      });
    }
  } finally {
    reader.releaseLock();
  }

  if (!verifiedHeader) {
    throw new Error(
      'Incomplete download: could not verify 4-byte GGUF magic header.'
    );
  }

  return {
    id: spec.id,
    name: spec.name,
    filename: spec.filename,
    sizeBytes: receivedBytes,
    estimatedRamMb: spec.estimatedRamMb,
    source: 'downloaded',
    verifiedGguf: true,
    addedAt: Date.now(),
  };
}

export async function loadNativePocketAiModel(
  model: PocketAiLocalModelRecord,
  contextLength = 4096
): Promise<{ ok: boolean; estimatedRamMb: number; simulated: boolean }> {
  const nativePlugin =
    typeof window !== 'undefined'
      ? window.Capacitor?.Plugins?.AtriumLocalAi
      : undefined;

  if (nativePlugin?.loadModel) {
    const res = await nativePlugin.loadModel({
      id: model.id,
      filename: model.filename,
      contextLength,
    });
    if (!res?.ok) {
      throw new Error(res?.error || 'Failed to load GGUF model in native runtime.');
    }
    return {
      ok: true,
      estimatedRamMb:
        typeof res.estimatedRamMb === 'number'
          ? res.estimatedRamMb
          : model.estimatedRamMb,
      simulated: false,
    };
  }

  return {
    ok: true,
    estimatedRamMb: model.estimatedRamMb,
    simulated: true,
  };
}

export async function unloadNativePocketAiModel(): Promise<void> {
  const nativePlugin =
    typeof window !== 'undefined'
      ? window.Capacitor?.Plugins?.AtriumLocalAi
      : undefined;
  if (nativePlugin?.unloadModel) {
    await nativePlugin.unloadModel().catch(() => {});
  }
}

export function createInitialPocketAiRuntimeState(): PocketAiRuntimeState {
  const savedConfig = loadSavedPocketAiConfig();
  const syncMem = readSyncDeviceMemory();
  const resolved = resolveMemoryTier(syncMem.deviceMemoryGb);

  return {
    mode: savedConfig.mode,
    loopbackPreset: savedConfig.loopbackPreset,
    deviceMemoryGb: syncMem.deviceMemoryGb,
    memoryMeasured: syncMem.measured,
    recommendedTier: resolved.tier,
    activeModelId: null,
    activeModelName: null,
    isModelLoaded: false,
    estimatedActiveRamMb: 0,
    autoUnloadDelaySec: resolved.autoUnloadDelaySec,
    lastAutoUnloadAt: null,
    nativeBridgeAvailable: isNativePocketAiBridgeAvailable(),
  };
}
