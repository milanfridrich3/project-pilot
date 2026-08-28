import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ProgressGauge } from "../components/ProgressGauge";
import { WaypointTimeline } from "../components/WaypointTimeline";
import { TaskBoard } from "../components/TaskBoard";
import { NewTaskForm } from "../components/NewTaskForm";
import { ProjectSettingsModal } from "../components/ProjectSettingsModal";
import { InviteFollowedForm } from "../components/InviteFollowedForm";
import { IconSettings, IconCheck, IconX, IconLock } from "../components/icons";
import { ProjectPageSkeleton } from "../components/Skeleton";
import { TaskDetailModal } from "../components/TaskDetailModal";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { ResourcesList } from "../components/ResourcesList";
import type {
  ProjectDetail,
  ProjectPreview,
  JoinRequest,
  ActivityEntry,
  Task,
  TaskPriority,
  TaskStatus,
} from "../lib/types";
import { api, ApiRequestError } from "../lib/api";
import { useTranslate } from "../lib/i18n";
import { useAuthStore } from "../store/auth";

const ROLE_KEY = { owner: "roles.owner", admin: "roles.admin", member: "roles.member" } as const;

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const t = useTranslate();
  const currentUser = useAuthStore((s) => s.user);

  function loadJoinRequests(canApprove: boolean) {
    if (!id || !canApprove) {
      setJoinRequests([]);
      return;
    }
    api
      .get<JoinRequest[]>(`/projects/${id}/join-requests`)
      .then(setJoinRequests)
      .catch(() => {});
  }

  function loadActivity() {
    if (!id) return;
    api
      .get<ActivityEntry[]>(`/projects/${id}/activity`)
      .then(setActivity)
      .catch(() => {});
  }

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    api
      .get<ProjectDetail>(`/projects/${id}`)
      .then((data) => {
        setProject(data);
        loadJoinRequests(!!data.permissions?.approve_join_requests);
        loadActivity();
        setOpenTask((current) => {
          if (!current) return current;
          const fresh = data.tasks.find((t) => t.id === current.id);
          return fresh || current;
        });
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.code === "PROJECT_ACCESS_DENIED") {
          api
            .get<ProjectPreview>(`/projects/${id}/preview`)
            .then(setPreview)
            .catch(() => setError(t("project.notFound")));
        } else {
          setError(err instanceof Error ? err.message : t("errors.generic"));
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateTask(data: {
    title: string;
    priority: TaskPriority;
    milestone_id: number | null;
    due_date: string | null;
    assignee_ids: number[];
  }) {
    if (!id) return;
    await api.post<Task>("/tasks", { project_id: Number(id), ...data });
    load();
  }

  async function handleChangeAssignees(taskId: number, assigneeIds: number[]) {
    await api.patch<Task>(`/tasks/${taskId}`, { assignee_ids: assigneeIds });
    load();
  }

  async function handleStatusChange(taskId: number, status: TaskStatus) {
    await api.patch<Task>(`/tasks/${taskId}`, { status });
    load();
  }

  async function handleTaskDelete(taskId: number) {
    await api.delete(`/tasks/${taskId}`);
    load();
  }

  async function handleTogglePin(taskId: number, pinned: boolean) {
    if (pinned) {
      await api.post(`/tasks/${taskId}/pin`);
    } else {
      await api.delete(`/tasks/${taskId}/pin`);
    }
    load();
  }

  async function handleToggleImportant(taskId: number, important: boolean) {
    await api.patch<Task>(`/tasks/${taskId}`, { is_important: important });
    load();
  }

  async function handleAddMilestone(data: { title: string; due_date: string | null }) {
    if (!id) return;
    await api.post("/milestones", { project_id: Number(id), ...data });
    load();
  }

  async function handleDeleteMilestone(milestoneId: number) {
    await api.delete(`/milestones/${milestoneId}`);
    load();
  }

  async function handleAddResource(data: { name: string; url: string; description: string | null }) {
    if (!id) return;
    await api.post("/resources", { project_id: Number(id), ...data });
    load();
  }

  async function handleDeleteResource(resourceId: number) {
    await api.delete(`/resources/${resourceId}`);
    load();
  }

  async function handleInvite(userId: number) {
    if (!id) return;
    setInviteError(null);
    try {
      await api.post(`/projects/${id}/members`, { userId });
      load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : t("errors.generic"));
      throw err;
    }
  }

  async function handleChangeRole(userId: number, role: "admin" | "member") {
    if (!id) return;
    await api.patch(`/projects/${id}/members/${userId}`, { role });
    load();
  }

  async function handleRemoveMember(userId: number) {
    if (!id) return;
    await api.delete(`/projects/${id}/members/${userId}`);
    if (userId === currentUser?.id) {
      navigate("/");
      return;
    }
    load();
  }

  async function handleRequestJoin() {
    if (!id) return;
    setRequestBusy(true);
    setRequestMessage(null);
    try {
      await api.post(`/projects/${id}/join-requests`);
      setRequestMessage(t("project.requestSent"));
      setPreview((p) => (p ? { ...p, joinRequestStatus: "pending" } : p));
    } catch (err) {
      setRequestMessage(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setRequestBusy(false);
    }
  }

  async function handleAcceptJoinRequest(requestId: number) {
    await api.post(`/projects/join-requests/${requestId}/accept`);
    load();
  }

  async function handleDeclineJoinRequest(requestId: number) {
    await api.post(`/projects/join-requests/${requestId}/decline`);
    setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  if (loading) {
    return (
      <Layout>
        <ProjectPageSkeleton />
      </Layout>
    );
  }

  if (preview) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-10 bg-panel border border-border rounded-xl p-6 card-shadow text-center">
          <IconLock size={20} className="text-muted mx-auto mb-3" />
          <h1 className="font-display text-lg font-semibold mb-1">{preview.name}</h1>
          {preview.objective && <p className="text-sm text-muted mb-3">{preview.objective}</p>}
          <p className="font-data text-xs text-muted mb-5">
            {t("project.membersCount").replace("{count}", String(preview.memberCount ?? 0))}
          </p>
          {preview.joinRequestStatus === "pending" ? (
            <p className="text-sm text-teal">{t("project.requestSent")}</p>
          ) : (
            <button
              onClick={handleRequestJoin}
              disabled={requestBusy}
              className="btn-primary font-medium rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-60"
            >
              {t("project.requestJoin")}
            </button>
          )}
          {requestMessage && <p className="text-xs text-muted mt-3">{requestMessage}</p>}
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <p className="text-danger text-sm">{error || t("project.notFound")}</p>
      </Layout>
    );
  }

  const permissions = project.permissions;
  const myRole = project.myRole;
  const canEditSettings = !!permissions?.edit_project_settings || myRole === "owner";
  const canManageMembers = !!permissions?.manage_members || myRole === "owner";

  return (
    <Layout>
      <div className="flex items-start justify-between gap-4 sm:gap-6 mb-8 flex-wrap">
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-semibold break-words">{project.name}</h1>
            {project.objective && <p className="text-muted text-sm mt-1 max-w-xl">{project.objective}</p>}
            {myRole && (
              <span className="inline-block mt-1.5 font-data text-[10px] uppercase tracking-wide text-muted border border-border rounded-full px-2 py-0.5">
                {t(ROLE_KEY[myRole])}
              </span>
            )}
          </div>
          {canEditSettings && (
            <button
              onClick={() => setShowSettings(true)}
              title={t("project.settings")}
              className="w-8 h-8 rounded-full border border-border hover:border-teal-dim text-muted hover:text-text flex items-center justify-center transition-colors shrink-0"
            >
              <IconSettings size={14} />
            </button>
          )}
        </div>
        <ProgressGauge progress={project.progress} size={72} label={t("project.overallProgress")} />
      </div>

      <section className="mb-10">
        <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          {t("project.flightPlan")}
        </h2>
        <WaypointTimeline
          milestones={project.milestones}
          tasks={project.tasks}
          onAdd={handleAddMilestone}
          onDelete={handleDeleteMilestone}
          canManage={!!permissions?.manage_milestones}
        />
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide">
            {t("project.tasks")}
          </h2>
        </div>
        <NewTaskForm
          milestones={project.milestones}
          members={project.members}
          onSubmit={handleCreateTask}
          canCreate={!!permissions?.create_tasks}
          canAssign={!!permissions?.assign_tasks}
        />
        <TaskBoard
          tasks={project.tasks}
          onStatusChange={handleStatusChange}
          onDelete={handleTaskDelete}
          onTogglePin={handleTogglePin}
          onToggleImportant={handleToggleImportant}
          onOpenTask={setOpenTask}
          canEdit={!!permissions?.edit_tasks}
          canDelete={!!permissions?.delete_tasks}
        />
      </section>

      <section className="mb-10">
        <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          {t("project.resources")}
        </h2>
        <ResourcesList
          resources={project.resources}
          canManage={!!permissions?.manage_resources}
          onAdd={handleAddResource}
          onDelete={handleDeleteResource}
        />
      </section>

      <section className="mb-10">
        <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          {t("project.activity")}
        </h2>
        <div className="bg-panel border border-border rounded-xl p-4 card-shadow">
          <ActivityTimeline entries={activity} />
        </div>
      </section>

      {joinRequests.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            {t("project.joinRequests")}
          </h2>
          <div className="bg-panel border border-border rounded-xl p-4 card-shadow flex flex-col gap-2">
            {joinRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-text">{r.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptJoinRequest(r.id)}
                    className="flex items-center gap-1 text-xs bg-teal text-white rounded-lg px-2.5 py-1 hover:bg-teal-dim transition-colors"
                  >
                    <IconCheck size={12} />
                    {t("notif.accept")}
                  </button>
                  <button
                    onClick={() => handleDeclineJoinRequest(r.id)}
                    className="flex items-center gap-1 text-xs border border-border rounded-lg px-2.5 py-1 text-muted hover:text-text transition-colors"
                  >
                    <IconX size={12} />
                    {t("notif.decline")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          {t("project.team")}
        </h2>
        <div className="bg-panel border border-border rounded-xl p-4 card-shadow">
          <ul className="flex flex-col gap-2 mb-4">
            {project.members.map((m) => {
              const isSelf = m.id === currentUser?.id;
              const canRemove =
                m.role !== "owner" && (isSelf || (canManageMembers && (m.role !== "admin" || myRole === "owner")));
              return (
                <li key={m.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-text truncate">{m.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {myRole === "owner" && m.role !== "owner" ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleChangeRole(m.id, e.target.value as "admin" | "member")}
                        className="font-data text-xs bg-base border border-border rounded-lg px-1.5 py-1 focus:outline-none focus:border-teal"
                      >
                        <option value="member">{t("roles.member")}</option>
                        <option value="admin">{t("roles.admin")}</option>
                      </select>
                    ) : (
                      <span className="font-data text-xs text-muted">{t(ROLE_KEY[m.role])}</span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-muted hover:text-danger"
                        aria-label={isSelf ? t("project.leaveProject") : t("project.removeMember")}
                      >
                        <IconX size={13} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {canManageMembers && <InviteFollowedForm onInvite={handleInvite} />}
          {inviteError && <p className="text-sm text-danger mt-2">{inviteError}</p>}
        </div>
      </section>

      {showSettings && (
        <ProjectSettingsModal
          project={project}
          onClose={() => setShowSettings(false)}
          onUpdated={(updated) => setProject({ ...project, ...updated })}
          onDeleted={() => navigate("/")}
        />
      )}

      {openTask && (
        <TaskDetailModal
          task={openTask}
          members={project.members}
          canAssign={!!permissions?.assign_tasks}
          onClose={() => setOpenTask(null)}
          onChangeAssignees={handleChangeAssignees}
        />
      )}
    </Layout>
  );
}
