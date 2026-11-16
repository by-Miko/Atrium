import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

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
}

// Exact geometric Atrium 'A' paths reversed to trace right-to-left
const OUTER_ARCH_RTL =
  'M356 388V238C356 172.83 311.228 120 256 120C200.772 120 156 172.83 156 238V388';
const INNER_ARCH_RTL =
  'M306 388V252C306 218.863 283.614 192 256 192C228.386 192 206 218.863 206 252V388';

export function OutroSplash({
  sessionSavedLabel,
  craftedByLabel = 'Crafted by Miko',
  reopenLabel,
  onReopen,
}: OutroSplashProps) {
  const [phase, setPhase] = useState<'shutting-down' | 'standby'>(
    'shutting-down'
  );

  useEffect(() => {
    const closeTimer = window.setTimeout(() => {
      try {
        if (window.atriumDesktop?.closeWindow) {
          window.atriumDesktop.closeWindow();
        }
        window.close();
      } catch {
        // Browsers often block window.close() on non-script-opened tabs
      }
      setPhase('standby');
    }, 2200);

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
        background:
          'radial-gradient(circle at 50% 48%, #1C1635 0%, #0E0B1A 48%, #07060C 100%)',
      }}
    >
      {/* Ambient radial glow dimming into serene standby */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0.65, scale: 1.04 }}
        animate={
          phase === 'standby'
            ? { opacity: 0.22, scale: 0.92 }
            : { opacity: [0.65, 0.45, 0.24], scale: [1.04, 0.98, 0.92] }
        }
        transition={{ duration: 2.0, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute h-[460px] w-[460px] rounded-full blur-[95px]"
        style={{
          background:
            'radial-gradient(circle, rgba(167,139,250,0.24) 0%, rgba(253,230,138,0.14) 38%, rgba(124,58,237,0.06) 65%, transparent 78%)',
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
            className="mb-6 h-12 w-10 opacity-45"
          >
            <path
              d={OUTER_ARCH_RTL}
              stroke="#C4B5FD"
              strokeWidth="34"
              strokeLinecap="round"
            />
            <path
              d={INNER_ARCH_RTL}
              stroke="#E9E4FA"
              strokeOpacity="0.85"
              strokeWidth="22"
              strokeLinecap="round"
            />
            <circle cx="256" cy="288" r="22" fill="#A78BFA" />
          </svg>

          <p className="text-sm font-medium tracking-wide text-white/75">
            {sessionSavedLabel}
          </p>

          <button
            type="button"
            onClick={onReopen}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] px-6 text-sm font-medium text-white backdrop-blur-xl transition-all hover:border-[#FDE68A]/50 hover:bg-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA] whitespace-nowrap"
          >
            {reopenLabel}
          </button>

          <p className="mt-5 text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
            {craftedByLabel}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
