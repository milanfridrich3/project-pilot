import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProgressGauge } from "../components/ProgressGauge";
import { NewProjectModal } from "../components/NewProjectModal";
import { TutorialModal } from "../components/TutorialModal";
import { Avatar } from "../components/Avatar";
import { IconPlus, IconPin, IconFlag } from "../components/icons";
import { DashboardSkeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import type { DashboardSummary } from "../lib/types";
import { useAuthStore } from "../store/auth";
import { useTranslate } from "../lib/i18n";

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const t = useTranslate();

  function loadSummary() {
    setLoading(true);
    api
      .get<DashboardSummary>("/projects/dashboard/summary")
      .then(setSummary)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSummary();
  }, []);

  function handleCreated(projectId: number) {
    setShowModal(false);
    navigate(`/projekty/${projectId}`);
  }

  const projects = summary?.projects ?? [];

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 min-w-0">
          {user && <Avatar value={user.avatar} size={48} />}
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-semibold truncate">
              {t("dashboard.welcome")}, {user?.name.split(" ")[0]}
            </h1>
            {user?.motto ? (
              <p className="text-muted text-sm mt-1 italic truncate">{user.motto}</p>
            ) : (
              <p className="text-muted text-sm mt-1">{t("dashboard.subtitle")}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <IconPlus size={16} />
          {t("dashboard.newProject")}
        </button>
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-panel border border-border rounded-xl p-4 card-shadow">
            <h2 className="font-display text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <IconPin size={13} /> {t("dashboard.pinned")}
            </h2>
            {summary.pinnedTasks.length === 0 ? (
              <p className="text-xs text-muted italic">{t("dashboard.pinnedEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {summary.pinnedTasks.map((task) => (
                  <li
                    key={task.id}
                    className="text-sm cursor-pointer hover:text-teal transition-colors truncate"
                    onClick={() => navigate(`/projekty/${task.project_id}`)}
                  >
                    {task.title}
                    <span className="text-muted text-xs ml-1.5">— {task.project_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-panel border border-border rounded-xl p-4 card-shadow">
            <h2 className="font-display text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              {t("dashboard.myTasks")}
            </h2>
            {summary.myTasks.length === 0 ? (
              <p className="text-xs text-muted italic">{t("dashboard.myTasksEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {summary.myTasks.slice(0, 6).map((task) => (
                  <li
                    key={task.id}
                    className="text-sm cursor-pointer hover:text-teal transition-colors flex items-center gap-1.5 truncate"
                    onClick={() => navigate(`/projekty/${task.project_id}`)}
                  >
                    {!!task.is_important && <IconFlag size={11} className="text-danger shrink-0" />}
                    <span className="truncate">{task.title}</span>
                    {task.due_date && (
                      <span className="font-data text-[10px] text-muted shrink-0 ml-auto">{task.due_date}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-panel border border-danger/30 rounded-xl p-4 card-shadow">
            <h2 className="font-display text-xs font-semibold text-danger uppercase tracking-wide mb-3">
              {t("dashboard.overdue")}
            </h2>
            {summary.overdueTasks.length === 0 ? (
              <p className="text-xs text-muted italic">{t("dashboard.overdueEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {summary.overdueTasks.slice(0, 6).map((task) => (
                  <li
                    key={task.id}
                    className="text-sm cursor-pointer hover:text-danger transition-colors flex items-center justify-between gap-2 truncate"
                    onClick={() => navigate(`/projekty/${task.project_id}`)}
                  >
                    <span className="truncate">{task.title}</span>
                    <span className="font-data text-[10px] text-danger shrink-0">{task.due_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loading && summary && summary.upcomingMilestones.length > 0 && (
        <div className="bg-panel border border-border rounded-xl p-4 card-shadow mb-8">
          <h2 className="font-display text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            {t("dashboard.upcomingMilestones")}
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {summary.upcomingMilestones.map((m) => (
              <li key={m.id} className="text-sm flex items-center gap-2">
                <span className="text-text">{m.title}</span>
                <span className="text-muted text-xs">
                  {(m as any).project_name} · {m.due_date}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && (
        <>
          <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            {t("dashboard.myProjects")}
          </h2>

          {projects.length === 0 && (
            <div className="border border-dashed border-border rounded-xl p-10 text-center">
              <p className="text-muted text-sm mb-4">{t("dashboard.empty")}</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all"
              >
                {t("dashboard.emptyCta")}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => navigate(`/projekty/${project.id}`)}
                className="text-left bg-panel border border-border rounded-xl p-5 card-shadow card-shadow-hover transition-all flex items-center gap-4"
                style={project.color ? { borderColor: project.color } : undefined}
              >
                <ProgressGauge progress={project.progress} size={64} />
                <div className="min-w-0">
                  <h3 className="font-display font-medium text-text truncate">{project.name}</h3>
                  {project.objective && (
                    <p className="text-xs text-muted mt-1 line-clamp-2">{project.objective}</p>
                  )}
                  {project.nextDeadline && (
                    <p className="font-data text-[10px] text-muted mt-1.5">{project.nextDeadline}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <NewProjectModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}

      {user?.emailVerified && !user.onboarded && <TutorialModal />}
    </Layout>
  );
}
