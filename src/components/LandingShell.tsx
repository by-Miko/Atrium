import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Download,
  Monitor,
  Play,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

interface HeroMetricItem {
  title: string;
  subtitle: string;
}

interface WorkflowStepItem {
  stepNumber: string;
  icon: 'character' | 'engine' | 'mobile';
  title: string;
  body: string;
}

interface EvolutionMilestone {
  version: string;
  title: string;
  tag: string;
  isCurrent?: boolean;
  body: string;
}

interface LandingCopy {
  nav: {
    vision: string;
    howItWorks: string;
    showcase: string;
    preview: string;
    architecture: string;
    changelog: string;
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
    metrics: readonly [HeroMetricItem, HeroMetricItem, HeroMetricItem];
    scrollCue: string;
  };
  emblemStage: {
    studioLabel: string;
    actionHint: string;
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: readonly [WorkflowStepItem, WorkflowStepItem, WorkflowStepItem];
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
  studioPreview: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cardA: {
      windowTitle: string;
      badge: string;
      eyebrow: string;
      title: string;
      caption: string;
      cards: readonly [
        { name: string; role: string; tag: string },
        { name: string; role: string; tag: string },
        { name: string; role: string; tag: string },
      ];
    };
    cardB: {
      eyebrow: string;
      title: string;
      userMessage: string;
      assistantQuote: string;
      streamLabel: string;
    };
    cardC: {
      eyebrow: string;
      title: string;
      desktopLabel: string;
      desktopSub: string;
      mobileLabel: string;
      mobileSub: string;
      caption: string;
    };
    cardD: {
      eyebrow: string;
      title: string;
      localTag: string;
      cloudTag: string;
      memoryStatus: string;
      dpapiBadge: string;
    };
  };
  architecture: {
    eyebrow: string;
    title: string;
    facts: readonly ArchitectureFactCard[];
  };
  evolution: {
    eyebrow: string;
    title: string;
    milestones: readonly [
      EvolutionMilestone,
      EvolutionMilestone,
      EvolutionMilestone,
    ];
  };
  creator: {
    eyebrow: string;
    headline: string;
    body: string;
    githubProfileLabel: string;
    mitLicenseLabel: string;
  };
  launch: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryButton: string;
    setupDownload: string;
    portableDownload: string;
  };
  downloadModal: {
    eyebrowPrefix: string;
    title: string;
    noteLead: string;
    noteWarning: string;
    noteTail: string;
    stepsHeading: string;
    step1Prefix: string;
    step1Highlight: string;
    step1Suffix: string;
    step2Prefix: string;
    step2Highlight: string;
    step2Suffix: string;
    inspectSourceLabel: string;
    securityAuditLabel: string;
    cancelButton: string;
    continueButton: string;
    closeAriaLabel: string;
  };
  footer: {
    copyright: string;
    license: string;
    skipIntro: string;
  };
}

const GITHUB_RELEASES_URL = 'https://github.com/by-miko/Atrium/releases/latest';
const GITHUB_SOURCE_URL = 'https://github.com/by-miko/Atrium';
const GITHUB_SECURITY_URL =
  'https://github.com/by-miko/Atrium/blob/main/SECURITY.md';
const GITHUB_PROFILE_URL = 'https://github.com/by-Miko';
const GITHUB_LICENSE_URL = 'https://github.com/by-Miko/Atrium/blob/main/LICENSE';

const LANDING_COPY: Record<LandingLang, LandingCopy> = {
  en: {
    nav: {
      vision: 'Vision',
      howItWorks: 'How It Works',
      showcase: 'Showcase',
      preview: 'Preview',
      architecture: 'Architecture',
      changelog: 'Changelog',
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
      metrics: [
        {
          title: '100% Local-First',
          subtitle: 'Ollama, LM Studio & APIs',
        },
        {
          title: 'PC ↔ QR Mobile',
          subtitle: 'LAN & Tailscale Sync',
        },
        {
          title: 'v1.5.0 Hardened',
          subtitle: 'DPAPI & Sandboxed',
        },
      ],
      scrollCue: 'Scroll to see how Atrium works in 3 steps',
    },
    emblemStage: {
      studioLabel: 'ATRIUM STUDIO • V1.5.0',
      actionHint: 'Launch Live Demo →',
    },
    howItWorks: {
      eyebrow: 'WORKFLOW // HOW ATRIUM WORKS',
      title: 'Private AI Roleplay in 3 Steps.',
      subtitle:
        'From importing a character card to syncing live sessions across desktop and mobile, everything runs on hardware you control.',
      steps: [
        {
          stepNumber: '01',
          icon: 'character',
          title: 'Pick or Import Any Character',
          body: 'Choose built-in personas or drag-and-drop TavernAI .png character cards with embedded lorebooks.',
        },
        {
          stepNumber: '02',
          icon: 'engine',
          title: 'Connect Local AI or APIs',
          body: 'Run 100% offline with Ollama / LM Studio on your GPU, or plug in OpenAI, Anthropic, Gemini, or OpenRouter keys encrypted via Windows DPAPI.',
        },
        {
          stepNumber: '03',
          icon: 'mobile',
          title: 'Pair Your Phone via QR',
          body: 'Scan one QR code from your Windows PC to chat seamlessly from your phone over Wi-Fi LAN or Tailscale VPN with live sync.',
        },
      ],
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
    studioPreview: {
      eyebrow: 'INSIDE THE STUDIO // VISUAL TOUR',
      title: 'Crafted for Every Screen.',
      subtitle:
        'Inspect the Spatial Lobby, Optical Liquid Glass chat surface, instant QR mobile bridge, and multi-provider engine—click any preview to enter the live web studio.',
      cardA: {
        windowTitle: 'Atrium Studio — Spatial Lobby',
        badge: 'Explore Lobby →',
        eyebrow: '01 // SPATIAL STAGE',
        title: 'Spatial Lobby & Art Admire',
        caption: 'Character Cards • TavernAI .png • Art Admire Mode',
        cards: [
          { name: 'Lyra', role: 'Orbital Navigator', tag: 'Sci-Fi' },
          { name: 'Vespera', role: 'Obsidian Archivist', tag: 'Art Admire' },
          { name: 'Soren', role: 'Arcane Historian', tag: 'Lorebook' },
        ],
      },
      cardB: {
        eyebrow: '02 // OPTICAL CHAT',
        title: 'Immersive Liquid Glass Chat',
        userMessage: 'Adjust the lens—what do you see across the rain?',
        assistantQuote:
          '*Adjusts the obsidian glass lens as warm amber light settles across the room...*',
        streamLabel: '34.2 t/s • Local Stream',
      },
      cardC: {
        eyebrow: '03 // MOBILE LINK',
        title: 'PC ↔ Mobile QR Sync',
        desktopLabel: 'Windows PC',
        desktopSub: 'Sandboxed Host',
        mobileLabel: 'Phone',
        mobileSub: 'Live Mirror',
        caption: 'Wi-Fi LAN • Tailscale VPN • Live Sync',
      },
      cardD: {
        eyebrow: '04 // HYBRID AI ENGINE',
        title: 'Silent Memory & Multi-Provider Engine',
        localTag: 'Local GPU',
        cloudTag: 'Encrypted API',
        memoryStatus: 'Silent Context Memory • Zero Telemetry',
        dpapiBadge: 'Windows DPAPI Vault',
      },
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
    evolution: {
      eyebrow: 'EVOLUTION // ROADMAP & RELEASES',
      title: 'Built in the Open by Miko.',
      milestones: [
        {
          version: 'v1.4.1',
          tag: 'Security Baseline',
          title: 'v1.4.1 Hardened Edition',
          body: 'Sandboxed Electron 35 runtime, Windows DPAPI credential encryption, @electron/fuses binary sealing, and double-layer Content Security Policy.',
        },
        {
          version: 'v1.5.0',
          tag: 'Cross-Device Sync',
          title: 'v1.5.0 Mobile UI & QR Link',
          body: 'Full < 640px mobile interface redesign, instant PC-to-Mobile QR pairing over Wi-Fi LAN or Tailscale VPN, and real-time bidirectional IndexedDB sync.',
        },
        {
          version: 'v1.5.1',
          tag: 'Current',
          isCurrent: true,
          title: 'v1.5.1 Official Web & Interactive Studio (Current)',
          body: 'Optical Liquid Glass showcase portal, Bento studio previews, live browser streaming simulator, and zero-telemetry open-source distribution.',
        },
      ],
    },
    creator: {
      eyebrow: 'INDEPENDENT CREATOR // OPEN SOURCE',
      headline:
        'Built in my free time before university—crafted to be genuinely useful.',
      body: "Hi, I'm Miko. Atrium started as a personal passion project during my free time before starting university—born from curiosity about local AI, security engineering, and Optical Liquid Glass design. There is no company, investor, or data harvesting behind it: every line of code is 100% open source under the MIT license so anyone can inspect it, run it privately on their own hardware, and enjoy it freely.",
      githubProfileLabel: 'GitHub (@by-Miko) ↗',
      mitLicenseLabel: 'MIT License ↗',
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
    downloadModal: {
      eyebrowPrefix: 'OPEN-SOURCE TRANSPARENCY',
      title: 'Before You Run Atrium on Windows',
      noteLead:
        'Atrium is a free, 100% open-source (MIT) hobby project crafted independently by Miko without a paid corporate EV code-signing certificate. Because of that, Windows Defender SmartScreen will show a standard blue warning (',
      noteWarning: '“Windows protected your PC”',
      noteTail: ') the first time you launch the .exe.',
      stepsHeading: '2-STEP SAFE INSTALL GUIDE',
      step1Prefix: 'Click ',
      step1Highlight: 'More info',
      step1Suffix: ' on the Windows SmartScreen prompt.',
      step2Prefix: 'Click ',
      step2Highlight: 'Run anyway',
      step2Suffix: ' to launch Atrium safely.',
      inspectSourceLabel: 'Inspect Source Code ↗',
      securityAuditLabel: 'Read SECURITY.md ↗',
      cancelButton: 'Cancel',
      continueButton: 'Continue to GitHub Releases (.exe) ↗',
      closeAriaLabel: 'Close Windows download notice',
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
      howItWorks: 'Cómo Funciona',
      showcase: 'Galería',
      preview: 'Vistas',
      architecture: 'Arquitectura',
      changelog: 'Evolución',
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
      metrics: [
        {
          title: '100% Local-First',
          subtitle: 'Ollama, LM Studio y APIs',
        },
        {
          title: 'PC ↔ QR Móvil',
          subtitle: 'Sync LAN y Tailscale',
        },
        {
          title: 'v1.5.0 Endurecida',
          subtitle: 'DPAPI y Sandbox',
        },
      ],
      scrollCue: 'Desliza para ver cómo funciona Atrium en 3 pasos',
    },
    emblemStage: {
      studioLabel: 'ATRIUM STUDIO • V1.5.0',
      actionHint: 'Abrir Demo en Vivo →',
    },
    howItWorks: {
      eyebrow: 'FLUJO // CÓMO FUNCIONA ATRIUM',
      title: 'Roleplay Privado con IA en 3 Pasos.',
      subtitle:
        'Desde importar una tarjeta de personaje hasta sincronizar tu sesión entre escritorio y móvil, todo corre bajo tu control.',
      steps: [
        {
          stepNumber: '01',
          icon: 'character',
          title: 'Elige o Importa Cualquier Personaje',
          body: 'Escoge personas integradas o arrastra tarjetas TavernAI .png con lorebooks incluidos.',
        },
        {
          stepNumber: '02',
          icon: 'engine',
          title: 'Conecta IA Local o tus APIs',
          body: 'Ejecuta 100% offline con Ollama / LM Studio en tu GPU, o usa claves de OpenAI, Anthropic, Gemini u OpenRouter cifradas con Windows DPAPI.',
        },
        {
          stepNumber: '03',
          icon: 'mobile',
          title: 'Vincula tu Celular por QR',
          body: 'Escanea un código QR desde tu PC Windows para chatear desde tu celular por Wi-Fi LAN o Tailscale VPN con sincronización en vivo.',
        },
      ],
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
    studioPreview: {
      eyebrow: 'DENTRO DEL ESTUDIO // RECORRIDO VISUAL',
      title: 'Diseñado para Cada Pantalla.',
      subtitle:
        'Explora el Lobby Espacial, el chat en Optical Liquid Glass, el puente QR hacia tu móvil y el motor multi-proveedor; haz clic en cualquier tarjeta para entrar al estudio web.',
      cardA: {
        windowTitle: 'Atrium Studio — Lobby Espacial',
        badge: 'Explorar Lobby →',
        eyebrow: '01 // ESCENARIO ESPACIAL',
        title: 'Lobby Espacial y Modo Art Admire',
        caption: 'Tarjetas de Personaje • TavernAI .png • Modo Art Admire',
        cards: [
          { name: 'Lyra', role: 'Navegante Orbital', tag: 'Sci-Fi' },
          { name: 'Vespera', role: 'Archivista Obsidiana', tag: 'Art Admire' },
          { name: 'Soren', role: 'Historiador Arcano', tag: 'Lorebook' },
        ],
      },
      cardB: {
        eyebrow: '02 // CHAT ÓPTICO',
        title: 'Chat Inmersivo Liquid Glass',
        userMessage: 'Ajusta la lente—¿qué ves a través de la lluvia?',
        assistantQuote:
          '*Ajusta la lente de cristal obsidiana mientras la luz ámbar cálida ilumina la habitación...*',
        streamLabel: '34.2 t/s • Stream Local',
      },
      cardC: {
        eyebrow: '03 // MOBILE LINK',
        title: 'Sincronización QR PC ↔ Móvil',
        desktopLabel: 'PC Windows',
        desktopSub: 'Host Sandbox',
        mobileLabel: 'Móvil',
        mobileSub: 'Espejo en Vivo',
        caption: 'Wi-Fi LAN • Tailscale VPN • Sync en Vivo',
      },
      cardD: {
        eyebrow: '04 // MOTOR DE IA HÍBRIDO',
        title: 'Memoria Silenciosa y Motor Multi-Proveedor',
        localTag: 'GPU Local',
        cloudTag: 'API Cifrada',
        memoryStatus: 'Memoria de Contexto Silenciosa • Cero Telemetría',
        dpapiBadge: 'Bóveda Windows DPAPI',
      },
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
    evolution: {
      eyebrow: 'EVOLUCIÓN // HITOS Y VERSIONES',
      title: 'Construido en Abierto por Miko.',
      milestones: [
        {
          version: 'v1.4.1',
          tag: 'Base de Seguridad',
          title: 'v1.4.1 Edición Endurecida',
          body: 'Entorno Electron 35 aislado en sandbox, cifrado de credenciales con Windows DPAPI, sellado binario con @electron/fuses y Content Security Policy de doble capa.',
        },
        {
          version: 'v1.5.0',
          tag: 'Sync Multi-Dispositivo',
          title: 'v1.5.0 Interfaz Móvil y QR Link',
          body: 'Rediseño completo para móviles < 640px, emparejamiento QR instantáneo PC-a-Móvil por Wi-Fi LAN o Tailscale VPN y sincronización bidireccional IndexedDB en tiempo real.',
        },
        {
          version: 'v1.5.1',
          tag: 'Actual',
          isCurrent: true,
          title: 'v1.5.1 Web Oficial y Estudio Interactivo (Actual)',
          body: 'Portal showcase en Optical Liquid Glass, vistas Bento del estudio, simulador de streaming en navegador y distribución open-source sin telemetría.',
        },
      ],
    },
    creator: {
      eyebrow: 'CREADOR INDEPENDIENTE // CÓDIGO ABIERTO',
      headline:
        'Hecho en mi tiempo libre antes de entrar a la universidad—creado para servirle a alguien más.',
      body: 'Hola, soy Miko. Atrium nació como un proyecto personal por pura pasión y curiosidad en mi tiempo libre antes de entrar a la universidad, explorando la IA local, la ciberseguridad y el diseño Optical Liquid Glass. No hay ninguna empresa, inversionistas ni recolección de datos detrás: todo el código es 100% abierto bajo licencia MIT para que cualquiera pueda auditarlo, ejecutarlo en privado en su propio equipo y aprovecharlo libremente.',
      githubProfileLabel: 'GitHub (@by-Miko) ↗',
      mitLicenseLabel: 'Licencia MIT ↗',
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
    downloadModal: {
      eyebrowPrefix: 'TRANSPARENCIA OPEN-SOURCE',
      title: 'Antes de Ejecutar Atrium en Windows',
      noteLead:
        'Atrium es un proyecto personal gratuito y 100% open-source (MIT), construido de forma independiente por Miko sin un certificado corporativo EV de pago. Por eso, Windows Defender SmartScreen mostrará la advertencia azul estándar (',
      noteWarning: '“Windows protegió su PC”',
      noteTail: ') la primera vez que abras el archivo .exe.',
      stepsHeading: 'GUÍA DE INSTALACIÓN SEGURA EN 2 PASOS',
      step1Prefix: 'Haz clic en ',
      step1Highlight: 'Más información',
      step1Suffix: ' en la ventana de Windows SmartScreen.',
      step2Prefix: 'Haz clic en ',
      step2Highlight: 'Ejecutar de todas formas',
      step2Suffix: ' para abrir Atrium con seguridad.',
      inspectSourceLabel: 'Inspeccionar Código Fuente ↗',
      securityAuditLabel: 'Leer SECURITY.md ↗',
      cancelButton: 'Cancelar',
      continueButton: 'Continuar a GitHub Releases (.exe) ↗',
      closeAriaLabel: 'Cerrar aviso de descarga para Windows',
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

const SUPPORTED_PROVIDERS = [
  { name: 'Ollama', mode: 'local' as const },
  { name: 'LM Studio', mode: 'local' as const },
  { name: 'OpenAI', mode: 'cloud' as const },
  { name: 'Anthropic', mode: 'cloud' as const },
  { name: 'Gemini', mode: 'cloud' as const },
  { name: 'OpenRouter', mode: 'cloud' as const },
] as const;

function BentoRevealButton({
  onClick,
  ariaLabel,
  reducedMotion,
  delayClass = 'delay-0',
  className,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  reducedMotion: boolean;
  delayClass?: 'delay-0' | 'delay-75' | 'delay-150' | 'delay-200';
  className: string;
  children: ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [visible, setVisible] = useState<boolean>(
    () => reducedMotion || typeof IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    if (visible) return;
    const node = buttonRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -24px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group relative flex w-full cursor-pointer flex-col justify-between overflow-hidden rounded-[28px] border border-violet-400/20 bg-white/[0.04] text-left backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(167,139,250,0.28),0_16px_48px_rgba(139,92,246,0.08)] transition-all duration-700 ease-out hover:border-violet-400/45 hover:bg-white/[0.055] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa] ${delayClass} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface PendingDownloadTarget {
  label: string;
  url: string;
}

function DownloadTransparencyModal({
  target,
  copy,
  onClose,
}: {
  target: PendingDownloadTarget | null;
  copy: LandingCopy['downloadModal'];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!target) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, target]);

  if (!target) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-transparency-title"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-violet-400/25 bg-[#0b0b12]/95 p-6 text-left shadow-[inset_0_1px_0_0_rgba(167,139,250,0.3),0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#e5cca0]/65 to-[#a78bfa]/45"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label={copy.closeAriaLabel}
          className="absolute top-5 right-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-violet-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="pr-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e5cca0]/35 bg-[#e5cca0]/10 px-3 py-1 font-mono text-[10px] font-medium tracking-[0.14em] text-[#e5cca0]">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {copy.eyebrowPrefix} • {target.label}
            </span>
          </div>

          <h2
            id="download-transparency-title"
            className="font-display mt-4 text-2xl font-semibold tracking-tight text-white"
          >
            {copy.title}
          </h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          {copy.noteLead}
          <span className="font-medium text-white">{copy.noteWarning}</span>
          {copy.noteTail}
        </p>

        {/* 2-Step Safe Install Guide */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#07080d] p-4 sm:p-5">
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#a78bfa]">
            {copy.stepsHeading}
          </p>

          <ol className="mt-3 space-y-3 text-sm text-zinc-200">
            <li className="flex items-start gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#e5cca0]/40 bg-[#e5cca0]/10 font-mono text-xs font-semibold text-[#e5cca0]">
                1
              </span>
              <span className="pt-0.5 leading-relaxed">
                {copy.step1Prefix}
                <strong className="font-semibold text-[#e5cca0]">
                  {copy.step1Highlight}
                </strong>
                {copy.step1Suffix}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-400/40 bg-violet-500/15 font-mono text-xs font-semibold text-[#c4b5fd]">
                2
              </span>
              <span className="pt-0.5 leading-relaxed">
                {copy.step2Prefix}
                <strong className="font-semibold text-white">
                  {copy.step2Highlight}
                </strong>
                {copy.step2Suffix}
              </span>
            </li>
          </ol>
        </div>

        {/* Source & Security Verification Links */}
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/10 pt-4 text-xs">
          <a
            href={GITHUB_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5cca0]"
          >
            {copy.inspectSourceLabel}
          </a>
          <a
            href={GITHUB_SECURITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-[#c4b5fd] transition hover:text-[#e5cca0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa]"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{copy.securityAuditLabel}</span>
          </a>
        </div>

        {/* Modal Footer Actions */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-full px-5 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa] ${SECONDARY_GLASS_BUTTON}`}
          >
            {copy.cancelButton}
          </button>

          <a
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${PRIMARY_ALABASTER_BUTTON}`}
          >
            <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{copy.continueButton}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function LandingShell({ onEnterApp }: LandingShellProps) {
  const [lang, setLang] = useState<LandingLang>('en');
  const [videoError, setVideoError] = useState<boolean>(false);
  const [pendingDownloadTarget, setPendingDownloadTarget] =
    useState<PendingDownloadTarget | null>(null);
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
            className="hidden items-center gap-3 text-[11px] font-medium tracking-wide text-zinc-400 md:flex lg:gap-5 lg:text-xs"
          >
            <a
              href="#vision"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.vision}
            </a>
            <a
              href="#how-it-works"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.howItWorks}
            </a>
            <a
              href="#showcase"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.showcase}
            </a>
            <a
              href="#studio-preview"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.preview}
            </a>
            <a
              href="#architecture"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.architecture}
            </a>
            <a
              href="#evolution"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              {copy.nav.changelog}
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

                  <button
                    type="button"
                    onClick={() =>
                      setPendingDownloadTarget({
                        label: copy.hero.secondaryCta,
                        url: GITHUB_RELEASES_URL,
                      })
                    }
                    className={`inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-medium transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa] sm:w-auto ${SECONDARY_GLASS_BUTTON}`}
                  >
                    <Download
                      className="h-4 w-4 shrink-0 text-[#e5cca0]"
                      aria-hidden="true"
                    />
                    <span>{copy.hero.secondaryCta}</span>
                  </button>
                </div>
                {/* Refined 3-Column Quick-Impact Metric Strip */}
                <div className="mt-8 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10">
                  {copy.hero.metrics.map((metric) => (
                    <div
                      key={metric.title}
                      className="sm:px-5 sm:first:pl-0 sm:last:pr-0"
                    >
                      <p className="font-display text-xs font-semibold tracking-tight text-white sm:text-sm">
                        {metric.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-[#a1a1aa] sm:text-xs">
                        {metric.subtitle}
                      </p>
                    </div>
                  ))}
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
                    className="group relative mx-auto my-4 flex h-64 w-64 cursor-pointer items-center justify-center rounded-full transition-transform duration-500 ease-out hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a78bfa] sm:h-80 sm:w-80"
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

                    {/* Official Atrium Double-Arch Emblem & Studio Label */}
                    <div className="relative z-10 flex flex-col items-center px-6 text-center sm:px-8">
                      <DoubleArchEmblem
                        idPrefix="hero-medallion"
                        className="h-20 w-20 shrink-0 overflow-visible transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24"
                      />

                      <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-[#e5cca0]/90 sm:mt-4 sm:text-[11px]">
                        {copy.emblemStage.studioLabel}
                      </p>

                      <span className="mt-1.5 inline-flex items-center gap-1 font-sans text-xs font-medium text-[#c4b5fd] transition-colors group-hover:text-[#e5cca0] sm:text-sm">
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
                href="#how-it-works"
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

        {/* 2.5 #how-it-works — Didactic 3-Step Visual Workflow */}
        <section
          id="how-it-works"
          className="mx-auto max-w-6xl scroll-mt-16 border-t border-white/10 px-6 py-14 sm:py-20"
        >
          <div className="mb-10 max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#e5cca0]/85">
              {copy.howItWorks.eyebrow}
            </p>
            <h2 className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.howItWorks.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#a1a1aa] sm:text-base">
              {copy.howItWorks.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {copy.howItWorks.steps.map((step, index) => {
              const StepIcon =
                step.icon === 'character'
                  ? Users
                  : step.icon === 'engine'
                    ? Cpu
                    : QrCode;

              return (
                <article key={step.stepNumber} className="relative flex">
                  <div
                    className={`relative flex w-full flex-col justify-between overflow-hidden rounded-[24px] p-6 sm:p-7 ${SMOKED_GLASS_SURFACE}`}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-7 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#e5cca0]/45 to-[#a78bfa]/45"
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#e5cca0]/40 bg-[#e5cca0]/10 px-2.5 font-mono text-xs font-semibold tracking-wider text-[#e5cca0]">
                          {step.stepNumber}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-[#c4b5fd]">
                          <StepIcon className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>

                      <h3 className="font-display mt-5 text-lg font-semibold tracking-tight text-white sm:text-xl">
                        {step.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-[#a1a1aa]">
                        {step.body}
                      </p>
                    </div>
                  </div>

                  {index < copy.howItWorks.steps.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 -right-[22px] z-20 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-violet-400/30 bg-[#090a10] text-[#e5cca0]/85 shadow-[0_0_16px_rgba(139,92,246,0.2)] md:flex"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  ) : null}
                </article>
              );
            })}
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

        {/* 3.5 #studio-preview — Interactive Bento Studio Gallery */}
        <section
          id="studio-preview"
          className="mx-auto max-w-6xl scroll-mt-16 border-t border-white/10 px-6 py-14 sm:py-20"
        >
          <div className="mb-10 max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#e5cca0]/85">
              {copy.studioPreview.eyebrow}
            </p>
            <h2 className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.studioPreview.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#a1a1aa] sm:text-base">
              {copy.studioPreview.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Bento Card A — Desktop Window Frame: Spatial Lobby & Art Admire */}
            <BentoRevealButton
              onClick={onEnterApp}
              ariaLabel={copy.studioPreview.cardA.title}
              reducedMotion={reducedMotion}
              delayClass="delay-0"
              className="p-5 sm:p-6 lg:col-span-7"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#e5cca0]/55 to-[#a78bfa]/45"
              />

              {/* Sleek Dark Desktop Window Frame */}
              <div className="relative z-10 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07080d]">
                {/* Window Chrome Bar */}
                <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                    <span className="ml-2 hidden font-mono text-[10px] tracking-wide text-zinc-400 sm:inline">
                      {copy.studioPreview.cardA.windowTitle}
                    </span>
                  </div>

                  <span className="inline-flex items-center rounded-full border border-[#e5cca0]/35 bg-[#e5cca0]/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#e5cca0] transition-colors group-hover:border-[#e5cca0]/65 group-hover:bg-[#e5cca0]/15">
                    {copy.studioPreview.cardA.badge}
                  </span>
                </div>

                {/* Miniature Character Gallery Mockup */}
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                    {copy.studioPreview.cardA.cards.map((char, idx) => {
                      const isFeatured = idx === 1;
                      return (
                        <div
                          key={char.name}
                          className={`relative flex h-32 flex-col justify-between overflow-hidden rounded-xl border p-2.5 transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-36 sm:p-3 ${
                            isFeatured
                              ? 'border-[#e5cca0]/45 bg-[#12101d] shadow-[0_8px_28px_rgba(139,92,246,0.2)]'
                              : 'border-white/10 bg-[#0d0e15]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`rounded-full px-2 py-0.5 font-mono text-[9px] ${
                                isFeatured
                                  ? 'border border-[#e5cca0]/35 bg-[#e5cca0]/10 text-[#e5cca0]'
                                  : 'border border-violet-400/20 bg-violet-500/10 text-[#c4b5fd]'
                              }`}
                            >
                              {char.tag}
                            </span>
                          </div>

                          {/* Stylized Smoked Glass Portrait Silhouette */}
                          <div className="my-auto flex items-center justify-center">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full border sm:h-11 sm:w-11 ${
                                isFeatured
                                  ? 'border-[#e5cca0]/40 bg-violet-500/15'
                                  : 'border-white/10 bg-white/[0.04]'
                              }`}
                            >
                              <Sparkles
                                className={`h-4 w-4 ${
                                  isFeatured
                                    ? 'text-[#e5cca0]'
                                    : 'text-[#a78bfa]/80'
                                }`}
                                aria-hidden="true"
                              />
                            </div>
                          </div>

                          <div className="rounded-lg border border-white/10 bg-black/55 px-2 py-1 backdrop-blur-md">
                            <p className="truncate font-display text-[11px] font-semibold text-white">
                              {char.name}
                            </p>
                            <p className="truncate text-[9px] text-zinc-400">
                              {char.role}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Smoked Glass Overlay Strip */}
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-violet-400/20 bg-white/[0.03] px-3.5 py-2 backdrop-blur-xl">
                    <span className="font-mono text-[10px] tracking-wide text-zinc-300">
                      {copy.studioPreview.cardA.caption}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-[#e5cca0] transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.16em] text-[#e5cca0]">
                    {copy.studioPreview.cardA.eyebrow}
                  </p>
                  <h3 className="font-display mt-1.5 text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {copy.studioPreview.cardA.title}
                  </h3>
                </div>
              </div>
            </BentoRevealButton>

            {/* Bento Card B — Immersive Liquid Glass Chat */}
            <BentoRevealButton
              onClick={onEnterApp}
              ariaLabel={copy.studioPreview.cardB.title}
              reducedMotion={reducedMotion}
              delayClass="delay-75"
              className="p-6 sm:p-7 lg:col-span-5"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#a78bfa]/65 to-cyan-400/35"
              />

              <div className="relative z-10 flex h-full w-full flex-col justify-between gap-5">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.16em] text-[#a78bfa]">
                    {copy.studioPreview.cardB.eyebrow}
                  </p>
                  <h3 className="font-display mt-1.5 text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {copy.studioPreview.cardB.title}
                  </h3>
                </div>

                {/* Miniature Smoked Glass Chat Surface */}
                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#07080d] p-4">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-[#e5cca0]/25 bg-[#e5cca0]/10 px-3.5 py-2 text-xs text-zinc-100">
                      {copy.studioPreview.cardB.userMessage}
                    </div>
                  </div>

                  <div className="rounded-2xl rounded-bl-sm border border-violet-400/25 bg-white/[0.05] px-4 py-3 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(167,139,250,0.22)]">
                    <p className="text-xs leading-relaxed text-zinc-200 italic sm:text-[13px]">
                      {copy.studioPreview.cardB.assistantQuote}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-300">
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                        />
                        {copy.studioPreview.cardB.streamLabel}
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 text-[#a78bfa] transition-transform duration-300 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </BentoRevealButton>

            {/* Bento Card C — PC <-> Mobile QR Sync */}
            <BentoRevealButton
              onClick={onEnterApp}
              ariaLabel={copy.studioPreview.cardC.title}
              reducedMotion={reducedMotion}
              delayClass="delay-150"
              className="p-6 sm:p-7 lg:col-span-5"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#a78bfa]/55 to-[#e5cca0]/45"
              />

              <div className="relative z-10 flex h-full w-full flex-col justify-between gap-5">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.16em] text-[#a78bfa]">
                    {copy.studioPreview.cardC.eyebrow}
                  </p>
                  <h3 className="font-display mt-1.5 text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {copy.studioPreview.cardC.title}
                  </h3>
                </div>

                {/* Desktop Badge <-> Dotted Bridge <-> Mobile Frame Diagram */}
                <div className="rounded-2xl border border-white/10 bg-[#07080d] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {/* Desktop Host Badge */}
                    <div className="flex shrink-0 flex-col items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
                      <Monitor
                        className="h-5 w-5 text-[#c4b5fd]"
                        aria-hidden="true"
                      />
                      <span className="mt-2 font-display text-[11px] font-semibold text-white">
                        {copy.studioPreview.cardC.desktopLabel}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-400">
                        {copy.studioPreview.cardC.desktopSub}
                      </span>
                    </div>

                    {/* Glowing Dotted Bridge with QR Node */}
                    <div className="relative flex flex-1 items-center justify-center px-1">
                      <div
                        aria-hidden="true"
                        className="w-full border-t-2 border-dotted border-[#a78bfa]/65 shadow-[0_0_14px_rgba(139,92,246,0.45)]"
                      />
                      <div className="absolute flex h-9 w-9 items-center justify-center rounded-full border border-[#e5cca0]/45 bg-[#090a10] text-[#e5cca0] shadow-[0_0_20px_rgba(229,204,160,0.22)] transition-transform duration-300 group-hover:scale-110">
                        <QrCode className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </div>

                    {/* Compact Mobile Frame */}
                    <div className="flex w-20 shrink-0 flex-col items-center rounded-2xl border border-violet-400/35 bg-white/[0.04] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_0_rgba(167,139,250,0.25)]">
                      <div className="mb-1.5 h-1 w-5 rounded-full bg-white/15" />
                      <Smartphone
                        className="h-4 w-4 text-[#e5cca0]"
                        aria-hidden="true"
                      />
                      <span className="mt-1.5 font-display text-[11px] font-semibold text-white">
                        {copy.studioPreview.cardC.mobileLabel}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-400">
                        {copy.studioPreview.cardC.mobileSub}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-violet-400/20 bg-white/[0.03] px-3 py-2">
                    <span className="font-mono text-[10px] tracking-wide text-zinc-300">
                      {copy.studioPreview.cardC.caption}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-[#e5cca0] transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </BentoRevealButton>

            {/* Bento Card D — Silent Memory & Multi-Provider Engine */}
            <BentoRevealButton
              onClick={onEnterApp}
              ariaLabel={copy.studioPreview.cardD.title}
              reducedMotion={reducedMotion}
              delayClass="delay-200"
              className="p-6 sm:p-7 lg:col-span-7"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#e5cca0]/50 to-[#a78bfa]/55"
              />

              <div className="relative z-10 flex h-full w-full flex-col justify-between gap-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.16em] text-[#e5cca0]">
                      {copy.studioPreview.cardD.eyebrow}
                    </p>
                    <h3 className="font-display mt-1.5 text-lg font-semibold tracking-tight text-white sm:text-xl">
                      {copy.studioPreview.cardD.title}
                    </h3>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 font-mono text-[10px] text-[#c4b5fd]">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{copy.studioPreview.cardD.dpapiBadge}</span>
                  </span>
                </div>

                {/* Supported Provider Visual Pills */}
                <div className="rounded-2xl border border-white/10 bg-[#07080d] p-4 sm:p-5">
                  <div className="flex flex-wrap gap-2.5">
                    {SUPPORTED_PROVIDERS.map((provider) => {
                      const isLocal = provider.mode === 'local';
                      return (
                        <div
                          key={provider.name}
                          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium backdrop-blur-xl transition-colors ${
                            isLocal
                              ? 'border-[#e5cca0]/35 bg-[#e5cca0]/10 text-white group-hover:border-[#e5cca0]/55'
                              : 'border-violet-400/25 bg-white/[0.04] text-zinc-200 group-hover:border-violet-400/45'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${
                              isLocal ? 'bg-[#e5cca0]' : 'bg-[#a78bfa]'
                            }`}
                          />
                          <span>{provider.name}</span>
                          <span className="font-mono text-[9px] text-zinc-400">
                            {isLocal
                              ? copy.studioPreview.cardD.localTag
                              : copy.studioPreview.cardD.cloudTag}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-400/20 bg-white/[0.03] px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-wide text-zinc-300">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-[#a78bfa]"
                      />
                      {copy.studioPreview.cardD.memoryStatus}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-[#e5cca0] transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </BentoRevealButton>
          </div>
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

        {/* 4.5 #evolution — Vertical Architectural Evolution Timeline */}
        <section
          id="evolution"
          className="mx-auto max-w-6xl scroll-mt-16 border-t border-white/10 px-6 py-14 sm:py-20"
        >
          <div className="mb-10 max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#a78bfa]">
              {copy.evolution.eyebrow}
            </p>
            <h2 className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.evolution.title}
            </h2>
          </div>

          <div className="relative pl-8 sm:pl-10">
            {/* Vertical Illuminated Hairline */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-2 bottom-2 left-[11px] w-[2px] bg-gradient-to-b from-violet-500/70 via-[#e5cca0]/60 to-transparent sm:left-[15px]"
            />

            <div className="space-y-6">
              {copy.evolution.milestones.map((milestone) => (
                <article key={milestone.version} className="relative">
                  {/* Glowing Milestone Node */}
                  <div
                    aria-hidden="true"
                    className={`absolute top-6 -left-8 flex h-6 w-6 items-center justify-center rounded-full border sm:-left-10 sm:h-8 sm:w-8 ${
                      milestone.isCurrent
                        ? 'border-[#e5cca0]/70 bg-[#12101d] shadow-[0_0_22px_rgba(229,204,160,0.42)]'
                        : 'border-violet-400/50 bg-[#0b0b12] shadow-[0_0_18px_rgba(139,92,246,0.35)]'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        milestone.isCurrent ? 'bg-[#e5cca0]' : 'bg-[#a78bfa]'
                      }`}
                    />
                  </div>

                  <div
                    className={`relative overflow-hidden rounded-[24px] p-5 sm:p-7 ${SMOKED_GLASS_SURFACE}`}
                  >
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r ${
                        milestone.isCurrent
                          ? 'from-transparent via-[#e5cca0]/65 to-[#a78bfa]/45'
                          : 'from-transparent via-[#a78bfa]/55 to-transparent'
                      }`}
                    />

                    <div className="relative z-10 flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] ${
                          milestone.isCurrent
                            ? 'border-[#e5cca0]/45 bg-[#e5cca0]/10 text-[#e5cca0]'
                            : 'border-violet-400/30 bg-violet-500/10 text-[#c4b5fd]'
                        }`}
                      >
                        {milestone.version}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.12em] text-zinc-400">
                        {milestone.tag}
                      </span>
                    </div>

                    <h3 className="font-display relative z-10 mt-3 text-lg font-semibold tracking-tight text-white sm:text-xl">
                      {milestone.title}
                    </h3>
                    <p className="relative z-10 mt-2 text-sm leading-relaxed text-[#a1a1aa]">
                      {milestone.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 4.8 #creator — Behind Atrium: Independent Creator Editorial Note */}
        <section
          id="creator"
          className="mx-auto max-w-6xl scroll-mt-16 border-t border-white/10 px-6 py-14 sm:py-20"
        >
          <article className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[inset_0_1px_0_0_rgba(229,204,160,0.2)] backdrop-blur-2xl sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#e5cca0]/50 to-[#a78bfa]/40"
            />

            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(229,204,160,0.22)] sm:h-16 sm:w-16">
                <DoubleArchEmblem
                  idPrefix="creator-note"
                  className="h-9 w-8 shrink-0 overflow-visible sm:h-10 sm:w-9"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] tracking-[0.18em] text-[#e5cca0]/90">
                  {copy.creator.eyebrow}
                </p>

                <h2 className="font-display mt-3 text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {copy.creator.headline}
                </h2>

                <p className="mt-4 text-sm leading-relaxed text-[#a1a1aa] sm:text-base">
                  {copy.creator.body}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                  <a
                    href={GITHUB_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-[40px] items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5cca0] ${SECONDARY_GLASS_BUTTON}`}
                  >
                    {copy.creator.githubProfileLabel}
                  </a>
                  <a
                    href={GITHUB_LICENSE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-[40px] items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa] ${SECONDARY_GLASS_BUTTON}`}
                  >
                    {copy.creator.mitLicenseLabel}
                  </a>
                </div>
              </div>
            </div>
          </article>
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
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDownloadTarget({
                        label: copy.launch.setupDownload,
                        url: GITHUB_RELEASES_URL,
                      })
                    }
                    className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5cca0] ${SECONDARY_GLASS_BUTTON}`}
                  >
                    <Download
                      className="h-3.5 w-3.5 text-[#e5cca0]"
                      aria-hidden="true"
                    />
                    <span>{copy.launch.setupDownload}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDownloadTarget({
                        label: copy.launch.portableDownload,
                        url: GITHUB_RELEASES_URL,
                      })
                    }
                    className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5cca0] ${SECONDARY_GLASS_BUTTON}`}
                  >
                    <Download
                      className="h-3.5 w-3.5 text-zinc-300"
                      aria-hidden="true"
                    />
                    <span>{copy.launch.portableDownload}</span>
                  </button>
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

      <DownloadTransparencyModal
        target={pendingDownloadTarget}
        copy={copy.downloadModal}
        onClose={() => setPendingDownloadTarget(null)}
      />
    </div>
  );
}
