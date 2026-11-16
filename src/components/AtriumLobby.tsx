import {
  Eye,
  FileImage,
  LayoutGrid,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { UIStrings } from '../i18n/translations';
import type { ApiProvider, Character, UserPersona } from '../types/chat';
import { parsePngCharacterCard } from '../utils/pngCharacterCard';
import { CharacterIcon } from './CharacterIcon';
import { PWAInstallButton } from './PWAInstallButton';

interface AtriumLobbyProps {
  t: UIStrings;
  characters: Character[];
  activeCharacterId: string;
  selectedModel: string;
  provider?: ApiProvider;
  ollamaStatus: 'checking' | 'connected' | 'offline';
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
  const showImage = Boolean(character.imageUrl) && !imgFailed;

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
        delay: introDone ? Math.min(index, 16) * 0.045 : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        willChange: introDone && !hasEntered ? 'transform, opacity' : 'auto',
      }}
      className={`group relative aspect-[2/3] overflow-hidden rounded-[26px] border bg-black/40 transition-all duration-300 ${
        isRecent
          ? 'border-white/25 hover:border-amber-300/75 hover:shadow-[0_0_0_1px_rgba(253,230,138,0.35),0_20px_50px_rgba(245,158,11,0.16),0_18px_40px_rgba(0,0,0,0.65)]'
          : 'border-white/12 hover:border-amber-300/70 hover:shadow-[0_0_0_1px_rgba(253,230,138,0.32),0_20px_50px_rgba(245,158,11,0.14),0_18px_40px_rgba(0,0,0,0.6)]'
      }`}
    >
      {showImage ? (
        <img
          src={character.imageUrl}
          alt={character.name}
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
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/15 transition-opacity duration-300 group-hover:via-black/30"
      />

      {/* Crisp 1px top-left Liquid Glass specular edge highlight + subtle warm-gold rim glow on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[26px] p-[1px] opacity-80 transition-opacity duration-300 group-hover:opacity-0"
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
        className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-inset ring-amber-200/0 transition-all duration-300 group-hover:ring-amber-200/35"
      />

      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-2">
        <div className="min-w-0 text-[11px] font-medium text-white/80 drop-shadow">
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
            aria-label={`${t.viewCharacterProfile}: ${character.name}`}
            title={`${t.viewCharacterProfile}: ${character.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 opacity-85 backdrop-blur-md transition-all hover:border-amber-300/50 hover:bg-black/75 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`${t.editCharacterTitle}: ${character.name}`}
            title={`${t.editCharacterTitle}: ${character.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 opacity-85 backdrop-blur-md transition-all hover:border-amber-300/50 hover:bg-black/75 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onEnterScene}
        className="absolute inset-0 flex flex-col justify-end p-5 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--theme-accent)]"
      >
        {character.tags.length > 0 ? (
          <p className="mb-1.5 truncate text-[11px] font-medium text-[var(--theme-accent)] transition-colors group-hover:text-amber-200">
            {character.tags.slice(0, 3).join(' · ')}
          </p>
        ) : null}

        <h2 className="truncate font-display text-lg font-semibold leading-tight text-white">
          {character.name}
        </h2>

        <p className="mt-0.5 truncate text-xs font-medium text-white/75">
          {character.role}
        </p>

        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-white/80">
          {character.bio}
        </p>
      </button>
    </motion.div>
  );
}

const ALL_TAG_KEY = '__ALL__';

export function AtriumLobby({
  t,
  characters,
  activeCharacterId,
  selectedModel,
  provider = 'ollama',
  ollamaStatus,
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
  onExit,
}: AtriumLobbyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>(ALL_TAG_KEY);
  const [pngImportError, setPngImportError] = useState<string | null>(null);
  const pngInputRef = useRef<HTMLInputElement | null>(null);

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
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 55% at 50% -10%, var(--theme-accent-soft), transparent 70%), var(--theme-bg)',
      }}
    >
      {/* Subtle Ambient Aurora Backdrop (14s slow breathing cycle) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <motion.div
          animate={{
            opacity: [0.35, 0.58, 0.35],
            scale: [1, 1.07, 1],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-36 -left-24 h-[520px] w-[520px] rounded-full blur-[140px]"
          style={{
            background:
              'radial-gradient(circle, rgba(99, 102, 241, 0.24) 0%, rgba(79, 70, 229, 0.08) 46%, transparent 74%)',
          }}
        />
        <motion.div
          animate={{
            opacity: [0.28, 0.48, 0.28],
            scale: [1.05, 0.98, 1.05],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 7,
          }}
          className="absolute right-[-8%] bottom-[-14%] h-[460px] w-[460px] rounded-full blur-[140px]"
          style={{
            background:
              'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(253, 230, 138, 0.06) 46%, transparent 74%)',
          }}
        />
      </div>

      {/* Top Spatial Header */}
      <header className="relative z-20 shrink-0 border-b border-white/10 bg-black/25 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
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
          <div className="flex items-center gap-2 shrink-0">
            {provider === 'openai' ? (
              <button
                type="button"
                onClick={onOpenSettings}
                title={
                  selectedModel.trim() ? t.apiStatusReady : t.apiStatusSetup
                }
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl transition-all focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 ${
                  selectedModel.trim()
                    ? 'border-white/14 bg-white/[0.06] text-white/90 hover:border-emerald-300/40 hover:bg-white/[0.12]'
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
                title={
                  ollamaStatus === 'offline'
                    ? t.ollamaStatusOffline
                    : ollamaStatus === 'connected'
                      ? t.ollamaStatusReady
                      : t.ollamaStatusChecking
                }
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl transition-all focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 ${
                  ollamaStatus === 'offline'
                    ? 'border-amber-300/35 bg-amber-500/[0.12] text-amber-100 hover:border-amber-300/65 hover:bg-amber-500/[0.2]'
                    : ollamaStatus === 'connected'
                      ? 'border-white/14 bg-white/[0.06] text-white/90 hover:border-emerald-300/40 hover:bg-white/[0.12]'
                      : 'border-white/12 bg-white/[0.05] text-white/75 hover:bg-white/[0.1]'
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

            <PWAInstallButton t={t} compact />

            <button
              type="button"
              onClick={onOpenUserPersona}
              title={t.userPersonaTooltip}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl transition-colors focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 ${
                hasPersonaName
                  ? 'border-[var(--theme-accent)]/45 bg-[var(--theme-accent-soft)] text-white hover:border-[var(--theme-accent)]'
                  : 'border-white/12 bg-white/[0.06] text-white/85 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              <User className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              <span className="max-w-[110px] truncate">
                {t.userPersonaBadgeLabel(userPersona.name)}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3.5 text-xs font-medium text-white/90 shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0"
            >
              <Settings className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              <span className="hidden sm:inline">{t.settingsButton}</span>
            </button>

            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 text-xs font-medium text-white/75 shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-colors hover:border-white/25 hover:bg-white/[0.1] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
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
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-4 text-xs font-semibold text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl transition-colors hover:border-amber-300/45 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0"
              >
                <FileImage className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                <span>{t.importCharacterCardShort}</span>
              </button>

              <button
                type="button"
                onClick={onCreateCharacter}
                className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-xs font-semibold shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0"
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
                className="h-10 w-full rounded-full border border-white/12 bg-white/[0.04] pr-4 pl-10 text-sm text-white placeholder-[var(--theme-muted)]/70 backdrop-blur-xl transition-colors focus:border-[var(--theme-accent)] focus:outline-none"
              />
            </label>

            {allTags.length > 1 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                {allTags.map((tag) => {
                  const selected = activeTag === tag;
                  const label = tag === ALL_TAG_KEY ? t.allTag : tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag(tag)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        selected
                          ? 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]'
                          : 'text-[var(--theme-muted)] hover:bg-white/[0.06] hover:text-white'
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
            <div className="mt-8 flex flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-16 text-center backdrop-blur-xl">
              <LayoutGrid className="mb-3 h-8 w-8 text-[var(--theme-muted)]" />
              <p className="text-base font-medium text-white">
                {t.noMatchingTitle}
              </p>
              <p className="mt-1 text-xs text-[var(--theme-muted)]">
                {t.noMatchingSubtitle}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
    </div>
  );
}
