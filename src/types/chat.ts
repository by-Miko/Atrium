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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
