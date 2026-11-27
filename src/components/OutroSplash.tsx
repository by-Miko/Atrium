import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    atriumDesktop?: {
      isDesktop?: boolean;
      closeWindow?: () => void;
    };
  }
}

interface OutroSplashProps {
  sessionSavedLabel: string;
  craftedByLabel?: string;
  reopenLabel: string;
  onReopen: () => void;
  onExitComplete?: () => void;
}

// Exact geometric Atrium 'A' paths reversed to trace right-to-left
const OUTER_ARCH_RTL =
  'M356 388V238C356 172.83 311.228 120 256 120C200.772 120 156 172.83 156 238V388';
const INNER_ARCH_RTL =
  'M306 388V252C306 218.863 283.614 192 256 192C228.386 192 206 218.863 206 252V388';

// Subtle ~2% SVG fractal film-grain data URL to eliminate 8-bit IPS gradient banding
const FILM_GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

export function OutroSplash({
  sessionSavedLabel,
  craftedByLabel = 'Crafted by Miko',
  reopenLabel,
  onReopen,
  onExitComplete,
}: OutroSplashProps) {
  const [phase, setPhase] = useState<'shutting-down' | 'standby'>(
    'shutting-down'
  );
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const durationMs = prefersReduced ? 350 : 2200;

    const closeTimer = window.setTimeout(() => {
      if (onExitCompleteRef.current) {
        onExitCompleteRef.current();
        return;
      }
      try {
        if (window.atriumDesktop?.closeWindow) {
          window.atriumDesktop.closeWindow();
        }
        window.close();
      } catch {
        // Browsers often block window.close() on non-script-opened tabs
      }
      setPhase('standby');
    }, durationMs);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Atrium"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6 text-center select-none"
      style={{
        backgroundColor: '#010205',
        backgroundImage:
          'radial-gradient(circle at 50% 48%, #070C18 0%, #03050B 45%, #010205 100%)',
      }}
    >
      {/* Subtle 2% fine film-grain texture to eliminate 8-bit IPS gradient banding */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage: FILM_GRAIN_SVG,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Focused deep-violet portal aura that preserves ink-deep obsidian edges */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0.72, scale: 1.04 }}
        animate={
          phase === 'standby'
            ? { opacity: 0.42, scale: 0.96 }
            : { opacity: [0.72, 0.55, 0.42], scale: [1.04, 1, 0.96] }
        }
        transition={{ duration: 2.0, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute z-0 h-[340px] w-[340px] rounded-full blur-[80px]"
        style={{
          background:
            'radial-gradient(circle, var(--theme-accent-soft, rgba(124,58,237,0.24)) 0%, rgba(67,56,202,0.08) 48%, transparent 74%)',
        }}
      />

      {phase === 'shutting-down' ? (
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center">
            {/* Atrium 'A' emblem with reverse right-to-left white-to-gold light stroke */}
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 0.96 }}
              transition={{ delay: 0.9, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="118 94 276 322"
                fill="none"
                className="h-16 w-14 overflow-visible sm:h-20 sm:w-[70px]"
              >
                <defs>
                  <linearGradient
                    id="outro-gold-stroke"
                    x1="356"
                    y1="388"
                    x2="156"
                    y2="120"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="52%" stopColor="#FDE68A" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>

                  <linearGradient
                    id="outro-brand-arch"
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
                    id="outro-brand-core"
                    x1="234"
                    y1="266"
                    x2="278"
                    y2="310"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#EDE9FE" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>

                {/* Completed brand emblem smoothly dissolving as reverse stroke sweeps */}
                <motion.g
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0.08 }}
                  transition={{
                    delay: 0.65,
                    duration: 0.95,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    filter:
                      'drop-shadow(0 0 16px rgba(167, 139, 250, 0.45)) drop-shadow(0 0 32px rgba(124, 58, 237, 0.25))',
                  }}
                >
                  <path
                    d={OUTER_ARCH_RTL}
                    stroke="url(#outro-brand-arch)"
                    strokeWidth="34"
                    strokeLinecap="round"
                  />
                  <path
                    d={INNER_ARCH_RTL}
                    stroke="#E9E4FA"
                    strokeOpacity="0.92"
                    strokeWidth="22"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="256"
                    cy="288"
                    r="22"
                    fill="url(#outro-brand-core)"
                  />
                </motion.g>

                {/* Reverse white-and-gold light-stroke sweep (right-to-left) */}
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{
                    delay: 0.55,
                    duration: 1.5,
                    times: [0, 0.14, 0.78, 1],
                    ease: 'easeInOut',
                  }}
                  style={{
                    filter:
                      'drop-shadow(0 0 12px rgba(253, 230, 138, 0.75)) drop-shadow(0 0 28px rgba(245, 158, 11, 0.48))',
                  }}
                >
                  <motion.path
                    d={OUTER_ARCH_RTL}
                    stroke="url(#outro-gold-stroke)"
                    strokeWidth="34"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, pathOffset: 0 }}
                    animate={{
                      pathLength: [0, 0.65, 0],
                      pathOffset: [0, 0.35, 1],
                    }}
                    transition={{
                      delay: 0.6,
                      duration: 1.35,
                      times: [0, 0.48, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                  <motion.path
                    d={INNER_ARCH_RTL}
                    stroke="url(#outro-gold-stroke)"
                    strokeWidth="22"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, pathOffset: 0 }}
                    animate={{
                      pathLength: [0, 0.6, 0],
                      pathOffset: [0, 0.4, 1],
                    }}
                    transition={{
                      delay: 0.72,
                      duration: 1.22,
                      times: [0, 0.48, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                  <motion.circle
                    cx="256"
                    cy="288"
                    r="22"
                    stroke="url(#outro-gold-stroke)"
                    strokeWidth="6"
                    initial={{ scale: 1, opacity: 0.9 }}
                    animate={{ scale: 0.5, opacity: 0 }}
                    transition={{
                      delay: 0.85,
                      duration: 0.85,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </motion.g>
              </svg>
            </motion.div>

            {/* Wordmark 'trium' retracting cleanly into the 'A' from right to left */}
            <motion.div
              initial={{ width: 'auto', opacity: 1 }}
              animate={{ width: 0, opacity: 0 }}
              transition={{
                delay: 0.22,
                duration: 0.62,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ clipPath: 'inset(0 0% 0 0)', x: 0 }}
                animate={{ clipPath: 'inset(0 100% 0 0)', x: -18 }}
                transition={{
                  delay: 0.2,
                  duration: 0.58,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="pr-1 pl-1.5"
              >
                <span
                  className="inline-block bg-clip-text font-display text-[44px] font-bold tracking-[-0.03em] text-transparent sm:text-[56px]"
                  style={{
                    backgroundImage:
                      'linear-gradient(100deg, #FFFFFF 0%, #F1EEF9 38%, #FDE68A 68%, #FFFFFF 100%)',
                    lineHeight: 1.05,
                  }}
                >
                  trium
                </span>
              </motion.div>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 0.82, 0.72], y: 0 }}
            transition={{
              delay: 0.28,
              duration: 1.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-7 text-xs font-medium tracking-[0.14em] text-[#EDE9FE]/75 uppercase"
          >
            {sessionSavedLabel}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            transition={{
              delay: 0.5,
              duration: 1.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-2.5 text-[10px] font-medium tracking-[0.18em] text-[#FDE68A]/70 uppercase"
          >
            {craftedByLabel}
          </motion.p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="118 94 276 322"
            fill="none"
            className="mb-6 h-14 w-12 overflow-visible sm:h-16 sm:w-14"
            style={{
              filter:
                'drop-shadow(0 0 16px rgba(167, 139, 250, 0.48)) drop-shadow(0 0 32px rgba(124, 58, 237, 0.26))',
            }}
          >
            <defs>
              <linearGradient
                id="standby-brand-arch"
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
                id="standby-brand-core"
                x1="234"
                y1="266"
                x2="278"
                y2="310"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#EDE9FE" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
            <path
              d={OUTER_ARCH_RTL}
              stroke="url(#standby-brand-arch)"
              strokeWidth="34"
              strokeLinecap="round"
            />
            <path
              d={INNER_ARCH_RTL}
              stroke="#E9E4FA"
              strokeOpacity="0.92"
              strokeWidth="22"
              strokeLinecap="round"
            />
            <circle cx="256" cy="288" r="22" fill="url(#standby-brand-core)" />
          </svg>

          <p className="text-sm font-medium tracking-wide text-[#F1EEF9]/90">
            {sessionSavedLabel}
          </p>

          <button
            type="button"
            onClick={onReopen}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-full border border-white/[0.16] px-6 text-sm font-medium text-[#F1EEF9] transition-all hover:border-[var(--theme-accent)]/60 hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] whitespace-nowrap"
            style={{
              background: 'var(--theme-stage-pill-bg, rgba(15, 23, 42, 0.42))',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              boxShadow:
                'inset 0 1px 1px rgba(255, 255, 255, 0.18), 0 8px 28px rgba(0, 0, 0, 0.45), 0 0 24px var(--theme-accent-soft, rgba(124, 58, 237, 0.16))',
            }}
          >
            {reopenLabel}
          </button>

          <p className="mt-5 text-[10px] font-medium tracking-[0.18em] text-[#FDE68A]/65 uppercase">
            {craftedByLabel}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
