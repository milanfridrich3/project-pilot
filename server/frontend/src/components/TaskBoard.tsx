import { useMemo, useState } from "react";
import type { Task, TaskStatus } from "../lib/types";
import { useTranslate, type TranslationKey } from "../lib/i18n";
import { IconX, IconPin, IconFlag } from "./icons";

interface TaskBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: number, status: TaskStatus) => void;
  onDelete: (taskId: number) => void;
  onTogglePin: (taskId: number, pinned: boolean) => void;
  onToggleImportant: (taskId: number, important: boolean) => void;
  onOpenTask: (task: Task) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const COLUMNS: { status: TaskStatus; labelKey: TranslationKey }[] = [
  { status: "todo", labelKey: "board.todo" },
  { status: "in_progress", labelKey: "board.inProgress" },
  { status: "review", labelKey: "board.review" },
  { status: "done", labelKey: "board.done" },
];

const PRIORITY_STYLE: Record<Task["priority"], string> = {
  low: "text-muted border-border",
  medium: "text-amber border-amber/40",
  high: "text-danger border-danger/40",
};

const PRIORITY_KEY: Record<Task["priority"], TranslationKey> = {
  low: "project.priorityLow",
  medium: "project.priorityMedium",
  high: "project.priorityHigh",
};

const PRIORITY_ORDER: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 };

type SortMode = "created" | "deadline" | "priority";

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === "done") return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

export function TaskBoard({
  tasks,
  onStatusChange,
  onDelete,
  onTogglePin,
  onToggleImportant,
  onOpenTask,
  canEdit = true,
  canDelete = true,
}: TaskBoardProps) {
  const t = useTranslate();
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("created");

  const assignees = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach((task) => {
      task.assignees.forEach((a) => names.add(a.name));
    });
    return Array.from(names).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (assigneeFilter !== "all" && !task.assignees.some((a) => a.name === assigneeFilter)) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, assigneeFilter, priorityFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      // Pripnute vzdy nahoru, bez ohledu na zvoleny sort mode.
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (sortMode === "deadline") {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date < b.due_date ? -1 : 1;
      }
      if (sortMode === "priority") {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      return a.created_at < b.created_at ? -1 : 1;
    });
    return copy;
  }, [filtered, sortMode]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        {assignees.length > 0 && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-panel border border-border rounded-lg px-2 py-1.5 text-text focus:outline-none focus:border-teal"
          >
            <option value="all">{t("board.filterAssignee")}: {t("board.filterAll")}</option>
            {assignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-panel border border-border rounded-lg px-2 py-1.5 text-text focus:outline-none focus:border-teal"
        >
          <option value="all">{t("board.filterPriority")}: {t("board.filterAll")}</option>
          <option value="low">{t("project.priorityLow")}</option>
          <option value="medium">{t("project.priorityMedium")}</option>
          <option value="high">{t("project.priorityHigh")}</option>
        </select>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="bg-panel border border-border rounded-lg px-2 py-1.5 text-text focus:outline-none focus:border-teal"
        >
          <option value="created">{t("board.sortBy")}: {t("board.sortCreated")}</option>
          <option value="deadline">{t("board.sortBy")}: {t("board.sortDeadline")}</option>
          <option value="priority">{t("board.sortBy")}: {t("board.sortPriority")}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const columnTasks = sorted.filter((task) => task.status === col.status);
          return (
            <div key={col.status} className="bg-panel border border-border rounded-xl p-3 flex flex-col gap-2 min-h-[160px]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{t(col.labelKey)}</h3>
                <span className="font-data text-[11px] text-muted">{columnTasks.length}</span>
              </div>
              {columnTasks.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <div
                    key={task.id}
                    className={`bg-panel-raised border rounded-md p-3 group ${
                      task.pinned ? "border-teal-dim" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 min-w-0">
                        {!!task.is_important && (
                          <IconFlag size={13} className="text-danger shrink-0 mt-0.5" />
                        )}
                        <p
                          className="text-sm text-text leading-snug cursor-pointer hover:text-teal transition-colors"
                          onClick={() => onOpenTask(task)}
                        >
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => onTogglePin(task.id, !task.pinned)}
                          aria-label={task.pinned ? t("board.unpin") : t("board.pin")}
                          className={`text-muted hover:text-teal ${task.pinned ? "text-teal opacity-100" : ""}`}
                        >
                          <IconPin size={13} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => onToggleImportant(task.id, !task.is_important)}
                            aria-label={task.is_important ? t("board.unmarkImportant") : t("board.markImportant")}
                            className={`text-muted hover:text-danger ${task.is_important ? "text-danger opacity-100" : ""}`}
                          >
                            <IconFlag size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDelete(task.id)}
                            className="text-muted hover:text-danger"
                            aria-label={t("board.deleteTask")}
                          >
                            <IconX size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-[10px] font-data px-2 py-0.5 border rounded-full ${PRIORITY_STYLE[task.priority]}`}>
                        {t(PRIORITY_KEY[task.priority])}
                      </span>
                      {task.due_date && (
                        <span className={`font-data text-[10px] ${overdue ? "text-danger font-medium" : "text-muted"}`}>
                          {overdue ? `${t("board.overdue")}: ` : ""}
                          {task.due_date}
                        </span>
                      )}
                    </div>
                    {task.assignees.length > 0 && (
                      <div className="text-[11px] text-muted mt-2 truncate">
                        {task.assignees.map((a) => a.name).join(", ")}
                      </div>
                    )}
                    {canEdit && (
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                        className="mt-3 w-full bg-base border border-border rounded-lg text-xs text-text px-2 py-1 focus:outline-none focus:border-teal"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.status} value={c.status}>
                            {t(c.labelKey)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
              {columnTasks.length === 0 && <p className="text-xs text-muted italic">{t("board.empty")}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
