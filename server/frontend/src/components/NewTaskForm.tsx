import { useState } from "react";
import type { Milestone, ProjectMember, Task, TaskPriority } from "../lib/types";
import { useTranslate } from "../lib/i18n";
import { IconPlus } from "./icons";

interface NewTaskFormProps {
  milestones: Milestone[];
  members: ProjectMember[];
  onSubmit: (data: {
    title: string;
    priority: TaskPriority;
    milestone_id: number | null;
    due_date: string | null;
    assignee_ids: number[];
  }) => Promise<void>;
  canCreate?: boolean;
  canAssign?: boolean;
}

export function NewTaskForm({ milestones, members, onSubmit, canCreate = true, canAssign = true }: NewTaskFormProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslate();

  function toggleAssignee(userId: number) {
    setAssigneeIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        priority,
        milestone_id: milestoneId ? Number(milestoneId) : null,
        due_date: dueDate || null,
        assignee_ids: assigneeIds,
      });
      setTitle("");
      setPriority("medium");
      setMilestoneId("");
      setDueDate("");
      setAssigneeIds([]);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-teal hover:text-teal-dim transition-colors border border-border rounded-xl px-4 py-2 mb-4 flex items-center gap-1.5"
      >
        <IconPlus size={15} />
        {t("project.addTask")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-panel border border-border rounded-xl p-4 mb-4 flex flex-col gap-3"
    >
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
        <div className="flex-1">
          <label className="text-xs text-muted mb-1 block">{t("project.taskTitle")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
            className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
            placeholder={t("project.taskTitlePlaceholder")}
          />
        </div>
        {milestones.length > 0 && (
          <div>
            <label className="text-xs text-muted mb-1 block">{t("project.milestone")}</label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
            >
              <option value="">{t("project.noMilestone")}</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-muted mb-1 block">{t("project.priority")}</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
          >
            <option value="low">{t("project.priorityLow")}</option>
            <option value="medium">{t("project.priorityMedium")}</option>
            <option value="high">{t("project.priorityHigh")}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">{t("project.dueDate")}</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal"
          />
        </div>
      </div>

      {canAssign && members.length > 0 && (
        <div>
          <label className="text-xs text-muted mb-1.5 block">{t("project.assignees")}</label>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const active = assigneeIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAssignee(m.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-teal text-white border-teal"
                      : "border-border text-muted hover:text-text hover:border-teal-dim"
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 self-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-border rounded-lg px-3 py-2 text-sm text-muted hover:text-text transition-colors"
        >
          {t("project.cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary font-medium rounded-lg px-3 py-2 text-sm transition-all disabled:opacity-60"
        >
          {t("project.add")}
        </button>
      </div>
    </form>
  );
}

export type { Task };
