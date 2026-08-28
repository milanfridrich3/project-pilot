import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Avatar } from "../components/Avatar";
import { IconChevronLeft, IconLock, IconUserPlus, IconUserCheck } from "../components/icons";
import { ListRowsSkeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { useTranslate } from "../lib/i18n";
import type { FollowListEntry } from "../lib/types";

interface FollowListPageProps {
  mode: "followers" | "following";
}

export function FollowListPage({ mode }: FollowListPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslate();

  const [entries, setEntries] = useState<FollowListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    if (!id) return;
    setLoading(true);
    api
      .get<FollowListEntry[]>(`/users/${id}/${mode}`)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : t("errors.generic")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode]);

  async function handleFollow(targetId: number) {
    setBusyId(targetId);
    try {
      await api.post("/follows", { followeeId: targetId });
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnfollow(targetId: number) {
    setBusyId(targetId);
    try {
      await api.delete(`/follows/${targetId}`);
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted hover:text-text transition-colors mb-6 flex items-center gap-1"
      >
        <IconChevronLeft size={16} />
        {t("settings.back")}
      </button>

      <h1 className="font-display text-xl font-semibold mb-6">
        {mode === "followers" ? t("profile.followers") : t("profile.followingCount")}
      </h1>

      {loading && <ListRowsSkeleton rows={5} />}
      {error && <p className="text-danger text-sm">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-muted text-sm">{t("search.noResults")}</p>
      )}

      <div className="flex flex-col gap-2 max-w-md">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 bg-panel border border-border rounded-xl p-3 card-shadow"
          >
            <Link to={`/profil/${entry.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar value={entry.avatar} size={40} />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm text-text truncate">{entry.name}</span>
                {entry.isPrivate && <IconLock size={12} className="text-muted shrink-0" />}
              </div>
            </Link>
            {entry.followStatus === "accepted" ? (
              <button
                onClick={() => handleUnfollow(entry.id)}
                disabled={busyId === entry.id}
                className="flex items-center gap-1 text-xs border border-border rounded-lg px-2.5 py-1.5 text-muted hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-60 shrink-0"
              >
                <IconUserCheck size={13} />
                {t("profile.following")}
              </button>
            ) : entry.followStatus === "pending" ? (
              <span className="text-xs text-muted shrink-0 px-2.5 py-1.5">{t("profile.pending")}</span>
            ) : (
              <button
                onClick={() => handleFollow(entry.id)}
                disabled={busyId === entry.id}
                className="btn-primary flex items-center gap-1 text-xs rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-60 shrink-0"
              >
                <IconUserPlus size={13} />
                {t("profile.follow")}
              </button>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
