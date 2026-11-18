import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface GrandIntroSplashProps {
  skipHintLabel?: string;
  muteLabel?: string;
  unmuteLabel?: string;
  onComplete: () => void;
}

const OUTER_ARCH_PATH =
  'M156 388V238C156 172.83 200.772 120 256 120C311.228 120 356 172.83 356 238V388';
const INNER_ARCH_PATH =
  'M206 388V252C206 218.863 228.386 192 256 192C283.614 192 306 218.863 306 252V388';

const WORDMARK_LETTERS = ['t', 'r', 'i', 'u', 'm'] as const;
const MUTE_STORAGE_KEY = 'atrium_grand_intro_muted';
const GRAND_INTRO_DURATION_MS = 7600;
const LOCK_AT_SEC = 3.2;

// Subtle ~2% SVG fractal film-grain data URL to eliminate 8-bit IPS gradient banding
const FILM_GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

interface FloatingMote {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  blurClass: string;
  color: string;
  delay: number;
  duration: number;
}

const FLOATING_MOTES: FloatingMote[] = [
  { id: 1, x: -195, y: -115, dx: 18, dy: -26, size: 5, blurClass: 'blur-[1.5px]', color: '#C4B5FD', delay: 0.08, duration: 5.8 },
  { id: 2, x: 210, y: -90, dx: -20, dy: -22, size: 7, blurClass: 'blur-[3px]', color: '#A78BFA', delay: 0.22, duration: 6.0 },
  { id: 3, x: -240, y: 55, dx: 22, dy: -18, size: 4, blurClass: 'blur-[1px]', color: '#FDE68A', delay: 0.28, duration: 5.4 },
  { id: 4, x: 175, y: 120, dx: -16, dy: -28, size: 6, blurClass: 'blur-[2px]', color: '#DDD6FE', delay: 0.14, duration: 5.9 },
  { id: 5, x: -95, y: 155, dx: 14, dy: -24, size: 8, blurClass: 'blur-[4px]', color: '#7C3AED', delay: 0.38, duration: 6.2 },
  { id: 6, x: 95, y: -165, dx: -12, dy: -20, size: 4, blurClass: 'blur-[1px]', color: '#FDE68A', delay: 0.18, duration: 5.3 },
  { id: 7, x: -140, y: -30, dx: 16, dy: -16, size: 5, blurClass: 'blur-[2px]', color: '#EDE9FE', delay: 0.32, duration: 5.6 },
  { id: 8, x: 245, y: 30, dx: -24, dy: -20, size: 6, blurClass: 'blur-[3px]', color: '#A78BFA', delay: 0.42, duration: 5.8 },
  { id: 9, x: 35, y: 185, dx: -10, dy: -25, size: 5, blurClass: 'blur-[2px]', color: '#FDE68A', delay: 0.26, duration: 5.5 },
  { id: 10, x: -35, y: -185, dx: 12, dy: -18, size: 7, blurClass: 'blur-[3.5px]', color: '#C4B5FD', delay: 0.16, duration: 6.1 },
];

function readInitialMutePreference(): boolean {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function GrandIntroSplash({
  skipHintLabel = 'Click anywhere to skip',
  muteLabel = 'Mute intro sound',
  unmuteLabel = 'Unmute intro sound',
  onComplete,
}: GrandIntroSplashProps) {
  const [isMuted, setIsMuted] = useState<boolean>(readInitialMutePreference);
  const completedRef = useRef(false);
  const startPerfRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const lockTimerRef = useRef<number | null>(null);

  const cleanupAudio = useCallback(() => {
    if (lockTimerRef.current !== null) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    audioCtxRef.current = null;
    masterGainRef.current = null;

    try {
      if (ctx && master) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0.0001, now, 0.08);
        window.setTimeout(() => {
          try {
            void ctx.close();
          } catch {
            // Ignore close errors
          }
        }, 240);
      } else if (ctx) {
        void ctx.close();
      }
    } catch {
      // Ignore Web Audio cleanup errors
    }
  }, []);

  const triggerComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    cleanupAudio();
    onComplete();
  }, [cleanupAudio, onComplete]);

  // Auto-complete cleanly at 7.5s & support Escape/Enter/Space keyboard skip
  useEffect(() => {
    const doneTimer = window.setTimeout(() => {
      triggerComplete();
    }, GRAND_INTRO_DURATION_MS);

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'Enter' || e.key === ' ') &&
        e.target instanceof HTMLElement &&
        e.target.closest('button')
      ) {
        return;
      }
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerComplete();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(doneTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [triggerComplete]);

  // Subtle Web Audio API Ambient Pad + 3.2s Resolution Chord
  useEffect(() => {
    let cancelled = false;
    let resumeHandler: (() => void) | null = null;

    const triggerLockResolution = (
      ctx: AudioContext,
      masterGain: GainNode
    ) => {
      try {
        const now = ctx.currentTime;
        const chimeFilter = ctx.createBiquadFilter();
        chimeFilter.type = 'lowpass';
        chimeFilter.frequency.setValueAtTime(2400, now);
        chimeFilter.connect(masterGain);

        const lockFreqs = [293.66, 440.0, 659.25, 739.99];
        lockFreqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now);
          const peak = idx === 0 ? 0.095 : idx === 1 ? 0.065 : 0.036;

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(peak, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

          osc.connect(gain);
          gain.connect(chimeFilter);
          osc.start(now);
          osc.stop(now + 3.15);
        });
      } catch {
        // Ignore audio scheduling failure
      }
    };

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 1, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      const padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.Q.setValueAtTime(0.9, ctx.currentTime);
      padFilter.connect(masterGain);

      const now = ctx.currentTime;
      const elapsedSec =
        typeof performance !== 'undefined'
          ? Math.max(0, (performance.now() - startPerfRef.current) / 1000)
          : 0;
      const remainingSec = Math.max(1.2, 7.4 - elapsedSec);

      padFilter.frequency.setValueAtTime(190, now);
      padFilter.frequency.exponentialRampToValueAtTime(
        980,
        now + Math.max(0.4, LOCK_AT_SEC - elapsedSec)
      );
      padFilter.frequency.exponentialRampToValueAtTime(
        320,
        now + remainingSec
      );

      const padVoices: Array<{
        freq: number;
        detune: number;
        peak: number;
        type: OscillatorType;
      }> = [
        { freq: 73.42, detune: -3, peak: 0.075, type: 'sine' },
        { freq: 110.0, detune: 2, peak: 0.055, type: 'triangle' },
        { freq: 164.81, detune: -4, peak: 0.032, type: 'sine' },
        { freq: 220.0, detune: 3, peak: 0.028, type: 'sine' },
      ];

      padVoices.forEach((voice) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = voice.type;
        osc.frequency.setValueAtTime(voice.freq, now);
        osc.detune.setValueAtTime(voice.detune, now);

        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.linearRampToValueAtTime(voice.peak * 0.65, now + 1.0);
        oscGain.gain.linearRampToValueAtTime(
          voice.peak,
          now + Math.max(1.2, LOCK_AT_SEC - elapsedSec)
        );
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + remainingSec);

        osc.connect(oscGain);
        oscGain.connect(padFilter);
        osc.start(now);
        osc.stop(now + remainingSec + 0.1);
      });

      const msUntilLock = Math.max(50, (LOCK_AT_SEC - elapsedSec) * 1000);
      lockTimerRef.current = window.setTimeout(() => {
        if (cancelled || completedRef.current) return;
        if (ctx.state === 'running') {
          triggerLockResolution(ctx, masterGain);
        }
      }, msUntilLock);

      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {
          // Autoplay blocked until gesture — listen once cleanly
        });
        resumeHandler = () => {
          try {
            if (!cancelled && ctx.state === 'suspended') {
              void ctx.resume();
            }
          } catch {
            // Ignore resume error
          }
        };
        window.addEventListener('pointerdown', resumeHandler, { once: true });
        window.addEventListener('keydown', resumeHandler, { once: true });
      }
    } catch {
      // Safe fallback if Web Audio is unavailable or blocked
    }

    return () => {
      cancelled = true;
      if (resumeHandler) {
        window.removeEventListener('pointerdown', resumeHandler);
        window.removeEventListener('keydown', resumeHandler);
      }
      cleanupAudio();
    };
    // Run once on mount; mute state updates masterGain separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupAudio]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted));
    } catch {
      // Ignore storage failure
    }
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;
    try {
      master.gain.setTargetAtTime(isMuted ? 0 : 1, ctx.currentTime, 0.05);
    } catch {
      // Ignore gain update failure
    }
  }, [isMuted]);

  const handleToggleMute = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      if (audioCtxRef.current?.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
    } catch {
      // Ignore resume error
    }
    setIsMuted((prev) => !prev);
  };

  const renderBrandSvg = (idPrefix: string) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="118 94 276 322"
      fill="none"
      className="h-14 w-12 overflow-visible sm:h-20 sm:w-[70px]"
    >
      <defs>
        <linearGradient
          id={`${idPrefix}-gold-stroke`}
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
          id={`${idPrefix}-arch-brand`}
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
          id={`${idPrefix}-core`}
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

      {/* Luminous white-to-warm-gold stroke pass tracing the 'A' arch cleanly (0.0s - 2.8s) */}
      <motion.g
        initial={{ opacity: 0.35 }}
        animate={{ opacity: [0.35, 1, 0.14] }}
        transition={{
          delay: 0.1,
          duration: 2.75,
          times: [0, 0.65, 1],
          ease: 'easeOut',
        }}
        style={{
          filter:
            'drop-shadow(0 0 12px rgba(253, 230, 138, 0.78)) drop-shadow(0 0 28px rgba(245, 158, 11, 0.48))',
        }}
      >
        <motion.path
          d={OUTER_ARCH_PATH}
          stroke={`url(#${idPrefix}-gold-stroke)`}
          strokeWidth="34"
          strokeLinecap="round"
          initial={{ pathLength: 0.08, opacity: 0.3 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            delay: 0.08,
            duration: 1.95,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <motion.path
          d={INNER_ARCH_PATH}
          stroke={`url(#${idPrefix}-gold-stroke)`}
          strokeWidth="22"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.15 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            delay: 0.45,
            duration: 1.8,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <motion.circle
          cx="256"
          cy="288"
          r="22"
          stroke={`url(#${idPrefix}-gold-stroke)`}
          strokeWidth="6"
          initial={{ pathLength: 0, opacity: 0, scale: 0.65 }}
          animate={{ pathLength: 1, opacity: 1, scale: 1 }}
          transition={{
            delay: 1.45,
            duration: 1.0,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </motion.g>

      {/* Crisp settled Obsidian Violet & Lavender 'A' emblem */}
      <motion.g
        initial={{ opacity: 0.15 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: 1.6,
          duration: 1.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          filter:
            'drop-shadow(0 0 16px rgba(167, 139, 250, 0.56)) drop-shadow(0 0 32px rgba(124, 58, 237, 0.32))',
        }}
      >
        <path
          d={OUTER_ARCH_PATH}
          stroke={`url(#${idPrefix}-arch-brand)`}
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
        <circle cx="256" cy="288" r="22" fill={`url(#${idPrefix}-core)`} />
      </motion.g>
    </svg>
  );

  const renderReflectionSvg = (idPrefix: string) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="118 94 276 322"
      fill="none"
      className="h-14 w-12 overflow-visible sm:h-20 sm:w-[70px]"
    >
      <defs>
        <linearGradient
          id={`${idPrefix}-arch-brand`}
          x1="128"
          y1="96"
          x2="384"
          y2="416"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>

        <linearGradient
          id={`${idPrefix}-core`}
          x1="234"
          y1="266"
          x2="278"
          y2="310"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F5F3FF" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>

      <path
        d={OUTER_ARCH_PATH}
        stroke={`url(#${idPrefix}-arch-brand)`}
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d={INNER_ARCH_PATH}
        stroke="#F3EEFF"
        strokeOpacity="0.95"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <circle cx="256" cy="288" r="22" fill={`url(#${idPrefix}-core)`} />
    </svg>
  );

  return (
    <motion.div
      role="presentation"
      aria-label="Atrium"
      onClick={triggerComplete}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      }}
      className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center overflow-hidden select-none"
    >
      {/* Layer 1: Pure GPU Composite Curtain (100% opaque 0.0s - 6.8s, lifts 1 -> 0 over 6.8s - 7.6s with exponential ease-out) */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0] }}
        transition={{
          duration: 7.6,
          times: [0, 6.8 / 7.6, 1],
          ease: ['linear', [0.22, 1, 0.36, 1]],
        }}
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          transform: 'translateZ(0)',
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          backgroundColor: '#010205',
          backgroundImage:
            'radial-gradient(circle at 50% 48%, #070C18 0%, #03050B 45%, #010205 100%)',
        }}
      >
        {/* Ultra-subtle 2% fine film-grain texture to eliminate 8-bit banding on IPS panels */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: FILM_GRAIN_SVG,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* IPS-Calibrated Atmospheric Mist (50% reduced intensity, opacity & radial spread) & Subtle Floating Light Motes */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0] }}
          transition={{
            duration: 6.7,
            times: [0, 6.0 / 6.7, 1],
            ease: ['linear', [0.4, 0, 0.2, 1]],
          }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0.12 }}
            animate={{ opacity: [0.12, 0.36, 0.44, 0.31, 0] }}
            transition={{
              duration: 6.7,
              times: [0, 0.22, 0.46, 0.85, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 24% 20% at 50% 48%, rgba(167,139,250,0.12) 0%, rgba(253,230,138,0.06) 36%, rgba(124,58,237,0.04) 58%, transparent 76%)',
            }}
          />

          {/* Delicate floating ambient light motes */}
          {FLOATING_MOTES.map((mote) => (
            <motion.span
              key={mote.id}
              initial={{
                opacity: 0,
                x: mote.x,
                y: mote.y,
                scale: 0.6,
              }}
              animate={{
                opacity: [0, 0.55, 0.32, 0],
                x: [mote.x, mote.x + mote.dx * 0.5, mote.x + mote.dx],
                y: [mote.y, mote.y + mote.dy * 0.5, mote.y + mote.dy],
                scale: [0.6, 1, 0.85],
              }}
              transition={{
                delay: mote.delay,
                duration: mote.duration,
                times: [0, 0.35, 1],
                ease: 'easeOut',
              }}
              className={`absolute rounded-full will-change-transform ${mote.blurClass}`}
              style={{
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                backgroundColor: mote.color,
                boxShadow: `0 0 ${mote.size * 2.4}px ${mote.color}`,
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Layer 2: Main Architectural Stage — Phase A Logo Fade-Out (6.0s - 6.7s) */}
      <motion.div
        initial={{
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
        }}
        animate={{
          opacity: [1, 1, 0],
          scale: [1, 1, 1.05],
          filter: ['blur(0px)', 'blur(0px)', 'blur(14px)'],
        }}
        transition={{
          duration: 6.7,
          times: [0, 6.0 / 6.7, 1],
          ease: ['linear', [0.4, 0, 0.2, 1]],
        }}
        style={{
          transformOrigin: 'center center',
          willChange: 'transform, opacity, filter',
        }}
        className="relative z-10 flex items-center justify-center px-6"
      >
        <div className="relative flex flex-col items-center">
          {/* Primary 'Atrium' Wordmark Row: Centered on 'A' (0.0s - 3.2s), then 'A' glides smoothly left as 'trium' reveals (3.2s - 5.2s) */}
          <div className="flex items-center justify-center">
            {/* Stage 1 (0.0s - 3.2s): Slow, deliberate 'A' focus, illumination & center breath */}
            <motion.div
              initial={{
                opacity: 0.12,
                x: 0,
                scale: 0.82,
                filter: 'blur(12px)',
              }}
              animate={{
                opacity: [0.12, 1, 1, 1],
                x: 0,
                scale: [0.82, 1, 1.035, 1],
                filter: ['blur(12px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
              }}
              transition={{
                duration: 3.2,
                times: [0, 0.66, 0.84, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                transformOrigin: 'center center',
                willChange: 'transform, opacity, filter',
              }}
              className="relative shrink-0"
            >
              {renderBrandSvg('grand-main')}
            </motion.div>

            {/* Stage 2 (3.2s - 5.2s): Smooth horizontal clip/mask & width expansion so 'Atrium' locks 100% centered */}
            <motion.div
              initial={{
                width: 0,
                opacity: 0,
                clipPath: 'inset(0 100% 0 0)',
              }}
              animate={{
                width: 'auto',
                opacity: 1,
                clipPath: 'inset(0 0% 0 0)',
              }}
              transition={{
                delay: 3.2,
                duration: 1.75,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex items-center overflow-hidden whitespace-nowrap"
            >
              <div className="flex items-baseline pl-1 pr-1.5 sm:pl-1.5 sm:pr-2">
                {WORDMARK_LETTERS.map((letter, idx) => (
                  <motion.span
                    key={letter}
                    initial={{
                      opacity: 0,
                      x: -8,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay: 3.32 + idx * 0.14,
                      duration: 0.72,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block bg-clip-text font-display text-[38px] font-bold tracking-[-0.03em] text-transparent sm:text-[56px]"
                    style={{
                      backgroundImage:
                        'linear-gradient(100deg, #FFFFFF 0%, #F1EEF9 34%, #FDE68A 62%, #F59E0B 80%, #FFFFFF 100%)',
                      lineHeight: 1.05,
                      filter:
                        'drop-shadow(0 0 12px rgba(167, 139, 250, 0.32))',
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>

              {/* Subtle Diagonal Glass Light-Sweep across 'trium' */}
              <motion.span
                aria-hidden="true"
                initial={{
                  opacity: 0,
                  x: '-140%',
                  skewX: -22,
                }}
                animate={{
                  opacity: [0, 0.85, 0],
                  x: ['-140%', '60%', '240%'],
                  skewX: -22,
                }}
                transition={{
                  delay: 4.45,
                  duration: 0.85,
                  times: [0, 0.45, 1],
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="pointer-events-none absolute inset-y-0 left-0 w-16 will-change-transform"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.68) 50%, rgba(253,230,138,0.45) 75%, transparent 100%)',
                  mixBlendMode: 'screen',
                }}
              />
            </motion.div>
          </div>

          {/* Horizon Line & Vivid Inverted Floor Reflection positioned directly beneath 'Atrium' */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-full left-1/2 flex w-max -translate-x-1/2 flex-col items-center pt-2"
          >
            {/* Stage 3 (3.55s - 5.2s): Crisp Luminous 1px Cyan-Gold Horizontal Glass Horizon Hairline */}
            <motion.div
              initial={{
                opacity: 0,
                scaleX: 0,
              }}
              animate={{
                opacity: 1,
                scaleX: 1,
              }}
              transition={{
                delay: 3.55,
                duration: 1.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="h-[1px] w-72 origin-center rounded-full will-change-transform sm:w-[360px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.85) 18%, rgba(224,242,254,1) 42%, rgba(253,230,138,1) 58%, rgba(56,189,248,0.85) 82%, transparent 100%)',
                boxShadow:
                  '0 0 10px rgba(56, 189, 248, 0.68), 0 0 22px rgba(253, 230, 138, 0.5)',
              }}
            />

            {/* Stage 3 (3.65s - 5.2s): Vivid Inverted Mirror Reflection of Both 'A' and 'trium' (scaleY(-1), opacity: 0.32, blur(2px)) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.32 }}
              transition={{
                delay: 3.65,
                duration: 1.35,
                ease: 'easeOut',
              }}
              className="mt-1 flex select-none justify-center"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.68) 45%, rgba(0,0,0,0.22) 80%, transparent 100%)',
                maskImage:
                  'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.68) 45%, rgba(0,0,0,0.22) 80%, transparent 100%)',
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  transform: 'scaleY(-1)',
                  transformOrigin: 'center center',
                  filter: 'blur(2px)',
                }}
              >
                <div className="shrink-0">
                  {renderReflectionSvg('grand-reflect')}
                </div>

                {/* Reflected 'trium' synchronized identically with top wordmark expansion */}
                <motion.div
                  initial={{
                    width: 0,
                    opacity: 0,
                    clipPath: 'inset(0 100% 0 0)',
                  }}
                  animate={{
                    width: 'auto',
                    opacity: 1,
                    clipPath: 'inset(0 0% 0 0)',
                  }}
                  transition={{
                    delay: 3.2,
                    duration: 1.75,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-center overflow-hidden whitespace-nowrap"
                >
                  <div className="flex items-baseline pl-1 pr-1.5 sm:pl-1.5 sm:pr-2">
                    {WORDMARK_LETTERS.map((letter, idx) => (
                      <motion.span
                        key={`ref-${letter}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 3.32 + idx * 0.14,
                          duration: 0.72,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="inline-block font-display text-[38px] font-bold tracking-[-0.03em] sm:text-[56px]"
                        style={{
                          color: '#F3EEFF',
                          lineHeight: 1.05,
                          textShadow:
                            '0 0 10px rgba(196, 181, 253, 0.48), 0 0 18px rgba(253, 230, 138, 0.34)',
                        }}
                      >
                        {letter}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Corner Controls: Subtle Audio Mute Toggle + Skip Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 6.7,
          times: [0, 0.08, 6.0 / 6.7, 1],
          ease: ['easeOut', 'linear', [0.4, 0, 0.2, 1]],
        }}
        className="fixed right-6 bottom-6 z-20 flex items-center gap-2.5"
      >
        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={isMuted ? unmuteLabel : muteLabel}
          title={isMuted ? unmuteLabel : muteLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] text-white/65 backdrop-blur-md transition-colors hover:border-[#A78BFA]/50 hover:bg-white/[0.1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA]"
        >
          {isMuted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerComplete();
          }}
          className="rounded-lg border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white/60 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/[0.1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA]"
        >
          {skipHintLabel}
        </button>
      </motion.div>
    </motion.div>
  );
}
