import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Avatar } from "../components/Avatar";
import { IconLock, IconUserPlus, IconUserCheck, IconSettings } from "../components/icons";
import { ProfilePageSkeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useTranslate } from "../lib/i18n";
import type { UserProfile } from "../lib/types";

export function ProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const t = useTranslate();
  const navigate = useNavigate();

  const targetId = id ? Number(id) : currentUser?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  function load() {
    if (!targetId) return;
    setLoading(true);
    api
      .get<UserProfile>(`/users/${targetId}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : t("errors.generic")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  async function handleFollow() {
    if (!profile) return;
    setFollowBusy(true);
    try {
      await api.post("/follows", { followeeId: profile.id });
      load();
    } finally {
      setFollowBusy(false);
    }
  }

  async function handleUnfollow() {
    if (!profile) return;
    setFollowBusy(true);
    try {
      await api.delete(`/follows/${profile.id}`);
      load();
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <ProfilePageSkeleton />
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <p className="text-danger text-sm">{error}</p>
      </Layout>
    );
  }

  const canSeeStats = profile.isSelf || profile.followStatus === "accepted" || !profile.isPrivate;

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="bg-panel border border-border rounded-2xl p-6 card-shadow animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar value={profile.avatar} size={64} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-semibold truncate">{profile.name}</h1>
                  {profile.isPrivate && <IconLock size={14} className="text-muted shrink-0" />}
                </div>
                {canSeeStats && profile.motto && (
                  <p className="text-sm text-muted italic mt-1 truncate">{profile.motto}</p>
                )}
              </div>
            </div>

            {profile.isSelf ? (
              <Link
                to="/nastaveni"
                className="flex items-center justify-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5 hover:border-teal-dim transition-colors shrink-0"
              >
                <IconSettings size={14} />
                {t("profile.editProfile")}
              </Link>
            ) : profile.followStatus === "accepted" ? (
              <button
                onClick={handleUnfollow}
                disabled={followBusy}
                className="flex items-center justify-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5 text-muted hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-60 shrink-0"
              >
                <IconUserCheck size={14} />
                {t("profile.following")}
              </button>
            ) : profile.followStatus === "pending" ? (
              <button
                onClick={handleUnfollow}
                disabled={followBusy}
                className="flex items-center justify-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5 text-muted transition-colors disabled:opacity-60 shrink-0"
              >
                {t("profile.pending")}
              </button>
            ) : (
              <button
                onClick={handleFollow}
                disabled={followBusy}
                className="btn-primary flex items-center justify-center gap-1.5 text-sm rounded-lg px-3 py-1.5 transition-all disabled:opacity-60 shrink-0"
              >
                <IconUserPlus size={14} />
                {t("profile.follow")}
              </button>
            )}
          </div>

          {canSeeStats ? (
            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
              <button
                onClick={() => navigate(`/profil/${profile.id}/sledujici`)}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <div className="font-display text-lg font-semibold">{profile.followers}</div>
                <div className="text-xs text-muted mt-0.5">{t("profile.followers")}</div>
              </button>
              <button
                onClick={() => navigate(`/profil/${profile.id}/sledovani`)}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <div className="font-display text-lg font-semibold">{profile.following}</div>
                <div className="text-xs text-muted mt-0.5">{t("profile.followingCount")}</div>
              </button>
              <div className="text-center">
                <div className="font-display text-lg font-semibold">{profile.completedProjects}</div>
                <div className="text-xs text-muted mt-0.5">{t("profile.completedProjects")}</div>
              </div>
            </div>
          ) : (
            <div className="mt-6 pt-6 border-t border-border text-center">
              <IconLock size={20} className="text-muted mx-auto mb-2" />
              <p className="text-sm text-text">{t("profile.privateAccount")}</p>
              <p className="text-xs text-muted mt-1">{t("profile.privateHint")}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
