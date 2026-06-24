// Bespoke logo mark: an ember-lit anvil with crossed blades. Inherits currentColor.
export function AnvilMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Local LLM Arena"
    >
      <defs>
        <linearGradient id="amk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.8 0.16 64)" />
          <stop offset="1" stopColor="oklch(0.62 0.2 42)" />
        </linearGradient>
      </defs>
      {/* crossed blades */}
      <path d="M7 6l13 13M25 6L12 19" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" opacity="0.55" />
      {/* anvil body */}
      <path
        d="M6 18h20c-1.2 2.2-3.4 3.2-6 3.4V24h3v2H9v-2h3v-2.6C9.4 21.2 7.2 20.2 6 18z"
        fill="url(#amk)"
      />
      {/* ember spark */}
      <circle cx="16" cy="11.5" r="2.1" fill="oklch(0.82 0.18 66)" />
      <circle cx="16" cy="11.5" r="4.2" fill="oklch(0.78 0.2 60)" opacity="0.25" />
    </svg>
  );
}

// Atmospheric mesh-gradient backdrop (stacked blurred ember blobs) + faint grid.
export function HeroBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="blobA" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="oklch(0.72 0.2 55 / 0.45)" />
          <stop offset="1" stopColor="oklch(0.72 0.2 55 / 0)" />
        </radialGradient>
        <radialGradient id="blobB" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="oklch(0.6 0.15 30 / 0.4)" />
          <stop offset="1" stopColor="oklch(0.6 0.15 30 / 0)" />
        </radialGradient>
      </defs>
      <circle cx="18%" cy="22%" r="280" fill="url(#blobA)" />
      <circle cx="82%" cy="70%" r="320" fill="url(#blobB)" />
    </svg>
  );
}
