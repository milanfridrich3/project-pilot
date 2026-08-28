interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSun({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  );
}

export function IconMoon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
    </svg>
  );
}

export function IconRocket({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M12 15c-2.5 0-4.5-2-4.5-4.5C7.5 6 12 2.5 12 2.5s4.5 3.5 4.5 8c0 2.5-2 4.5-4.5 4.5Z" />
      <circle cx="12" cy="10" r="1.5" />
      <path d="M9 14.5 6.5 17c-.5.5-.5 2 0 2.5s2 .5 2.5 0L11.5 17M15 14.5 17.5 17c.5.5.5 2 0 2.5s-2 .5-2.5 0L12.5 17" />
    </svg>
  );
}

export function IconSettings({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.7a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H2.3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H8.4a1.7 1.7 0 0 0 1-1.55V2.3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V8.4a1.7 1.7 0 0 0 1.55 1h.19a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1.1z" />
    </svg>
  );
}

export function IconLogout({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
      <path d="M9 12h12M17.5 8.5 21 12l-3.5 3.5" />
    </svg>
  );
}

export function IconPlus({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconX({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconCamera({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.3l.9-1.5a1.5 1.5 0 0 1 1.3-.75h5.6a1.5 1.5 0 0 1 1.3.75l.9 1.5h1.3A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

export function IconInbox({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M4 12.5 6.2 5h11.6L20 12.5" />
      <path d="M4 12.5v5A1.5 1.5 0 0 0 5.5 19h13a1.5 1.5 0 0 0 1.5-1.5v-5" />
      <path d="M4 12.5h4.8l1 2h4.4l1-2H20" />
    </svg>
  );
}

export function IconFlag({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M6 3v18" />
      <path d="M6 4.5h9.5l-2 3.5 2 3.5H6z" />
    </svg>
  );
}

export function IconMail({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4.5 6.5l7.5 6 7.5-6" />
    </svg>
  );
}

export function IconAlertCircle({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r="0.4" fill="currentColor" />
    </svg>
  );
}

export function IconEye({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M3.5 3.5l17 17" />
      <path d="M10.6 5.7A10.6 10.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.6 15.6 0 0 1-3.3 4.2M7.4 7.3C4.7 8.9 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.3 0 2.5-.3 3.6-.8" />
      <path d="M9.9 10c-.3.5-.4 1-.4 1.6a2.5 2.5 0 0 0 2.5 2.5c.5 0 1-.1 1.5-.4" />
    </svg>
  );
}

export function IconChevronLeft({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconSearch({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </svg>
  );
}

export function IconBell({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.3 5.3 1.3 5.3H4.7S6 14.5 6 10.5Z" />
      <path d="M10.2 19a1.8 1.8 0 0 0 3.6 0" />
    </svg>
  );
}

export function IconUserPlus({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="9.5" cy="8.5" r="3.3" />
      <path d="M3.3 19c.9-3 3.2-4.6 6.2-4.6s5.3 1.6 6.2 4.6" />
      <path d="M18.5 8v5M16 10.5h5" />
    </svg>
  );
}

export function IconUserCheck({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="9.5" cy="8.5" r="3.3" />
      <path d="M3.3 19c.9-3 3.2-4.6 6.2-4.6s5.3 1.6 6.2 4.6" />
      <path d="M15.5 11l1.8 1.8L21 9" />
    </svg>
  );
}

export function IconCheck({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconTrash({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l.8 12A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-12" />
      <path d="M10.3 11v6M13.7 11v6" />
    </svg>
  );
}

export function IconLock({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="5.5" y="10.5" width="13" height="9" rx="1.8" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconGlobe({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.3 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.3-3.8-8.5S9.5 5.8 12 3.5Z" />
    </svg>
  );
}

export function IconDots({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function IconPin({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M12 2v6.5l4 3v2.5H8v-2.5l4-3V2Z" />
      <path d="M12 14v8" />
    </svg>
  );
}

export function IconArchive({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M4.5 8v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8" />
      <path d="M10 13h4" />
    </svg>
  );
}

export function IconLink({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.5 5a3.54 3.54 0 0 1 5 5L16 11.5" />
      <path d="M13 17.5 11.5 19a3.54 3.54 0 0 1-5-5L8 12.5" />
    </svg>
  );
}

export function IconMessageCircle({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.5-.28-3.6-.78L3 21l1.35-4.03A8.47 8.47 0 0 1 3.5 12 8.5 8.5 0 0 1 12 3.5 8.5 8.5 0 0 1 21 12Z" />
    </svg>
  );
}

export function IconClockHistory({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M6 3 3 6M18 3l3 3" />
    </svg>
  );
}

export function IconSend({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <path d="M21 3 3 10.5l7.5 3L14 21l7-18Z" />
      <path d="M10.5 13.5 21 3" />
    </svg>
  );
}

export function IconClipboardCheck({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
      <rect x="6" y="4.5" width="12" height="16" rx="1.8" />
      <path d="M9.3 4.5V4a1.5 1.5 0 0 1 1.5-1.5h2.4A1.5 1.5 0 0 1 14.7 4v.5" />
      <path d="M9.3 13l2 2 3.4-4" />
    </svg>
  );
}

/* --- Avatar preset icons: single-color glyphs meant to sit on a gradient circle --- */

const glyph = {
  fill: "none",
  stroke: "#FFFFFF",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function AvatarGlyphDefault({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...glyph}>
      <circle cx="12" cy="9" r="3.4" />
      <path d="M5.5 19c1-3.2 3.6-4.8 6.5-4.8s5.5 1.6 6.5 4.8" />
    </svg>
  );
}

export function AvatarGlyphCat({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...glyph}>
      <path d="M7 6 5.5 3l3 1.5M17 6l1.5-3-3 1.5" />
      <circle cx="12" cy="12" r="6.2" />
      <path d="M9.3 12.5c.2.9.9 1.5 1.7 1.7M14.7 12.5c-.2.9-.9 1.5-1.7 1.7" />
      <circle cx="9.6" cy="11" r="0.6" fill="#FFFFFF" stroke="none" />
      <circle cx="14.4" cy="11" r="0.6" fill="#FFFFFF" stroke="none" />
    </svg>
  );
}

export function AvatarGlyphFox({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...glyph}>
      <path d="M6.5 5 4 3.5l1 3.3M17.5 5 20 3.5l-1 3.3" />
      <path d="M6 8.5C6 6.5 8.5 5.5 12 5.5s6 1 6 3c0 4-2.5 8-6 8s-6-4-6-8Z" />
      <path d="M12 12.5 10 16h4Z" />
      <circle cx="9.6" cy="10.5" r="0.6" fill="#FFFFFF" stroke="none" />
      <circle cx="14.4" cy="10.5" r="0.6" fill="#FFFFFF" stroke="none" />
    </svg>
  );
}

export function AvatarGlyphOwl({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...glyph}>
      <path d="M8 5.5 6.5 3.8M16 5.5l1.5-1.7" />
      <ellipse cx="12" cy="12.5" rx="6.3" ry="6.8" />
      <circle cx="9.3" cy="11.5" r="2" />
      <circle cx="14.7" cy="11.5" r="2" />
      <circle cx="9.3" cy="11.5" r="0.5" fill="#FFFFFF" stroke="none" />
      <circle cx="14.7" cy="11.5" r="0.5" fill="#FFFFFF" stroke="none" />
      <path d="M12 13.3l-1 1.6h2Z" />
    </svg>
  );
}

export function AvatarGlyphPanda({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...glyph}>
      <circle cx="6.3" cy="6.3" r="2" />
      <circle cx="17.7" cy="6.3" r="2" />
      <circle cx="12" cy="12.5" r="6.3" />
      <ellipse cx="9.4" cy="12" rx="1.5" ry="1.9" />
      <ellipse cx="14.6" cy="12" rx="1.5" ry="1.9" />
      <circle cx="9.4" cy="12.3" r="0.5" fill="#FFFFFF" stroke="none" />
      <circle cx="14.6" cy="12.3" r="0.5" fill="#FFFFFF" stroke="none" />
      <path d="M12 15.3v1.2" />
    </svg>
  );
}

export function AvatarGlyphRabbit({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...glyph}>
      <rect x="7.4" y="2.3" width="2.6" height="8.5" rx="1.3" transform="rotate(-8 8.7 6.5)" />
      <rect x="14" y="2.3" width="2.6" height="8.5" rx="1.3" transform="rotate(8 15.3 6.5)" />
      <circle cx="12" cy="14" r="6.1" />
      <circle cx="9.6" cy="13.2" r="0.6" fill="#FFFFFF" stroke="none" />
      <circle cx="14.4" cy="13.2" r="0.6" fill="#FFFFFF" stroke="none" />
      <path d="M12 15l-1 1.6h2Z" />
    </svg>
  );
}

export function AvatarGlyphBear({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...glyph}>
      <circle cx="6.6" cy="6.6" r="2.1" />
      <circle cx="17.4" cy="6.6" r="2.1" />
      <circle cx="12" cy="13" r="6.5" />
      <circle cx="9.5" cy="12.2" r="0.6" fill="#FFFFFF" stroke="none" />
      <circle cx="14.5" cy="12.2" r="0.6" fill="#FFFFFF" stroke="none" />
      <ellipse cx="12" cy="15" rx="2" ry="1.5" />
    </svg>
  );
}

export function AvatarGlyphBird({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...glyph}>
      <path d="M8 6c-.6-1.6-.3-3 .5-3.4.9-.4 1.9.6 2 2.2" />
      <circle cx="12" cy="12" r="6.3" />
      <path d="M15.8 11 19 9.7 15.8 13" />
      <circle cx="14.3" cy="10.3" r="0.6" fill="#FFFFFF" stroke="none" />
      <path d="M10.5 15c1 .8 2 .8 3 0" />
    </svg>
  );
}

export const AVATAR_PRESETS = [
  { key: "icon:default", Glyph: AvatarGlyphDefault, label: "avatar.default" },
  { key: "icon:cat", Glyph: AvatarGlyphCat, label: "avatar.cat" },
  { key: "icon:fox", Glyph: AvatarGlyphFox, label: "avatar.fox" },
  { key: "icon:owl", Glyph: AvatarGlyphOwl, label: "avatar.owl" },
  { key: "icon:panda", Glyph: AvatarGlyphPanda, label: "avatar.panda" },
  { key: "icon:rabbit", Glyph: AvatarGlyphRabbit, label: "avatar.rabbit" },
  { key: "icon:bear", Glyph: AvatarGlyphBear, label: "avatar.bear" },
  { key: "icon:bird", Glyph: AvatarGlyphBird, label: "avatar.bird" },
] as const;

export type AvatarPresetKey = (typeof AVATAR_PRESETS)[number]["key"];
