import { useState } from "react";
import type { Milestone, Task } from "../lib/types";
import { useTranslate } from "../lib/i18n";
import { IconPlus, IconX } from "./icons";

interface WaypointTimelineProps {
  milestones: Milestone[];
  tasks: Task[];
  onAdd: (data: { title: string; due_date: string | null }) => Promise<void>;
  onDelete: (milestoneId: number) => void;
  canManage?: boolean;
}

function milestoneCompletion(milestoneId: number, tasks: Task[]): number {
  const relevant = tasks.filter((t) => t.milestone_id === milestoneId);
  if (relevant.length === 0) return 0;
  const done = relevant.filter((t) => t.status === "done").length;
  return Math.round((done / relevant.length) * 100);
}

export function WaypointTimeline({ milestones, tasks, onAdd, onDelete, canManage = true }: WaypointTimelineProps) {
  const t = useTranslate();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({ title: title.trim(), due_date: dueDate || null });
      setTitle("");
      setDueDate("");
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative overflow-x-auto pb-2">
      <div className="flex items-start gap-0 min-w-max px-2">
        {milestones.map((m, i) => {
          const completion = milestoneCompletion(m.id, tasks);
          const reached = completion === 100;
          return (
            <div key={m.id} className="flex items-start">
              <div className="flex flex-col items-center w-40 group relative">
                {canManage && (
                  <button
                    onClick={() => onDelete(m.id)}
                    className="absolute -top-1 right-8 opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity"
                    aria-label={t("project.deleteMilestone")}
                  >
                    <IconX size={12} />
                  </button>
                )}
                <div className="font-data text-[10px] text-muted mb-2">{i + 1}</div>
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                    reached ? "bg-teal border-teal" : "bg-panel border-teal-dim"
                  }`}
                />
                <div className="mt-3 text-center">
                  <div className="text-sm font-medium text-text">{m.title}</div>
                  {m.due_date && (
                    <div className="font-data text-[11px] text-muted mt-1">{m.due_date}</div>
                  )}
                  <div className="font-data text-[11px] text-teal mt-1">{completion}%</div>
                </div>
              </div>
              <div className="w-16 h-[2px] bg-border mt-[6px]" />
            </div>
          );
        })}

        {canManage && (adding ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-48 bg-panel border border-border rounded-xl p-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
              placeholder={t("project.milestoneTitlePlaceholder")}
              className="w-full bg-base border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-base border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs text-muted hover:text-text transition-colors"
              >
                {t("project.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn-primary rounded-lg px-2 py-1.5 text-xs disabled:opacity-60"
              >
                {t("project.add")}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex flex-col items-center justify-center w-40 border border-dashed border-border rounded-xl text-muted hover:text-teal hover:border-teal-dim transition-colors py-6 gap-1.5 self-start"
          >
            <IconPlus size={16} />
            <span className="text-xs">{t("project.addMilestone")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
