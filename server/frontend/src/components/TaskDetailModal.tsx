import { useEffect, useState } from "react";
import type { Task, TaskComment, ProjectMember } from "../lib/types";
import { api } from "../lib/api";
import { useTranslate } from "../lib/i18n";
import { Avatar } from "./Avatar";
import { IconX, IconSend } from "./icons";

interface TaskDetailModalProps {
  task: Task;
  members: ProjectMember[];
  canAssign: boolean;
  onClose: () => void;
  onChangeAssignees: (taskId: number, assigneeIds: number[]) => Promise<void>;
}

// Najde v textu "@Jmeno" shody se jmeny clenu projektu (nejdelsi shoda
// vyhrava, aby se "@Jan Novak" neuriznul na jen "@Jan"). Vraci id
// zminenych uzivatelu, ktere backend pouzije k odeslani notifikace.
function extractMentions(body: string, members: ProjectMember[]): number[] {
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const found = new Set<number>();
  for (const m of sorted) {
    if (body.includes(`@${m.name}`)) {
      found.add(m.id);
    }
  }
  return Array.from(found);
}

export function TaskDetailModal({ task, members, canAssign, onClose, onChangeAssignees }: TaskDetailModalProps) {
  const t = useTranslate();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [assigneeBusy, setAssigneeBusy] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<TaskComment[]>(`/tasks/${task.id}/comments`)
      .then(setComments)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const mentions = extractMentions(body, members);
      await api.post<TaskComment>(`/tasks/${task.id}/comments`, { body: body.trim(), mentions });
      setBody("");
      load();
    } finally {
      setSending(false);
    }
  }

  async function toggleAssignee(userId: number) {
    const current = task.assignees.map((a) => a.id);
    const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
    setAssigneeBusy(true);
    try {
      await onChangeAssignees(task.id, next);
    } finally {
      setAssigneeBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 sm:px-6 z-50">
      <div className="bg-panel border border-border rounded-2xl w-full max-w-lg card-shadow max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold break-words text-text">{task.title}</h2>
            {task.description && <p className="text-sm text-muted mt-1.5">{task.description}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-text shrink-0" aria-label={t("task.close")}>
            <IconX size={16} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{t("project.assignees")}</h3>
          {canAssign ? (
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const active = task.assignees.some((a) => a.id === m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={assigneeBusy}
                    onClick={() => toggleAssignee(m.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-60 ${
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
          ) : task.assignees.length > 0 ? (
            <p className="text-sm text-text">{task.assignees.map((a) => a.name).join(", ")}</p>
          ) : (
            <p className="text-sm text-muted italic">{t("project.noAssignee")}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">{t("task.comments")}</h3>
          {loading && <p className="text-xs text-muted">…</p>}
          {!loading && comments.length === 0 && (
            <p className="text-xs text-muted italic">{t("task.commentsEmpty")}</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar value={c.author_avatar} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-text font-medium">{c.author_name}</span>
                  <span className="font-data text-[10px] text-muted">{c.created_at}</span>
                </div>
                <p className="text-sm text-text mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2 items-end">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (body.trim() && !sending) {
                  handleSend(e as unknown as React.FormEvent);
                }
              }
            }}
            placeholder={t("task.commentPlaceholder")}
            rows={1}
            className="flex-1 bg-base border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow resize-none"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="btn-primary rounded-lg px-3 py-2 text-sm disabled:opacity-60 shrink-0"
            aria-label={t("task.commentSend")}
          >
            <IconSend size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
