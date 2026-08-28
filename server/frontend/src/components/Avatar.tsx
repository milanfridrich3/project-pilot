import { AVATAR_PRESETS, AvatarGlyphDefault } from "./icons";

interface AvatarProps {
  value?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ value, size = 32, className }: AvatarProps) {
  if (value && value.startsWith("data:image")) {
    return (
      <img
        src={value}
        alt="Avatar"
        className={`rounded-full object-cover ${className || ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const preset = AVATAR_PRESETS.find((p) => p.key === value);
  const Glyph = preset ? preset.Glyph : AvatarGlyphDefault;
  const iconSize = Math.round(size * 0.52);

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className || ""}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #60A5FA 0%, #1E40AF 100%)",
      }}
    >
      <Glyph size={iconSize} />
    </div>
  );
}
