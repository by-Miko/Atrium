import {
  Check,
  Copy,
  Download,
  Globe,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UIStrings } from '../i18n/translations';
import type { Language, MobileLinkStatus } from '../types/chat';

interface MobileLinkModalProps {
  t: UIStrings;
  isOpen: boolean;
  language: Language;
  status: MobileLinkStatus;
  isWebDemoMode?: boolean;
  onStatusChange: (nextStatus: MobileLinkStatus) => void;
  onClose: () => void;
}

const GITHUB_RELEASES_URL = 'https://github.com/by-Miko/Atrium/releases/latest';

export function MobileLinkModal({
  t,
  isOpen,
  language,
  status,
  isWebDemoMode = false,
  onStatusChange,
  onClose,
}: MobileLinkModalProps) {
  const [networkTab, setNetworkTab] = useState<'lan' | 'tailscale'>('lan');
  const [selectedUrlIndex, setSelectedUrlIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isToggling, setIsToggling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const userDisabledRef = useRef(false);
  const isTogglingRef = useRef(false);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const statusActiveRef = useRef(status.active);
  statusActiveRef.current = status.active;
  const startErrorRef = useRef(t.mobileLinkStartError);
  startErrorRef.current = t.mobileLinkStartError;

  const lanUrls = status.urls?.lan ?? [];
  const tailscaleUrls = status.urls?.tailscale ?? [];

  const activeUrls = useMemo(
    () => (networkTab === 'lan' ? lanUrls : tailscaleUrls),
    [lanUrls, networkTab, tailscaleUrls]
  );

  const activeUrl =
    activeUrls[selectedUrlIndex] ?? activeUrls[0] ?? '';

  // Auto-select whichever interface category has detected URLs when opened/updated
  useEffect(() => {
    if (networkTab === 'lan' && lanUrls.length === 0 && tailscaleUrls.length > 0) {
      setNetworkTab('tailscale');
      setSelectedUrlIndex(0);
    } else if (
      networkTab === 'tailscale' &&
      tailscaleUrls.length === 0 &&
      lanUrls.length > 0
    ) {
      setNetworkTab('lan');
      setSelectedUrlIndex(0);
    }
  }, [lanUrls.length, networkTab, tailscaleUrls.length]);

  useEffect(() => {
    if (selectedUrlIndex >= activeUrls.length) {
      setSelectedUrlIndex(0);
    }
  }, [activeUrls.length, selectedUrlIndex]);

  // Auto-start Mobile Link server once when modal opens if inactive and not disabled by user
  useEffect(() => {
    if (!isOpen || isWebDemoMode) return;
    if (statusActiveRef.current || userDisabledRef.current) {
      return;
    }
    const startApi = window.electronAPI?.startMobileLink;
    if (!startApi) return;

    let cancelled = false;
    setErrorMsg(null);
    setCopiedUrl(false);
    isTogglingRef.current = true;
    setIsToggling(true);

    void startApi()
      .then((next) => {
        if (!cancelled && next && !userDisabledRef.current) {
          onStatusChangeRef.current(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg(startErrorRef.current);
        }
      })
      .finally(() => {
        isTogglingRef.current = false;
        if (!cancelled) {
          setIsToggling(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isWebDemoMode]);

  // Poll live status (connected clients & last sync timestamp) while open
  useEffect(() => {
    if (!isOpen || isWebDemoMode || !status.active) return;
    const statusApi = window.electronAPI?.getMobileLinkStatus;
    if (!statusApi) return;

    const timer = window.setInterval(() => {
      if (isTogglingRef.current || userDisabledRef.current) {
        return;
      }
      void statusApi()
        .then((next) => {
          if (next && !isTogglingRef.current && !userDisabledRef.current) {
            onStatusChangeRef.current(next);
          }
        })
        .catch(() => {
          // ignore transient status poll failures
        });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [isOpen, isWebDemoMode, status.active]);

  // Generate local QR code data URL whenever activeUrl changes (no external requests, CSP safe)
  useEffect(() => {
    if (!isOpen || isWebDemoMode || !status.active || !activeUrl) {
      setQrDataUrl('');
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(activeUrl, {
      width: 440,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0B0B11',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUrl, isOpen, isWebDemoMode, status.active]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleToggleServer = useCallback(async () => {
    const startApi = window.electronAPI?.startMobileLink;
    const stopApi = window.electronAPI?.stopMobileLink;
    if (!startApi || !stopApi || isTogglingRef.current) return;

    const turningOff = statusActiveRef.current;
    isTogglingRef.current = true;
    setIsToggling(true);
    setErrorMsg(null);
    setCopiedUrl(false);

    try {
      if (turningOff) {
        userDisabledRef.current = true;
        const next = await stopApi();
        onStatusChangeRef.current(
          next ?? {
            active: false,
            port: null,
            token: null,
            urls: { lan: [], tailscale: [] },
            connectedClients: 0,
            lastSyncAt: status.lastSyncAt,
          }
        );
      } else {
        userDisabledRef.current = false;
        const next = await startApi();
        if (next) {
          onStatusChangeRef.current(next);
        }
      }
    } catch {
      setErrorMsg(startErrorRef.current);
    } finally {
      isTogglingRef.current = false;
      setIsToggling(false);
    }
  }, [status.lastSyncAt]);

  const handleRotateToken = useCallback(async () => {
    const startApi = window.electronAPI?.startMobileLink;
    if (!startApi || isTogglingRef.current) return;

    userDisabledRef.current = false;
    isTogglingRef.current = true;
    setIsToggling(true);
    setErrorMsg(null);
    setCopiedUrl(false);

    try {
      const next = await startApi({ forceRotate: true });
      if (next) {
        onStatusChangeRef.current(next);
      }
    } catch {
      setErrorMsg(startErrorRef.current);
    } finally {
      isTogglingRef.current = false;
      setIsToggling(false);
    }
  }, []);

  const handleCopyUrl = useCallback(async () => {
    if (!activeUrl) return;
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  }, [activeUrl]);

  const formattedLastSync = useMemo(() => {
    if (!status.lastSyncAt) {
      return t.mobileLinkNeverSynced;
    }
    try {
      const timeStr = new Date(status.lastSyncAt).toLocaleTimeString(
        language === 'es' ? 'es-ES' : 'en-US',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }
      );
      return t.mobileLinkLastSync(timeStr);
    } catch {
      return t.mobileLinkNeverSynced;
    }
  }, [language, status.lastSyncAt, t]);

  if (!isOpen) return null;

  if (isWebDemoMode) {
    const isSpanish = language === 'es' || t.mobileLinkButton === 'Móvil';
    const previewSubtitle = isSpanish
      ? 'Puente Local para Windows'
      : 'Windows Desktop Bridge';
    const previewMessage = isSpanish
      ? 'El enlace móvil por QR no está disponible en la Demo Web interactiva. Descarga Atrium v1.5.2 o superior para Windows para vincular tu teléfono mediante Wi-Fi local o Mesh VPN.'
      : 'Mobile QR Link is not available in the interactive Web Demo. Download Atrium v1.5.2 or later for Windows to pair your phone via local Wi-Fi or Mesh VPN.';
    const networkSummary = isSpanish
      ? 'Wi-Fi LAN Local · Mesh VPN · Sincronización en Vivo'
      : 'Local Wi-Fi LAN · Mesh VPN · Live Sync';
    const downloadLabel = isSpanish
      ? 'Descargar Última Versión'
      : 'Download Latest Release';
    const closeLabel = isSpanish ? 'Cerrar' : 'Close';

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-link-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="relative flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.16)] bg-[var(--theme-panel)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.18),0_28px_80px_rgba(0,0,0,0.8)]"
          style={{
            backdropFilter: 'blur(20px) saturate(165%)',
            WebkitBackdropFilter: 'blur(20px) saturate(165%)',
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-[var(--theme-accent-soft)] text-[var(--theme-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="mobile-link-modal-title"
                  className="font-display text-lg font-semibold text-white sm:text-xl"
                >
                  {t.mobileLinkTitle}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--theme-muted)]">
                  {previewSubtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <p className="text-sm leading-relaxed text-white/85">
              {previewMessage}
            </p>

            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-black/35 px-4 py-3">
              <QrCode
                className="h-4 w-4 shrink-0 text-[var(--theme-accent)]"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-white/80">
                {networkSummary}
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-medium text-white/85 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap"
            >
              {closeLabel}
            </button>

            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-zinc-100 px-5 py-2 text-xs font-semibold text-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{downloadLabel}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-link-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.16)] bg-[var(--theme-panel)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.18),0_28px_80px_rgba(0,0,0,0.8)]"
        style={{
          backdropFilter: 'blur(20px) saturate(165%)',
          WebkitBackdropFilter: 'blur(20px) saturate(165%)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-[var(--theme-accent-soft)] text-[var(--theme-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="mobile-link-modal-title"
                className="font-display text-lg font-semibold text-white sm:text-xl"
              >
                {t.mobileLinkTitle}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--theme-muted)]">
                {t.mobileLinkSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.dismiss}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Server Toggle & Live Metrics */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/12 bg-black/35 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${
                  status.active
                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
                    : 'bg-white/30'
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-white">
                  {isToggling && !status.active
                    ? t.mobileLinkStarting
                    : status.active
                      ? t.mobileLinkStatusActive
                      : t.mobileLinkStatusStopped}
                  {status.active && status.port ? (
                    <span className="ml-1.5 font-mono text-[11px] font-normal text-white/60">
                      :{status.port}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--theme-muted)]">
                  {t.mobileLinkConnectedClients(status.connectedClients)} ·{' '}
                  {formattedLastSync}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status.active ? (
                <button
                  type="button"
                  onClick={handleRotateToken}
                  disabled={isToggling}
                  title={t.mobileLinkRefreshToken}
                  aria-label={t.mobileLinkRefreshToken}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 text-[11px] font-medium text-white/85 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isToggling ? 'animate-spin' : ''}`}
                  />
                  <span>{t.mobileLinkRefreshToken}</span>
                </button>
              ) : null}

              <button
                type="button"
                role="switch"
                aria-checked={status.active}
                aria-label={t.mobileLinkToggleLabel}
                disabled={isToggling}
                onClick={handleToggleServer}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] disabled:opacity-50 ${
                  status.active
                    ? 'border-emerald-400/50 bg-emerald-500/35'
                    : 'border-white/15 bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    status.active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {errorMsg ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-500/35 bg-rose-950/60 px-4 py-2.5 text-xs text-rose-100"
            >
              {errorMsg}
            </div>
          ) : null}

          {/* Network Interface Switcher (Wi-Fi LAN vs Tailscale VPN) */}
          <div
            role="tablist"
            aria-label={t.mobileLinkTitle}
            className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={networkTab === 'lan'}
              onClick={() => {
                setNetworkTab('lan');
                setSelectedUrlIndex(0);
                setCopiedUrl(false);
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                networkTab === 'lan'
                  ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                  : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Wifi className="h-3.5 w-3.5 shrink-0" />
              <span>{t.mobileLinkLanTab}</span>
              {lanUrls.length > 0 ? (
                <span className="ml-0.5 font-mono text-[10px] opacity-80">
                  ({lanUrls.length})
                </span>
              ) : null}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={networkTab === 'tailscale'}
              onClick={() => {
                setNetworkTab('tailscale');
                setSelectedUrlIndex(0);
                setCopiedUrl(false);
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                networkTab === 'tailscale'
                  ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                  : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span>{t.mobileLinkTailscaleTab}</span>
              {tailscaleUrls.length > 0 ? (
                <span className="ml-0.5 font-mono text-[10px] opacity-80">
                  ({tailscaleUrls.length})
                </span>
              ) : null}
            </button>
          </div>

          {/* QR Code & URL Section */}
          {status.active && activeUrl ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/12 bg-black/35 p-5">
              <div className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={t.mobileLinkTitle}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                )}
              </div>

              <p className="text-center text-xs leading-relaxed text-white/80">
                {t.mobileLinkScanHint}
              </p>

              {/* Multi-NIC selector if more than one IP exists in this category */}
              {activeUrls.length > 1 ? (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {activeUrls.map((urlItem, idx) => {
                    let hostLabel = urlItem;
                    try {
                      hostLabel = new URL(urlItem).host;
                    } catch {
                      // keep raw
                    }
                    const selected = idx === selectedUrlIndex;
                    return (
                      <button
                        key={urlItem}
                        type="button"
                        onClick={() => {
                          setSelectedUrlIndex(idx);
                          setCopiedUrl(false);
                        }}
                        className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                          selected
                            ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-white'
                            : 'border-white/12 bg-white/5 text-white/70 hover:text-white'
                        }`}
                      >
                        {hostLabel}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* URL Preview + One-click Copy */}
              <div className="flex w-full items-center gap-2 rounded-xl border border-white/12 bg-black/50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/80 select-all">
                  {activeUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      <span className="text-emerald-200">{t.mobileLinkCopied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                      <span>{t.mobileLinkCopyUrl}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-8 text-center text-xs leading-relaxed text-[var(--theme-muted)]">
              {!status.active
                ? t.mobileLinkStatusStopped
                : networkTab === 'lan'
                  ? t.mobileLinkNoUrlsLan
                  : t.mobileLinkNoUrlsTailscale}
            </div>
          )}

          {/* Ephemeral Security Guarantee Badge */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3.5 py-2.5 text-[11px] leading-relaxed text-emerald-100/90">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span>{t.mobileLinkSecurityBadge}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
