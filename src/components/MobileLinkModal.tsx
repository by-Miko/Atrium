import {
  AlertTriangle,
  Camera,
  Check,
  Copy,
  Globe,
  Link2Off,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type { UIStrings } from '../i18n/translations';
import type {
  Language,
  MobileLinkStatus,
  MobilePairingProfile,
} from '../types/chat';
import {
  pairWithMobileLinkDesktop,
  scanNativeAndroidQrCode,
  type SmartRouteResolution,
} from '../utils/mobileSync';
import { isElectronDesktop, isNativeAndroid } from '../utils/platform';

interface MobileLinkModalProps {
  t: UIStrings;
  isOpen: boolean;
  language: Language;
  status: MobileLinkStatus;
  onStatusChange: (nextStatus: MobileLinkStatus) => void;
  pairingProfile?: MobilePairingProfile | null;
  isClientConnected?: boolean;
  onPairClientSuccess?: (resolution: SmartRouteResolution) => void;
  onReconnectDualRoute?: () => Promise<SmartRouteResolution | null>;
  onDisconnectClient?: () => void;
  onClose: () => void;
}

export function MobileLinkModal({
  t,
  isOpen,
  language,
  status,
  onStatusChange,
  pairingProfile = null,
  isClientConnected = false,
  onPairClientSuccess,
  onReconnectDualRoute,
  onDisconnectClient,
  onClose,
}: MobileLinkModalProps) {
  const isDesktopHost = isElectronDesktop();
  const [networkTab, setNetworkTab] = useState<'lan' | 'tailscale'>('lan');
  const [selectedUrlIndex, setSelectedUrlIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isToggling, setIsToggling] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [rotateCount, setRotateCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Android / Mobile Client pairing state
  const [manualInput, setManualInput] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [isPairingClient, setIsPairingClient] = useState(false);
  const [isReconnectingClient, setIsReconnectingClient] = useState(false);
  const [clientErrorMsg, setClientErrorMsg] = useState<string | null>(null);

  const wasOpenRef = useRef(false);
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

  // Pick initial tab only when modal opens (never bounce user away from Mesh VPN tab)
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      setRotateCount(0);
      return;
    }
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setRotateCount(0);
      if (lanUrls.length === 0 && tailscaleUrls.length > 0) {
        setNetworkTab('tailscale');
      } else {
        setNetworkTab('lan');
      }
      setSelectedUrlIndex(0);
    }
  }, [isOpen, lanUrls.length, tailscaleUrls.length]);

  useEffect(() => {
    if (status.connectedClients > 0) {
      setRotateCount(0);
    }
  }, [status.connectedClients]);

  useEffect(() => {
    if (selectedUrlIndex >= activeUrls.length) {
      setSelectedUrlIndex(0);
    }
  }, [activeUrls.length, selectedUrlIndex]);

  // Auto-start Mobile Link server once when modal opens if inactive and not disabled by user
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  // Poll live status (connected clients & last sync timestamp) while open
  useEffect(() => {
    if (!isOpen || !status.active) return;
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
  }, [isOpen, status.active]);

  // Generate local QR code data URL whenever activeUrl changes (no external requests, CSP safe)
  useEffect(() => {
    if (!isOpen || !status.active || !activeUrl) {
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
  }, [activeUrl, isOpen, status.active]);

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
    setRotateCount((prev) => prev + 1);

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

  const handleRescanNetwork = useCallback(async () => {
    const statusApi = window.electronAPI?.getMobileLinkStatus;
    if (!statusApi || isRescanning) return;
    setIsRescanning(true);
    setErrorMsg(null);
    try {
      const next = await statusApi();
      if (next) {
        onStatusChangeRef.current(next);
      }
    } catch {
      // ignore transient network rescan error
    } finally {
      setIsRescanning(false);
    }
  }, [isRescanning]);

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

  const handleScanQr = useCallback(async () => {
    setClientErrorMsg(null);
    setIsScanningQr(true);
    try {
      const scannedUrl = await scanNativeAndroidQrCode();
      setManualInput(scannedUrl);
      setIsPairingClient(true);
      const resolution = await pairWithMobileLinkDesktop(
        scannedUrl,
        manualToken || undefined
      );
      onPairClientSuccess?.(resolution);
      onClose();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'QR_SCAN_CANCELLED') {
        // User backed out of camera scanner cleanly
      } else if (code === 'NATIVE_SCANNER_UNAVAILABLE') {
        setClientErrorMsg(t.mobileLinkScannerUnavailable);
      } else if (code === 'CAMERA_PERMISSION_DENIED') {
        setClientErrorMsg(t.mobileLinkCameraDenied);
      } else {
        setClientErrorMsg(
          err instanceof Error ? err.message : t.mobileLinkStartError
        );
      }
    } finally {
      setIsScanningQr(false);
      setIsPairingClient(false);
    }
  }, [manualToken, onClose, onPairClientSuccess, t]);

  const handleManualPairSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!manualInput.trim()) return;
      setClientErrorMsg(null);
      setIsPairingClient(true);
      try {
        const resolution = await pairWithMobileLinkDesktop(
          manualInput,
          manualToken || undefined
        );
        onPairClientSuccess?.(resolution);
        onClose();
      } catch (err) {
        setClientErrorMsg(
          err instanceof Error ? err.message : t.mobileLinkStartError
        );
      } finally {
        setIsPairingClient(false);
      }
    },
    [manualInput, manualToken, onClose, onPairClientSuccess, t]
  );

  const handleReconnectClick = useCallback(async () => {
    if (!onReconnectDualRoute) return;
    setClientErrorMsg(null);
    setIsReconnectingClient(true);
    try {
      const res = await onReconnectDualRoute();
      if (!res) {
        setClientErrorMsg(t.mobileLinkStartError);
      }
    } catch (err) {
      setClientErrorMsg(
        err instanceof Error ? err.message : t.mobileLinkStartError
      );
    } finally {
      setIsReconnectingClient(false);
    }
  }, [onReconnectDualRoute, t.mobileLinkStartError]);

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

  const showPublicWifiAdvisory =
    status.active &&
    networkTab === 'lan' &&
    status.connectedClients === 0 &&
    rotateCount >= 3;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md ${
        isNativeAndroid()
          ? 'pt-[max(env(safe-area-inset-top),18px)]'
          : 'pt-[max(1rem,env(safe-area-inset-top))]'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-link-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.16)] bg-[var(--theme-panel)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.18),0_28px_80px_rgba(0,0,0,0.8)] sm:max-w-[540px]"
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
                {isDesktopHost ? t.mobileLinkTitle : t.mobileLinkClientTitle}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--theme-muted)]">
                {isDesktopHost
                  ? t.mobileLinkSubtitle
                  : t.mobileLinkClientSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label={t.dismiss}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] sm:h-9 sm:w-9"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        {!isDesktopHost ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* Active Smart Dual-Route Profile Card (if paired or saved) */}
            {pairingProfile ? (
              <div className="space-y-3 rounded-2xl border border-white/14 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-semibold text-white">
                      {t.mobileLinkDualRouteReady}
                    </span>
                    {pairingProfile.activeRouteType ? (
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
                          pairingProfile.activeRouteType === 'vpn'
                            ? 'text-cyan-300'
                            : 'text-emerald-300'
                        }`}
                      >
                        {pairingProfile.activeRouteType === 'vpn' ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <Wifi className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {pairingProfile.activeRouteType === 'vpn'
                            ? t.mobileLinkRouteVpnBadge
                            : t.mobileLinkRouteLanBadge}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  {typeof pairingProfile.lastLatencyMs === 'number' ? (
                    <span className="font-mono text-[11px] tabular-nums text-white/65">
                      {t.mobileLinkSmartRouteLatency(
                        pairingProfile.lastLatencyMs
                      )}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5 font-mono text-[11px] text-white/80">
                  {pairingProfile.lanUrl ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/50">LAN</span>
                      <span className="truncate">{pairingProfile.lanUrl}</span>
                    </div>
                  ) : null}
                  {pairingProfile.vpnUrl ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/50">
                        {pairingProfile.vpnProvider || 'Mesh VPN'}
                      </span>
                      <span className="truncate">{pairingProfile.vpnUrl}</span>
                    </div>
                  ) : null}
                </div>

                <p className="text-[11px] leading-relaxed text-[var(--theme-muted)]">
                  {t.mobileLinkDualRouteHint}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {onReconnectDualRoute ? (
                    <button
                      type="button"
                      disabled={isReconnectingClient}
                      onClick={() => void handleReconnectClick()}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-55"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 text-[var(--theme-accent)] ${
                          isReconnectingClient ? 'animate-spin' : ''
                        }`}
                      />
                      <span>{t.mobileLinkReconnectDualRoute}</span>
                    </button>
                  ) : null}
                  {isClientConnected && onDisconnectClient ? (
                    <button
                      type="button"
                      onClick={onDisconnectClient}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-950/50 px-4 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-900/60"
                    >
                      <Link2Off className="h-3.5 w-3.5" />
                      <span>{t.mobileLinkDisconnectClient}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Primary Native Android QR Scanner Action */}
            <button
              type="button"
              disabled={isScanningQr || isPairingClient}
              onClick={() => void handleScanQr()}
              className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl px-4 text-sm font-semibold shadow-lg transition-all hover:opacity-95 disabled:opacity-60"
              style={{
                backgroundColor: 'var(--theme-accent)',
                color: 'var(--theme-on-accent)',
              }}
            >
              {isScanningQr ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <span>
                {isScanningQr
                  ? t.mobileLinkScanningQr
                  : t.mobileLinkScanQrButton}
              </span>
            </button>

            {clientErrorMsg ? (
              <div
                role="alert"
                className="rounded-2xl border border-rose-500/35 bg-rose-950/60 px-4 py-2.5 text-xs leading-relaxed text-rose-100"
              >
                {clientErrorMsg}
              </div>
            ) : null}

            {/* Manual Pairing URL / Private IP + Token Form */}
            <form
              onSubmit={(e) => void handleManualPairSubmit(e)}
              className="space-y-3 rounded-2xl border border-white/12 bg-black/35 p-4"
            >
              <div>
                <label
                  htmlFor="mobile-link-pair-url"
                  className="mb-1.5 block text-xs font-medium text-white/85"
                >
                  {t.mobileLinkOrPasteUrl}
                </label>
                <input
                  id="mobile-link-pair-url"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={t.mobileLinkPairInputPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11 w-full rounded-2xl border border-white/15 bg-black/45 px-3.5 font-mono text-xs text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="mobile-link-pair-token"
                  className="mb-1.5 block text-xs font-medium text-white/85"
                >
                  {t.mobileLinkPairTokenLabel}
                </label>
                <input
                  id="mobile-link-pair-token"
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder={t.mobileLinkPairTokenPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11 w-full rounded-2xl border border-white/15 bg-black/45 px-3.5 font-mono text-xs text-white placeholder-white/35 focus:border-[var(--theme-accent)] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!manualInput.trim() || isPairingClient}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-45"
              >
                {isPairingClient ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4 text-[var(--theme-accent)]" />
                )}
                <span>
                  {isPairingClient
                    ? t.mobileLinkConnecting
                    : t.mobileLinkConnectButton}
                </span>
              </button>
            </form>

            {/* Ephemeral Security Guarantee */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3.5 py-2.5 text-[11px] leading-relaxed text-emerald-100/90">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span>{t.mobileLinkSecurityBadge}</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* Server Toggle & Live Metrics (zero layout-shift single row) */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-black/35 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  status.active
                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
                    : 'bg-white/30'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white tabular-nums">
                  {isToggling && !status.active
                    ? t.mobileLinkStarting
                    : status.active
                      ? t.mobileLinkStatusActive
                      : t.mobileLinkStatusStopped}
                  {status.active && status.port ? (
                    <span className="ml-1.5 font-mono text-[11px] font-normal text-white/60 tabular-nums">
                      :{status.port}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--theme-muted)] tabular-nums">
                  {t.mobileLinkConnectedClients(status.connectedClients)} ·{' '}
                  {formattedLastSync}
                </p>
              </div>
            </div>

            <div className="flex w-[166px] shrink-0 items-center justify-end gap-2">
              {status.active ? (
                <button
                  type="button"
                  onClick={handleRotateToken}
                  disabled={isToggling}
                  title={t.mobileLinkRefreshToken}
                  aria-label={t.mobileLinkRefreshToken}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 text-[11px] font-medium text-white/85 whitespace-nowrap transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3 w-3 shrink-0 ${isToggling ? 'animate-spin' : ''}`}
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

          {/* Network Interface Switcher (Wi-Fi LAN vs Mesh VPN) */}
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
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                networkTab === 'lan'
                  ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                  : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Wifi className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t.mobileLinkLanTab}</span>
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
                setRotateCount(0);
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                networkTab === 'tailscale'
                  ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
                  : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t.mobileLinkTailscaleTab}</span>
              {tailscaleUrls.length > 0 && status.vpnProvider ? (
                <span
                  className={`truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                    networkTab === 'tailscale'
                      ? 'bg-black/20 text-current'
                      : 'border border-white/12 bg-white/[0.06] text-white/80'
                  }`}
                >
                  {status.vpnProvider}
                </span>
              ) : (
                <span className="truncate text-[10px] font-normal opacity-75">
                  {t.mobileLinkMeshVpnOfflineSub}
                </span>
              )}
            </button>
          </div>

          {showPublicWifiAdvisory ? (
            <div
              role="status"
              className="space-y-2.5 rounded-2xl border border-amber-400/30 bg-amber-500/[0.1] px-4 py-3 text-xs leading-relaxed text-amber-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <p>
                  {language === 'es' ? (
                    <>
                      ¿En Wi-Fi público o externo? Rotar el token no
                      desbloqueará la conexión: los routers públicos bloquean el
                      tráfico entre dispositivos (AP Isolation) y dejan la red
                      local sin cifrar. Usa{' '}
                      <strong className="font-semibold text-white">
                        Mesh VPN (Tailscale / ZeroTier)
                      </strong>{' '}
                      para proteger tu sesión en un túnel cifrado.
                    </>
                  ) : (
                    <>
                      On public or external Wi-Fi? Rotating the token won&apos;t
                      bypass router restrictions: public routers block
                      device-to-device traffic (AP Isolation) and leave local
                      traffic unencrypted. Switch to{' '}
                      <strong className="font-semibold text-white">
                        Mesh VPN (Tailscale / ZeroTier)
                      </strong>{' '}
                      for a private encrypted tunnel.
                    </>
                  )}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setNetworkTab('tailscale');
                    setSelectedUrlIndex(0);
                    setCopiedUrl(false);
                    setRotateCount(0);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-400/15 px-3.5 text-[11px] font-semibold text-amber-50 transition-colors hover:border-amber-300/60 hover:bg-amber-400/25"
                >
                  <Globe className="h-3.5 w-3.5 text-amber-200" />
                  <span>{t.mobileLinkSwitchToMeshVpn}</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* QR Code & URL Section (fixed minimum height to prevent vertical tab jump) */}
          <div className="flex min-h-[300px] flex-col justify-between rounded-2xl border border-white/12 bg-black/35 p-5">
            {status.active && activeUrl ? (
              <>
                <div className="flex flex-col items-center gap-3.5">
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
                </div>

                {/* URL Preview + One-click Copy + External Wi-Fi Hint */}
                <div className="mt-4 space-y-2">
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

                  {networkTab === 'lan' ? (
                    <p className="w-full text-center text-[11px] leading-snug text-white/55">
                      {t.mobileLinkLanExternalHint}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-[var(--theme-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                  {networkTab === 'tailscale' ? (
                    <Globe className="h-5 w-5" />
                  ) : (
                    <Wifi className="h-5 w-5" />
                  )}
                </div>

                <p className="max-w-sm text-xs leading-relaxed text-white/75">
                  {!status.active
                    ? t.mobileLinkStatusStopped
                    : networkTab === 'tailscale'
                      ? t.mobileLinkTailscaleOfflineCard
                      : t.mobileLinkNoUrlsLan}
                </p>

                {status.active ? (
                  <button
                    type="button"
                    onClick={handleRescanNetwork}
                    disabled={isRescanning}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/15 disabled:opacity-55"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 text-[var(--theme-accent)] ${
                        isRescanning ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {isRescanning
                        ? t.mobileLinkRescanning
                        : t.mobileLinkRescanNetwork}
                    </span>
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Ephemeral Security Guarantee Badge */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3.5 py-2.5 text-[11px] leading-relaxed text-emerald-100/90">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span>{t.mobileLinkSecurityBadge}</span>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
