import {
  Eye,
  FileImage,
  LayoutGrid,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { UIStrings } from '../i18n/translations';
import type {
  ApiProvider,
  Character,
  Language,
  LobbyBackdropMode,
  SmartRouteType,
  UserPersona,
} from '../types/chat';
import { sanitizeImageUrl } from '../utils/imageUpload';
import { parsePngCharacterCard } from '../utils/pngCharacterCard';
import {
  isElectronDesktop,
  isMobileOrAndroidRuntime,
  isNativeAndroid,
} from '../utils/platform';
import { sanitizeRenderedText } from '../utils/sanitize';
import { CharacterIcon } from './CharacterIcon';
import { PWAInstallButton } from './PWAInstallButton';

interface AtriumLobbyProps {
  t: UIStrings;
  language?: Language;
  onChangeLanguage?: (lang: Language) => void;
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
  onReorderCharacters: (orderedIds: string[]) => void;
  onOpenUserPersona: () => void;
  onOpenSettings: () => void;
  onOpenOllamaSetup: () => void;
  mobileLinkActive?: boolean;
  isMobileClientConnected?: boolean;
  activeRouteType?: SmartRouteType | null;
  onOpenMobileLink?: () => void;
  backdropMode?: LobbyBackdropMode;
  onExit: () => void;
}

interface LobbyCardProps {
  t: UIStrings;
  character: Character;
  index: number;
  introDone: boolean;
  isRecent: boolean;
  isDragging: boolean;
  isSettling: boolean;
  isAnyDragging: boolean;
  messageCount: number;
  onEnterScene: () => void;
  onOpenProfile: () => void;
  onEdit: () => void;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  registerSlotRef: (el: HTMLDivElement | null) => void;
  registerVisualRef: (el: HTMLDivElement | null) => void;
}

function LobbyCharacterCard({
  t,
  character,
  index,
  introDone,
  isRecent,
  isDragging,
  isSettling,
  isAnyDragging,
  messageCount,
  onEnterScene,
  onOpenProfile,
  onEdit,
  onPointerDown,
  registerSlotRef,
  registerVisualRef,
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
    <div
      ref={registerSlotRef}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => {
        if (isAnyDragging || isSettling) {
          e.preventDefault();
        }
      }}
      style={{ WebkitTouchCallout: 'none' }}
      className={`relative aspect-[3/4] select-none sm:aspect-[2/3] ${
        isDragging || isSettling ? 'z-40' : ''
      }`}
    >
      {/* Subtle target grid slot placeholder ghost while this card is lifted */}
      {isDragging ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[20px] border-2 border-dashed border-amber-200/35 bg-violet-950/20 backdrop-blur-sm sm:rounded-[26px]"
        />
      ) : null}

      <div
        ref={registerVisualRef}
        className={`relative h-full w-full ${
          isDragging || isSettling ? 'will-change-transform' : ''
        }`}
      >
        <motion.div
          initial={{
            opacity: 0,
            y: 18,
            scale: 0.97,
          }}
          animate={
            introDone
              ? {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }
              : {
                  opacity: 0,
                  y: 18,
                  scale: 0.97,
                }
          }
          whileHover={
            isAnyDragging || isSettling
              ? undefined
              : {
                  y: -5,
                  transition: {
                    duration: 0.2,
                    delay: 0,
                    ease: [0.22, 1, 0.36, 1],
                  },
                }
          }
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
            willChange:
              introDone && !hasEntered ? 'transform, opacity' : 'auto',
          }}
          className={`group mobile-card-blur relative h-full w-full overflow-hidden rounded-[20px] border bg-[var(--theme-glass)] backdrop-blur-md transition-shadow duration-200 ease-out sm:rounded-[26px] ${
            isDragging
              ? 'cursor-grabbing border-amber-200/50 shadow-[0_24px_48px_rgba(0,0,0,0.65),0_0_0_1.5px_rgba(229,204,160,0.45)]'
              : isSettling
                ? 'border-amber-200/35 shadow-[0_18px_40px_rgba(0,0,0,0.55)]'
                : isRecent
                  ? 'border-white/20 hover:border-amber-300/75 hover:shadow-[0_0_0_1px_rgba(253,230,138,0.35),0_20px_50px_rgba(245,158,11,0.16),0_18px_40px_rgba(0,0,0,0.65)]'
                  : 'border-[rgba(255,255,255,0.12)] hover:border-amber-300/70 hover:shadow-[0_0_0_1px_rgba(253,230,138,0.32),0_20px_50px_rgba(245,158,11,0.14),0_18px_40px_rgba(0,0,0,0.6)]'
          }`}
        >
          {showImage ? (
            <img
              src={safeImageUrl}
              alt={safeName}
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full select-none object-cover object-top transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
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
                  {messageCount}{' '}
                  {messageCount === 1 ? t.msgSingular : t.msgPlural}
                </span>
              ) : null}
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                type="button"
                data-card-action="true"
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
                data-card-action="true"
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
            className={`absolute inset-0 flex touch-manipulation flex-col justify-end p-3.5 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--theme-accent)] sm:p-5 ${
              isDragging ? 'cursor-grabbing' : ''
            }`}
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
      </div>
    </div>
  );
}

const ALL_TAG_KEY = '__ALL__';
const DRAG_HOLD_DELAY_MS = 150;
const DRAG_MOVE_CANCEL_PX = 8;
const SWAP_MIDPOINT_DEADZONE_PX = 28;
const FLIP_NEIGHBOR_DURATION_MS = 700;
const DRAG_SETTLE_DURATION_MS = 480;
const SILKY_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EDGE_AUTOSCROLL_ZONE_PX = 85;
const EDGE_AUTOSCROLL_SPEED_PX = 5;

export function AtriumLobby({
  t,
  language = 'en',
  onChangeLanguage,
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
  onReorderCharacters,
  onOpenUserPersona,
  onOpenSettings,
  onOpenOllamaSetup,
  mobileLinkActive = false,
  isMobileClientConnected = false,
  activeRouteType = null,
  onOpenMobileLink,
  backdropMode = 'orbital-clouds',
  onExit,
}: AtriumLobbyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>(ALL_TAG_KEY);
  const [pngImportError, setPngImportError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [previewOrderIds, setPreviewOrderIds] = useState<string[] | null>(null);
  const pngInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const visualRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const pendingFlipRef = useRef(false);
  const savedScrollTopRef = useRef<number | null>(null);
  const flipCleanupTimersRef = useRef<Map<string, number>>(new Map());
  const flipRafIdsRef = useRef<Map<string, number>>(new Map());
  const settleTimerRef = useRef<number | null>(null);
  const settleRafRef = useRef<number | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragLastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previewOrderRef = useRef<string[] | null>(null);
  previewOrderRef.current = previewOrderIds;
  const draggingIdRef = useRef<string | null>(null);
  draggingIdRef.current = draggingId;
  const charactersRef = useRef<Character[]>(characters);
  charactersRef.current = characters;
  const suppressClickUntilRef = useRef<number>(0);
  const lastSwapAtRef = useRef<number>(0);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const pressRef = useRef<{
    pointerId: number;
    cardId: string;
    startX: number;
    startY: number;
    isDragging: boolean;
    timerId: number | null;
  } | null>(null);

  const captureSlotRects = useCallback(() => {
    if (scrollContainerRef.current) {
      savedScrollTopRef.current = scrollContainerRef.current.scrollTop;
    }
    const snapshot = new Map<string, DOMRect>();
    for (const [id, el] of slotRefs.current.entries()) {
      snapshot.set(id, el.getBoundingClientRect());
    }
    prevRectsRef.current = snapshot;
    pendingFlipRef.current = true;
  }, []);

  useEffect(() => {
    return () => {
      if (
        pressRef.current?.timerId !== null &&
        pressRef.current?.timerId !== undefined
      ) {
        window.clearTimeout(pressRef.current.timerId);
      }
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
      if (settleRafRef.current !== null) {
        cancelAnimationFrame(settleRafRef.current);
      }
      if (autoScrollRafRef.current !== null) {
        cancelAnimationFrame(autoScrollRafRef.current);
      }
      for (const rafId of flipRafIdsRef.current.values()) {
        cancelAnimationFrame(rafId);
      }
      flipRafIdsRef.current.clear();
      for (const timerId of flipCleanupTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      flipCleanupTimersRef.current.clear();
      cleanupListenersRef.current?.();
    };
  }, []);

  const handleCardPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, cardId: string) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (charactersRef.current.length <= 1) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('button[data-card-action="true"]')) {
        return;
      }

      if (
        pressRef.current?.timerId !== null &&
        pressRef.current?.timerId !== undefined
      ) {
        window.clearTimeout(pressRef.current.timerId);
      }
      cleanupListenersRef.current?.();

      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      if (settleRafRef.current !== null) {
        cancelAnimationFrame(settleRafRef.current);
        settleRafRef.current = null;
      }
      setSettlingId(null);

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;

      const state = {
        pointerId,
        cardId,
        startX,
        startY,
        isDragging: false,
        timerId: null as number | null,
      };
      pressRef.current = state;

      const applyVisualTransform = (
        id: string,
        dx: number,
        dy: number,
        scale: number,
        transitionCss: string
      ) => {
        const visualEl = visualRefs.current.get(id);
        if (!visualEl) return;
        visualEl.style.transition = transitionCss;
        visualEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
      };

      const stopAutoScroll = () => {
        if (autoScrollRafRef.current !== null) {
          cancelAnimationFrame(autoScrollRafRef.current);
          autoScrollRafRef.current = null;
        }
      };

      const evaluateHoverSwap = (clientX: number, clientY: number) => {
        const now = Date.now();
        if (now - lastSwapAtRef.current < 120) {
          return;
        }

        const gridEl = gridRef.current;
        if (!gridEl) return;
        const gridRect = gridEl.getBoundingClientRect();
        const relX = clientX - gridRect.left;
        const relY = clientY - gridRect.top;

        let hoveredId: string | null = null;
        for (const [candidateId, slotEl] of slotRefs.current.entries()) {
          if (candidateId === state.cardId) continue;
          const halfW = slotEl.offsetWidth / 2;
          const halfH = slotEl.offsetHeight / 2;
          const centerX = slotEl.offsetLeft + halfW;
          const centerY = slotEl.offsetTop + halfH;
          const activeHalfW = Math.max(12, halfW - SWAP_MIDPOINT_DEADZONE_PX);
          const activeHalfH = Math.max(12, halfH - SWAP_MIDPOINT_DEADZONE_PX);
          if (
            Math.abs(relX - centerX) <= activeHalfW &&
            Math.abs(relY - centerY) <= activeHalfH
          ) {
            hoveredId = candidateId;
            break;
          }
        }

        if (!hoveredId) return;

        const base =
          previewOrderRef.current ?? charactersRef.current.map((c) => c.id);
        const fromIdx = base.indexOf(state.cardId);
        const toIdx = base.indexOf(hoveredId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
          return;
        }

        lastSwapAtRef.current = now;
        captureSlotRects();

        const next = [...base];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        previewOrderRef.current = next;
        setPreviewOrderIds(next);
      };

      const getEdgeAutoScrollVelocity = (clientY: number): number => {
        const scrollEl = scrollContainerRef.current;
        if (!scrollEl) return 0;
        const rect = scrollEl.getBoundingClientRect();
        const topDist = clientY - rect.top;
        const bottomDist = rect.bottom - clientY;

        if (topDist < EDGE_AUTOSCROLL_ZONE_PX) {
          const intensity = Math.min(
            1,
            Math.max(
              0,
              (EDGE_AUTOSCROLL_ZONE_PX - topDist) / EDGE_AUTOSCROLL_ZONE_PX
            )
          );
          return -EDGE_AUTOSCROLL_SPEED_PX * intensity;
        }
        if (bottomDist < EDGE_AUTOSCROLL_ZONE_PX) {
          const intensity = Math.min(
            1,
            Math.max(
              0,
              (EDGE_AUTOSCROLL_ZONE_PX - bottomDist) / EDGE_AUTOSCROLL_ZONE_PX
            )
          );
          return EDGE_AUTOSCROLL_SPEED_PX * intensity;
        }
        return 0;
      };

      const ensureAutoScrollLoop = () => {
        if (autoScrollRafRef.current !== null) return;
        let lastTime = performance.now() - 16.67;
        let carry = 0;

        const tick = (now: number) => {
          if (
            pressRef.current !== state ||
            !state.isDragging ||
            draggingIdRef.current !== state.cardId
          ) {
            autoScrollRafRef.current = null;
            return;
          }

          const scrollEl = scrollContainerRef.current;
          const pointer = dragLastPointerRef.current;
          const velocity = getEdgeAutoScrollVelocity(pointer.y);
          if (!scrollEl || Math.abs(velocity) < 0.05) {
            autoScrollRafRef.current = null;
            return;
          }

          const dt = Math.max(4, now - lastTime);
          lastTime = now;
          const frameScale = Math.min(2, Math.max(0.35, dt / 16.67));
          carry += velocity * frameScale;

          const prevScrollTop = scrollEl.scrollTop;
          scrollEl.scrollTop = prevScrollTop + carry;
          const actualScrollDelta = scrollEl.scrollTop - prevScrollTop;

          if (actualScrollDelta !== 0) {
            carry -= actualScrollDelta;
            dragOffsetRef.current = {
              x: dragOffsetRef.current.x,
              y: dragOffsetRef.current.y + actualScrollDelta,
            };
            applyVisualTransform(
              state.cardId,
              dragOffsetRef.current.x,
              dragOffsetRef.current.y,
              1.035,
              'none'
            );
            evaluateHoverSwap(pointer.x, pointer.y);
          } else if (Math.abs(carry) > 2) {
            // Reached top or bottom scroll limit
            autoScrollRafRef.current = null;
            return;
          }

          autoScrollRafRef.current = requestAnimationFrame(tick);
        };

        autoScrollRafRef.current = requestAnimationFrame(tick);
      };

      const finishPress = (commitOrder: boolean) => {
        stopAutoScroll();
        if (state.timerId !== null) {
          window.clearTimeout(state.timerId);
          state.timerId = null;
        }
        cleanupListenersRef.current?.();
        cleanupListenersRef.current = null;
        if (pressRef.current === state) {
          pressRef.current = null;
        }
        if (state.isDragging) {
          suppressClickUntilRef.current = Date.now() + 280;
          if (scrollContainerRef.current) {
            savedScrollTopRef.current = scrollContainerRef.current.scrollTop;
          }
          const latestOrder = previewOrderRef.current;
          const releasedId = state.cardId;
          const visualEl = visualRefs.current.get(releasedId);

          if (visualEl) {
            setSettlingId(releasedId);
            visualEl.style.transition = 'none';
            visualEl.style.transform = `translate3d(${dragOffsetRef.current.x}px, ${dragOffsetRef.current.y}px, 0) scale(1.035)`;
            visualEl.getBoundingClientRect();
            settleRafRef.current = requestAnimationFrame(() => {
              settleRafRef.current = requestAnimationFrame(() => {
                settleRafRef.current = null;
                const targetEl = visualRefs.current.get(releasedId);
                if (!targetEl) return;
                targetEl.style.transition = `transform ${DRAG_SETTLE_DURATION_MS}ms ${SILKY_EASING}`;
                targetEl.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
              });
            });
            settleTimerRef.current = window.setTimeout(() => {
              settleTimerRef.current = null;
              const targetEl = visualRefs.current.get(releasedId);
              if (targetEl) {
                targetEl.style.transition = '';
                targetEl.style.transform = '';
              }
              setSettlingId(null);
            }, DRAG_SETTLE_DURATION_MS + 30);
          }

          dragOffsetRef.current = { x: 0, y: 0 };
          draggingIdRef.current = null;
          setDraggingId(null);
          setPreviewOrderIds(null);
          if (commitOrder && latestOrder && latestOrder.length > 0) {
            onReorderCharacters(latestOrder);
          }
        }
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId || pressRef.current !== state) {
          return;
        }
        if (!state.isDragging) {
          const dist = Math.hypot(
            moveEvent.clientX - state.startX,
            moveEvent.clientY - state.startY
          );
          if (dist > DRAG_MOVE_CANCEL_PX) {
            finishPress(false);
          }
          return;
        }

        moveEvent.preventDefault();

        const stepX = moveEvent.clientX - dragLastPointerRef.current.x;
        const stepY = moveEvent.clientY - dragLastPointerRef.current.y;
        dragLastPointerRef.current = {
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        };
        dragOffsetRef.current = {
          x: dragOffsetRef.current.x + stepX,
          y: dragOffsetRef.current.y + stepY,
        };

        applyVisualTransform(
          state.cardId,
          dragOffsetRef.current.x,
          dragOffsetRef.current.y,
          1.035,
          'none'
        );

        if (Math.abs(getEdgeAutoScrollVelocity(moveEvent.clientY)) >= 0.05) {
          ensureAutoScrollLoop();
        } else {
          stopAutoScroll();
        }

        evaluateHoverSwap(moveEvent.clientX, moveEvent.clientY);
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId || pressRef.current !== state) {
          return;
        }
        finishPress(true);
      };

      const handlePointerCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId !== pointerId || pressRef.current !== state) {
          return;
        }
        finishPress(false);
      };

      window.addEventListener('pointermove', handlePointerMove, {
        passive: false,
      });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerCancel);

      cleanupListenersRef.current = () => {
        stopAutoScroll();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerCancel);
      };

      state.timerId = window.setTimeout(() => {
        state.timerId = null;
        if (pressRef.current !== state) return;
        state.isDragging = true;
        dragOffsetRef.current = { x: 0, y: 0 };
        dragLastPointerRef.current = { x: state.startX, y: state.startY };
        const initialOrder = charactersRef.current.map((c) => c.id);
        previewOrderRef.current = initialOrder;
        draggingIdRef.current = state.cardId;
        setPreviewOrderIds(initialOrder);
        setDraggingId(state.cardId);

        const visualEl = visualRefs.current.get(state.cardId);
        if (visualEl) {
          visualEl.style.transition =
            'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)';
          visualEl.style.transform = 'translate3d(0px, 0px, 0) scale(1.035)';
        }

        if (Math.abs(getEdgeAutoScrollVelocity(state.startY)) >= 0.05) {
          ensureAutoScrollLoop();
        }

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(12);
          } catch {
            // ignore unsupported vibration errors
          }
        }
      }, DRAG_HOLD_DELAY_MS);
    },
    [captureSlotRects, onReorderCharacters]
  );

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

  const orderedCharacters = useMemo(() => {
    if (!previewOrderIds || previewOrderIds.length === 0) {
      return characters;
    }
    const byId = new Map(characters.map((c) => [c.id, c]));
    const resolved: Character[] = [];
    for (const id of previewOrderIds) {
      const char = byId.get(id);
      if (char) {
        resolved.push(char);
        byId.delete(id);
      }
    }
    for (const remaining of byId.values()) {
      resolved.push(remaining);
    }
    return resolved;
  }, [characters, previewOrderIds]);

  // FLIP (First, Last, Invert, Play) neighbor glide & dragged card slot-delta compensation
  useLayoutEffect(() => {
    if (
      savedScrollTopRef.current !== null &&
      scrollContainerRef.current
    ) {
      scrollContainerRef.current.scrollTop = savedScrollTopRef.current;
      savedScrollTopRef.current = null;
    }

    if (!pendingFlipRef.current) return;
    pendingFlipRef.current = false;

    const prevRects = prevRectsRef.current;
    const activeDragId = draggingIdRef.current;

    for (const [id, slotEl] of slotRefs.current.entries()) {
      const prevRect = prevRects.get(id);
      if (!prevRect) continue;

      if (id === activeDragId) {
        const newSlotRect = slotEl.getBoundingClientRect();
        const slotDeltaX = newSlotRect.left - prevRect.left;
        const slotDeltaY = newSlotRect.top - prevRect.top;
        dragOffsetRef.current = {
          x: dragOffsetRef.current.x - slotDeltaX,
          y: dragOffsetRef.current.y - slotDeltaY,
        };
        const visualEl = visualRefs.current.get(id);
        if (visualEl) {
          visualEl.style.transition = 'none';
          visualEl.style.transform = `translate3d(${dragOffsetRef.current.x}px, ${dragOffsetRef.current.y}px, 0) scale(1.035)`;
        }
        continue;
      }

      // Reset any in-flight transform briefly to measure true Last layout coordinates
      const existingTransform = slotEl.style.transform;
      slotEl.style.transition = 'none';
      slotEl.style.transform = 'none';
      const newRect = slotEl.getBoundingClientRect();

      const deltaX = prevRect.left - newRect.left;
      const deltaY = prevRect.top - newRect.top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        slotEl.style.transform = existingTransform === 'translate3d(0px, 0px, 0px)' ? '' : existingTransform;
        continue;
      }

      const prevRaf = flipRafIdsRef.current.get(id);
      if (prevRaf !== undefined) {
        cancelAnimationFrame(prevRaf);
        flipRafIdsRef.current.delete(id);
      }

      const prevTimer = flipCleanupTimersRef.current.get(id);
      if (prevTimer !== undefined) {
        window.clearTimeout(prevTimer);
      }

      slotEl.style.willChange = 'transform';
      slotEl.style.transition = 'none';
      slotEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      slotEl.getBoundingClientRect();

      // Double-rAF guarantees the browser paints the inverted frame before transitioning
      const firstRaf = requestAnimationFrame(() => {
        const secondRaf = requestAnimationFrame(() => {
          flipRafIdsRef.current.delete(id);
          const currentEl = slotRefs.current.get(id);
          if (!currentEl) return;
          currentEl.style.transition = `transform ${FLIP_NEIGHBOR_DURATION_MS}ms ${SILKY_EASING}`;
          currentEl.style.transform = 'translate3d(0px, 0px, 0px)';
        });
        flipRafIdsRef.current.set(id, secondRaf);
      });
      flipRafIdsRef.current.set(id, firstRaf);

      const cleanupTimer = window.setTimeout(() => {
        flipCleanupTimersRef.current.delete(id);
        const currentEl = slotRefs.current.get(id);
        if (currentEl) {
          currentEl.style.transition = '';
          currentEl.style.transform = '';
          currentEl.style.willChange = '';
        }
      }, FLIP_NEIGHBOR_DURATION_MS + 40);
      flipCleanupTimersRef.current.set(id, cleanupTimer);
    }
  }, [orderedCharacters]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    characters.forEach((char) => {
      char.tags.forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) tagSet.add(trimmed);
      });
    });
    const sortedTags = Array.from(tagSet)
      .sort(
        (a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' }) ||
          a.localeCompare(b)
      )
      .slice(0, 10);
    return [ALL_TAG_KEY, ...sortedTags];
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orderedCharacters.filter((char) => {
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
  }, [orderedCharacters, searchQuery, activeTag]);

  const hasPersonaName = Boolean(userPersona.name.trim());

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#050507]">
      {/* Obsidian (#050507) Lobby Ambient Layer: Orbital Liquid Clouds (v1.5.2) or Classic Obsidian Static (v1.5.1) */}
      {backdropMode === 'orbital-clouds' ? (
        <div
          aria-hidden="true"
          className="mobile-bg-gpu-layer fixed inset-0 z-0 pointer-events-none overflow-hidden"
        >
          <div
            className="liquid-ambient-orb absolute top-[28%] left-[26%] h-[760px] w-[760px] rounded-full sm:h-[980px] sm:w-[980px]"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--accent-primary, #8b5cf6) 24%, transparent) 0%, color-mix(in srgb, var(--accent-glow, #6d28d9) 9%, transparent) 44%, transparent 72%)',
              animationName: 'atriumOrbitWide',
              animationDuration: '34s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: 'running',
              willChange: 'transform',
            }}
          />
          <div
            className="liquid-ambient-orb absolute top-[54%] left-[74%] h-[680px] w-[680px] rounded-full sm:h-[880px] sm:w-[880px]"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--accent-glow, #7c3aed) 20%, transparent) 0%, rgba(76, 29, 149, 0.08) 46%, transparent 72%)',
              animationName: 'atriumOrbit',
              animationDuration: '44s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDirection: 'reverse',
              animationPlayState: 'running',
              willChange: 'transform',
            }}
          />
          <div
            className="liquid-ambient-orb absolute top-[74%] left-[40%] h-[560px] w-[560px] rounded-full sm:h-[740px] sm:w-[740px]"
            style={{
              background:
                'radial-gradient(circle, rgba(229, 204, 160, 0.11) 0%, color-mix(in srgb, var(--accent-primary, #8b5cf6) 6%, transparent) 46%, transparent 72%)',
              animationName: 'atriumOrbitWide',
              animationDuration: '50s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDelay: '-14s',
              animationPlayState: 'running',
              willChange: 'transform',
            }}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse 80% 45% at 50% -5%, color-mix(in srgb, var(--accent-primary, #8b5cf6) 22%, transparent) 0%, rgba(88, 28, 135, 0.08) 45%, transparent 78%)',
          }}
        />
      )}

      {/* Top Spatial Header */}
      <header className="pt-safe relative z-20 shrink-0 border-b border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] backdrop-blur-2xl transition-colors duration-700 ease-in-out">
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
            {provider === 'openai' ? (
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

            {onOpenMobileLink &&
            ((isElectronDesktop() && Boolean(window.electronAPI?.startMobileLink)) ||
              isNativeAndroid() ||
              isMobileOrAndroidRuntime() ||
              isMobileClientConnected) ? (
              <button
                type="button"
                onClick={onOpenMobileLink}
                aria-label={
                  isElectronDesktop()
                    ? t.mobileLinkTitle
                    : t.mobileLinkClientTitle
                }
                title={
                  isElectronDesktop()
                    ? t.mobileLinkTitle
                    : t.mobileLinkClientTitle
                }
                className={`${
                  isElectronDesktop() ? 'hidden sm:inline-flex' : 'inline-flex'
                } h-10 touch-manipulation items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-medium shadow-[inset_1px_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-colors duration-700 ease-in-out focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap shrink-0 sm:h-9 sm:px-3 ${
                  mobileLinkActive || isMobileClientConnected
                    ? 'border-emerald-300/40 bg-emerald-500/[0.14] text-emerald-100 hover:border-emerald-300/65 hover:bg-emerald-500/[0.22]'
                    : 'border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] text-white/90 hover:bg-[var(--theme-glass-hover)] hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
                {isMobileClientConnected && activeRouteType ? (
                  <span className="text-[11px] font-semibold">
                    {activeRouteType === 'vpn'
                      ? t.mobileLinkRouteVpnBadge
                      : t.mobileLinkRouteLanBadge}
                  </span>
                ) : (
                  <span className="hidden sm:inline">{t.mobileLinkButton}</span>
                )}
              </button>
            ) : null}

            {onChangeLanguage ? (
              <div
                role="group"
                aria-label={t.quickLanguageToggleLabel}
                title={t.quickLanguageToggleLabel}
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[var(--theme-glass)] p-0.5 shadow-[inset_1px_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl sm:h-9"
              >
                <button
                  type="button"
                  onClick={() => onChangeLanguage('en')}
                  aria-pressed={language === 'en'}
                  className={`h-full rounded-full px-2 text-[11px] font-semibold transition-colors ${
                    language === 'en'
                      ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                      : 'text-[var(--theme-muted)] hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLanguage('es')}
                  aria-pressed={language === 'es'}
                  className={`h-full rounded-full px-2 text-[11px] font-semibold transition-colors ${
                    language === 'es'
                      ? 'bg-[var(--theme-accent)] text-[var(--theme-on-accent)]'
                      : 'text-[var(--theme-muted)] hover:text-white'
                  }`}
                >
                  ES
                </button>
              </div>
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
      <div
        ref={scrollContainerRef}
        style={{ overflowAnchor: 'none' }}
        className="relative z-10 flex-1 overflow-y-auto"
      >
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
                accept=".png,.json,image/png,application/json"
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

            {availableTags.length > 1 ? (
              <div className="no-scrollbar flex flex-nowrap snap-x items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:gap-1.5 sm:overflow-visible sm:pb-0">
                {availableTags.map((tag) => {
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
            <div
              ref={gridRef}
              style={{ overflowAnchor: 'none' }}
              className={`relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 pb-safe sm:pb-0 ${
                draggingId ? 'select-none touch-none' : ''
              }`}
            >
              {filteredCharacters.map((char, index) => (
                <LobbyCharacterCard
                  key={char.id}
                  t={t}
                  character={char}
                  index={index}
                  introDone={introDone}
                  isRecent={char.id === activeCharacterId}
                  isDragging={draggingId === char.id}
                  isSettling={settlingId === char.id}
                  isAnyDragging={draggingId !== null}
                  messageCount={messageCounts[char.id] ?? 0}
                  onEnterScene={() => {
                    if (Date.now() < suppressClickUntilRef.current) return;
                    onEnterScene(char);
                  }}
                  onOpenProfile={() => onOpenCharacterProfile(char)}
                  onEdit={() => onEditCharacter(char)}
                  onPointerDown={(e) => handleCardPointerDown(e, char.id)}
                  registerSlotRef={(el) => {
                    if (el) {
                      slotRefs.current.set(char.id, el);
                    } else {
                      slotRefs.current.delete(char.id);
                    }
                  }}
                  registerVisualRef={(el) => {
                    if (el) {
                      visualRefs.current.set(char.id, el);
                    } else {
                      visualRefs.current.delete(char.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
