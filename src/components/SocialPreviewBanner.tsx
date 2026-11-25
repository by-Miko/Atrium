const ARCH_OUTER_PATH =
  'M156 388V238C156 172.83 200.772 120 256 120C311.228 120 356 172.83 356 238V388';
const ARCH_INNER_PATH =
  'M206 388V252C206 218.863 228.386 192 256 192C283.614 192 306 218.863 306 252V388';

export function SocialPreviewBanner() {
  return (
    <main className="flex min-h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[#050507]">
      <div
        data-testid="social-preview-stage"
        className="relative flex h-[640px] w-[1280px] shrink-0 items-center justify-center overflow-hidden bg-[#050507]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(360px_360px_at_48%_48%,rgba(139,92,246,0.14)_0%,transparent_72%),radial-gradient(320px_320px_at_54%_53%,rgba(229,204,160,0.08)_0%,transparent_70%)]"
        />

        <div className="relative z-10 flex h-[360px] w-[360px] items-center justify-center rounded-full border border-[#e5cca0]/35 bg-white/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_0_80px_rgba(139,92,246,0.18)] backdrop-blur-2xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="118 94 276 322"
            fill="none"
            aria-hidden="true"
            className="h-[190px] w-[190px] shrink-0 overflow-visible drop-shadow-[0_0_24px_rgba(167,139,250,0.42)]"
          >
            <defs>
              <linearGradient
                id="social-preview-arch-grad"
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
              d={ARCH_OUTER_PATH}
              stroke="url(#social-preview-arch-grad)"
              strokeWidth="34"
              strokeLinecap="round"
            />
            <path
              d={ARCH_INNER_PATH}
              stroke="#f4f4f5"
              strokeWidth="22"
              strokeLinecap="round"
            />
            <circle cx="256" cy="288" r="22" fill="#a78bfa" />
          </svg>
        </div>
      </div>
    </main>
  );
}
