import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useTranslate } from "../lib/i18n";
import { Avatar } from "./Avatar";
import type { FollowedUser } from "../lib/types";

interface InviteFollowedFormProps {
  onInvite: (userId: number) => Promise<void>;
}

export function InviteFollowedForm({ onInvite }: InviteFollowedFormProps) {
  const t = useTranslate();
  const [followed, setFollowed] = useState<FollowedUser[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<FollowedUser[]>("/users/following").then(setFollowed).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      await onInvite(Number(selected));
      setSelected("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (followed.length === 0) {
    return <p className="text-sm text-muted">{t("project.noFollowedUsers")}</p>;
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 bg-base border border-border rounded-lg px-2 min-w-0">
          {selected && (
            <Avatar value={followed.find((f) => f.id === Number(selected))?.avatar ?? null} size={22} />
          )}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            required
            className="flex-1 min-w-0 bg-transparent py-2 text-sm focus:outline-none"
          >
            <option value="" disabled>
              {t("project.selectPerson")}
            </option>
            {followed.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy || !selected}
          className="btn-primary font-medium rounded-lg px-3 py-2 text-sm transition-all disabled:opacity-60 shrink-0"
        >
          {t("project.invite")}
        </button>
      </form>
      <p className="text-xs text-muted mt-2">{t("project.inviteFollowedHint")}</p>
      {error && <p className="text-sm text-danger mt-1">{error}</p>}
    </div>
  );
}
