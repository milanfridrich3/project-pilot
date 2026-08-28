import { useState } from "react";
import { IconEye, IconEyeOff } from "./icons";
import { useTranslate } from "../lib/i18n";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  /** Extra classes appended to the base input styling (never replaces it,
   *  so the "eye" toggle button stays put no matter what a caller passes in). */
  className?: string;
  /** Visual variant for the focus ring/border. Use "danger" in destructive
   *  contexts like the delete-account confirmation. */
  variant?: "default" | "danger";
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
  className,
  variant = "default",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const t = useTranslate();

  const variantClasses =
    variant === "danger"
      ? "focus:border-danger focus:ring-danger/10"
      : "focus:border-teal focus:ring-teal/10";

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`w-full bg-base border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-4 transition-shadow ${variantClasses} ${className || ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? t("password.hide") : t("password.show")}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
      >
        {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
      </button>
    </div>
  );
}
