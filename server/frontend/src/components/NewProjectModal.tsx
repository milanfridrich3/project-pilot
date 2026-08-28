import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { TemplateOption } from "../lib/types";
import { useTranslate } from "../lib/i18n";

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (projectId: number) => void;
}

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [template, setTemplate] = useState("blank");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslate();

  useEffect(() => {
    api.get<TemplateOption[]>("/projects/templates").then(setTemplates).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const project = await api.post<{ id: number }>("/projects", { name, objective, template });
      onCreated(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 sm:px-6 z-50">
      <div className="bg-panel border border-border rounded-2xl p-6 w-full max-w-md card-shadow max-h-[85vh] overflow-y-auto">
        <h2 className="font-display text-lg font-semibold mb-4">{t("project.newProject")}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted mb-1 block">{t("project.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
              placeholder={t("project.namePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">{t("project.objective")}</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={2}
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal resize-none"
              placeholder={t("project.objectivePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">{t("project.template")}</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
            >
              {templates.map((tpl) => (
                <option key={tpl.key} value={tpl.key}>
                  {tpl.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-muted hover:text-text transition-colors"
            >
              {t("project.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary font-medium rounded-lg px-3 py-2 text-sm transition-all disabled:opacity-60"
            >
              {loading ? t("project.creating") : t("project.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
