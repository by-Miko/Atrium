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

export interface VisualStudioSettings {
  fontFamily: ChatFontFamily;
  textSize: ChatTextSize;
  glassOpacity: number;
  customUserBubbleColor?: string;
  customDialogueColor?: string;
  customActionColor?: string;
}
