import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { UIStrings } from '../i18n/translations';

interface PWAInstallButtonProps {
  t: UIStrings;
  compact?: boolean;
}

export function PWAInstallButton({ t, compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title={t.installApp}
        className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-black/30 font-medium text-white transition-colors hover:border-[var(--theme-accent)]/60 hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 ${
          compact ? 'h-10 px-3.5 text-xs' : 'h-10 px-4 text-xs'
        }`}
      >
        <Download className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
        <span>{t.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--theme-border)] bg-black/30 px-3.5 text-xs font-medium text-white transition-colors hover:bg-black/50 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
          <span>{t.installShort}</span>
        </button>

        {showIOSGuide ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-glass-strong)] p-6 text-[var(--theme-text)] shadow-2xl backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-white">
                  {t.installIOSTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label={t.dismiss}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--theme-muted)] hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--theme-muted)]">
                {t.installIOSStep1}
                <br />
                {t.installIOSStep2}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 h-10 w-full rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--theme-accent)',
                  color: 'var(--theme-on-accent)',
                }}
              >
                {t.gotIt}
              </button>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return null;
}
