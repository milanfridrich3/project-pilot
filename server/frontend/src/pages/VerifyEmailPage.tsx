import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { api, ApiRequestError } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useTranslate } from "../lib/i18n";
import { useCooldown } from "../lib/useCooldown";
import type { User } from "../lib/types";
import { IconMail } from "../components/icons";

export function VerifyEmailPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const t = useTranslate();
  const cooldown = useCooldown();

  const [codeSent, setCodeSent] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(t("verify.codeAlreadySent"));
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await api.post("/auth/me/send-verification");
      setCodeSent(true);
      setMessage(t("settings.codeSent"));
      cooldown.start(30);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "VERIFICATION_RATE_LIMITED" && err.waitSeconds) {
        setCodeSent(true);
        cooldown.start(err.waitSeconds);
      } else {
        setError(err instanceof Error ? err.message : t("errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const updated = await api.post<User>("/auth/me/verify-email", { code });
      updateUser(updated);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/prihlaseni");
  }

  return (
    <div className="min-h-screen bg-base text-text flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-center mb-8">
          <Logo size={30} />
        </div>

        <div className="bg-panel border border-border rounded-2xl p-6 shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-teal/10 text-teal flex items-center justify-center mx-auto mb-4">
            <IconMail size={24} />
          </div>
          <h1 className="font-display text-lg font-semibold mb-2">{t("verify.title")}</h1>
          <p className="text-sm text-muted mb-1">{t("verify.subtitle")}</p>
          <p className="text-sm text-text font-medium break-all mb-6">{user?.email}</p>

          {!codeSent ? (
            <button
              onClick={handleSendCode}
              disabled={busy}
              className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-60 w-full"
            >
              {busy ? "…" : t("settings.sendCode")}
            </button>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-3 text-left">
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
              <button
                type="submit"
                disabled={busy || code.length < 4}
                className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-60"
              >
                {t("settings.verifyEmail")}
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

          {message && <p className="text-xs text-teal mt-3">{message}</p>}
          {error && <p className="text-xs text-danger mt-3">{error}</p>}

          <button
            onClick={handleLogout}
            className="text-xs text-muted hover:text-text transition-colors mt-6"
          >
            {t("nav.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
