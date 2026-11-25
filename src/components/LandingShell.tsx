import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Download,
  Play,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getBaseAssetUrl } from '../utils/webEnvironment';

export type LandingLang = 'en' | 'es';

export interface LandingShellProps {
  onEnterApp: () => void;
}

interface ArchitectureFactCard {
  indexLabel: string;
  accent: 'champagne' | 'amethyst' | 'silver';
  title: string;
  body: string;
  linkLabel?: string;
  linkHref?: string;
}

interface LandingCopy {
  nav: {
    vision: string;
    showcase: string;
    architecture: string;
    launchDemo: string;
    github: string;
  };
  hero: {
    statusPill: string;
    statusPillMobile: string;
    headlinePrimary: string;
    headlineAccent: string;
    identityBody: string;
    primaryCta: string;
    secondaryCta: string;
    scrollCue: string;
  };
  emblemStage: {
    bridgeLabel: string;
    subLabel: string;
    actionHint: string;
  };
  showcase: {
    eyebrow: string;
    title: string;
    fallbackBadge: string;
    fallbackTitle: string;
    fallbackDescription: string;
    fallbackStudioCta: string;
    fallbackGithubCta: string;
  };
  architecture: {
    eyebrow: string;
    title: string;
    facts: readonly ArchitectureFactCard[];
  };
  launch: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryButton: string;
    setupDownload: string;
    portableDownload: string;
  };
  footer: {
    copyright: string;
    license: string;
    skipIntro: string;
  };
}

const LANDING_COPY: Record<LandingLang, LandingCopy> = {
  en: {
    nav: {
      vision: 'Vision',
      showcase: 'Showcase',
      architecture: 'Architecture',
      launchDemo: 'Launch Demo',
      github: 'GitHub',
    },
    hero: {
      statusPill: 'ATRIUM V1.5.0 HARDENED • LOCAL-FIRST STUDIO',
      statusPillMobile: 'ATRIUM V1.5.0 • LOCAL-FIRST',
      headlinePrimary: 'Your Private AI Roleplay Studio.',
      headlineAccent: 'Crafted in Optical Liquid Glass.',
      identityBody:
        'Bring characters to life on your Windows PC and pair your phone instantly via QR. 100% private, zero subscriptions, powered by Ollama, LM Studio, or your own API keys.',
      primaryCta: 'Try Live Web Demo',
      secondaryCta: 'Download Windows v1.5.0',
      scrollCue: 'Scroll to explore Showcase & Architecture',
    },
    emblemStage: {
      bridgeLabel: 'PC ↔ Mobile Local Bridge',
      subLabel: 'Liquid Glass • v1.5.0',
      actionHint: 'Open Studio →',
    },
    showcase: {
      eyebrow: 'SHOWCASE // LIVE WORKFLOW',
      title: 'Designed for Pure Immersion.',
      fallbackBadge: 'ATRIUM V1.5.0 // INTERACTIVE REEL',
      fallbackTitle: 'See the Liquid Glass Lobby in Motion',
      fallbackDescription:
        'Step inside the browser demo right now or watch the full v1.5.0 release reel and Windows desktop source on GitHub.',
      fallbackStudioCta: 'Launch Studio',
      fallbackGithubCta: 'View on GitHub ↗',
    },
    architecture: {
      eyebrow: 'ARCHITECTURE // SYSTEM PILLARS',
      title: 'Built Without Compromises.',
      facts: [
        {
          indexLabel: '01 // Optical Liquid Glass',
          accent: 'champagne',
          title: 'Spatial Stage & Persona Craft',
          body: 'Full-bleed character framing, distraction-free Art Admire mode, TavernAI .png card import with <canvas> sanitization, and silent context memory.',
        },
        {
          indexLabel: '02 // Atrium Mobile Link',
          accent: 'amethyst',
          title: 'Instant QR Bridge & Live Sync',
          body: 'Pair your Windows desktop with your phone in one scan over Wi-Fi LAN or Tailscale VPN—zero firewall setup, local streaming proxy for Ollama & LM Studio, and bidirectional IndexedDB sync.',
        },
        {
          indexLabel: '03 // Hardened v1.5.0',
          accent: 'silver',
          title: 'Zero-Telemetry Defense in Depth',
          body: 'Sandboxed Electron 35 runtime, Windows DPAPI credential encryption, binary @electron/fuses sealing, and audited SECURITY.md policy.',
          linkLabel: 'Read SECURITY.md ↗',
          linkHref: 'https://github.com/by-miko/Atrium/blob/main/SECURITY.md',
        },
      ],
    },
    launch: {
      eyebrow: 'WEB SANDBOX // DIRECT ENTRY',
      title: 'Experience Atrium Anywhere.',
      subtitle:
        'Launch the interactive browser studio immediately, or install the hardened Windows v1.5.0 desktop build for local Electron sandboxing and Mobile Link QR sync.',
      primaryButton: 'Enter Atrium Studio →',
      setupDownload: 'Windows Installer (.exe)',
      portableDownload: 'Portable (.exe)',
    },
    footer: {
      copyright: '© 2026 Miko (by-Miko)',
      license: 'MIT Open Source • V1.5.0 Hardened',
      skipIntro: 'Skip',
    },
  },
  es: {
    nav: {
      vision: 'Visión',
      showcase: 'Galería',
      architecture: 'Arquitectura',
      launchDemo: 'Abrir Demo',
      github: 'GitHub',
    },
    hero: {
      statusPill: 'ATRIUM V1.5.0 HARDENED • LOCAL-FIRST STUDIO',
      statusPillMobile: 'ATRIUM V1.5.0 • LOCAL-FIRST',
      headlinePrimary: 'Tu Estudio Privado de Roleplay con IA.',
      headlineAccent: 'Diseñado en Optical Liquid Glass.',
      identityBody:
        'Da vida a personajes inmersivos en tu PC Windows y vincula tu celular al instante por QR. 100% privado, sin suscripciones, compatible con Ollama, LM Studio o tus propias APIs.',
      primaryCta: 'Probar Demo en Vivo',
      secondaryCta: 'Descargar Windows v1.5.0',
      scrollCue: 'Desliza para explorar la Galería y Arquitectura',
    },
    emblemStage: {
      bridgeLabel: 'Puente Local PC ↔ Móvil',
      subLabel: 'Liquid Glass • v1.5.0',
      actionHint: 'Abrir Estudio →',
    },
    showcase: {
      eyebrow: 'SHOWCASE // FLUJO EN VIVO',
      title: 'Diseñado para Inmersión Pura.',
      fallbackBadge: 'ATRIUM V1.5.0 // REEL INTERACTIVO',
      fallbackTitle: 'Explora el Lobby Liquid Glass en Acción',
      fallbackDescription:
        'Entra ahora mismo a la demo interactiva en tu navegador o consulta el video y código fuente de Windows v1.5.0 en GitHub.',
      fallbackStudioCta: 'Abrir Estudio',
      fallbackGithubCta: 'Ver en GitHub ↗',
    },
    architecture: {
      eyebrow: 'ARQUITECTURA // PILARES DEL SISTEMA',
      title: 'Construido Sin Concesiones.',
      facts: [
        {
          indexLabel: '01 // Optical Liquid Glass',
          accent: 'champagne',
          title: 'Escenario Espacial y Creación',
          body: 'Encuadre de personajes a pantalla completa, modo Art Admire sin distracciones, importación de tarjetas TavernAI .png sanitizadas con <canvas> y memoria contextual silenciosa.',
        },
        {
          indexLabel: '02 // Atrium Mobile Link',
          accent: 'amethyst',
          title: 'Puente QR Instantáneo y Sync en Vivo',
          body: 'Vincula tu PC Windows con tu teléfono en un solo escaneo por Wi-Fi LAN o Tailscale VPN: cero configuración de firewall, proxy local para Ollama y LM Studio y sincronización IndexedDB bidireccional.',
        },
        {
          indexLabel: '03 // Hardened v1.5.0',
          accent: 'silver',
          title: 'Defensa en Profundidad Sin Telemetría',
          body: 'Entorno Electron 35 aislado en sandbox, cifrado de credenciales con Windows DPAPI, sellado binario con @electron/fuses y política auditada en SECURITY.md.',
          linkLabel: 'Leer SECURITY.md ↗',
          linkHref: 'https://github.com/by-miko/Atrium/blob/main/SECURITY.md',
        },
      ],
    },
    launch: {
      eyebrow: 'SANDBOX WEB // ACCESO DIRECTO',
      title: 'Prueba Atrium Donde Quieras.',
      subtitle:
        'Abre el estudio interactivo en tu navegador al instante o descarga la compilación endurecida para Windows v1.5.0 con sandbox Electron y sincronización QR Mobile Link.',
      primaryButton: 'Entrar a Atrium Studio →',
      setupDownload: 'Instalador Windows (.exe)',
      portableDownload: 'Portable (.exe)',
    },
    footer: {
      copyright: '© 2026 Miko (by-Miko)',
      license: 'MIT Open Source • V1.5.0 Endurecida',
      skipIntro: 'Saltar',
    },
  },
};

const SMOKED_GLASS_SURFACE =
  'bg-white/[0.04] backdrop-blur-2xl border border-violet-400/20 shadow-[inset_0_1px_0_0_rgba(167,139,250,0.28),0_16px_48px_rgba(139,92,246,0.08)]';

const PRIMARY_ALABASTER_BUTTON =
  'bg-zinc-100 hover:bg-white text-zinc-950 font-medium shadow-[0_8px_24px_rgba(0,0,0,0.45)]';

const SECONDARY_GLASS_BUTTON =
  'bg-white/[0.04] hover:bg-violet-500/[0.1] backdrop-blur-xl border border-violet-400/25 hover:border-violet-300/45 text-zinc-200 hover:text-white shadow-[inset_0_1px_0_0_rgba(167,139,250,0.22)]';

const LUXURY_PILLAR_STYLES: Record<
  ArchitectureFactCard['accent'],
  { labelClass: string; badgeBg: string; topEdge: string }
> = {
  champagne: {
    labelClass: 'text-[#e5cca0]',
    badgeBg: 'border border-[#e5cca0]/35 bg-[#e5cca0]/10',
    topEdge: 'from-transparent via-[#e5cca0]/55 to-[#a78bfa]/35',
  },
  amethyst: {
    labelClass: 'text-[#a78bfa]',
    badgeBg: 'border border-violet-400/35 bg-violet-500/15',
    topEdge: 'from-transparent via-[#a78bfa]/65 to-cyan-400/35',
  },
  silver: {
    labelClass: 'text-zinc-200',
    badgeBg: 'border border-violet-400/25 bg-white/[0.06]',
    topEdge: 'from-transparent via-[#a78bfa]/45 to-[#e5cca0]/45',
  },
};

const BOOT_OUTER_ARCH_PATH =
  'M156 388V238C156 172.83 200.772 120 256 120C311.228 120 356 172.83 356 238V388';
const BOOT_INNER_ARCH_PATH =
  'M206 388V252C206 218.863 228.386 192 256 192C283.614 192 306 218.863 306 252V388';

const BOOT_DUST_MOTES = [
  { id: 1, left: '26%', top: '34%', size: 3, color: '#a78bfa', delay: '0s', duration: '3.8s' },
  { id: 2, left: '72%', top: '31%', size: 2.5, color: '#fbbf24', delay: '0.4s', duration: '4.2s' },
  { id: 3, left: '34%', top: '62%', size: 2, color: '#22d3ee', delay: '0.8s', duration: '3.6s' },
  { id: 4, left: '66%', top: '60%', size: 3, color: '#c4b5fd', delay: '0.2s', duration: '4.4s' },
  { id: 5, left: '46%', top: '24%', size: 2, color: '#fbbf24', delay: '0.6s', duration: '4.0s' },
  { id: 6, left: '54%', top: '70%', size: 2.5, color: '#a78bfa', delay: '0.5s', duration: '3.9s' },
] as const;

function DoubleArchEmblem({
  idPrefix,
  reflected = false,
  className = 'h-12 w-10 shrink-0 overflow-visible sm:h-16 sm:w-14',
}: {
  idPrefix: string;
  reflected?: boolean;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="118 94 276 322"
      fill="none"
      aria-hidden="true"
      className={className}
      style={
        reflected
          ? undefined
          : {
              filter:
                'drop-shadow(0 0 18px rgba(167, 139, 250, 0.55)) drop-shadow(0 0 34px rgba(139, 92, 246, 0.28))',
            }
      }
    >
      <defs>
        <linearGradient
          id={`${idPrefix}-arch`}
          x1="256"
          y1="120"
          x2="256"
          y2="388"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path
        d={BOOT_OUTER_ARCH_PATH}
        stroke={`url(#${idPrefix}-arch)`}
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d={BOOT_INNER_ARCH_PATH}
        stroke="#f4f4f5"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <circle cx="256" cy="288" r="22" fill="#a78bfa" />
    </svg>
  );
}

function AtriumEmblem() {
  return (
    <DoubleArchEmblem
      idPrefix="nav-atrium"
      reflected
      className="h-5 w-[18px] shrink-0 overflow-visible"
    />
  );
}

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export function LandingShell({ onEnterApp }: LandingShellProps) {
  const [lang, setLang] = useState<LandingLang>('en');
  const [videoError, setVideoError] = useState<boolean>(false);
  const [reducedMotion] = useState<boolean>(() => prefersReducedMotion());
  const [introStage, setIntroStage] = useState<0 | 1 | 2>(() =>
    prefersReducedMotion() ? 2 : 0
  );
  const [introFading, setIntroFading] = useState<boolean>(false);
  const [introVisible, setIntroVisible] = useState<boolean>(
    () => !prefersReducedMotion()
  );
  const [entered, setEntered] = useState<boolean>(() => prefersReducedMotion());
  const copy = LANDING_COPY[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const dismissIntro = useCallback(() => {
    setIntroFading(true);
    setEntered(true);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setIntroVisible(false);
      setEntered(true);
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      setIntroStage(1);
    });

    // 1.1s: Smoothly glide 'trium' in over 1700ms alongside cyan horizon & reflection
    const stage2Timer = window.setTimeout(() => {
      setIntroStage(2);
    }, 1100);

    // 3.8s: Dissolve peacefully into Hero stage
    const fadeTimer = window.setTimeout(() => {
      dismissIntro();
    }, 3800);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(stage2Timer);
      window.clearTimeout(fadeTimer);
    };
  }, [dismissIntro, reducedMotion]);

  useEffect(() => {
    if (!introFading) return;
    const unmountTimer = window.setTimeout(() => {
      setIntroVisible(false);
    }, 700);
    return () => window.clearTimeout(unmountTimer);
  }, [introFading]);

  return (
    <div className="relative h-[100dvh] min-h-[100dvh] w-screen overflow-x-hidden overflow-y-auto scroll-smooth bg-[#040508] text-white selection:bg-[#a78bfa]/30 selection:text-white">
      {/* Full 3.8-Second Signature Atrium Reflective Boot Intro */}
      {introVisible ? (
        <div
          role="button"
          tabIndex={0}
          onClick={dismissIntro}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
              e.preventDefault();
              dismissIntro();
            }
          }}
          aria-label="Skip Atrium intro"
          className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#040508] px-6 text-center transition-opacity duration-700 ease-out select-none ${
            introFading ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          {/* Floating ambient dust specks */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              introStage >= 2 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {BOOT_DUST_MOTES.map((mote) => (
              <span
                key={mote.id}
                className="absolute rounded-full"
                style={{
                  left: mote.left,
                  top: mote.top,
                  width: `${mote.size}px`,
                  height: `${mote.size}px`,
                  backgroundColor: mote.color,
                  animation: `landingDustFloat ${mote.duration} ease-in-out ${mote.delay} infinite`,
                }}
              />
            ))}
          </div>

          {/* Centered Reflective 'Atrium' Lockup */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center justify-center gap-1.5">
              {/* 0.0s-1.2s: Double-arch 'A' fades & scales in gently, then glides left cleanly */}
              <div
                className={`transition-all duration-[1100ms] ease-out ${
                  introStage >= 1
                    ? 'scale-100 opacity-100'
                    : 'scale-95 opacity-0'
                }`}
              >
                <div
                  className={`transition-transform duration-[1700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    introStage >= 2
                      ? 'translate-x-0'
                      : 'translate-x-10 sm:translate-x-14'
                  }`}
                >
                  <DoubleArchEmblem idPrefix="boot-main" />
                </div>
              </div>

              {/* 1.1s-2.8s: 'trium' glides & fades in slowly over 1700ms with zero width clipping */}
              <span
                className={`font-display inline-block whitespace-nowrap text-[34px] leading-none font-bold tracking-[-0.03em] text-[#fbbf24] transition-all duration-[1700ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-[46px] ${
                  introStage >= 2
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-3 opacity-0'
                }`}
                style={{
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.28)',
                }}
              >
                trium
              </span>
            </div>

            {/* Luminous cyan horizon line */}
            <div
              aria-hidden="true"
              className={`mt-2 h-[1px] w-56 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent shadow-[0_0_14px_rgba(34,211,238,0.48)] transition-all duration-[1700ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-72 ${
                introStage >= 2 ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
              }`}
            />

            {/* Synchronized vertical mirror reflection of 'Atrium' beneath horizon */}
            <div
              aria-hidden="true"
              className={`pointer-events-none mt-1.5 flex items-center justify-center gap-1.5 transition-opacity duration-[1700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                introStage >= 2 ? 'opacity-30' : 'opacity-0'
              }`}
              style={{
                transform: 'scaleY(-1)',
                filter: 'blur(1.5px)',
              }}
            >
              <div
                className={`transition-transform duration-[1700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  introStage >= 2
                    ? 'translate-x-0'
                    : 'translate-x-10 sm:translate-x-14'
                }`}
              >
                <DoubleArchEmblem idPrefix="boot-reflect" reflected />
              </div>
              <span
                className={`font-display inline-block whitespace-nowrap text-[34px] leading-none font-bold tracking-[-0.03em] text-[#fbbf24] transition-all duration-[1700ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-[46px] ${
                  introStage >= 2
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-3 opacity-0'
                }`}
              >
                trium
              </span>
            </div>
          </div>

          {/* Discrete Bottom-Right Skip / Saltar Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissIntro();
            }}
            className="fixed right-5 bottom-5 z-20 cursor-pointer rounded-full border border-violet-400/25 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-zinc-300 backdrop-blur-xl transition hover:border-violet-400/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa]"
          >
            {copy.footer.skipIntro}
          </button>
        </div>
      ) : null}

      {/* Ultra-Diffused Calm Liquid Glass Ambient Veil (Desktop >= 640px, Static Clean Obsidian on Mobile) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden sm:block"
      >
        <div
          className="absolute top-0 left-0 h-[62vh] w-[72vw] rounded-full opacity-[0.11] blur-[160px]"
          style={{
            background:
              'linear-gradient(135deg, #8b5cf6 0%, #38bdf8 55%, #f59e0b 100%)',
            animation: 'landingVeilDriftA 38s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute top-0 left-0 h-[62vh] w-[72vw] rounded-full opacity-[0.11] blur-[160px]"
          style={{
            background:
              'linear-gradient(225deg, #38bdf8 0%, #8b5cf6 52%, #f59e0b 100%)',
            animation: 'landingVeilDriftB 38s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* 1. Minimal Sticky Smoked Optical Liquid Glass Navbar */}
      <header className="sticky top-0 z-40 h-14 border-b border-violet-400/15 bg-[#040508]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-6 sm:gap-8">
          <a
            href="#vision"
            className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5cca0]"
          >
            <AtriumEmblem />
            <span className="font-display text-xs font-semibold tracking-[0.22em]">
              ATRIUM
            </span>
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden items-center gap-7 text-xs font-medium tracking-wide text-zinc-400 md:flex"
          >
            <a
              href="#vision"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.vision}
            </a>
            <a
              href="#showcase"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.showcase}
            </a>
            <a
              href="#architecture"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.architecture}
            </a>
            <a
              href="#launch-demo"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.launchDemo}
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <div
              role="group"
              aria-label="Language switcher"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5"
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                aria-label="Switch language to English"
                className={`cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wider transition-colors ${
                  lang === 'en'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('es')}
                aria-pressed={lang === 'es'}
                aria-label="Cambiar idioma a español"
                className={`cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wider transition-colors ${
                  lang === 'es'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ES
              </button>
            </div>

            <a
              href="https://github.com/by-miko/Atrium"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Atrium repository on GitHub"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5cca0]"
            >
              <span>{copy.nav.github}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* 2. Luxury Editorial Hero Stage with 900ms Cinematic Mount Entrance */}
        <section
          id="vision"
          className="mx-auto max-w-6xl px-6 pt-12 pb-16 sm:pt-20 sm:pb-24"
        >
          <div
            className={`transition-all duration-[900ms] ease-out ${
              entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            {/* Smoked Optical Liquid Glass Status Pill with Amethyst-Champagne Refraction */}
            <div className="mb-7 inline-flex max-w-full items-center gap-2 rounded-full border border-violet-400/25 bg-white/[0.04] px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] text-[#e5cca0] backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(167,139,250,0.28),0_0_24px_rgba(139,92,246,0.12)]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a78bfa]"
              />
              <span className="sm:hidden">{copy.hero.statusPillMobile}</span>
              <span className="hidden sm:inline">{copy.hero.statusPill}</span>
            </div>

            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
              {/* Left Column: Apple Two-Tone Editorial Headline & Dual Conversion CTAs */}
              <div className="lg:col-span-7">
                <h1 className="font-display text-balance text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
                  <span className="block text-white">
                    {copy.hero.headlinePrimary}
                  </span>
                  <span className="mt-2 block text-2xl font-semibold leading-tight text-[#c4b5fd] sm:text-4xl">
                    {copy.hero.headlineAccent}
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-[#a1a1aa] sm:text-lg">
                  {copy.hero.identityBody}
                </p>

                {/* Immediate Dual CTA Row — Full-width thumb-friendly on mobile */}
                <div className="flex flex-col gap-3.5 pt-8 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={onEnterApp}
                    className={`inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-3 text-sm transition duration-200 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto ${PRIMARY_ALABASTER_BUTTON}`}
                  >
                    <span>{copy.hero.primaryCta}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>

                  <a
                    href="https://github.com/by-miko/Atrium/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-medium transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa] sm:w-auto ${SECONDARY_GLASS_BUTTON}`}
                  >
                    <Download
                      className="h-4 w-4 shrink-0 text-[#e5cca0]"
                      aria-hidden="true"
                    />
                    <span>{copy.hero.secondaryCta}</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Concentric Smoked Optical Liquid Glass Emblem Stage */}
              <aside className="px-5 sm:px-8 lg:col-span-5 lg:px-0">
                <div
                  className={`flex items-center justify-center transition-all delay-150 duration-1000 ease-out ${
                    entered
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-4 opacity-0'
                  }`}
                >
                  <button
                    type="button"
                    onClick={onEnterApp}
                    aria-label={copy.emblemStage.actionHint}
                    className="group relative mx-auto my-4 flex h-60 w-60 cursor-pointer items-center justify-center rounded-full transition-transform duration-500 ease-out hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a78bfa] sm:h-76 sm:w-76"
                  >
                    {/* Outer Concentric Smoked Optical Glass Ring with Champagne-Gold Rim */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-2.5 rounded-full border border-[#e5cca0]/35 bg-white/[0.04] backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(229,204,160,0.45),0_0_50px_rgba(229,204,160,0.08)] transition-all duration-300 group-hover:border-[#e5cca0]/55 group-hover:shadow-[inset_0_1px_0_0_rgba(229,204,160,0.58),0_0_60px_rgba(229,204,160,0.14)] sm:inset-3"
                    />

                    {/* Inner Concentric Smoked Optical Glass Ring */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-7 rounded-full border border-violet-400/20 bg-white/[0.03] backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(229,204,160,0.22)] sm:inset-10"
                    />

                    {/* Center Optical Bridge Emblem & Label */}
                    <div className="relative z-10 flex flex-col items-center px-6 text-center sm:px-8">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/10 shadow-[inset_0_1px_0_0_rgba(167,139,250,0.35),0_0_24px_rgba(139,92,246,0.18)] sm:h-12 sm:w-12">
                        <QrCode
                          className="h-4 w-4 text-[#e5cca0] sm:h-5 sm:w-5"
                          aria-hidden="true"
                        />
                      </div>

                      <p className="font-display mt-3 text-xs font-semibold tracking-tight text-white sm:mt-4 sm:text-base">
                        {copy.emblemStage.bridgeLabel}
                      </p>

                      <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[#a1a1aa] sm:text-[10px] sm:tracking-[0.16em]">
                        {copy.emblemStage.subLabel}
                      </p>

                      <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] text-[#a78bfa] transition-colors group-hover:text-[#e5cca0] sm:mt-4 sm:text-[11px]">
                        <span>{copy.emblemStage.actionHint}</span>
                      </span>
                    </div>
                  </button>
                </div>
              </aside>
            </div>

            {/* Scroll Cue */}
            <div className="mt-12 border-t border-white/10 pt-5 sm:mt-16">
              <a
                href="#showcase"
                className="inline-flex items-center gap-2 font-mono text-xs tracking-wide text-zinc-400 transition-colors hover:text-zinc-200"
              >
                <ArrowDown
                  className="h-3.5 w-3.5 text-[#e5cca0]/80"
                  aria-hidden="true"
                />
                <span>{copy.hero.scrollCue}</span>
              </a>
            </div>
          </div>
        </section>

        {/* 3. #showcase — Smart Compact Showcase */}
        <section
          id="showcase"
          className="mx-auto max-w-6xl scroll-mt-16 border-t border-white/10 px-6 py-14 sm:py-20"
        >
          <div className="mb-8 text-center sm:mb-10">
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#e5cca0]/85">
              {copy.showcase.eyebrow}
            </p>
            <h2 className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.showcase.title}
            </h2>
          </div>

          {!videoError ? (
            <div
              className={`mx-auto max-w-5xl overflow-hidden rounded-3xl p-1.5 ${SMOKED_GLASS_SURFACE}`}
            >
              <video
                controls
                playsInline
                muted
                loop
                preload="metadata"
                src={getBaseAssetUrl('Atrium-Demo.mp4')}
                onError={() => setVideoError(true)}
                className="aspect-video w-full rounded-[20px] object-cover"
              />
            </div>
          ) : (
            <div
              className={`relative mx-auto max-w-5xl overflow-hidden rounded-[28px] p-6 sm:p-8 ${SMOKED_GLASS_SURFACE}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#a78bfa]/60 to-[#e5cca0]/45"
              />
              <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="flex items-start gap-4 sm:items-center sm:gap-5">
                  <button
                    type="button"
                    onClick={onEnterApp}
                    aria-label={copy.showcase.fallbackStudioCta}
                    className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border border-violet-400/35 bg-violet-500/10 text-[#e5cca0] shadow-[0_0_24px_rgba(139,92,246,0.2)] transition hover:scale-105 hover:border-violet-300/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa]"
                  >
                    <Play className="relative ml-0.5 h-5 w-5" aria-hidden="true" />
                  </button>

                  <div className="space-y-1.5">
                    <p className="font-mono text-[11px] tracking-[0.18em] text-[#a78bfa]">
                      {copy.showcase.fallbackBadge}
                    </p>
                    <h3 className="font-display text-lg font-semibold text-white sm:text-xl">
                      {copy.showcase.fallbackTitle}
                    </h3>
                    <p className="max-w-xl text-sm leading-relaxed text-[#a1a1aa]">
                      {copy.showcase.fallbackDescription}
                    </p>
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={onEnterApp}
                    className={`inline-flex min-h-[48px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${PRIMARY_ALABASTER_BUTTON}`}
                  >
                    {copy.showcase.fallbackStudioCta}
                  </button>
                  <a
                    href="https://github.com/by-miko/Atrium"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa] ${SECONDARY_GLASS_BUTTON}`}
                  >
                    {copy.showcase.fallbackGithubCta}
                  </a>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. #architecture — Apple Mobile Store Horizontal Swipe Carousel (< 640px) & 3-Column Grid (md:) */}
        <section
          id="architecture"
          className="mx-auto max-w-6xl scroll-mt-16 border-t border-white/10 px-6 py-14 sm:py-20"
        >
          <div className="mb-10">
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#a78bfa]">
              {copy.architecture.eyebrow}
            </p>
            <h2 className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.architecture.title}
            </h2>
          </div>

          <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
            {copy.architecture.facts.map((card) => {
              const luxury = LUXURY_PILLAR_STYLES[card.accent];
              return (
                <article
                  key={card.indexLabel}
                  className="relative flex min-w-[82vw] snap-center flex-col justify-between overflow-hidden rounded-[28px] border border-violet-400/20 bg-white/[0.04] p-7 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(167,139,250,0.28),0_16px_44px_rgba(139,92,246,0.08)] sm:min-w-[320px] md:min-w-0"
                >
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r ${luxury.topEdge}`}
                  />
                  <div className="relative z-10">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-[10px] font-medium tracking-[0.14em] ${luxury.badgeBg} ${luxury.labelClass}`}
                    >
                      {card.indexLabel}
                    </span>
                    <h3 className="font-display mt-4 text-xl font-semibold tracking-tight text-white">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#a1a1aa]">
                      {card.body}
                    </p>
                  </div>

                  {card.linkLabel && card.linkHref ? (
                    <div className="relative z-10 mt-6 border-t border-white/10 pt-4">
                      <a
                        href={card.linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-violet-400/25 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(167,139,250,0.22)] transition hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa]"
                      >
                        <ShieldCheck
                          className="h-3.5 w-3.5 text-[#a78bfa]"
                          aria-hidden="true"
                        />
                        <span>{card.linkLabel}</span>
                      </a>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {/* 5. #launch-demo — Clean Bottom CTA + Windows v1.5.0 Downloads */}
        <section
          id="launch-demo"
          className="mx-auto max-w-6xl scroll-mt-16 border-t border-white/10 px-6 py-14 sm:py-20"
        >
          <div
            className={`relative overflow-hidden rounded-[28px] p-6 sm:p-10 ${SMOKED_GLASS_SURFACE}`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#a78bfa]/60 to-[#e5cca0]/45"
            />
            <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] tracking-[0.18em] text-[#a78bfa]">
                  {copy.launch.eyebrow}
                </p>
                <h2 className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {copy.launch.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#a1a1aa] sm:text-base">
                  {copy.launch.subtitle}
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-5">
                  <a
                    href="https://github.com/by-miko/Atrium/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5cca0] ${SECONDARY_GLASS_BUTTON}`}
                  >
                    <Download
                      className="h-3.5 w-3.5 text-[#e5cca0]"
                      aria-hidden="true"
                    />
                    <span>{copy.launch.setupDownload}</span>
                  </a>
                  <a
                    href="https://github.com/by-miko/Atrium/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5cca0] ${SECONDARY_GLASS_BUTTON}`}
                  >
                    <Download
                      className="h-3.5 w-3.5 text-zinc-300"
                      aria-hidden="true"
                    />
                    <span>{copy.launch.portableDownload}</span>
                  </a>
                </div>
              </div>

              <div className="flex shrink-0 items-center lg:justify-end">
                <button
                  type="button"
                  onClick={onEnterApp}
                  className={`inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-7 py-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto ${PRIMARY_ALABASTER_BUTTON}`}
                >
                  {copy.launch.primaryButton}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 font-mono text-xs text-zinc-400 sm:flex-row sm:items-center">
          <span>{copy.footer.copyright}</span>
          <span>{copy.footer.license}</span>
        </div>
      </footer>
    </div>
  );
}
