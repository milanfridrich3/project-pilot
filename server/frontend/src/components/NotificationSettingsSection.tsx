import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useTranslate } from "../lib/i18n";

interface NotificationSettings {
  taskDue: boolean;
  follows: boolean;
  email: boolean;
}

export function NotificationSettingsSection() {
  const t = useTranslate();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<NotificationSettings>("/notifications/settings").then(setSettings);
  }, []);

  async function toggle(key: keyof NotificationSettings) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    try {
      await api.patch("/notifications/settings", { [key]: next[key] });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <section className="bg-panel border border-border rounded-2xl p-6 card-shadow">
      <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-4">
        {t("settings.notifications")}
      </h2>
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-text">{t("settings.notifyTaskDue")}</span>
          <input
            type="checkbox"
            checked={settings.taskDue}
            onChange={() => toggle("taskDue")}
            disabled={saving}
          />
        </label>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-text">{t("settings.notifyFollows")}</span>
          <input
            type="checkbox"
            checked={settings.follows}
            onChange={() => toggle("follows")}
            disabled={saving}
          />
        </label>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-text">{t("settings.notifyEmail")}</span>
          <input
            type="checkbox"
            checked={settings.email}
            onChange={() => toggle("email")}
            disabled={saving}
          />
        </label>
      </div>
    </section>
  );
}
