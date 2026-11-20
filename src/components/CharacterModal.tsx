import {
  CheckCircle2,
  FileImage,
  ImagePlus,
  Trash2,
  Upload,
  Wallpaper,
  X,
} from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  PRESET_PORTRAITS,
  PRESET_STAGE_BACKGROUNDS,
} from '../data/defaultCharacters';
import type { UIStrings } from '../i18n/translations';
import type { Character, CharacterIconId, CharacterTone } from '../types/chat';
import {
  readImageFileAsDataUrl,
  sanitizeImageUrl,
} from '../utils/imageUpload';
import { parsePngCharacterCard } from '../utils/pngCharacterCard';
import { sanitizeRenderedText } from '../utils/sanitize';
import {
  CHARACTER_ICON_OPTIONS,
  CHARACTER_TONE_OPTIONS,
  CharacterIcon,
} from './CharacterIcon';

interface CharacterModalProps {
  t: UIStrings;
  isOpen: boolean;
  editingCharacter: Character | null;
  canDelete: boolean;
  onClose: () => void;
  onSave: (character: Character) => void;
  onDelete: (id: string) => void;
}

export function CharacterModal({
  t,
  isOpen,
  editingCharacter,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: CharacterModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [stageBackground, setStageBackground] = useState('');
  const [greeting, setGreeting] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [icon, setIcon] = useState<CharacterIconId>('orbit');
  const [tone, setTone] = useState<CharacterTone>('cobalt');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUploadError(null);
    setImportSuccess(null);
    if (editingCharacter) {
      setName(editingCharacter.name);
      setRole(editingCharacter.role);
      setBio(editingCharacter.bio);
      setTagsInput(editingCharacter.tags.join(', '));
      setImageUrl(editingCharacter.imageUrl ?? '');
      setStageBackground(
        editingCharacter.stageBackground ?? editingCharacter.wallpaperUrl ?? ''
      );
      setGreeting(editingCharacter.greeting ?? '');
      setSystemPrompt(editingCharacter.systemPrompt);
      setIcon(editingCharacter.icon);
      setTone(editingCharacter.tone);
    } else {
      setName('');
      setRole('');
      setBio('');
      setTagsInput('Roleplay, Mystery');
      setImageUrl(PRESET_PORTRAITS[0]?.url ?? '');
      setStageBackground('');
      setGreeting(
        '*Glances up as the door clicks shut behind you.* You’re just in time—take a seat and tell me what brings you here.'
      );
      setSystemPrompt(
        'Stay strictly in character. Describe brief physical gestures in *italics* and reply naturally to the user.'
      );
      setIcon('orbit');
      setTone('cobalt');
    }
  }, [isOpen, editingCharacter]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadError(null);
      const dataUrl = await readImageFileAsDataUrl(file, 900);
      setImageUrl(dataUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload avatar image.'
      );
    }
  };

  const handleStageBackgroundUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadError(null);
      const dataUrl = await readImageFileAsDataUrl(file, 1280, 0.85);
      setStageBackground(dataUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Failed to upload stage wallpaper image.'
      );
    }
  };

  const handleImportPngCard = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadError(null);
      setImportSuccess(null);
      const imported = await parsePngCharacterCard(file);
      setName(imported.name);
      setRole(imported.role);
      setBio(imported.bio);
      setTagsInput(imported.tags.join(', '));
      setImageUrl(imported.imageUrl ?? '');
      setGreeting(imported.greeting);
      setSystemPrompt(imported.systemPrompt);
      setImportSuccess(t.importCharacterCardSuccess(imported.name));
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Failed to read PNG character card.'
      );
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;

    const trimmedImageUrl = imageUrl.trim();
    const safeImageUrl = trimmedImageUrl
      ? sanitizeImageUrl(trimmedImageUrl)
      : undefined;
    if (trimmedImageUrl && !safeImageUrl) {
      setUploadError(
        'Unsafe avatar image URL. Only https://, http://, blob:, or raster PNG/JPEG/WebP/GIF data URLs are allowed.'
      );
      return;
    }

    const trimmedStageBg = stageBackground.trim();
    const safeStageBg = trimmedStageBg
      ? sanitizeImageUrl(trimmedStageBg)
      : undefined;
    if (trimmedStageBg && !safeStageBg) {
      setUploadError(
        'Unsafe stage wallpaper URL. Only https://, http://, blob:, or raster PNG/JPEG/WebP/GIF data URLs are allowed.'
      );
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => sanitizeRenderedText(tag).trim())
      .filter(Boolean)
      .slice(0, 5);

    const safeName = sanitizeRenderedText(name).trim();
    const nextCharacter: Character = {
      id:
        editingCharacter?.id ??
        `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: safeName,
      role: sanitizeRenderedText(role).trim() || 'Roleplay Persona',
      bio: sanitizeRenderedText(bio).trim() || 'Custom roleplay character.',
      greeting:
        sanitizeRenderedText(greeting).trim() ||
        `*${safeName} greets you quietly.* What would you like to begin with?`,
      tags,
      imageUrl: safeImageUrl,
      stageBackground: safeStageBg,
      wallpaperUrl: undefined,
      systemPrompt: sanitizeRenderedText(systemPrompt).trim(),
      icon,
      tone,
    };

    onSave(nextCharacter);
    onClose();
  };

  const previewAvatarUrl = sanitizeImageUrl(imageUrl);
  const previewStageUrl = sanitizeImageUrl(stageBackground) || previewAvatarUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-glass-strong)] p-6 text-[var(--theme-text)] shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name || 'Character preview'}
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-2xl border border-white/15 object-cover"
              />
            ) : (
              <CharacterIcon icon={icon} tone={tone} size="md" />
            )}
            <div>
              <h2
                id="character-modal-title"
                className="font-display text-xl font-semibold text-white"
              >
                {editingCharacter
                  ? t.editCharacterTitle
                  : t.createCharacterTitle}
              </h2>
              <p className="text-xs text-[var(--theme-muted)]">
                {t.characterModalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.dismiss}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Standard PNG Character Card Importer */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] bg-black/35 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">
                TavernAI / Character Card V2 (.png)
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--theme-muted)]">
                Reads embedded Base64 &quot;chara&quot; metadata &amp; portrait automatically
              </p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/15 whitespace-nowrap shrink-0">
              <FileImage className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
              <span>{t.importCharacterCardButton}</span>
              <input
                type="file"
                accept=".png,image/png"
                onChange={handleImportPngCard}
                className="sr-only"
              />
            </label>
          </div>

          {importSuccess ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-950/55 px-4 py-2.5 text-xs text-emerald-100"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
              <span>{importSuccess}</span>
            </div>
          ) : null}

          {uploadError ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-500/35 bg-rose-950/60 px-4 py-2.5 text-xs text-rose-100"
            >
              {uploadError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="char-name"
                className="mb-1.5 block text-xs font-medium text-white/85"
              >
                {t.nameLabel}
              </label>
              <input
                id="char-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="h-11 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="char-role"
                className="mb-1.5 block text-xs font-medium text-white/85"
              >
                {t.roleLabel}
              </label>
              <input
                id="char-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={t.rolePlaceholder}
                className="h-11 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
              />
            </div>
          </div>

          {/* Local File Uploads for Avatar Card & Full-Screen Chat Wallpaper */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white">
                  {t.avatarCardImageLabel}
                </span>
                {imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-[11px] text-[var(--theme-muted)] hover:text-white"
                  >
                    {t.clear}
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/50">
                  {previewAvatarUrl ? (
                    <img
                      src={previewAvatarUrl}
                      alt={t.avatarCardImageLabel}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/40">
                      <ImagePlus className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/15">
                    <Upload className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                    <span>{t.uploadAvatar}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="url"
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder={
                      imageUrl.startsWith('data:')
                        ? t.localImageSaved
                        : t.avatarUrlPlaceholder
                    }
                    aria-label={t.avatarCardImageLabel}
                    className="h-8 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 text-[11px] text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PRESET_PORTRAITS.map((preset) => (
                  <button
                    key={`avatar-${preset.label}`}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    title={preset.label}
                    className={`h-8 w-6 overflow-hidden rounded-md border transition-all ${
                      imageUrl === preset.url
                        ? 'border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent)]'
                        : 'border-white/15 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white">
                  {t.wallpaperImageLabel}
                </span>
                {stageBackground ? (
                  <button
                    type="button"
                    onClick={() => setStageBackground('')}
                    className="text-[11px] text-[var(--theme-muted)] hover:text-white"
                  >
                    {t.useAvatar}
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/50">
                  {previewStageUrl ? (
                    <img
                      src={previewStageUrl}
                      alt={t.wallpaperImageLabel}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover opacity-85"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/40">
                      <Wallpaper className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/15">
                    <Wallpaper className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                    <span>{t.uploadWallpaper}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleStageBackgroundUpload}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="url"
                    value={
                      stageBackground.startsWith('data:') ? '' : stageBackground
                    }
                    onChange={(e) => setStageBackground(e.target.value)}
                    placeholder={
                      stageBackground.startsWith('data:')
                        ? t.localWallpaperSaved
                        : t.wallpaperUrlPlaceholder
                    }
                    aria-label={t.wallpaperImageLabel}
                    className="h-8 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 text-[11px] text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PRESET_STAGE_BACKGROUNDS.map((preset) => (
                  <button
                    key={`stage-${preset.label}`}
                    type="button"
                    onClick={() => setStageBackground(preset.url)}
                    title={preset.label}
                    className={`h-6 w-10 overflow-hidden rounded-md border transition-all ${
                      stageBackground === preset.url
                        ? 'border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent)]'
                        : 'border-white/15 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="char-tags"
                className="mb-1.5 block text-xs font-medium text-white/85"
              >
                {t.tagsLabel}
              </label>
              <input
                id="char-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder={t.tagsPlaceholder}
                className="h-11 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="char-bio"
                className="mb-1.5 block text-xs font-medium text-white/85"
              >
                {t.bioLabel}
              </label>
              <input
                id="char-bio"
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t.bioPlaceholder}
                className="h-11 w-full rounded-2xl border border-white/15 bg-black/40 px-4 text-sm text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="char-greeting"
              className="mb-1.5 block text-xs font-medium text-white/85"
            >
              {t.greetingLabel}
            </label>
            <textarea
              id="char-greeting"
              rows={3}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder={t.greetingPlaceholder}
              className="w-full rounded-2xl border border-white/15 bg-black/40 p-3.5 text-sm leading-relaxed text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="char-system-prompt"
              className="mb-1.5 block text-xs font-medium text-white/85"
            >
              {t.systemPromptLabel}
            </label>
            <textarea
              id="char-system-prompt"
              required
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t.systemPromptPlaceholder}
              className="w-full rounded-2xl border border-white/15 bg-black/40 p-3.5 font-mono text-xs leading-relaxed text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/85">
                {t.fallbackIconLabel}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CHARACTER_ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIcon(opt.id)}
                    title={opt.label}
                    aria-label={opt.label}
                    className={`rounded-xl p-0.5 transition-transform ${
                      icon === opt.id
                        ? 'ring-2 ring-[var(--theme-accent)]'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <CharacterIcon icon={opt.id} tone={tone} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/85">
                {t.fallbackToneLabel}
              </span>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {CHARACTER_TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTone(opt.id)}
                    title={opt.label}
                    aria-label={opt.label}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      tone === opt.id
                        ? 'scale-105 ring-2 ring-white'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.swatch }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {editingCharacter && canDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingCharacter.id);
                  onClose();
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/60 px-4 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-900/70"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.deleteButton}
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-full px-5 text-sm font-medium text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="h-10 rounded-full px-6 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--theme-accent)',
                  color: 'var(--theme-on-accent)',
                }}
              >
                {editingCharacter ? t.saveChanges : t.createCharacterButton}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
