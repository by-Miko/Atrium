import {
  Download,
  Eye,
  FileImage,
  LayoutGrid,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  Search,
  Settings,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { UIStrings } from '../i18n/translations';
import type {
  ApiProvider,
  Character,
  Language,
  UserPersona,
} from '../types/chat';
import { sanitizeImageUrl } from '../utils/imageUpload';
import { parsePngCharacterCard } from '../utils/pngCharacterCard';
import { sanitizeRenderedText } from '../utils/sanitize';
import { isWebEdition } from '../utils/webEnvironment';
import { CharacterIcon } from './CharacterIcon';
import { PWAInstallButton } from './PWAInstallButton';

interface AtriumLobbyProps {
  t: UIStrings;
  language?: Language;
  characters: Character[];
  activeCharacterId: string;
  selectedModel: string;
  provider?: ApiProvider;
  ollamaStatus: 'checking' | 'connected' | 'offline';
  isWebDemo?: boolean;
  introDone: boolean;
  userPersona: UserPersona;
  messageCounts: Record<string, number>;
  onEnterScene: (character: Character) => void;
  onOpenCharacterProfile: (character: Character) => void;
  onCreateCharacter: () => void;
  onImportCharacter: (character: Character) => void;
  onEditCharacter: (character: Character) => void;
  onOpenUserPersona: () => void;
  onOpenSettings: () => void;
  onOpenOllamaSetup: () => void;
  mobileLinkActive?: boolean;
  onOpenMobileLink?: () => void;
  onExit: () => void;
}

interface LobbyCardProps {
  t: UIStrings;
  character: Character;
  index: number;
  introDone: boolean;
  isRecent: boolean;
  messageCount: number;
  onEnterScene: () => void;
  onOpenProfile: () => void;
  onEdit: () => void;
}

function LobbyCharacterCard({
  t,
  character,
  index,
  introDone,
  isRecent,
  messageCount,
  onEnterScene,
  onOpenProfile,
  onEdit,
}: LobbyCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const safeImageUrl = sanitizeImageUrl(character.imageUrl);
  const safeName = sanitizeRenderedText(character.name);
  const safeRole = sanitizeRenderedText(character.role);
  const safeBio = sanitizeRenderedText(character.bio);
  const safeTags = character.tags
    .slice(0, 3)
    .map((tag) => sanitizeRenderedText(tag));
  const showImage = Boolean(safeImageUrl) && !imgFailed;

  return (
    <motion.div
      initial={{
        opacity: 0,
        transform: 'translate3d(0, 18px, 0) scale3d(0.97, 0.97, 1)',
      }}
      animate={
        introDone
          ? {
              opacity: 1,
              transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
            }
          : {
              opacity: 0,
              transform: 'translate3d(0, 18px, 0) scale3d(0.97, 0.97, 1)',
            }
      }
      whileHover={{
        transform: 'translate3d(0, -5px, 0) scale3d(1, 1, 1)',
        transition: { duration: 0.2, delay: 0, ease: [0.22, 1, 0.36, 1] },
      }}
      onAnimationComplete={() => {
        if (introDone && !hasEntered) {
          setHasEntered(true);
        }
      }}
      transition={{
        duration: 0.45,
        delay: introDone && !hasEntered ? Math.min(index, 16) * 0.045 : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        willChange: introDone && !hasEntered ? 'transform, opacity' : 'auto',
      }}
      className={`group mobile-card-blur relative aspect-[3/4] overflow-hidden rounded-[20px] border bg-[var(--theme-glass)] backdrop-blur-md transition-all duration-700 ease-in-out sm:aspect-[2/3] sm:rounded-[26px] ${
        isRecent
          ? 'border-white/20 hover:border-amber-300/75 hover:shadow-[0_0_0_1px_rgba(253,230,138,0.35),0_20px_50px_rgba(245,158,11,0.16),0_18px_40px_rgba(0,0,0,0.65)]'
          : 'border-[rgba(255,255,255,0.12)] hover:border-amber-300/70 hover:shadow-[0_0_0_1px_rgba(253,230,138,0.32),0_20px_50px_rgba(245,158,11,0.14),0_18px_40px_rgba(0,0,0,0.6)]'
      }`}
    >
      {showImage ? (
        <img
          src={safeImageUrl}
          alt={safeName}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover object-top transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--theme-accent-soft),transparent_65%),linear-gradient(160deg,#1B1A26,#0B0B11)] p-4">
          <CharacterIcon
            icon={character.icon}
            tone={character.tone}
            size="lg"
          />
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 group-hover:via-black/30 sm:from-black/95 sm:via-black/40 sm:to-black/15"
      />

      {/* Crisp 1px top-left Liquid Glass specular edge highlight + subtle warm-gold rim glow on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[20px] p-[1px] opacity-80 transition-opacity duration-300 group-hover:opacity-0 sm:rounded-[26px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 38%, rgba(255,255,255,0) 70%)',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-inset ring-amber-200/0 transition-all duration-300 group-hover:ring-amber-200/35 sm:rounded-[26px]"
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-1.5 sm:inset-x-4 sm:top-4 sm:gap-2">
        <div className="min-w-0 text-[10px] font-medium text-white/80 drop-shadow sm:text-[11px]">
          {messageCount > 0 ? (
            <span className="tabular-nums text-white/80">
              {messageCount} {messageCount === 1 ? t.msgSingular : t.msgPlural}
            </span>
          ) : null}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile();
            }}
            aria-label={`${t.viewCharacterProfile}: ${safeName}`}
            title={`${t.viewCharacterProfile}: ${safeName}`}
            className="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 opacity-85 backdrop-blur-md transition-all hover:border-amber-300/50 hover:bg-black/75 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`${t.editCharacterTitle}: ${safeName}`}
            title={`${t.editCharacterTitle}: ${safeName}`}
            className="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 opacity-85 backdrop-blur-md transition-all hover:border-amber-300/50 hover:bg-black/75 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onEnterScene}
        className="absolute inset-0 flex touch-manipulation flex-col justify-end p-3.5 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--theme-accent)] sm:p-5"
      >
        {safeTags.length > 0 ? (
          <p className="mb-1.5 hidden truncate text-[11px] font-medium text-[var(--theme-accent)] transition-colors group-hover:text-amber-200 sm:block">
            {safeTags.join(' · ')}
          </p>
        ) : null}

        <h2 className="truncate font-display text-base font-semibold leading-tight text-white sm:text-lg">
          {safeName}
        </h2>

        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-white/75">
          {safeRole}
        </p>

        <p className="mt-2 hidden text-[13px] leading-snug text-white/80 sm:line-clamp-2 sm:block">
          {safeBio}
        </p>
      </button>
    </motion.div>
  );
}

const ALL_TAG_KEY = '__ALL__';

interface MobileLinkDemoModalProps {
  isOpen: boolean;
  isSpanish: boolean;
  onClose: () => void;
}

function MobileLinkDemoModal({
  isOpen,
  isSpanish,
  onClose,
}: MobileLinkDemoModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = isSpanish
    ? 'Atrium Mobile Link (Puente QR)'
    : 'Atrium Mobile Link (QR Bridge)';
  const description = isSpanish
    ? 'No disponible en Modo Demo Web — Mobile Link ejecuta un servidor local HTTP y QR directamente desde tu PC Windows para vincular tu celular por Wi-Fi LAN o Tailscale VPN sin pasar por la nube.'
    : 'Unavailable in Web Demo Mode — Mobile Link runs a local encrypted HTTP & QR server directly from your Windows PC so your phone pairs over Wi-Fi LAN or Tailscale VPN with zero cloud servers.';
  const previewBadge = 'Wi-Fi LAN • Tailscale VPN • Live IndexedDB Sync';
  const downloadLabel = isSpanish
    ? 'Descargar Windows v1.5.0 (.exe)'
    : 'Download Windows v1.5.0 (.exe)';
  const closeLabel = isSpanish ? 'Cerrar' : 'Close';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-link-demo-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.14)] bg-[#0c0e14]/90 shadow-[inset_1px_1px_0_rgba(255,255,255,0.14),0_28px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="mobile-link-demo-modal-title"
                className="font-display text-lg font-semibold text-white"
              >
                {title}
              </h2>
              <p className="mt-0.5 font-mono text-[11px] tracking-wide text-slate-400">
                V1.5.0 Desktop Bridge
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:outline-2 focus-visible:outline-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-zinc-300">{description}</p>

          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <QrCode
              className="h-4 w-4 shrink-0 text-slate-300"
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] text-zinc-300">
              {previewBadge}
            </span>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full bg-white/[0.06] px-4 py-2 text-xs font-medium text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-white/[0.11] hover:text-white focus-visible:outline-2 focus-visible:outline-zinc-300"
          >
            {closeLabel}
          </button>

          <a
            href="https://github.com/by-miko/Atrium/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-zinc-100 px-5 py-2 text-xs font-medium text-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{downloadLabel}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function AtriumLobby({
  t,
  language,
  characters,
  activeCharacterId,
  selectedModel,
  provider = 'ollama',
  ollamaStatus,
  isWebDemo = false,
  introDone,
  userPersona,
  messageCounts,
  onEnterScene,
  onOpenCharacterProfile,
  onCreateCharacter,
  onImportCharacter,
  onEditCharacter,
  onOpenUserPersona,
  onOpenSettings,
  onOpenOllamaSetup,
  mobileLinkActive = false,
  onOpenMobileLink,
  onExit,
}: AtriumLobbyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>(ALL_TAG_KEY);
  const [pngImportError, setPngImportError] = useState<string | null>(null);
  const [isWebMobileModalOpen, setIsWebMobileModalOpen] = useState(false);
  const pngInputRef = useRef<HTMLInputElement | null>(null);
  const webEdition = isWebEdition();
  const isSpanish = language === 'es' || t.mobileLinkButton === 'Móvil';

  const handlePngFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPngImportError(null);
      const imported = await parsePngCharacterCard(file);
      onImportCharacter(imported);
    } catch (err) {
      setPngImportError(
        err instanceof Error
          ? err.message
          : 'Failed to import PNG character card.'
      );
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    characters.forEach((char) => {
      char.tags.forEach((tag) => {
        if (tag.trim()) tagSet.add(tag.trim());
      });
    });
    return [ALL_TAG_KEY, ...Array.from(tagSet).slice(0, 10)];
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return characters.filter((char) => {
      const matchesTag =
        activeTag === ALL_TAG_KEY ||
        char.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase());
      if (!matchesTag) return false;
      if (!q) return true;
      return (
        char.name.toLowerCase().includes(q) ||
        char.role.toLowerCase().includes(q) ||
        char.bio.toLowerCase().includes(q) ||
        char.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        char.systemPrompt.toLowerCase().includes(q)
      );
    });
  }, [characters, searchQuery, activeTag]);

  const hasPersonaName = Boolean(userPersona.name.trim());

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden transition-colors duration-700 ease-in-out"
      style={{
        backgroundColor: 'var(--theme-bg)',
        backgroundImage:
          'radial-gradient(ellipse 80% 55% at 50% -10%, var(--theme-accent-soft), transparent 70%)',
      }}
    >
      {/* Dynamic Theme-Synced Liquid Glass Flow Background (14s–18s continuous swirl) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden sm:block"
      >
        <div
          className="absolute -top-32 -left-24 h-[620px] w-[620px] rounded-full blur-[110px] transition-colors duration-700 ease-in-out"
          style={{
            opacity: 0.34,
            backgroundColor: 'var(--theme-orb-1, #6d28d9)',
            maskImage:
              'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.45) 44%, transparent 74%)',
            WebkitMaskImage:
              'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.45) 44%, transparent 74%)',
            animation: 'liquidOrbDriftA 14s ease-in-out infinite',
            willChange: 'transform, border-radius',
          }}
        />
        <div
          className="absolute top-[14%] right-[-10%] h-[600px] w-[600px] rounded-full blur-[110px] transition-colors duration-700 ease-in-out"
          style={{
            opacity: 0.32,
            backgroundColor: 'var(--theme-orb-2, #4c1d95)',
            maskImage:
              'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.46) 46%, transparent 74%)',
            WebkitMaskImage:
              'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.46) 46%, transparent 74%)',
            animation: 'liquidOrbDriftB 16s ease-in-out infinite',
            willChange: 'transform, border-radius',
          }}
        />
        <div
          className="absolute -bottom-36 left-[24%] h-[640px] w-[640px] rounded-full blur-[110px] transition-colors duration-700 ease-in-out"
          style={{
            opacity: 0.3,
            backgroundColor: 'var(--theme-orb-3, #1e1b4b)',
            maskImage:
              'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.44) 45%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.44) 45%, transparent 75%)',
            animation: 'liquidOrbDriftC 18s ease-in-out infinite',
            willChange: 'transform, border-radius',
          }}
        />
      </div>

      {/* Top Spatial Header */}
      <header className="pt-safe relative z-20 shrink-0 border-b border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] backdrop-blur-2xl transition-colors duration-700 ease-in-out sm:pt-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-8 sm:py-3.5">
          {/* Left: Living Atrium Logo Mark + Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="118 94 276 322"
              fill="none"
              aria-hidden="true"
              className="h-7 w-6 shrink-0 overflow-visible"
            >
              <defs>
                <linearGradient
                  id="lobby-brand-arch"
                  x1="128"
                  y1="96"
                  x2="384"
                  y2="416"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#C4B5FD" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
                <linearGradient
                  id="lobby-shimmer-stroke"
                  x1="156"
                  y1="388"
                  x2="356"
                  y2="120"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#FDE68A" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <path
                d="M156 388V238C156 172.83 200.772 120 256 120C311.228 120 356 172.83 356 238V388"
                stroke="url(#lobby-brand-arch)"
                strokeWidth="34"
                strokeLinecap="round"
              />
              <path
                d="M206 388V252C206 218.863 228.386 192 256 192C283.614 192 306 218.863 306 252V388"
                stroke="#E9E4FA"
                strokeOpacity="0.9"
                strokeWidth="22"
                strokeLinecap="round"
              />
              <circle cx="256" cy="288" r="22" fill="#A78BFA" />

              {/* Periodic luminous left-to-right shimmer sweep every 9s */}
              <motion.path
                d="M156 388V238C156 172.83 200.772 120 256 120C311.228 120 356 172.83 356 238V388"
                stroke="url(#lobby-shimmer-stroke)"
                strokeWidth="34"
                strokeLinecap="round"
                initial={{ pathLength: 0.22, pathOffset: -0.25, opacity: 0 }}
                animate={{
                  pathOffset: [-0.25, 1.05],
                  opacity: [0, 0.95, 0.95, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 7.5,
                  delay: 2.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(253, 230, 138, 0.65))',
                }}
              />
            </svg>
            <span className="font-display text-lg font-semibold tracking-tight text-white whitespace-nowrap">
              {t.appTitle}
            </span>
          </div>

          {/* Right: Liquid Glass Pills (Engine Status, User Persona, Settings, Exit) */}
          <div className="flex items-center gap-1.5 shrink-0 sm:gap-2">
            {isWebDemo ? (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={t.webDemoStatusReady}
                title={t.webDemoStatusReady}
                className="inline-flex h-10 w-10 touch-manipulation items-center justify-center gap-2 rounded-full border border-cyan-400/25 bg-emerald-500/[0.08] px-0 text-xs font-medium text-cyan-100 shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-all duration-700 ease-in-out hover:border-cyan-300/50 hover:bg-cyan-500/[0.14] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 sm:h-9 sm:w-auto sm:px-3"
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                />
                <span className="hidden md:inline">
                  {t.webDemoStatusReady}
                </span>
              </button>
            ) : provider === 'openai' ? (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={
                  selectedModel.trim() ? t.apiStatusReady : t.apiStatusSetup
                }
                title={
                  selectedModel.trim() ? t.apiStatusReady : t.apiStatusSetup
                }
                className={`inline-flex h-10 w-10 touch-manipulation items-center justify-center gap-2 rounded-full border px-0 text-xs font-medium shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-all duration-700 ease-in-out focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 sm:h-9 sm:w-auto sm:px-3 ${
                  selectedModel.trim()
                    ? 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] text-white/90 hover:border-emerald-300/40 hover:bg-[var(--theme-glass-hover)]'
                    : 'border-amber-300/35 bg-amber-500/[0.12] text-amber-100 hover:border-amber-300/65 hover:bg-amber-500/[0.2]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    selectedModel.trim()
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]'
                      : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                  }`}
                />
                <span className="hidden md:inline">
                  {selectedModel.trim() ? t.apiStatusReady : t.apiStatusSetup}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  ollamaStatus === 'offline' ? onOpenOllamaSetup : onOpenSettings
                }
                aria-label={
                  ollamaStatus === 'offline'
                    ? t.ollamaStatusOffline
                    : ollamaStatus === 'connected'
                      ? t.ollamaStatusReady
                      : t.ollamaStatusChecking
                }
                title={
                  ollamaStatus === 'offline'
                    ? t.ollamaStatusOffline
                    : ollamaStatus === 'connected'
                      ? t.ollamaStatusReady
                      : t.ollamaStatusChecking
                }
                className={`inline-flex h-10 w-10 touch-manipulation items-center justify-center gap-2 rounded-full border px-0 text-xs font-medium shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-colors duration-700 ease-in-out focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 sm:h-9 sm:w-auto sm:px-3 ${
                  ollamaStatus === 'offline'
                    ? 'border-amber-300/35 bg-amber-500/[0.12] text-amber-100 hover:border-amber-300/65 hover:bg-amber-500/[0.2]'
                    : ollamaStatus === 'connected'
                      ? 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] text-white/90 hover:border-emerald-300/40 hover:bg-[var(--theme-glass-hover)]'
                      : 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] text-white/75 hover:bg-[var(--theme-glass-hover)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    ollamaStatus === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]'
                      : ollamaStatus === 'offline'
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'animate-pulse bg-white/60'
                  }`}
                />
                <span className="hidden md:inline">
                  {ollamaStatus === 'connected'
                    ? t.ollamaStatusReady
                    : ollamaStatus === 'offline'
                      ? t.ollamaStatusOffline
                      : t.ollamaStatusChecking}
                </span>
              </button>
            )}

            {typeof window !== 'undefined' &&
            Boolean(window.electronAPI?.startMobileLink) &&
            onOpenMobileLink ? (
              <button
                type="button"
                onClick={onOpenMobileLink}
                aria-label={t.mobileLinkTitle}
                title={t.mobileLinkTitle}
                className={`hidden sm:inline-flex h-9 touch-manipulation items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-colors duration-700 ease-in-out focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 ${
                  mobileLinkActive
                    ? 'border-emerald-300/40 bg-emerald-500/[0.14] text-emerald-100 hover:border-emerald-300/65 hover:bg-emerald-500/[0.22]'
                    : 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] text-white/90 hover:bg-[var(--theme-glass-hover)] hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                <span>{t.mobileLinkButton}</span>
                {mobileLinkActive ? (
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                  />
                ) : null}
              </button>
            ) : webEdition ? (
              <button
                type="button"
                onClick={() => setIsWebMobileModalOpen(true)}
                aria-label={t.mobileLinkTitle}
                title={t.mobileLinkTitle}
                className="inline-flex h-10 w-10 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] px-0 text-xs font-medium text-white/90 shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-colors duration-700 ease-in-out hover:bg-[var(--theme-glass-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 sm:h-9 sm:w-auto sm:px-3"
              >
                <Smartphone className="h-4 w-4 text-[var(--theme-accent)] sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{t.mobileLinkButton}</span>
              </button>
            ) : null}

            <PWAInstallButton t={t} compact />

            <button
              type="button"
              onClick={onOpenUserPersona}
              aria-label={t.userPersonaTooltip}
              title={t.userPersonaTooltip}
              className={`inline-flex h-10 w-10 touch-manipulation items-center justify-center gap-1.5 rounded-full border px-0 text-xs font-medium shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-colors duration-700 ease-in-out focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 sm:h-9 sm:w-auto sm:px-3.5 ${
                hasPersonaName
                  ? 'border-[var(--theme-accent)]/45 bg-[var(--theme-accent-soft)] text-white hover:border-[var(--theme-accent)]'
                  : 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] text-white/85 hover:bg-[var(--theme-glass-hover)] hover:text-white'
              }`}
            >
              <User className="h-4 w-4 text-[var(--theme-accent)] sm:h-3.5 sm:w-3.5" />
              <span className="hidden max-w-[110px] truncate sm:inline">
                {t.userPersonaBadgeLabel(userPersona.name)}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label={t.settingsButton}
              title={t.settingsButton}
              className="inline-flex h-10 w-10 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] px-0 text-xs font-medium text-white/90 shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-colors duration-700 ease-in-out hover:bg-[var(--theme-glass-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 sm:h-9 sm:w-auto sm:px-3.5"
            >
              <Settings className="h-4 w-4 text-[var(--theme-accent)] sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t.settingsButton}</span>
            </button>

            <button
              type="button"
              onClick={onExit}
              aria-label={t.lobbyExitButton}
              title={t.lobbyExitButton}
              className="inline-flex h-10 w-10 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] px-0 text-xs font-medium text-white/75 shadow-[inset_1px_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition-colors duration-700 ease-in-out hover:border-white/25 hover:bg-[var(--theme-glass-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 sm:h-9 sm:w-auto sm:px-3.5"
            >
              <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t.lobbyExitButton}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Lobby Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
          {/* Greeting Header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {hasPersonaName
                  ? t.lobbyGreetingNamed(userPersona.name.trim())
                  : t.lobbyGreetingDefault}
              </h1>
              <p className="mt-1.5 text-sm text-[var(--theme-muted)] tabular-nums">
                {t.lobbySubtitleMeta(
                  characters.length,
                  selectedModel || t.noModelSelected
                )}
              </p>
            </div>

            {/* Action Buttons: + Create Character & Import PNG */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <input
                ref={pngInputRef}
                type="file"
                accept=".png,image/png"
                onChange={handlePngFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => pngInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] px-4 text-xs font-semibold text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-colors duration-700 ease-in-out hover:border-amber-300/45 hover:bg-[var(--theme-glass-hover)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0"
              >
                <FileImage className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                <span>{t.importCharacterCardShort}</span>
              </button>

              <button
                type="button"
                onClick={onCreateCharacter}
                className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-xs font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--theme-accent)',
                  color: 'var(--theme-on-accent)',
                }}
              >
                <Plus className="h-4 w-4" />
                <span>{t.createCharacterFullButton}</span>
              </button>
            </div>
          </div>

          {pngImportError ? (
            <div
              role="alert"
              className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/35 bg-rose-950/65 px-4 py-2.5 text-xs text-rose-100 backdrop-blur-xl"
            >
              <span>{pngImportError}</span>
              <button
                type="button"
                onClick={() => setPngImportError(null)}
                aria-label={t.dismiss}
                className="shrink-0 text-rose-200 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {/* Search & Tag Filter Bar */}
          <div className="mt-6 flex flex-col gap-3">
            <label className="relative flex w-full items-center sm:max-w-md">
              <Search
                className="pointer-events-none absolute left-4 h-4 w-4 text-[var(--theme-muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="h-10 w-full rounded-full border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] pr-4 pl-10 text-sm text-white placeholder-[var(--theme-muted)]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-colors duration-700 ease-in-out focus:border-[var(--theme-accent)] focus:outline-none"
              />
            </label>

            {allTags.length > 1 ? (
              <div className="no-scrollbar flex flex-nowrap snap-x items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:gap-1.5 sm:overflow-visible sm:pb-0">
                {allTags.map((tag) => {
                  const selected = activeTag === tag;
                  const label =
                    tag === ALL_TAG_KEY ? t.allTag : sanitizeRenderedText(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag(tag)}
                      className={`snap-start touch-manipulation rounded-xl border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-colors duration-700 ease-in-out whitespace-nowrap shrink-0 ${
                        selected
                          ? 'border-[var(--theme-accent)]/45 bg-[var(--theme-accent-soft)] text-[var(--theme-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]'
                          : 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] text-[var(--theme-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[var(--theme-glass-hover)] hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Cinematic Character Card Grid */}
          {filteredCharacters.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] px-6 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-colors duration-700 ease-in-out">
              <LayoutGrid className="mb-3 h-8 w-8 text-[var(--theme-muted)]" />
              <p className="text-base font-medium text-white">
                {t.noMatchingTitle}
              </p>
              <p className="mt-1 text-xs text-[var(--theme-muted)]">
                {t.noMatchingSubtitle}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 pb-safe sm:pb-0">
              {filteredCharacters.map((char, index) => (
                <LobbyCharacterCard
                  key={char.id}
                  t={t}
                  character={char}
                  index={index}
                  introDone={introDone}
                  isRecent={char.id === activeCharacterId}
                  messageCount={messageCounts[char.id] ?? 0}
                  onEnterScene={() => onEnterScene(char)}
                  onOpenProfile={() => onOpenCharacterProfile(char)}
                  onEdit={() => onEditCharacter(char)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {webEdition ? (
        <MobileLinkDemoModal
          isOpen={isWebMobileModalOpen}
          isSpanish={isSpanish}
          onClose={() => setIsWebMobileModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
