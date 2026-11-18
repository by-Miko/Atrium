import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface IntroSplashProps {
  skipLabel?: string;
  onComplete: () => void;
}

const OUTER_ARCH_PATH =
  'M156 388V238C156 172.83 200.772 120 256 120C311.228 120 356 172.83 356 238V388';
const INNER_ARCH_PATH =
  'M206 388V252C206 218.863 228.386 192 256 192C283.614 192 306 218.863 306 252V388';

const WORDMARK_LETTERS = ['t', 'r', 'i', 'u', 'm'] as const;

// Subtle ~2% SVG fractal film-grain data URL to eliminate 8-bit IPS gradient banding
const FILM_GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

export function IntroSplash({
  skipLabel = 'Skip',
  onComplete,
}: IntroSplashProps) {
  const completedRef = useRef(false);

  useEffect(() => {
    // Fast 2.5s Central Portal intro for regular opens during the same day
    const doneTimer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, 2500);

    return () => {
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  return (
    <motion.div
      role="presentation"
      aria-label="Atrium"
      initial={{
        opacity: 1,
        transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
      }}
      exit={{
        opacity: 0,
        transform: 'translate3d(0, 0, 0) scale3d(1.03, 1.03, 1)',
      }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden select-none"
      style={{
        willChange: 'transform, opacity',
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

      {/* Centered "Central Portal" Logo Lockup */}
      <div className="relative z-10 flex items-center justify-center px-6">
        <div className="relative flex items-center justify-center">
          {/* Phase 1 (0.0s - 1.15s): Geometric 'A' SVG emblem draws in exact center */}
          <motion.div
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.92, ease: [0.22, 1, 0.36, 1] }}
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
                  id="intro-gold-stroke"
                  x1="156"
                  y1="388"
                  x2="356"
                  y2="120"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="52%" stopColor="#FDE68A" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>

                <linearGradient
                  id="intro-brand-arch"
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
                  id="intro-brand-core"
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

              {/* Luminous white-to-warm-gold strokes */}
              <motion.g
                initial={{ opacity: 1 }}
                animate={{ opacity: 0.14 }}
                transition={{ delay: 0.88, duration: 0.32, ease: 'easeOut' }}
                style={{
                  filter:
                    'drop-shadow(0 0 12px rgba(253, 230, 138, 0.72)) drop-shadow(0 0 28px rgba(245, 158, 11, 0.45))',
                }}
              >
                <motion.path
                  d={OUTER_ARCH_PATH}
                  stroke="url(#intro-gold-stroke)"
                  strokeWidth="34"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.4 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: 0.82,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                <motion.path
                  d={INNER_ARCH_PATH}
                  stroke="url(#intro-gold-stroke)"
                  strokeWidth="22"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    delay: 0.16,
                    duration: 0.72,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                <motion.circle
                  cx="256"
                  cy="288"
                  r="22"
                  stroke="url(#intro-gold-stroke)"
                  strokeWidth="6"
                  initial={{ pathLength: 0, opacity: 0, scale: 0.7 }}
                  animate={{ pathLength: 1, opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.54,
                    duration: 0.42,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </motion.g>

              {/* Completed brand gradient emblem fading in smoothly by 1.15s */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 0.82,
                  duration: 0.36,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  filter:
                    'drop-shadow(0 0 16px rgba(167, 139, 250, 0.5)) drop-shadow(0 0 32px rgba(124, 58, 237, 0.28))',
                }}
              >
                <path
                  d={OUTER_ARCH_PATH}
                  stroke="url(#intro-brand-arch)"
                  strokeWidth="34"
                  strokeLinecap="round"
                />
                <path
                  d={INNER_ARCH_PATH}
                  stroke="#E9E4FA"
                  strokeOpacity="0.92"
                  strokeWidth="22"
                  strokeLinecap="round"
                />
                <circle
                  cx="256"
                  cy="288"
                  r="22"
                  fill="url(#intro-brand-core)"
                />
              </motion.g>
            </svg>
          </motion.div>

          {/* Phase 2 (1.15s - 1.45s): Ultra-thin 1.5px vertical golden-white center light beam & outward portal wave */}
          <div
            aria-hidden="true"
            className="relative flex h-20 items-center justify-center sm:h-24"
          >
            {/* 1.5px vertical light beam right beside the 'A' */}
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{
                scaleY: [0, 1, 1, 0.4],
                opacity: [0, 0.98, 0.92, 0],
              }}
              transition={{
                delay: 1.15,
                duration: 1.15,
                times: [0, 0.22, 0.72, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-0.5 h-full w-[1.5px] origin-center rounded-full"
              style={{
                background:
                  'linear-gradient(180deg, transparent 0%, rgba(253,230,138,0.85) 22%, #FFFFFF 50%, rgba(253,230,138,0.85) 78%, transparent 100%)',
                boxShadow:
                  '0 0 10px rgba(253, 230, 138, 0.9), 0 0 22px rgba(245, 158, 11, 0.55)',
              }}
            />

            {/* Radiating warm golden light wave expanding symmetrically from center axis */}
            <motion.div
              initial={{ scale: 0.25, opacity: 0 }}
              animate={{
                scale: [0.25, 1.5, 2.3],
                opacity: [0, 0.55, 0],
              }}
              transition={{
                delay: 1.38,
                duration: 0.95,
                times: [0, 0.35, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              className="pointer-events-none absolute h-24 w-36 rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(253,230,138,0.55) 0%, rgba(245,158,11,0.22) 48%, transparent 75%)',
              }}
            />
          </div>

          {/* Phase 3 (1.4s - 2.3s): Symmetrical split as 'A' glides left and 't','r','i','u','m' emerge sequentially */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            transition={{
              delay: 1.4,
              duration: 0.72,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="overflow-hidden"
          >
            <div className="flex items-baseline pl-1 pr-1.5">
              {WORDMARK_LETTERS.map((letter, idx) => (
                <motion.span
                  key={letter}
                  initial={{
                    opacity: 0,
                    transform: 'translate3d(-16px, 0, 0) scale3d(0.96, 0.96, 1)',
                    backgroundPosition: '130% 50%',
                  }}
                  animate={{
                    opacity: 1,
                    transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
                    backgroundPosition: '0% 50%',
                  }}
                  transition={{
                    delay: 1.44 + idx * 0.075,
                    duration: 0.48,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block bg-clip-text font-display text-[44px] font-bold tracking-[-0.03em] text-transparent sm:text-[56px]"
                  style={{
                    backgroundImage:
                      'linear-gradient(100deg, #FFFFFF 0%, #F1EEF9 34%, #FDE68A 62%, #F59E0B 80%, #FFFFFF 100%)',
                    backgroundSize: '240% 100%',
                    lineHeight: 1.05,
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subtle Skip Button */}
      <motion.button
        type="button"
        onClick={handleSkip}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="fixed right-6 bottom-6 z-20 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-wide text-white/60 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/[0.1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA]"
      >
        {skipLabel}
      </motion.button>
    </motion.div>
  );
}
