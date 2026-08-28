import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { AvatarPicker } from "../components/AvatarPicker";
import { PasswordInput } from "../components/PasswordInput";
import { NotificationSettingsSection } from "../components/NotificationSettingsSection";
import { IconChevronLeft, IconMail, IconCheck, IconAlertCircle } from "../components/icons";
import { api, ApiRequestError } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";
import { useI18nStore, useTranslate } from "../lib/i18n";
import { useCooldown } from "../lib/useCooldown";
import type { User } from "../lib/types";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);
  const t = useTranslate();
  const navigate = useNavigate();
  const cooldown = useCooldown();

  const [name, setName] = useState(user?.name || "");
  const [motto, setMotto] = useState(user?.motto || "");
  const [avatar, setAvatar] = useState(user?.avatar || "icon:default");
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changeEmailPassword, setChangeEmailPassword] = useState("");
  const [changeEmailBusy, setChangeEmailBusy] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);

  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateBusy, setDeactivateBusy] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  if (!user) return null;

  async function handleThemeChange(next: "dark" | "light") {
    setTheme(next);
    try {
      const updated = await api.patch<User>("/auth/me", { theme: next });
      updateUser(updated);
    } catch {
      // vzhled zůstává změněný lokálně, i kdyby se nepodařilo uložit na server
    }
  }

  async function handleLanguageChange(next: "cs" | "en") {
    setLanguage(next);
    try {
      const updated = await api.patch<User>("/auth/me", { language: next });
      updateUser(updated);
    } catch {
      // jazyk zůstává změněný lokálně
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setSavingProfile(true);
    setSavedMessage(false);
    try {
      const updated = await api.patch<User>("/auth/me", { name, motto, avatar, isPrivate });
      updateUser(updated);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    setPasswordBusy(true);
    try {
      await api.patch("/auth/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage(t("settings.saved"));
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleSendCode() {
    setEmailError(null);
    setEmailMessage(null);
    setEmailBusy(true);
    try {
      await api.post("/auth/me/send-verification");
      setCodeSent(true);
      setEmailMessage(t("settings.codeSent"));
      cooldown.start(30);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "VERIFICATION_RATE_LIMITED" && err.waitSeconds) {
        setCodeSent(true);
        cooldown.start(err.waitSeconds);
      } else {
        setEmailError(err instanceof Error ? err.message : t("errors.generic"));
      }
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailBusy(true);
    try {
      const updated = await api.post<User>("/auth/me/verify-email", { code: verificationCode });
      updateUser(updated);
      setVerificationCode("");
      setCodeSent(false);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      await api.delete("/auth/me", { password: deletePassword });
      logout();
      navigate("/prihlaseni");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("errors.generic"));
      setDeleteBusy(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setChangeEmailError(null);
    setChangeEmailBusy(true);
    try {
      const updated = await api.patch<User>("/auth/me/email", {
        newEmail,
        password: changeEmailPassword,
      });
      updateUser(updated);
      setChangingEmail(false);
      setNewEmail("");
      setChangeEmailPassword("");
    } catch (err) {
      setChangeEmailError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setChangeEmailBusy(false);
    }
  }

  async function handleDeactivate() {
    setDeactivateError(null);
    setDeactivateBusy(true);
    try {
      await api.post("/auth/me/deactivate", { password: deactivatePassword });
      logout();
      navigate("/prihlaseni");
    } catch (err) {
      setDeactivateError(err instanceof Error ? err.message : t("errors.generic"));
      setDeactivateBusy(false);
    }
  }

  return (
    <Layout>
      <button
        onClick={() => navigate("/")}
        className="text-sm text-muted hover:text-text transition-colors mb-6 flex items-center gap-1"
      >
        <IconChevronLeft size={16} />
        {t("settings.back")}
      </button>

      <h1 className="font-display text-2xl font-semibold mb-8">{t("settings.title")}</h1>

      <div className="flex flex-col gap-6 max-w-xl">
        {/* Profil */}
        <section className="bg-panel border border-border rounded-2xl p-6 card-shadow">
          <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-4">
            {t("settings.profile")}
          </h2>
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-muted mb-2 block">{t("settings.avatar")}</label>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">{t("auth.name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">{t("settings.motto")}</label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                maxLength={120}
                placeholder={t("settings.mottoPlaceholder")}
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-2 block">{t("profile.privacySetting")}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    !isPrivate ? "border-teal bg-panel-raised" : "border-border text-muted"
                  }`}
                >
                  {t("profile.public")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    isPrivate ? "border-teal bg-panel-raised" : "border-border text-muted"
                  }`}
                >
                  {t("profile.private")}
                </button>
              </div>
              <p className="text-xs text-muted mt-2">{t("profile.privacyHint")}</p>
            </div>
            {profileError && <p className="text-sm text-danger">{profileError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-60 self-start"
              >
                {savingProfile ? "…" : t("settings.save")}
              </button>
              {savedMessage && <span className="text-xs text-teal">{t("settings.saved")}</span>}
            </div>
          </form>
        </section>

        {/* Email */}
        <section className="bg-panel border border-border rounded-2xl p-6 card-shadow">
          <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-4">
            {t("settings.email")}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <IconMail size={15} className="text-muted shrink-0" />
            <span className="text-sm text-text break-all">{user.email}</span>
            {user.emailVerified ? (
              <span className="flex items-center gap-1 text-xs text-teal bg-teal/10 rounded-full px-2 py-0.5 shrink-0">
                <IconCheck size={12} />
                {t("settings.emailVerified")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber bg-amber/10 rounded-full px-2 py-0.5 shrink-0">
                <IconAlertCircle size={12} />
                {t("settings.emailUnverified")}
              </span>
            )}
          </div>

          {!changingEmail ? (
            <button
              onClick={() => setChangingEmail(true)}
              className="text-sm text-teal hover:text-teal-dim transition-colors mt-3"
            >
              {t("settings.changeEmail")}
            </button>
          ) : (
            <form onSubmit={handleChangeEmail} className="flex flex-col gap-3 mt-4 max-w-sm">
              <div>
                <label className="text-xs text-muted mb-1 block">{t("settings.newEmail")}</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder={t("auth.emailPlaceholder")}
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">{t("auth.password")}</label>
                <PasswordInput value={changeEmailPassword} onChange={setChangeEmailPassword} required />
              </div>
              {changeEmailError && <p className="text-xs text-danger">{changeEmailError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={changeEmailBusy}
                  className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-60"
                >
                  {changeEmailBusy ? "…" : t("settings.changeEmail")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangingEmail(false);
                    setNewEmail("");
                    setChangeEmailPassword("");
                    setChangeEmailError(null);
                  }}
                  className="text-sm text-muted hover:text-text border border-border rounded-lg px-3 py-2 transition-colors"
                >
                  {t("project.cancel")}
                </button>
              </div>
            </form>
          )}

          {!user.emailVerified && (
            <div className="mt-4">
              <p className="text-xs text-muted mb-3">{t("settings.emailUnverifiedHint")}</p>

              {!codeSent ? (
                <button
                  onClick={handleSendCode}
                  disabled={emailBusy}
                  className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-60"
                >
                  {emailBusy ? "…" : t("settings.sendCode")}
                </button>
              ) : (
                <form onSubmit={handleVerifyCode} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1 max-w-[180px]">
                    <label className="text-xs text-muted mb-1 block">{t("settings.verificationCode")}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      required
                      className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm font-data tracking-widest focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={emailBusy || verificationCode.length < 4}
                      className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-60"
                    >
                      {t("settings.verifyEmail")}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={emailBusy || cooldown.secondsLeft > 0}
                      className="text-sm text-muted hover:text-text border border-border rounded-lg px-3 py-2 transition-colors disabled:opacity-60"
                    >
                      {cooldown.secondsLeft > 0
                        ? `${t("settings.resendCode")} (${cooldown.secondsLeft}s)`
                        : t("settings.resendCode")}
                    </button>
                  </div>
                </form>
              )}

              {emailMessage && <p className="text-xs text-teal mt-2">{emailMessage}</p>}
              {emailError && <p className="text-xs text-danger mt-2">{emailError}</p>}
            </div>
          )}
        </section>
        <section className="bg-panel border border-border rounded-2xl p-6 card-shadow">
          <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-4">
            {t("settings.appearance")}
          </h2>
          <div className="mb-4">
            <label className="text-xs text-muted mb-2 block">{t("settings.theme")}</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleThemeChange("dark")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  theme === "dark" ? "border-teal bg-panel-raised" : "border-border text-muted"
                }`}
              >
                {t("settings.themeDark")}
              </button>
              <button
                onClick={() => handleThemeChange("light")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  theme === "light" ? "border-teal bg-panel-raised" : "border-border text-muted"
                }`}
              >
                {t("settings.themeLight")}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-2 block">{t("settings.language")}</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguageChange("cs")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  language === "cs" ? "border-teal bg-panel-raised" : "border-border text-muted"
                }`}
              >
                Čeština
              </button>
              <button
                onClick={() => handleLanguageChange("en")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  language === "en" ? "border-teal bg-panel-raised" : "border-border text-muted"
                }`}
              >
                English
              </button>
            </div>
          </div>
        </section>

        {/* Notifikace */}
        <NotificationSettingsSection />

        {/* Heslo */}
        <section className="bg-panel border border-border rounded-2xl p-6 card-shadow">
          <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-4">
            {t("settings.password")}
          </h2>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">{t("settings.currentPassword")}</label>
              <PasswordInput value={currentPassword} onChange={setCurrentPassword} required autoComplete="current-password" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">{t("settings.newPassword")}</label>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-teal">{passwordMessage}</p>}
            <button
              type="submit"
              disabled={passwordBusy}
              className="border border-border rounded-lg px-4 py-2 text-sm hover:border-teal-dim transition-colors disabled:opacity-60 self-start rounded-lg"
            >
              {t("settings.changePassword")}
            </button>
          </form>
        </section>

        {/* Deaktivace uctu */}
        <section className="bg-panel border border-border rounded-2xl p-6 card-shadow">
          <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-2">
            {t("settings.deactivateAccount")}
          </h2>
          <p className="text-sm text-muted mb-4">{t("settings.deactivateHint")}</p>
          {!confirmingDeactivate ? (
            <button
              onClick={() => setConfirmingDeactivate(true)}
              className="border border-border rounded-lg px-4 py-2 text-sm hover:border-teal-dim transition-colors"
            >
              {t("settings.deactivateAccount")}
            </button>
          ) : (
            <div className="flex flex-col gap-3 max-w-xs">
              <PasswordInput
                value={deactivatePassword}
                onChange={setDeactivatePassword}
                placeholder={t("settings.confirmPassword")}
              />
              {deactivateError && <p className="text-sm text-danger">{deactivateError}</p>}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeactivate}
                  disabled={deactivateBusy || !deactivatePassword}
                  className="border border-border rounded-lg px-3 py-2 text-sm hover:border-teal-dim transition-colors disabled:opacity-60"
                >
                  {deactivateBusy ? "…" : t("settings.deactivateAccount")}
                </button>
                <button
                  onClick={() => {
                    setConfirmingDeactivate(false);
                    setDeactivatePassword("");
                    setDeactivateError(null);
                  }}
                  className="text-sm text-muted hover:text-text"
                >
                  {t("project.cancel")}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Nebezpečná zóna */}
        <section className="bg-panel border border-danger/30 rounded-2xl p-6 card-shadow">
          <h2 className="font-display text-sm font-semibold text-danger uppercase tracking-wide mb-2">
            {t("settings.dangerZone")}
          </h2>
          <p className="text-sm text-muted mb-4">{t("settings.deleteWarning")}</p>
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="border border-danger/50 text-danger rounded-lg px-4 py-2 text-sm hover:bg-danger/10 transition-colors"
            >
              {t("settings.deleteAccount")}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text">{t("settings.deleteConfirm")}</p>
              <PasswordInput
                value={deletePassword}
                onChange={setDeletePassword}
                placeholder={t("settings.confirmPassword")}
                variant="danger"
                className="max-w-xs"
              />
              {deleteError && <p className="text-sm text-danger">{deleteError}</p>}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleteBusy || !deletePassword}
                  className="bg-danger text-white rounded-lg px-3 py-2 text-sm disabled:opacity-60"
                >
                  {deleteBusy ? "…" : t("settings.deleteAccount")}
                </button>
                <button
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeletePassword("");
                    setDeleteError(null);
                  }}
                  className="text-sm text-muted hover:text-text"
                >
                  {t("project.cancel")}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
