import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useTranslate } from "../lib/i18n";
import { Logo } from "../components/Logo";
import { PasswordInput } from "../components/PasswordInput";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const t = useTranslate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base text-text flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-center mb-8">
          <Logo size={30} />
        </div>

        <div className="bg-panel border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex gap-1 mb-6 bg-base rounded-md p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 text-sm py-1.5 rounded transition-colors ${
                mode === "login" ? "bg-panel-raised text-text" : "text-muted"
              }`}
            >
              {t("auth.login")}
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 text-sm py-1.5 rounded transition-colors ${
                mode === "register" ? "bg-panel-raised text-text" : "text-muted"
              }`}
            >
              {t("auth.register")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "register" && (
              <div>
                <label className="text-xs text-muted mb-1 block">{t("auth.name")}</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                  placeholder={t("auth.namePlaceholder")}
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted mb-1 block">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">{t("auth.password")}</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                minLength={6}
                placeholder={t("auth.passwordHint")}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              {mode === "login" && (
                <Link
                  to="/zapomenute-heslo"
                  className="text-xs text-muted hover:text-teal transition-colors mt-1.5 inline-block"
                >
                  {t("auth.forgotPassword")}
                </Link>
              )}
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 btn-primary font-medium rounded-lg px-3 py-2 text-sm transition-all disabled:opacity-60"
            >
              {loading ? t("auth.loading") : mode === "login" ? t("auth.submitLogin") : t("auth.submitRegister")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
