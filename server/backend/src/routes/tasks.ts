import { Router, Response } from "express";
import { db } from "../db";
import { AuthRequest, requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { isMember, hasPermission } from "../lib/permissions";
import { createNotification, logActivity } from "../lib/notify";

const router = Router();
router.use(requireAuth);
router.use(requireVerifiedEmail);

const VALID_STATUSES = ["todo", "in_progress", "review", "done"];
const VALID_PRIORITIES = ["low", "medium", "high"];

async function withPinnedAndAssignees(task: any, userId: number) {
  const pin = await db.get("SELECT 1 FROM task_pins WHERE task_id = ? AND user_id = ?", [task.id, userId]);
  const assignees = await getAssignees(task.id);
  return { ...task, pinned: !!pin, assignees };
}

async function getAssignees(taskId: number): Promise<{ id: number; name: string }[]> {
  const rows = (await db.all(
    `SELECT u.id, u.name FROM task_assignees ta
     JOIN users u ON u.id = ta.user_id
     WHERE ta.task_id = ?
     ORDER BY u.name ASC`,
    [taskId]
  )) as { id: number; name: string }[];
  return rows;
}

// Filtruje pole assignee_ids jen na skutecne cleny projektu - ochrana proti
// prirazeni ukolu nekomu, kdo v projektu neni.
async function filterToProjectMembers(projectId: number, ids: unknown): Promise<number[]> {
  if (!Array.isArray(ids)) return [];
  const unique = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id))));
  const result: number[] = [];
  for (const id of unique) {
    if (await isMember(projectId, id)) result.push(id);
  }
  return result;
}

async function setAssignees(taskId: number, userIds: number[]) {
  await db.run("DELETE FROM task_assignees WHERE task_id = ?", [taskId]);
  for (const userId of userIds) {
    try {
      await db.run("INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)", [taskId, userId]);
    } catch {
      // uz existuje (soubeh) - v poradku
    }
  }
}

router.post("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const { project_id, title, description, priority, assignee_ids, due_date, milestone_id } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ error: "project_id a title jsou povinné.", code: "PROJECT_ID_TITLE_REQUIRED" });
    }
    if (!(await isMember(project_id, req.userId!))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(project_id, req.userId!, "create_tasks"))) {
      return res.status(403).json({ error: "Nemáte oprávnění vytvářet úkoly.", code: "PERMISSION_DENIED" });
    }
    const requestedAssignees = Array.isArray(assignee_ids) ? assignee_ids : [];
    if (requestedAssignees.length > 0 && !(await hasPermission(project_id, req.userId!, "assign_tasks"))) {
      return res.status(403).json({ error: "Nemáte oprávnění přiřazovat úkoly.", code: "PERMISSION_DENIED" });
    }
    const finalPriority = VALID_PRIORITIES.includes(priority) ? priority : "medium";
    const finalAssignees = await filterToProjectMembers(project_id, requestedAssignees);

    const result = await db.run(
      `INSERT INTO tasks (project_id, milestone_id, title, description, priority, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project_id, milestone_id || null, title, description || null, finalPriority, due_date || null, req.userId as number]
    );
    const taskId = result.lastInsertRowid;

    if (finalAssignees.length > 0) {
      await setAssignees(taskId, finalAssignees);
    }

    const actor = (await db.get("SELECT name FROM users WHERE id = ?", [req.userId as number])) as { name: string };
    await logActivity(project_id, req.userId as number, "task_created", { taskId, title });

    if (finalAssignees.length > 0) {
      const project = (await db.get("SELECT name FROM projects WHERE id = ?", [project_id])) as { name: string };
      for (const assigneeId of finalAssignees) {
        if (assigneeId === req.userId) continue;
        await createNotification(assigneeId, "task_assigned", {
          taskId,
          taskTitle: title,
          projectId: project_id,
          projectName: project.name,
          fromUserName: actor.name,
        });
      }
    }

    const task = await db.get("SELECT * FROM tasks WHERE id = ?", [taskId]);
    res.status(201).json({ ...(task as object), pinned: false, assignees: await getAssignees(taskId) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const taskId = Number(req.params.id);
    const task = (await db.get("SELECT * FROM tasks WHERE id = ?", [taskId])) as any;
    if (!task) return res.status(404).json({ error: "Úkol nenalezen.", code: "TASK_NOT_FOUND" });
    if (!(await isMember(task.project_id, req.userId!))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }

    const { title, description, status, priority, assignee_ids, due_date, milestone_id, is_important } = req.body;

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Neplatný stav úkolu.", code: "INVALID_TASK_STATUS" });
    }
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: "Neplatná priorita.", code: "INVALID_PRIORITY" });
    }

    // Prirazeni ukolu ma vlastni opravneni, oddelene od beznych uprav.
    const changingAssignees = Array.isArray(assignee_ids);
    if (changingAssignees && !(await hasPermission(task.project_id, req.userId!, "assign_tasks"))) {
      return res.status(403).json({ error: "Nemáte oprávnění přiřazovat úkoly.", code: "PERMISSION_DENIED" });
    }
    // Ostatni zmeny (nazev, popis, stav, priorita, termin, milnik, dulezitost)
    // spadaji pod obecne opravneni upravovat ukoly.
    const editsOtherFields =
      title !== undefined ||
      description !== undefined ||
      status !== undefined ||
      priority !== undefined ||
      due_date !== undefined ||
      milestone_id !== undefined ||
      is_important !== undefined;
    if (editsOtherFields && !(await hasPermission(task.project_id, req.userId!, "edit_tasks"))) {
      return res.status(403).json({ error: "Nemáte oprávnění upravovat úkoly.", code: "PERMISSION_DENIED" });
    }

    // completed_at se nastavi/zrusi automaticky podle prechodu stavu do/z "done"
    let completedAt: string | null | undefined = undefined;
    if (status !== undefined) {
      if (status === "done" && task.status !== "done") {
        completedAt = new Date().toISOString();
      } else if (status !== "done" && task.status === "done") {
        completedAt = null;
      }
    }

    await db.run(
      `UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        due_date = COALESCE(?, due_date),
        milestone_id = COALESCE(?, milestone_id),
        is_important = COALESCE(?, is_important),
        completed_at = CASE WHEN ? = 1 THEN ? ELSE completed_at END
       WHERE id = ?`,
      [
        title ?? null,
        description ?? null,
        status ?? null,
        priority ?? null,
        due_date ?? null,
        milestone_id ?? null,
        is_important === undefined ? null : is_important ? 1 : 0,
        completedAt !== undefined ? 1 : 0,
        completedAt ?? null,
        taskId,
      ]
    );

    const actorId = req.userId as number;
    if (status === "done" && task.status !== "done") {
      await logActivity(task.project_id, actorId, "task_completed", { taskId, title: task.title });
      if (task.is_important && task.created_by && task.created_by !== actorId) {
        const actor = (await db.get("SELECT name FROM users WHERE id = ?", [actorId])) as { name: string };
        const project = (await db.get("SELECT name FROM projects WHERE id = ?", [task.project_id])) as {
          name: string;
        };
        await createNotification(task.created_by, "important_task_completed", {
          taskId,
          taskTitle: task.title,
          projectId: task.project_id,
          projectName: project.name,
          fromUserName: actor.name,
        });
      }
    }

    if (changingAssignees) {
      const before = new Set((await getAssignees(taskId)).map((a) => a.id));
      const finalAssignees = await filterToProjectMembers(task.project_id, assignee_ids);
      await setAssignees(taskId, finalAssignees);
      const added = finalAssignees.filter((id) => !before.has(id));

      if (added.length > 0) {
        const actor = (await db.get("SELECT name FROM users WHERE id = ?", [actorId])) as { name: string };
        const project = (await db.get("SELECT name FROM projects WHERE id = ?", [task.project_id])) as {
          name: string;
        };
        await logActivity(task.project_id, actorId, "task_assigned", { taskId, title: task.title });
        for (const assigneeId of added) {
          if (assigneeId === actorId) continue;
          await createNotification(assigneeId, "task_assigned", {
            taskId,
            taskTitle: task.title,
            projectId: task.project_id,
            projectName: project.name,
            fromUserName: actor.name,
          });
        }
      }
    }

    if (due_date !== undefined && due_date !== task.due_date) {
      await logActivity(task.project_id, actorId, "task_deadline_changed", { taskId, title: task.title, dueDate: due_date });
    }

    const updated = await db.get("SELECT * FROM tasks WHERE id = ?", [taskId]);
    res.json(await withPinnedAndAssignees(updated, req.userId as number));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const taskId = Number(req.params.id);
    const task = (await db.get("SELECT * FROM tasks WHERE id = ?", [taskId])) as any;
    if (!task) return res.status(404).json({ error: "Úkol nenalezen.", code: "TASK_NOT_FOUND" });
    if (!(await isMember(task.project_id, req.userId!))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(task.project_id, req.userId!, "delete_tasks"))) {
      return res.status(403).json({ error: "Nemáte oprávnění mazat úkoly.", code: "PERMISSION_DENIED" });
    }
    await db.run("DELETE FROM tasks WHERE id = ?", [taskId]);
    await logActivity(task.project_id, req.userId as number, "task_deleted", { title: task.title });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Osobni pripnuti ukolu - kazdy clen projektu si muze pripnout libovolny
// pocet ukolu nezavisle na ostatnich; pripnute ukoly se zobrazuji nahore.
// Neni to samostatne opravneni - staci byt clenem projektu.
router.post("/:id/pin", async (req: AuthRequest, res: Response, next) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.userId as number;
    const task = (await db.get("SELECT * FROM tasks WHERE id = ?", [taskId])) as any;
    if (!task) return res.status(404).json({ error: "Úkol nenalezen.", code: "TASK_NOT_FOUND" });
    if (!(await isMember(task.project_id, userId))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    try {
      await db.run("INSERT INTO task_pins (task_id, user_id) VALUES (?, ?)", [taskId, userId]);
    } catch {
      // uz pripnuto - v poradku, idempotentni
    }
    res.json({ ok: true, pinned: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/pin", async (req: AuthRequest, res: Response, next) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.userId as number;
    await db.run("DELETE FROM task_pins WHERE task_id = ? AND user_id = ?", [taskId, userId]);
    res.json({ ok: true, pinned: false });
  } catch (err) {
    next(err);
  }
});

// --- Komentare u ukolu (jednoduchy chat) ---

router.get("/:id/comments", async (req: AuthRequest, res: Response, next) => {
  try {
    const taskId = Number(req.params.id);
    const task = (await db.get("SELECT project_id FROM tasks WHERE id = ?", [taskId])) as any;
    if (!task) return res.status(404).json({ error: "Úkol nenalezen.", code: "TASK_NOT_FOUND" });
    if (!(await isMember(task.project_id, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    const rows = await db.all(
      `SELECT c.id, c.body, c.created_at, u.id as author_id, u.name as author_name, u.avatar as author_avatar
       FROM task_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC, c.id ASC`,
      [taskId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/comments", async (req: AuthRequest, res: Response, next) => {
  try {
    const taskId = Number(req.params.id);
    const userId = req.userId as number;
    const task = (await db.get("SELECT * FROM tasks WHERE id = ?", [taskId])) as any;
    if (!task) return res.status(404).json({ error: "Úkol nenalezen.", code: "TASK_NOT_FOUND" });
    if (!(await isMember(task.project_id, userId))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    const { body, mentions } = req.body;
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: "Komentář nemůže být prázdný.", code: "COMMENT_BODY_REQUIRED" });
    }

    const result = await db.run("INSERT INTO task_comments (task_id, author_id, body) VALUES (?, ?, ?)", [
      taskId,
      userId,
      String(body).trim(),
    ]);

    const author = (await db.get("SELECT name, avatar FROM users WHERE id = ?", [userId])) as {
      name: string;
      avatar: string | null;
    };
    const project = (await db.get("SELECT name FROM projects WHERE id = ?", [task.project_id])) as {
      name: string;
    };

    // Upozorneni: vsem prirazenym lidem a zadavateli ukolu (pokud nejsou
    // sami autorem komentare) + explicitne zmineni lide (musi byt clenove
    // projektu, jinak se ignoruji).
    const notifyIds = new Set<number>();
    for (const a of await getAssignees(taskId)) {
      if (a.id !== userId) notifyIds.add(a.id);
    }
    if (task.created_by && task.created_by !== userId) notifyIds.add(task.created_by);

    if (Array.isArray(mentions)) {
      for (const rawId of mentions) {
        const mentionId = Number(rawId);
        if (mentionId === userId) continue;
        if (await isMember(task.project_id, mentionId)) {
          notifyIds.add(mentionId);
        }
      }
    }

    for (const targetId of notifyIds) {
      await createNotification(targetId, "task_comment", {
        taskId,
        taskTitle: task.title,
        projectId: task.project_id,
        projectName: project.name,
        fromUserName: author.name,
      });
    }

    res.status(201).json({
      id: result.lastInsertRowid,
      body: String(body).trim(),
      created_at: new Date().toISOString(),
      author_id: userId,
      author_name: author.name,
      author_avatar: author.avatar,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
