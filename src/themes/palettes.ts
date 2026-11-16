import type { CSSProperties } from 'react';
import type {
  BubbleSchemeId,
  ChatFontFamily,
  ChatTextSize,
  ThemeId,
  VisualStudioSettings,
} from '../types/chat';

export interface ThemePalette {
  id: ThemeId;
  swatches: [string, string, string];
  vars: {
    bg: string;
    panelBg: string;
    glass: string;
    glassHover: string;
    glassStrong: string;
    accent: string;
    accentHover: string;
    accentSoft: string;
    onAccent: string;
    border: string;
    text: string;
    muted: string;
    scrimTint: string;
  };
}

export interface BubbleScheme {
  id: BubbleSchemeId;
  swatches: [string, string];
  userBaseHex: string;
  userBorderHex: string;
  assistantBaseHex: string;
  assistantBorderHex: string;
  vars: {
    userBg: string;
    userBorder: string;
    assistantBg: string;
    assistantBorder: string;
  };
}

export const DEFAULT_VISUAL_STUDIO_SETTINGS: VisualStudioSettings = {
  fontFamily: 'sans',
  textSize: 'md',
  glassOpacity: 66,
};

export const DEFAULT_DIALOGUE_COLOR = '#FFFFFF';
export const DEFAULT_ASSISTANT_ACTION_COLOR = '#E7D8B6';
export const DEFAULT_USER_ACTION_COLOR = '#E2DAFF';

const FONT_FAMILY_STACKS: Record<ChatFontFamily, string> = {
  sans: '"Inter", "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", Cambria, serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

const TEXT_SIZE_VALUES: Record<ChatTextSize, string> = {
  sm: '13.5px',
  md: '15px',
  lg: '16.5px',
  xl: '18px',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isValidHexColor(value: string | undefined): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `rgba(109, 40, 217, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
}

export const THEME_PALETTES: Record<ThemeId, ThemePalette> = {
  'obsidian-violet': {
    id: 'obsidian-violet',
    swatches: ['#0B0A12', '#261D42', '#A78BFA'],
    vars: {
      bg: '#0A0910',
      panelBg: 'rgba(14, 12, 22, 0.84)',
      glass: 'rgba(20, 17, 34, 0.62)',
      glassHover: 'rgba(32, 26, 52, 0.74)',
      glassStrong: 'rgba(20, 17, 32, 0.92)',
      accent: '#A78BFA',
      accentHover: '#C4B5FD',
      accentSoft: 'rgba(167, 139, 250, 0.16)',
      onAccent: '#140B29',
      border: 'rgba(196, 181, 253, 0.16)',
      text: '#F1EEF9',
      muted: '#ABA3C2',
      scrimTint: 'rgba(10, 8, 18, 0.34)',
    },
  },
  'midnight-crimson': {
    id: 'midnight-crimson',
    swatches: ['#0E080A', '#3B1520', '#FB7185'],
    vars: {
      bg: '#0C0709',
      panelBg: 'rgba(19, 11, 14, 0.85)',
      glass: 'rgba(28, 15, 20, 0.62)',
      glassHover: 'rgba(44, 22, 29, 0.74)',
      glassStrong: 'rgba(26, 14, 18, 0.92)',
      accent: '#FB7185',
      accentHover: '#FDA4AF',
      accentSoft: 'rgba(251, 113, 133, 0.16)',
      onAccent: '#2B0711',
      border: 'rgba(253, 164, 175, 0.16)',
      text: '#FAF0F2',
      muted: '#C4A5AD',
      scrimTint: 'rgba(16, 7, 11, 0.34)',
    },
  },
  'cyber-emerald': {
    id: 'cyber-emerald',
    swatches: ['#070D0B', '#113328', '#34D399'],
    vars: {
      bg: '#070C0A',
      panelBg: 'rgba(10, 19, 16, 0.85)',
      glass: 'rgba(13, 26, 22, 0.62)',
      glassHover: 'rgba(20, 40, 33, 0.74)',
      glassStrong: 'rgba(12, 24, 20, 0.92)',
      accent: '#34D399',
      accentHover: '#6EE7B7',
      accentSoft: 'rgba(52, 211, 153, 0.15)',
      onAccent: '#032318',
      border: 'rgba(110, 231, 183, 0.16)',
      text: '#ECFDF7',
      muted: '#9ABCB0',
      scrimTint: 'rgba(6, 14, 11, 0.34)',
    },
  },
};

export const BUBBLE_SCHEMES: Record<BubbleSchemeId, BubbleScheme> = {
  'indigo-violet': {
    id: 'indigo-violet',
    swatches: ['#6D28D9', '#191628'],
    userBaseHex: '#6D28D9',
    userBorderHex: '#A78BFA',
    assistantBaseHex: '#141122',
    assistantBorderHex: '#C4B5FD',
    vars: {
      userBg: 'rgba(109, 40, 217, 0.42)',
      userBorder: 'rgba(167, 139, 250, 0.38)',
      assistantBg: 'rgba(20, 17, 34, 0.66)',
      assistantBorder: 'rgba(196, 181, 253, 0.18)',
    },
  },
  'crimson-rose': {
    id: 'crimson-rose',
    swatches: ['#BE123C', '#241218'],
    userBaseHex: '#BE123C',
    userBorderHex: '#FB7185',
    assistantBaseHex: '#1C0E13',
    assistantBorderHex: '#FDA4AF',
    vars: {
      userBg: 'rgba(190, 18, 60, 0.42)',
      userBorder: 'rgba(251, 113, 133, 0.38)',
      assistantBg: 'rgba(28, 14, 19, 0.66)',
      assistantBorder: 'rgba(253, 164, 175, 0.18)',
    },
  },
  'cyber-emerald': {
    id: 'cyber-emerald',
    swatches: ['#059669', '#0E201B'],
    userBaseHex: '#059669',
    userBorderHex: '#34D399',
    assistantBaseHex: '#0C1A16',
    assistantBorderHex: '#6EE7B7',
    vars: {
      userBg: 'rgba(5, 150, 105, 0.38)',
      userBorder: 'rgba(52, 211, 153, 0.38)',
      assistantBg: 'rgba(12, 26, 22, 0.66)',
      assistantBorder: 'rgba(110, 231, 183, 0.18)',
    },
  },
  'ocean-blue': {
    id: 'ocean-blue',
    swatches: ['#0284C7', '#0F1C2E'],
    userBaseHex: '#0284C7',
    userBorderHex: '#38BDF8',
    assistantBaseHex: '#0D1828',
    assistantBorderHex: '#7DD3FC',
    vars: {
      userBg: 'rgba(2, 132, 199, 0.40)',
      userBorder: 'rgba(56, 189, 248, 0.38)',
      assistantBg: 'rgba(13, 24, 40, 0.66)',
      assistantBorder: 'rgba(125, 211, 252, 0.18)',
    },
  },
  'amber-gold': {
    id: 'amber-gold',
    swatches: ['#D97706', '#211910'],
    userBaseHex: '#D97706',
    userBorderHex: '#FBBF24',
    assistantBaseHex: '#1C160E',
    assistantBorderHex: '#FCD34D',
    vars: {
      userBg: 'rgba(217, 119, 6, 0.38)',
      userBorder: 'rgba(251, 191, 36, 0.38)',
      assistantBg: 'rgba(28, 22, 14, 0.66)',
      assistantBorder: 'rgba(252, 211, 77, 0.18)',
    },
  },
  'minimalist-glass': {
    id: 'minimalist-glass',
    swatches: ['#3F3F46', '#141418'],
    userBaseHex: '#FFFFFF',
    userBorderHex: '#FFFFFF',
    assistantBaseHex: '#0E0E12',
    assistantBorderHex: '#FFFFFF',
    vars: {
      userBg: 'rgba(255, 255, 255, 0.14)',
      userBorder: 'rgba(255, 255, 255, 0.24)',
      assistantBg: 'rgba(14, 14, 18, 0.56)',
      assistantBorder: 'rgba(255, 255, 255, 0.14)',
    },
  },
};

export function getThemeCssVariables(
  themeId: ThemeId,
  bubbleSchemeId: BubbleSchemeId,
  visualSettings: VisualStudioSettings = DEFAULT_VISUAL_STUDIO_SETTINGS
): CSSProperties {
  const palette = THEME_PALETTES[themeId] ?? THEME_PALETTES['obsidian-violet'];
  const bubbles =
    BUBBLE_SCHEMES[bubbleSchemeId] ?? BUBBLE_SCHEMES['indigo-violet'];

  const opacityPct = clamp(
    typeof visualSettings.glassOpacity === 'number'
      ? visualSettings.glassOpacity
      : DEFAULT_VISUAL_STUDIO_SETTINGS.glassOpacity,
    20,
    95
  );
  const assistantAlpha = opacityPct / 100;
  const userAlpha =
    bubbleSchemeId === 'minimalist-glass' &&
    !isValidHexColor(visualSettings.customUserBubbleColor)
      ? clamp(assistantAlpha * 0.3, 0.1, 0.55)
      : clamp(assistantAlpha * 0.72, 0.16, 0.92);

  const hasCustomUser = isValidHexColor(visualSettings.customUserBubbleColor);
  const userBaseHex = hasCustomUser
    ? visualSettings.customUserBubbleColor!
    : bubbles.userBaseHex;
  const userBorderHex = hasCustomUser
    ? visualSettings.customUserBubbleColor!
    : bubbles.userBorderHex;

  const userBg = hexToRgba(userBaseHex, userAlpha);
  const userBorder = hexToRgba(
    userBorderHex,
    clamp(userAlpha * 0.8 + 0.14, 0.2, 0.82)
  );
  const assistantBg = hexToRgba(bubbles.assistantBaseHex, assistantAlpha);
  const assistantBorder = hexToRgba(
    bubbles.assistantBorderHex,
    clamp(assistantAlpha * 0.28 + 0.04, 0.1, 0.4)
  );

  const blurPx = Math.round(8 + (opacityPct / 100) * 20);
  const fontStack =
    FONT_FAMILY_STACKS[visualSettings.fontFamily] ?? FONT_FAMILY_STACKS.sans;
  const textSize =
    TEXT_SIZE_VALUES[visualSettings.textSize] ?? TEXT_SIZE_VALUES.md;

  const dialogueColor = isValidHexColor(visualSettings.customDialogueColor)
    ? visualSettings.customDialogueColor
    : DEFAULT_DIALOGUE_COLOR;

  const assistantActionColor = isValidHexColor(visualSettings.customActionColor)
    ? visualSettings.customActionColor
    : DEFAULT_ASSISTANT_ACTION_COLOR;

  const userActionColor = isValidHexColor(visualSettings.customActionColor)
    ? visualSettings.customActionColor
    : DEFAULT_USER_ACTION_COLOR;

  return {
    '--theme-bg': palette.vars.bg,
    '--theme-panel-bg': palette.vars.panelBg,
    '--theme-glass': palette.vars.glass,
    '--theme-glass-hover': palette.vars.glassHover,
    '--theme-glass-strong': palette.vars.glassStrong,
    '--theme-accent': palette.vars.accent,
    '--theme-accent-hover': palette.vars.accentHover,
    '--theme-accent-soft': palette.vars.accentSoft,
    '--theme-on-accent': palette.vars.onAccent,
    '--theme-border': palette.vars.border,
    '--theme-text': palette.vars.text,
    '--theme-muted': palette.vars.muted,
    '--theme-scrim-tint': palette.vars.scrimTint,
    '--bubble-user-bg': userBg,
    '--bubble-user-border': userBorder,
    '--bubble-assistant-bg': assistantBg,
    '--bubble-assistant-border': assistantBorder,
    '--chat-glass-blur': `${blurPx}px`,
    '--chat-font-family': fontStack,
    '--chat-font-size': textSize,
    '--chat-dialogue-color': dialogueColor,
    '--chat-action-color': assistantActionColor,
    '--chat-user-action-color': userActionColor,
  } as CSSProperties;
}
