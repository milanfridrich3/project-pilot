import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { PasswordInput } from "../components/PasswordInput";
import { api, ApiRequestError } from "../lib/api";
import { useTranslate } from "../lib/i18n";
import { useCooldown } from "../lib/useCooldown";

export function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const t = useTranslate();
  const cooldown = useCooldown();

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setStep("reset");
      setMessage(t("settings.codeSent"));
      cooldown.start(30);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "VERIFICATION_RATE_LIMITED" && err.waitSeconds) {
        setStep("reset");
        cooldown.start(err.waitSeconds);
      } else {
        setError(err instanceof Error ? err.message : t("errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { email, code, newPassword });
      navigate("/prihlaseni", { state: { passwordReset: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-base text-text flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-center mb-8">
          <Logo size={30} />
        </div>

        <div className="bg-panel border border-border rounded-2xl p-6 shadow-sm">
          <h1 className="font-display text-lg font-semibold mb-1">{t("forgotPw.title")}</h1>
          <p className="text-sm text-muted mb-6">{t("forgotPw.subtitle")}</p>

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">{t("auth.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder={t("auth.emailPlaceholder")}
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="btn-primary font-medium rounded-lg px-3 py-2 text-sm transition-all disabled:opacity-60 mt-1"
              >
                {busy ? t("auth.loading") : t("settings.sendCode")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted mb-1 block">{t("settings.verificationCode")}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm font-data tracking-widest text-center focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">{t("forgotPw.newPassword")}</label>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {message && <p className="text-xs text-teal">{message}</p>}
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="btn-primary font-medium rounded-lg px-3 py-2 text-sm transition-all disabled:opacity-60 mt-1"
              >
                {busy ? t("auth.loading") : t("forgotPw.resetButton")}
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={busy || cooldown.secondsLeft > 0}
                className="text-sm text-muted hover:text-text transition-colors disabled:opacity-60"
              >
                {cooldown.secondsLeft > 0
                  ? `${t("settings.resendCode")} (${cooldown.secondsLeft}s)`
                  : t("settings.resendCode")}
              </button>
            </form>
          )}

          <Link
            to="/prihlaseni"
            className="block text-center text-sm text-muted hover:text-text transition-colors mt-6"
          >
            {t("forgotPw.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
