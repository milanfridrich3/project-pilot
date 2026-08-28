import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useTranslate } from "../lib/i18n";
import { IconTrash, IconArchive } from "./icons";
import type { ProjectDetail, ProjectRole } from "../lib/types";
import { PERMISSION_ACTIONS } from "../lib/types";

interface ProjectSettingsModalProps {
  project: ProjectDetail;
  onClose: () => void;
  onUpdated: (project: ProjectDetail) => void;
  onDeleted: () => void;
}

const COLOR_OPTIONS = ["#2dd4bf", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#facc15", "#f87171", "#4ade80"];

export function ProjectSettingsModal({ project, onClose, onUpdated, onDeleted }: ProjectSettingsModalProps) {
  const t = useTranslate();
  const isOwner = project.myRole === "owner";
  const [name, setName] = useState(project.name);
  const [objective, setObjective] = useState(project.objective || "");
  const [color, setColor] = useState(project.color || "");
  const [isDiscoverable, setIsDiscoverable] = useState(!!project.is_discoverable);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, ProjectRole> | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    api
      .get<Record<string, ProjectRole>>(`/projects/${project.id}/permissions`)
      .then(setPermissions)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, isOwner]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.patch<ProjectDetail>(`/projects/${project.id}`, {
        name,
        objective,
        color,
        isDiscoverable,
      });
      onUpdated({ ...project, ...updated });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  async function handlePermissionChange(action: string, role: ProjectRole) {
    if (!permissions) return;
    const next = { ...permissions, [action]: role };
    setPermissions(next);
    try {
      await api.patch(`/projects/${project.id}/permissions`, { [action]: role });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/projects/${project.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
      setDeleting(false);
    }
  }

  async function handleToggleArchive() {
    setArchiveBusy(true);
    setError(null);
    try {
      const isArchived = !!project.is_archived;
      await api.post(`/projects/${project.id}/${isArchived ? "unarchive" : "archive"}`);
      if (isArchived) {
        onUpdated({ ...project, is_archived: 0 });
      } else {
        onDeleted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setArchiveBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 sm:px-6 z-50">
      <div className="bg-panel border border-border rounded-2xl p-6 w-full max-w-md card-shadow max-h-[85vh] overflow-y-auto">
        <h2 className="font-display text-lg font-semibold mb-4">{t("project.settings")}</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted mb-1 block">{t("project.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">{t("project.objective")}</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={2}
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">{t("project.color")}</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? "ring-2 ring-offset-2 ring-offset-panel ring-teal scale-105" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDiscoverable}
              onChange={(e) => setIsDiscoverable(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="text-sm text-text block">{t("project.discoverable")}</span>
              <span className="text-xs text-muted">{t("project.discoverableHint")}</span>
            </span>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-muted hover:text-text transition-colors"
            >
              {t("project.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary font-medium rounded-lg px-3 py-2 text-sm transition-all disabled:opacity-60"
            >
              {saving ? "…" : t("project.save")}
            </button>
          </div>
        </form>

        {isOwner && permissions && (
          <div className="mt-6 pt-5 border-t border-border">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
              {t("project.permissions")}
            </h3>
            <p className="text-xs text-muted mb-3">{t("project.permissionsHint")}</p>
            <div className="flex flex-col gap-2">
              {PERMISSION_ACTIONS.map((action) => (
                <div key={action} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-text">{t(`permission.${action}` as any)}</span>
                  <select
                    value={permissions[action] || "admin"}
                    onChange={(e) => handlePermissionChange(action, e.target.value as ProjectRole)}
                    className="font-data text-xs bg-base border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-teal"
                  >
                    <option value="member">{t("roles.member")}</option>
                    <option value="admin">{t("roles.admin")}</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner && (
          <div className="mt-6 pt-5 border-t border-border flex flex-col gap-2 items-start">
            <button
              onClick={handleToggleArchive}
              disabled={archiveBusy}
              className="flex items-center gap-1.5 text-sm text-muted border border-border rounded-lg px-3 py-2 hover:text-text hover:border-teal-dim transition-colors disabled:opacity-60"
            >
              <IconArchive size={14} />
              {archiveBusy ? "…" : project.is_archived ? t("project.unarchiveProject") : t("project.archiveProject")}
            </button>
          </div>
        )}

        {isOwner && (
          <div className="mt-4 pt-5 border-t border-border">
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 text-sm text-danger border border-danger/40 rounded-lg px-3 py-2 hover:bg-danger/10 transition-colors"
              >
                <IconTrash size={14} />
                {t("project.deleteProject")}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-text">{t("project.deleteProjectConfirm")}</p>
                <p className="text-xs text-muted">{t("project.deleteProjectWarning")}</p>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setConfirmingDelete(false)} className="text-sm text-muted hover:text-text">
                    {t("project.cancel")}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-danger text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    {deleting ? "…" : t("project.deleteProject")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
