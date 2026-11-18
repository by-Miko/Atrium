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
  orbColors: [string, string, string];
  vars: {
    bg: string;
    panelBg: string;
    glass: string;
    glassHover: string;
    glassStrong: string;
    stagePillBg: string;
    stageComposerBg: string;
    modalBackdrop: string;
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
  userAlpha: number;
  userBorderHex: string;
  userBorderAlpha: number;
  assistantBaseHex: string;
  assistantAlpha: number;
  assistantBorderHex: string;
  assistantBorderAlpha: number;
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

export const DEFAULT_DIALOGUE_COLOR = '#F1F5F9';
export const DEFAULT_ASSISTANT_ACTION_COLOR = '#CBD5E1';
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
    orbColors: ['#6d28d9', '#4c1d95', '#1e1b4b'],
    vars: {
      bg: '#0A0910',
      panelBg: 'rgba(14, 12, 22, 0.84)',
      glass: 'rgba(20, 17, 36, 0.56)',
      glassHover: 'rgba(34, 26, 58, 0.72)',
      glassStrong: 'rgba(18, 15, 32, 0.88)',
      stagePillBg: 'rgba(18, 15, 34, 0.36)',
      stageComposerBg: 'rgba(18, 15, 34, 0.42)',
      modalBackdrop: 'rgba(8, 6, 18, 0.68)',
      accent: '#A78BFA',
      accentHover: '#C4B5FD',
      accentSoft: 'rgba(167, 139, 250, 0.16)',
      onAccent: '#140B29',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#F1EEF9',
      muted: '#ABA3C2',
      scrimTint: 'rgba(10, 8, 18, 0.34)',
    },
  },
  'midnight-crimson': {
    id: 'midnight-crimson',
    swatches: ['#0E080A', '#3B1520', '#FB7185'],
    orbColors: ['#9f1239', '#881337', '#27121a'],
    vars: {
      bg: '#0C0709',
      panelBg: 'rgba(19, 11, 14, 0.85)',
      glass: 'rgba(32, 13, 20, 0.56)',
      glassHover: 'rgba(50, 19, 30, 0.72)',
      glassStrong: 'rgba(24, 10, 16, 0.88)',
      stagePillBg: 'rgba(28, 12, 18, 0.38)',
      stageComposerBg: 'rgba(28, 12, 18, 0.44)',
      modalBackdrop: 'rgba(14, 5, 9, 0.68)',
      accent: '#FB7185',
      accentHover: '#FDA4AF',
      accentSoft: 'rgba(251, 113, 133, 0.16)',
      onAccent: '#2B0711',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#FAF0F2',
      muted: '#C4A5AD',
      scrimTint: 'rgba(16, 7, 11, 0.34)',
    },
  },
  'cyber-emerald': {
    id: 'cyber-emerald',
    swatches: ['#070D0B', '#113328', '#34D399'],
    orbColors: ['#059669', '#0f766e', '#042f2e'],
    vars: {
      bg: '#070C0A',
      panelBg: 'rgba(10, 19, 16, 0.85)',
      glass: 'rgba(10, 26, 22, 0.56)',
      glassHover: 'rgba(16, 42, 34, 0.72)',
      glassStrong: 'rgba(8, 21, 17, 0.88)',
      stagePillBg: 'rgba(9, 24, 19, 0.38)',
      stageComposerBg: 'rgba(9, 24, 19, 0.44)',
      modalBackdrop: 'rgba(4, 12, 10, 0.68)',
      accent: '#34D399',
      accentHover: '#6EE7B7',
      accentSoft: 'rgba(52, 211, 153, 0.15)',
      onAccent: '#032318',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#ECFDF7',
      muted: '#9ABCB0',
      scrimTint: 'rgba(6, 14, 11, 0.34)',
    },
  },
};

export const BUBBLE_SCHEMES: Record<BubbleSchemeId, BubbleScheme> = {
  'indigo-violet': {
    id: 'indigo-violet',
    swatches: ['#6366F1', '#141122'],
    userBaseHex: '#6366F1',
    userAlpha: 0.3,
    userBorderHex: '#A78BFA',
    userBorderAlpha: 0.34,
    assistantBaseHex: '#0F172A',
    assistantAlpha: 0.34,
    assistantBorderHex: '#C4B5FD',
    assistantBorderAlpha: 0.18,
    vars: {
      userBg: 'rgba(99, 102, 241, 0.30)',
      userBorder: 'rgba(167, 139, 250, 0.34)',
      assistantBg: 'rgba(15, 23, 42, 0.34)',
      assistantBorder: 'rgba(196, 181, 253, 0.18)',
    },
  },
  'crimson-rose': {
    id: 'crimson-rose',
    swatches: ['#BE123C', '#1C0E13'],
    userBaseHex: '#BE123C',
    userAlpha: 0.3,
    userBorderHex: '#FB7185',
    userBorderAlpha: 0.34,
    assistantBaseHex: '#1C0E13',
    assistantAlpha: 0.4,
    assistantBorderHex: '#FDA4AF',
    assistantBorderAlpha: 0.18,
    vars: {
      userBg: 'rgba(190, 18, 60, 0.30)',
      userBorder: 'rgba(251, 113, 133, 0.34)',
      assistantBg: 'rgba(28, 14, 19, 0.40)',
      assistantBorder: 'rgba(253, 164, 175, 0.18)',
    },
  },
  'cyber-emerald': {
    id: 'cyber-emerald',
    swatches: ['#059669', '#092019'],
    userBaseHex: '#059669',
    userAlpha: 0.28,
    userBorderHex: '#34D399',
    userBorderAlpha: 0.34,
    assistantBaseHex: '#092019',
    assistantAlpha: 0.38,
    assistantBorderHex: '#6EE7B7',
    assistantBorderAlpha: 0.18,
    vars: {
      userBg: 'rgba(5, 150, 105, 0.28)',
      userBorder: 'rgba(52, 211, 153, 0.34)',
      assistantBg: 'rgba(9, 32, 25, 0.38)',
      assistantBorder: 'rgba(110, 231, 183, 0.18)',
    },
  },
  'ocean-blue': {
    id: 'ocean-blue',
    swatches: ['#2563EB', '#0F172A'],
    userBaseHex: '#2563EB',
    userAlpha: 0.28,
    userBorderHex: '#60A5FA',
    userBorderAlpha: 0.34,
    assistantBaseHex: '#0F172A',
    assistantAlpha: 0.34,
    assistantBorderHex: '#93C5FD',
    assistantBorderAlpha: 0.18,
    vars: {
      userBg: 'rgba(37, 99, 235, 0.28)',
      userBorder: 'rgba(96, 165, 250, 0.34)',
      assistantBg: 'rgba(15, 23, 42, 0.34)',
      assistantBorder: 'rgba(147, 197, 253, 0.18)',
    },
  },
  'amber-gold': {
    id: 'amber-gold',
    swatches: ['#D97706', '#291C12'],
    userBaseHex: '#D97706',
    userAlpha: 0.28,
    userBorderHex: '#FBBF24',
    userBorderAlpha: 0.36,
    assistantBaseHex: '#291C12',
    assistantAlpha: 0.42,
    assistantBorderHex: '#FBBF24',
    assistantBorderAlpha: 0.24,
    vars: {
      userBg: 'rgba(217, 119, 6, 0.28)',
      userBorder: 'rgba(251, 191, 36, 0.36)',
      assistantBg: 'rgba(41, 28, 18, 0.42)',
      assistantBorder: 'rgba(251, 191, 36, 0.24)',
    },
  },
  'minimalist-glass': {
    id: 'minimalist-glass',
    swatches: ['#52525B', '#0F172A'],
    userBaseHex: '#FFFFFF',
    userAlpha: 0.08,
    userBorderHex: '#FFFFFF',
    userBorderAlpha: 0.18,
    assistantBaseHex: '#0F172A',
    assistantAlpha: 0.28,
    assistantBorderHex: '#FFFFFF',
    assistantBorderAlpha: 0.14,
    vars: {
      userBg: 'rgba(255, 255, 255, 0.08)',
      userBorder: 'rgba(255, 255, 255, 0.18)',
      assistantBg: 'rgba(15, 23, 42, 0.28)',
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
  const opacityScale = opacityPct / DEFAULT_VISUAL_STUDIO_SETTINGS.glassOpacity;

  const hasCustomUser = isValidHexColor(visualSettings.customUserBubbleColor);
  const userBaseHex = hasCustomUser
    ? visualSettings.customUserBubbleColor!
    : bubbles.userBaseHex;
  const userBorderHex = hasCustomUser
    ? visualSettings.customUserBubbleColor!
    : bubbles.userBorderHex;

  const baseUserAlpha = hasCustomUser ? 0.3 : bubbles.userAlpha;
  const userAlpha =
    bubbleSchemeId === 'minimalist-glass' && !hasCustomUser
      ? clamp(baseUserAlpha * opacityScale, 0.04, 0.36)
      : clamp(baseUserAlpha * opacityScale, 0.12, 0.85);
  const userBorderAlpha = clamp(
    (hasCustomUser ? 0.36 : bubbles.userBorderAlpha) *
      (0.75 + 0.25 * opacityScale),
    0.14,
    0.72
  );

  const assistantAlpha = clamp(bubbles.assistantAlpha * opacityScale, 0.14, 0.88);
  const assistantBorderAlpha = clamp(
    bubbles.assistantBorderAlpha * (0.75 + 0.25 * opacityScale),
    0.1,
    0.48
  );

  const userBg = hexToRgba(userBaseHex, userAlpha);
  const userBorder = hexToRgba(userBorderHex, userBorderAlpha);
  const assistantBg = hexToRgba(bubbles.assistantBaseHex, assistantAlpha);
  const assistantBorder = hexToRgba(
    bubbles.assistantBorderHex,
    assistantBorderAlpha
  );

  const blurPx = Math.round(10 + (opacityPct / 100) * 15);
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
    '--theme-stage-pill-bg': palette.vars.stagePillBg,
    '--theme-stage-composer-bg': palette.vars.stageComposerBg,
    '--theme-modal-backdrop': palette.vars.modalBackdrop,
    '--theme-orb-1': palette.orbColors[0],
    '--theme-orb-2': palette.orbColors[1],
    '--theme-orb-3': palette.orbColors[2],
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
