export type CharacterIconId =
  | 'compass'
  | 'orbit'
  | 'flame'
  | 'anchor'
  | 'feather'
  | 'shield'
  | 'scroll'
  | 'eye';

export type CharacterTone =
  | 'cobalt'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'slate';

export type ThemeId =
  | 'obsidian-violet'
  | 'midnight-crimson'
  | 'cyber-emerald';

export type BubbleSchemeId =
  | 'indigo-violet'
  | 'crimson-rose'
  | 'cyber-emerald'
  | 'ocean-blue'
  | 'amber-gold'
  | 'minimalist-glass';

export type Language = 'en' | 'es';

export interface Character {
  id: string;
  name: string;
  role: string;
  bio: string;
  greeting: string;
  systemPrompt: string;
  imageUrl?: string;
  stageBackground?: string;
  wallpaperUrl?: string;
  tags: string[];
  icon: CharacterIconId;
  tone: CharacterTone;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  swipes?: string[];
  activeSwipeIndex?: number;
  createdAt: number;
  model?: string;
  tokensPerSecond?: number;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface StoryMemoryEntry {
  summary: string;
  summarizedMessageCount: number;
  updatedAt: number;
}

export interface OllamaModelTag {
  name: string;
  model?: string;
  size?: number;
  modified_at?: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
}

export type ApiProvider = 'ollama' | 'openai';

export interface OllamaSettings {
  provider?: ApiProvider;
  baseUrl: string;
  openaiBaseUrl?: string;
  apiKey?: string;
  selectedModel: string;
  availableModels: OllamaModelTag[];
  temperature: number;
  numPredict: number;
  numCtx: number;
  storyMemoryEnabled?: boolean;
}

export interface UserPersona {
  name: string;
  appearance: string;
  bio: string;
}

export type WallpaperFitMode = 'cover' | 'contain';

export type ChatFontFamily = 'sans' | 'serif' | 'mono';

export type ChatTextSize = 'sm' | 'md' | 'lg' | 'xl';

export type LobbyBackdropMode = 'orbital-clouds' | 'obsidian-static';

export interface VisualStudioSettings {
  fontFamily: ChatFontFamily;
  textSize: ChatTextSize;
  glassOpacity: number;
  lobbyBackdropMode?: LobbyBackdropMode;
  customUserBubbleColor?: string;
  customDialogueColor?: string;
  customActionColor?: string;
}

export type MeshVpnProvider = 'Tailscale' | 'ZeroTier' | 'NetBird' | 'WireGuard';

export interface MobileLinkUrls {
  lan: string[];
  tailscale: string[];
}

export interface MobileLinkStatus {
  active: boolean;
  port: number | null;
  token: string | null;
  urls: MobileLinkUrls;
  lanUrl?: string | null;
  vpnUrl?: string | null;
  vpnProvider?: MeshVpnProvider | null;
  vpnProviders?: MeshVpnProvider[];
  connectedClients: number;
  lastSyncAt: number | null;
}

export interface MobileSyncPreferences {
  activeCharacterId?: string;
  characterOrder?: string[];
  userPersona?: UserPersona;
  themeId?: ThemeId;
  bubbleSchemeId?: BubbleSchemeId;
  language?: Language;
  wallpaperFit?: WallpaperFitMode;
  parallaxEnabled?: boolean;
  visualSettings?: VisualStudioSettings;
  settings?: {
    provider?: ApiProvider;
    openaiBaseUrl?: string;
    selectedModel?: string;
    availableModels?: OllamaModelTag[];
    temperature?: number;
    numPredict?: number;
    numCtx?: number;
    storyMemoryEnabled?: boolean;
  };
}

export interface MobileSyncStatePayload {
  updatedAt: number;
  characters: Character[];
  chats: Record<string, ChatMessage[]>;
  storyMemory: Record<string, StoryMemoryEntry>;
  preferences: MobileSyncPreferences;
}

export interface ElectronSpeechResult {
  text: string;
  isFinal: boolean;
}

export interface ElectronSpeechError {
  code: string;
  detail?: string;
}

export interface ElectronStartResponse {
  ok: boolean;
  fallbackToWebSpeech?: boolean;
  errorCode?: string;
  detail?: string;
}

export interface ElectronSecretEncryptResponse {
  ok: boolean;
  encrypted?: string;
  fallbackSessionOnly?: boolean;
}

export interface ElectronSecretDecryptResponse {
  ok: boolean;
  plaintext?: string;
}

export interface ElectronAPI {
  isElectron?: boolean;
  platform?: string;
  closeWindow?: () => void;
  startNativeDictation?: (language: Language) => Promise<ElectronStartResponse>;
  stopNativeDictation?: () => Promise<{ ok: boolean }>;
  onDictationResult?: (cb: (payload: ElectronSpeechResult) => void) => () => void;
  onDictationError?: (cb: (payload: ElectronSpeechError) => void) => () => void;
  onDictationEnd?: (cb: () => void) => () => void;
  encryptSecret?: (plaintext: string) => Promise<ElectronSecretEncryptResponse>;
  decryptSecret?: (
    encryptedPayload: string
  ) => Promise<ElectronSecretDecryptResponse>;
  startMobileLink?: (options?: {
    forceRotate?: boolean;
  }) => Promise<MobileLinkStatus>;
  stopMobileLink?: () => Promise<MobileLinkStatus>;
  getMobileLinkStatus?: () => Promise<MobileLinkStatus>;
}

export type SmartRouteType = 'lan' | 'vpn';

export interface MobilePairingProfile {
  lanUrl?: string;
  vpnUrl?: string;
  vpnProvider?: MeshVpnProvider | null;
  hostLabel?: string;
  activeRouteType?: SmartRouteType;
  activeOrigin?: string;
  lastLatencyMs?: number | null;
  updatedAt: number;
}

export interface MobileLinkInfoResponse {
  active: boolean;
  port: number | null;
  lanUrl?: string | null;
  vpnUrl?: string | null;
  vpnProvider?: MeshVpnProvider | null;
  vpnProviders?: MeshVpnProvider[];
  urls?: MobileLinkUrls;
  connectedClients?: number;
  lastSyncAt?: number | null;
}

export type MemoryTierId = 'compact' | 'performance';

export type PocketAiMode = 'embedded-gguf' | 'local-loopback';

export type PocketAiLoopbackPreset = 'ollama' | 'llama-cpp';

export interface PocketAiModelSpec {
  id: string;
  name: string;
  paramsLabel: string;
  quantization: string;
  downloadSizeMb: number;
  estimatedRamMb: number;
  tier: MemoryTierId;
  downloadUrl: string;
  filename: string;
  descriptionEn: string;
  descriptionEs: string;
}

export interface PocketAiLocalModelRecord {
  id: string;
  name: string;
  filename: string;
  sizeBytes: number;
  estimatedRamMb: number;
  source: 'downloaded' | 'imported' | 'native';
  verifiedGguf: boolean;
  addedAt: number;
}

export interface PocketAiRuntimeState {
  mode: PocketAiMode;
  loopbackPreset: PocketAiLoopbackPreset;
  deviceMemoryGb: number;
  memoryMeasured: boolean;
  recommendedTier: MemoryTierId;
  activeModelId: string | null;
  activeModelName: string | null;
  isModelLoaded: boolean;
  estimatedActiveRamMb: number;
  autoUnloadDelaySec: number;
  lastAutoUnloadAt: number | null;
  nativeBridgeAvailable: boolean;
}

export interface CapacitorPluginListenerHandle {
  remove: () => Promise<void> | void;
}

export interface CapacitorBarcodeScanResult {
  hasContent?: boolean;
  content?: string;
  rawValue?: string;
  barcodes?: Array<{ rawValue?: string; displayValue?: string }>;
}

export interface CapacitorAtriumLocalAiPlugin {
  getDeviceMemoryGb?: () => Promise<{ totalGb?: number }>;
  downloadModel?: (options: {
    id: string;
    url: string;
    filename: string;
  }) => Promise<{ ok: boolean; path?: string; sizeBytes?: number; error?: string }>;
  loadModel?: (options: {
    id: string;
    filename?: string;
    contextLength?: number;
  }) => Promise<{ ok: boolean; estimatedRamMb?: number; error?: string }>;
  unloadModel?: () => Promise<{ ok: boolean }>;
  generateChat?: (options: {
    modelId: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<{ text?: string; error?: string }>;
  addListener?: (
    eventName: 'downloadProgress' | 'token' | 'memoryWarning',
    cb: (data: Record<string, unknown>) => void
  ) => Promise<CapacitorPluginListenerHandle> | CapacitorPluginListenerHandle;
}

export interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    App?: {
      addListener?: (
        eventName: 'appStateChange',
        cb: (state: { isActive: boolean }) => void
      ) => Promise<CapacitorPluginListenerHandle> | CapacitorPluginListenerHandle;
    };
    BarcodeScanner?: {
      scan?: () => Promise<CapacitorBarcodeScanResult>;
      startScan?: () => Promise<CapacitorBarcodeScanResult>;
      requestPermissions?: () => Promise<{ camera?: string }>;
    };
    BarcodeScanning?: {
      scan?: () => Promise<CapacitorBarcodeScanResult>;
      requestPermissions?: () => Promise<{ camera?: string }>;
    };
    MLKitBarcodeScanning?: {
      scan?: () => Promise<CapacitorBarcodeScanResult>;
    };
    AtriumLocalAi?: CapacitorAtriumLocalAiPlugin;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    Capacitor?: CapacitorBridge;
  }
}
