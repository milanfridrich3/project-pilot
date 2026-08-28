import { useRef, useState } from "react";
import { AVATAR_PRESETS } from "./icons";
import { Avatar } from "./Avatar";
import { IconCamera } from "./icons";
import { useTranslate, type TranslationKey } from "../lib/i18n";

interface AvatarPickerProps {
  value: string;
  onChange: (value: string) => void;
}

function resizeImageFile(
  file: File,
  errorMessages: { canvasNotSupported: string; imageLoadFailed: string; fileReadFailed: string },
  targetSize = 256
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error(errorMessages.canvasNotSupported));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error(errorMessages.imageLoadFailed));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error(errorMessages.fileReadFailed));
    reader.readAsDataURL(file);
  });
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const t = useTranslate();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("avatar.selectImageFile"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(t("avatar.imageTooLarge"));
      return;
    }

    setError(null);
    setProcessing(true);
    try {
      const dataUrl = await resizeImageFile(file, {
        canvasNotSupported: t("avatar.canvasNotSupported"),
        imageLoadFailed: t("avatar.imageLoadFailed"),
        fileReadFailed: t("avatar.fileReadFailed"),
      });
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative group shrink-0"
          title={t("avatar.uploadPhoto")}
          disabled={processing}
        >
          <Avatar value={value} size={56} />
          <span className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/45 flex items-center justify-center transition-colors">
            <IconCamera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        </button>

        <div className="hidden sm:block w-px self-stretch bg-border" />

        <div className="flex flex-wrap gap-2">
          {AVATAR_PRESETS.map(({ key, Glyph, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => onChange(key)}
              title={t(label as TranslationKey)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-shadow ${
                value === key ? "ring-2 ring-offset-2 ring-offset-panel ring-teal" : "hover:ring-2 hover:ring-offset-2 hover:ring-offset-panel hover:ring-border"
              }`}
              style={{ background: "linear-gradient(135deg, #60A5FA 0%, #1E40AF 100%)" }}
            >
              <Glyph size={20} />
            </button>
          ))}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {processing && <p className="text-xs text-muted mt-2">{t("avatar.processing")}</p>}
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}
