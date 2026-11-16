import {
  AlertCircle,
  Brain,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { UIStrings } from '../i18n/translations';
import type { Character, StoryMemoryEntry } from '../types/chat';

interface StoryMemoryModalProps {
  t: UIStrings;
  isOpen: boolean;
  character: Character;
  memory?: StoryMemoryEntry;
  autoMemoryEnabled: boolean;
  canSummarizeNow: boolean;
  isStreaming: boolean;
  onClose: () => void;
  onSave: (summaryText: string) => void;
  onClear: () => void;
  onRefreshSummary: () => Promise<string | null>;
}

export function StoryMemoryModal({
  t,
  isOpen,
  character,
  memory,
  autoMemoryEnabled,
  canSummarizeNow,
  isStreaming,
  onClose,
  onSave,
  onClear,
  onRefreshSummary,
}: StoryMemoryModalProps) {
  const [draft, setDraft] = useState(memory?.summary ?? '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(memory?.summary ?? '');
    setRefreshError(null);
  }, [isOpen, character.id, memory?.summary]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRefreshing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isRefreshing, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(draft.trim());
    onClose();
  };

  const handleRefresh = async () => {
    if (isRefreshing || isStreaming) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const updated = await onRefreshSummary();
      if (updated === null) {
        setRefreshError(t.storyMemoryRefreshError);
      } else {
        setDraft(updated);
      }
    } catch {
      setRefreshError(t.storyMemoryRefreshError);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClear = () => {
    setDraft('');
    setRefreshError(null);
    onClear();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-memory-modal-title"
      onClick={() => {
        if (!isRefreshing) onClose();
      }}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-glass-strong)] text-[var(--theme-text)] shadow-[0_24px_80px_rgba(0,0,0,0.68)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-6 pt-5 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 shrink-0 text-[var(--theme-accent)]" />
              <h2
                id="story-memory-modal-title"
                className="font-display text-lg font-semibold text-white"
              >
                {t.storyMemoryModalTitle} · {character.name}
              </h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
              {t.storyMemoryModalSubtitle(character.name)}
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={onClose}
            aria-label={t.dismiss}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span
                className={`rounded-full border px-2.5 py-1 font-medium ${
                  autoMemoryEnabled
                    ? 'border-[var(--theme-accent)]/40 bg-[var(--theme-accent-soft)] text-white'
                    : 'border-white/12 bg-black/35 text-[var(--theme-muted)]'
                }`}
              >
                {autoMemoryEnabled
                  ? t.storyMemoryAutoOn
                  : t.storyMemoryAutoOff}
              </span>

              <span className="font-mono text-[var(--theme-muted)]">
                {t.storyMemorySummarizedCount(
                  memory?.summarizedMessageCount ?? 0
                )}
              </span>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="story-memory-textarea"
                  className="text-xs font-medium text-white/85"
                >
                  {t.storyMemoryTextareaLabel}
                </label>

                <button
                  type="button"
                  disabled={!canSummarizeNow || isRefreshing || isStreaming}
                  onClick={() => void handleRefresh()}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  <span>
                    {isRefreshing
                      ? t.storyMemoryRefreshing
                      : t.storyMemoryRefreshButton}
                  </span>
                </button>
              </div>

              <textarea
                id="story-memory-textarea"
                rows={7}
                maxLength={2500}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t.storyMemoryTextareaPlaceholder}
                className="w-full resize-y rounded-2xl border border-white/15 bg-black/45 p-3.5 text-sm leading-relaxed text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
              />
            </div>

            {refreshError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-2xl border border-rose-500/35 bg-rose-950/60 p-3 text-xs text-rose-100"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                <span>{refreshError}</span>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/25 px-6 py-4">
            <button
              type="button"
              disabled={!draft.trim() && !memory?.summary}
              onClick={handleClear}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-black/30 px-3.5 text-xs font-medium text-rose-200/85 transition-colors hover:border-rose-400/40 hover:bg-rose-950/60 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.storyMemoryClearButton}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRefreshing}
                onClick={onClose}
                className="h-9 rounded-full px-4 text-xs font-medium text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={isRefreshing}
                className="h-9 rounded-full px-5 text-xs font-semibold transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--theme-accent)',
                  color: 'var(--theme-on-accent)',
                }}
              >
                {t.storyMemorySaveButton}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
