import {
  Maximize2,
  MessageCircle,
  Pencil,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { UIStrings } from '../i18n/translations';
import type { Character } from '../types/chat';
import { CharacterIcon } from './CharacterIcon';

interface CharacterProfileModalProps {
  t: UIStrings;
  character: Character | null;
  primaryActionLabel?: string;
  onClose: () => void;
  onChat: (characterId: string) => void;
  onEdit: (character: Character) => void;
  onOpenLightbox: (imageUrl: string, altText: string) => void;
}

export function CharacterProfileModal({
  t,
  character,
  primaryActionLabel,
  onClose,
  onChat,
  onEdit,
  onOpenLightbox,
}: CharacterProfileModalProps) {
  const [artVariant, setArtVariant] = useState<'portrait' | 'wallpaper'>(
    'portrait'
  );
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setArtVariant('portrait');
  }, [character?.id]);

  useEffect(() => {
    if (!character) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [character, onClose]);

  const hasPortrait = Boolean(character?.imageUrl);
  const hasSeparateWallpaper = Boolean(
    character?.wallpaperUrl && character.wallpaperUrl !== character.imageUrl
  );

  const displayedArtwork =
    character === null
      ? ''
      : artVariant === 'wallpaper' && character.wallpaperUrl
        ? character.wallpaperUrl
        : character.imageUrl || character.wallpaperUrl || '';

  return (
    <AnimatePresence>
      {character ? (
        <motion.div
          key="character-profile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="character-profile-name"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-glass-strong)] text-[var(--theme-text)] shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close & Edit Floating Controls */}
            <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(character);
                }}
                aria-label={t.editCharacterTooltip}
                title={t.editCharacterTooltip}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/85 backdrop-blur-md transition-colors hover:bg-black/75 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.dismiss}
                title={t.dismiss}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/85 backdrop-blur-md transition-colors hover:bg-black/75 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Full Uncropped Artwork Showcase */}
            <div className="relative overflow-hidden border-b border-white/10 bg-black/65">
              {displayedArtwork && !imageFailed ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenLightbox(displayedArtwork, character.name)
                  }
                  aria-label={t.viewFullArt}
                  title={t.viewFullArt}
                  className="group relative flex w-full items-center justify-center bg-black/50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--theme-accent)]"
                >
                  {/* Soft ambient blur behind uncropped vertical/horizontal art */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-2xl"
                    style={{ backgroundImage: `url("${displayedArtwork}")` }}
                  />
                  <img
                    src={displayedArtwork}
                    alt={character.name}
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    className="relative z-10 max-h-[48vh] w-full object-contain transition-transform duration-300 group-hover:scale-[1.015]"
                  />
                  <span className="pointer-events-none absolute right-3.5 bottom-3.5 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/90 opacity-85 backdrop-blur-md transition-opacity group-hover:opacity-100">
                    <Maximize2 className="h-3 w-3 text-[var(--theme-accent)]" />
                    <span>{t.viewFullArt}</span>
                  </span>
                </button>
              ) : (
                <div className="flex h-56 w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,var(--theme-accent-soft),transparent_65%)]">
                  <CharacterIcon
                    icon={character.icon}
                    tone={character.tone}
                    size="lg"
                  />
                </div>
              )}

              {hasPortrait && hasSeparateWallpaper ? (
                <div className="absolute bottom-3.5 left-3.5 z-20 inline-flex rounded-full border border-white/15 bg-black/60 p-0.5 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => {
                      setImageFailed(false);
                      setArtVariant('portrait');
                    }}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      artVariant === 'portrait'
                        ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    {t.profilePortraitTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFailed(false);
                      setArtVariant('wallpaper');
                    }}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      artVariant === 'wallpaper'
                        ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    {t.profileWallpaperTab}
                  </button>
                </div>
              ) : null}
            </div>

            {/* Profile Info */}
            <div className="p-6">
              <h2
                id="character-profile-name"
                className="font-display text-2xl font-bold tracking-tight text-white"
              >
                {character.name}
              </h2>
              <p className="mt-0.5 text-sm font-medium text-[var(--theme-muted)]">
                {character.role}
              </p>

              {character.tags.length > 0 ? (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {character.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--theme-accent)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="mt-4 text-sm leading-relaxed text-white/85">
                {character.bio}
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onChat(character.id);
                    onClose();
                  }}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold shadow-lg transition-transform hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
                  style={{
                    backgroundColor: 'var(--theme-accent)',
                    color: 'var(--theme-on-accent)',
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{primaryActionLabel ?? t.enterSceneButton}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
