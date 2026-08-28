interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 28 }: LogoMarkProps) {
  const gradientId = "pilot-logo-gradient";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="10" y1="5" x2="42" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      {/* Stem of the P */}
      <path d="M13 5 L13 43 L19 43 L19 27 L19 5 Z" fill={`url(#${gradientId})`} />
      {/* Bowl of the P, swept like a paper airplane wing */}
      <path d="M13 5 C26 5 39 9 39 17.5 C39 26 27 27 19 27 L19 5 Z" fill={`url(#${gradientId})`} />
      {/* Paper-plane fold / nose */}
      <path d="M13 5 L34 18 L19 21 Z" fill="#F8FAFC" />
      {/* Tail accent */}
      <path d="M13 27 L19 27 L19 33 Z" fill="#1E3A8A" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
}

export function Logo({ size = 24, withWordmark = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-display font-bold text-lg tracking-tight">
          <span className="text-text">Project</span> <span className="text-teal">Pilot</span>
        </span>
      )}
    </div>
  );
}
