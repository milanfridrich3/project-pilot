import { useState } from "react";
import type { ProjectResource } from "../lib/types";
import { useTranslate } from "../lib/i18n";
import { IconLink, IconPlus, IconX } from "./icons";

interface ResourcesListProps {
  resources: ProjectResource[];
  canManage: boolean;
  onAdd: (data: { name: string; url: string; description: string | null }) => Promise<void>;
  onDelete: (resourceId: number) => void;
}

export function ResourcesList({ resources, canManage, onAdd, onDelete }: ResourcesListProps) {
  const t = useTranslate();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), url: url.trim(), description: description.trim() || null });
      setName("");
      setUrl("");
      setDescription("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-panel border border-border rounded-xl p-4 card-shadow">
      {resources.length === 0 && !adding && (
        <p className="text-xs text-muted italic mb-3">{t("project.resourcesEmpty")}</p>
      )}
      <ul className="flex flex-col gap-2 mb-3">
        {resources.map((r) => (
          <li key={r.id} className="flex items-start gap-2.5 group">
            <IconLink size={13} className="text-muted mt-1 shrink-0" />
            <div className="min-w-0 flex-1">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal hover:text-teal-dim transition-colors break-words"
              >
                {r.name}
              </a>
              {r.description && <p className="text-xs text-muted mt-0.5">{r.description}</p>}
              {r.added_by_name && (
                <p className="text-[11px] text-muted mt-0.5">
                  {t("project.resourceAddedBy").replace("{name}", r.added_by_name)}
                </p>
              )}
            </div>
            {canManage && (
              <button
                onClick={() => onDelete(r.id)}
                className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label={t("board.deleteTask")}
              >
                <IconX size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage &&
        (adding ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-2 border-t border-border">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("project.resourceName")}
              required
              className="bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("project.resourceUrl")}
              required
              className="bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("project.resourceDescription")}
              className="bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-sm text-muted hover:text-text"
              >
                {t("project.cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary rounded-lg px-3 py-1.5 text-sm disabled:opacity-60"
              >
                {saving ? "…" : t("project.add")}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-teal transition-colors"
          >
            <IconPlus size={14} />
            {t("project.addResource")}
          </button>
        ))}
    </div>
  );
}
