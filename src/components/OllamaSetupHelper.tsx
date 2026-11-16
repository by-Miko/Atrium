import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Settings,
  Terminal,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { UIStrings } from '../i18n/translations';
import type { OllamaModelTag } from '../types/chat';
import { fetchOllamaModels } from '../utils/ollama';

type OSType = 'windows' | 'mac' | 'linux';

function detectDefaultOS(): OSType {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux') && !ua.includes('android')) return 'linux';
  return 'windows';
}

interface OllamaSetupHelperProps {
  t: UIStrings;
  isOpen: boolean;
  ollamaUrl: string;
  onDismiss: () => void;
  onOpenSettings: () => void;
  onConnected: (models: OllamaModelTag[]) => void;
}

const OS_COMMANDS: Record<
  OSType,
  {
    installCmd: string;
    corsCmd: string;
    downloadUrl: string;
  }
> = {
  windows: {
    installCmd: 'winget install Ollama.Ollama\nollama pull llama3.2',
    corsCmd: '$env:OLLAMA_ORIGINS="*"; ollama serve',
    downloadUrl: 'https://ollama.com/download/windows',
  },
  mac: {
    installCmd: 'brew install ollama\nollama pull llama3.2',
    corsCmd: 'launchctl setenv OLLAMA_ORIGINS "*"\nOLLAMA_ORIGINS="*" ollama serve',
    downloadUrl: 'https://ollama.com/download/mac',
  },
  linux: {
    installCmd: 'curl -fsSL https://ollama.com/install.sh | sh\nollama pull llama3.2',
    corsCmd: 'OLLAMA_ORIGINS="*" ollama serve',
    downloadUrl: 'https://ollama.com/download/linux',
  },
};

export function OllamaSetupHelper({
  t,
  isOpen,
  ollamaUrl,
  onDismiss,
  onOpenSettings,
  onConnected,
}: OllamaSetupHelperProps) {
  const [activeOS, setActiveOS] = useState<OSType>(detectDefaultOS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const commands = OS_COMMANDS[activeOS];

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryFeedback(null);
    try {
      const models = await fetchOllamaModels(ollamaUrl);
      onConnected(models);
    } catch (err) {
      setRetryFeedback(
        err instanceof Error ? err.message : t.diagOllamaFailed
      );
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ollama-setup-title"
      onClick={onDismiss}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-glass-strong)] p-6 text-[var(--theme-text)] shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="ollama-setup-title"
                className="font-display text-lg font-semibold text-white"
              >
                {t.setupHelperTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
                {t.setupHelperSubtitle(ollamaUrl)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.dismiss}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* OS Tabs */}
        <div
          role="tablist"
          aria-label="Operating System"
          className="mt-5 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1"
        >
          {(['windows', 'mac', 'linux'] as const).map((os) => {
            const label =
              os === 'windows' ? 'Windows' : os === 'mac' ? 'macOS' : 'Linux';
            const selected = activeOS === os;
            return (
              <button
                key={os}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveOS(os)}
                className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
                  selected
                    ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                    : 'text-[var(--theme-muted)] hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Step 1: Install & Pull */}
        <div className="mt-4 space-y-3.5">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                {t.setupStep1Title}
              </span>
              <a
                href={commands.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--theme-accent)] hover:underline"
              >
                <span>ollama.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-black/55 p-3 pr-11">
              <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-white/90">
                <code>{commands.installCmd}</code>
              </pre>
              <button
                type="button"
                onClick={() => handleCopy('install', commands.installCmd)}
                aria-label={t.copyCommand}
                title={t.copyCommand}
                className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                {copiedId === 'install' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Set OLLAMA_ORIGINS=* */}
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                {t.setupStep2Title}
              </span>
              <span className="font-mono text-[11px] text-[var(--theme-accent)]">
                OLLAMA_ORIGINS=*
              </span>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-black/55 p-3 pr-11">
              <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-white/90">
                <code>{commands.corsCmd}</code>
              </pre>
              <button
                type="button"
                onClick={() => handleCopy('cors', commands.corsCmd)}
                aria-label={t.copyCommand}
                title={t.copyCommand}
                className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                {copiedId === 'cors' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--theme-muted)]">
              {activeOS === 'windows'
                ? t.setupWindowsTip
                : activeOS === 'mac'
                  ? t.setupMacTip
                  : t.setupLinuxTip}
            </p>
          </div>
        </div>

        {retryFeedback ? (
          <div
            role="alert"
            className="mt-3.5 rounded-2xl border border-rose-500/35 bg-rose-950/60 px-4 py-2.5 text-xs text-rose-100"
          >
            {retryFeedback}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/12 bg-black/35 px-4 text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
          >
            <Settings className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
            <span>{t.openSettings}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="h-10 rounded-full px-4 text-xs font-medium text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white"
            >
              {t.setupDismissLater}
            </button>

            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-xs font-semibold transition-colors disabled:opacity-60"
              style={{
                backgroundColor: 'var(--theme-accent)',
                color: 'var(--theme-on-accent)',
              }}
            >
              {isRetrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>{t.setupRetryConnection}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
