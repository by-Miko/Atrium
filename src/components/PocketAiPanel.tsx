import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Download,
  FileUp,
  HardDrive,
  Loader2,
  Play,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import type { UIStrings } from '../i18n/translations';
import type {
  ApiProvider,
  Language,
  PocketAiLocalModelRecord,
  PocketAiLoopbackPreset,
  PocketAiMode,
  PocketAiModelSpec,
  PocketAiRuntimeState,
} from '../types/chat';
import {
  POCKET_AI_CATALOG,
  POCKET_AI_LOOPBACK_ENDPOINTS,
  type PocketAiDownloadProgress,
} from '../utils/mobileLocalAi';

interface PocketAiPanelProps {
  t: UIStrings;
  language: Language;
  runtimeState: PocketAiRuntimeState;
  installedModels: PocketAiLocalModelRecord[];
  downloadingModelId: string | null;
  downloadProgress: PocketAiDownloadProgress | null;
  localAiError: string | null;
  onDismissError: () => void;
  onChangeMode: (mode: PocketAiMode) => void;
  onDownloadCatalogModel: (spec: PocketAiModelSpec) => Promise<void>;
  onCancelDownload: () => void;
  onImportLocalGguf: (file: File) => Promise<void>;
  onLoadModel: (model: PocketAiLocalModelRecord) => Promise<void>;
  onUnloadModel: () => Promise<void>;
  onRemoveInstalledModel?: (modelId: string) => Promise<void> | void;
  onSelectLoopbackEndpoint: (
    provider: ApiProvider,
    baseUrl: string,
    preset: PocketAiLoopbackPreset
  ) => void;
}

function formatSizeMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

export function PocketAiPanel({
  t,
  language,
  runtimeState,
  installedModels,
  downloadingModelId,
  downloadProgress,
  localAiError,
  onDismissError,
  onChangeMode,
  onDownloadCatalogModel,
  onCancelDownload,
  onImportLocalGguf,
  onLoadModel,
  onUnloadModel,
  onRemoveInstalledModel,
  onSelectLoopbackEndpoint,
}: PocketAiPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [isUnloading, setIsUnloading] = useState(false);

  const installedById = new Map(installedModels.map((m) => [m.id, m]));
  const importedOnlyModels = installedModels.filter(
    (m) => !POCKET_AI_CATALOG.some((spec) => spec.id === m.id)
  );

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await onImportLocalGguf(file);
  };

  const handleLoadClick = async (model: PocketAiLocalModelRecord) => {
    setLoadingModelId(model.id);
    try {
      await onLoadModel(model);
    } finally {
      setLoadingModelId(null);
    }
  };

  const handleUnloadClick = async () => {
    setIsUnloading(true);
    try {
      await onUnloadModel();
    } finally {
      setIsUnloading(false);
    }
  };

  const handleDeleteClick = async (modelId: string) => {
    if (!onRemoveInstalledModel) return;
    setDeletingModelId(modelId);
    try {
      await onRemoveInstalledModel(modelId);
    } finally {
      setDeletingModelId(null);
    }
  };

  return (
    <section
      aria-label={t.pocketAiTitle}
      className="space-y-4 rounded-2xl border border-[rgba(255,255,255,0.14)] bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl"
    >
      {/* Header & Adaptive RAM Readout (clean unboxed metadata) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Cpu
              className="h-4 w-4 shrink-0 text-[var(--theme-accent)]"
              aria-hidden="true"
            />
            <h3 className="font-display text-sm font-semibold text-white">
              {t.pocketAiTitle}
            </h3>
            <span className="font-mono text-[11px] font-medium text-[var(--theme-accent)]">
              {t.pocketAiOfflineBadge}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
            {t.pocketAiRamDetected(
              runtimeState.deviceMemoryGb,
              runtimeState.memoryMeasured
            )}{' '}
            ·{' '}
            <span className="text-white/85">
              {runtimeState.recommendedTier === 'compact'
                ? t.pocketAiTierCompact
                : t.pocketAiTierPerformance}
            </span>
          </p>
        </div>
      </div>

      {/* Mode Switcher: Embedded .gguf Engine vs Local Loopback */}
      <div
        role="group"
        aria-label={t.pocketAiTitle}
        className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1"
      >
        <button
          type="button"
          aria-pressed={runtimeState.mode === 'embedded-gguf'}
          onClick={() => onChangeMode('embedded-gguf')}
          className={`min-h-[44px] rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
            runtimeState.mode === 'embedded-gguf'
              ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
              : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
          }`}
        >
          {t.pocketAiModeEmbedded}
        </button>

        <button
          type="button"
          aria-pressed={runtimeState.mode === 'local-loopback'}
          onClick={() => onChangeMode('local-loopback')}
          className={`min-h-[44px] rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
            runtimeState.mode === 'local-loopback'
              ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm'
              : 'text-[var(--theme-muted)] hover:bg-white/5 hover:text-white'
          }`}
        >
          {t.pocketAiModeLoopback}
        </button>
      </div>

      {/* Active Loaded Model & Instant One-Tap Unload */}
      {runtimeState.isModelLoaded && runtimeState.activeModelName ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.1] px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-100">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
              <span className="truncate">{runtimeState.activeModelName}</span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-emerald-200/80">
              {t.pocketAiLoadedActive} · ~{runtimeState.estimatedActiveRamMb} MB
            </p>
          </div>
          <button
            type="button"
            disabled={isUnloading}
            onClick={() => void handleUnloadClick()}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-emerald-300/35 bg-black/40 px-3.5 text-xs font-semibold text-emerald-50 transition-colors hover:border-emerald-200/60 hover:bg-black/60 disabled:opacity-55"
          >
            {isUnloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 text-emerald-300" />
            )}
            <span>
              {t.pocketAiUnloadRamButton(runtimeState.estimatedActiveRamMb)}
            </span>
          </button>
        </div>
      ) : null}

      {/* Auto-Unloaded Background Notice */}
      {runtimeState.lastAutoUnloadAt ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.1] px-3.5 py-2.5 text-xs leading-relaxed text-amber-100"
        >
          {t.pocketAiAutoUnloadedNotice}
        </div>
      ) : null}

      {/* Inline Error Alert */}
      {localAiError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-2.5 rounded-2xl border border-rose-500/35 bg-rose-950/65 px-3.5 py-2.5 text-xs leading-relaxed text-rose-100"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <span>{localAiError}</span>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            aria-label={t.dismiss}
            className="shrink-0 text-rose-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {runtimeState.mode === 'embedded-gguf' ? (
        <div className="space-y-3">
          {/* Native Runtime vs Browser Verification Note */}
          <p className="text-[11px] leading-relaxed text-[var(--theme-muted)]">
            {runtimeState.nativeBridgeAvailable ? (
              <span className="font-medium text-emerald-200">
                {t.pocketAiNativeBridgeReady}
              </span>
            ) : (
              t.pocketAiNativeBridgeWebNote
            )}
          </p>

          {/* Curated Quantized GGUF Model Catalog */}
          <div className="space-y-2.5">
            {POCKET_AI_CATALOG.map((spec) => {
              const installed = installedById.get(spec.id);
              const isRecommended = spec.tier === runtimeState.recommendedTier;
              const isThisDownloading = downloadingModelId === spec.id;
              const isThisLoaded =
                runtimeState.isModelLoaded &&
                runtimeState.activeModelId === spec.id;
              const isThisLoading = loadingModelId === spec.id;

              return (
                <div
                  key={spec.id}
                  className={`rounded-2xl border p-3.5 transition-colors ${
                    isThisLoaded
                      ? 'border-emerald-400/40 bg-emerald-500/[0.08]'
                      : isRecommended
                        ? 'border-[var(--theme-accent)]/40 bg-[var(--theme-accent-soft)]/50'
                        : 'border-white/12 bg-black/35'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-xs font-semibold text-white">
                          {spec.name}
                        </span>
                        <span className="font-mono text-[11px] text-white/70">
                          {spec.paramsLabel} · {spec.quantization}
                        </span>
                        {isRecommended ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--theme-accent)]">
                            <Sparkles className="h-3 w-3" />
                            <span>{t.pocketAiRecommendedTag}</span>
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--theme-muted)]">
                        {language === 'es'
                          ? spec.descriptionEs
                          : spec.descriptionEn}
                      </p>
                      <p className="mt-1 font-mono text-[10.5px] tabular-nums text-white/60">
                        ~{(spec.downloadSizeMb / 1024).toFixed(2)} GB · RAM ~
                        {spec.estimatedRamMb} MB
                      </p>
                    </div>
                  </div>

                  {isThisDownloading && downloadProgress ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-white/85">
                        <span className="tabular-nums">
                          {t.pocketAiDownloading(downloadProgress.percent)}
                        </span>
                        {downloadProgress.verifiedHeader ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{t.pocketAiVerifiedBadge}</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[var(--theme-accent)] transition-all duration-200"
                          style={{ width: `${downloadProgress.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={onCancelDownload}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-medium text-white hover:bg-white/20"
                        >
                          <X className="h-3 w-3" />
                          <span>{t.cancel}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {installed ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{t.pocketAiVerifiedBadge}</span>
                          </span>

                          <div className="flex items-center gap-2">
                            {isThisLoaded ? (
                              <span className="text-[11px] font-semibold text-emerald-200">
                                {t.pocketAiLoadedActive}
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isThisLoading || deletingModelId === spec.id}
                                onClick={() => void handleLoadClick(installed)}
                                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors disabled:opacity-55"
                                style={{
                                  backgroundColor: 'var(--theme-accent)',
                                  color: 'var(--theme-on-accent)',
                                }}
                              >
                                {isThisLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                )}
                                <span>{t.pocketAiLoadModel}</span>
                              </button>
                            )}
                            {onRemoveInstalledModel ? (
                              <button
                                type="button"
                                disabled={deletingModelId === spec.id || isThisLoading}
                                onClick={() => void handleDeleteClick(spec.id)}
                                aria-label={t.pocketAiDeleteModelLabel(spec.name)}
                                title={t.pocketAiDeleteModelLabel(spec.name)}
                                className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/75 shadow-[inset_1px_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition-colors hover:border-rose-400/45 hover:bg-rose-500/15 hover:text-rose-200 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] disabled:opacity-50"
                              >
                                {deletingModelId === spec.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(downloadingModelId)}
                          onClick={() => void onDownloadCatalogModel(spec)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:border-[var(--theme-accent)]/60 hover:bg-white/15 disabled:opacity-45"
                        >
                          <Download className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                          <span>{t.pocketAiDownloadButton}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* User-Imported Local .gguf Models */}
            {importedOnlyModels.map((model) => {
              const isLoaded =
                runtimeState.isModelLoaded &&
                runtimeState.activeModelId === model.id;
              const isLoading = loadingModelId === model.id;
              return (
                <div
                  key={model.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/12 bg-black/40 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 shrink-0 text-[var(--theme-accent)]" />
                      <span className="truncate font-display text-xs font-semibold text-white">
                        {model.name}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-white/65">
                      <span>{formatSizeMb(model.sizeBytes)}</span>
                      <span>·</span>
                      <span className="text-emerald-300">
                        {t.pocketAiVerifiedBadge}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isLoaded ? (
                      <button
                        type="button"
                        disabled={isLoading || deletingModelId === model.id}
                        onClick={() => void handleLoadClick(model)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors disabled:opacity-55"
                        style={{
                          backgroundColor: 'var(--theme-accent)',
                          color: 'var(--theme-on-accent)',
                        }}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current" />
                        )}
                        <span>{t.pocketAiLoadModel}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-200">
                        {t.pocketAiLoadedActive}
                      </span>
                    )}
                    {onRemoveInstalledModel ? (
                      <button
                        type="button"
                        disabled={deletingModelId === model.id || isLoading}
                        onClick={() => void handleDeleteClick(model.id)}
                        aria-label={t.pocketAiDeleteModelLabel(model.name)}
                        title={t.pocketAiDeleteModelLabel(model.name)}
                        className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/75 shadow-[inset_1px_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition-colors hover:border-rose-400/45 hover:bg-rose-500/15 hover:text-rose-200 focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] disabled:opacity-50"
                      >
                        {deletingModelId === model.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Import Local .gguf File */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".gguf"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.04] px-4 text-xs font-semibold text-white/90 transition-colors hover:border-[var(--theme-accent)]/60 hover:bg-white/[0.08]"
          >
            <FileUp className="h-4 w-4 text-[var(--theme-accent)]" />
            <span>{t.pocketAiImportGgufButton}</span>
          </button>

          {/* Thermal & RAM Guard Footnote */}
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-[var(--theme-muted)]">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--theme-accent)]" />
            <span>{t.pocketAiRamGuardHint(runtimeState.autoUnloadDelaySec)}</span>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-[var(--theme-muted)]">
            {t.pocketAiLoopbackHint}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                onSelectLoopbackEndpoint(
                  POCKET_AI_LOOPBACK_ENDPOINTS.ollama.provider,
                  POCKET_AI_LOOPBACK_ENDPOINTS.ollama.baseUrl,
                  'ollama'
                )
              }
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                runtimeState.loopbackPreset === 'ollama'
                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-white'
                  : 'border-white/12 bg-black/40 text-white/85 hover:border-white/25 hover:bg-white/10'
              }`}
            >
              <Server className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" />
              <span>{t.pocketAiLoopbackOllamaBtn}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSelectLoopbackEndpoint(
                  POCKET_AI_LOOPBACK_ENDPOINTS['llama-cpp'].provider,
                  POCKET_AI_LOOPBACK_ENDPOINTS['llama-cpp'].baseUrl,
                  'llama-cpp'
                )
              }
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                runtimeState.loopbackPreset === 'llama-cpp'
                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-white'
                  : 'border-white/12 bg-black/40 text-white/85 hover:border-white/25 hover:bg-white/10'
              }`}
            >
              <Server className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" />
              <span>{t.pocketAiLoopbackLlamaBtn}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
