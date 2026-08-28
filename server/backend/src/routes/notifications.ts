import { Router } from "express";
import { db } from "../db";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { addClient, removeClient } from "../lib/realtime";

const router = Router();

// SSE stream - MUSI byt pred router.use(requireAuth) below jen zdanlive
// problematicke, ale requireAuth uz sam podporuje token v query parametru
// (viz middleware/auth.ts), takze ho lze pouzit i zde primo - prohlizecovy
// EventSource neumi poslat vlastni Authorization hlavicku.
router.get("/stream", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId as number;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  addClient(userId, res);

  // Heartbeat drzi spojeni pri zivote pres proxy/load-balancery, ktere by
  // jinak necinny SSE stream po chvili samy zavrely.
  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
});

router.use(requireAuth);

interface StoredNotification {
  id: number;
  type: string;
  payload: string;
  is_read: number;
  created_at: string;
}

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId as number;

    const stored = (await db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [
      userId,
    ])) as unknown as StoredNotification[];

    const storedFormatted = stored.map((n) => ({
      id: `stored:${n.id}`,
      type: n.type,
      payload: JSON.parse(n.payload),
      isRead: !!n.is_read,
      createdAt: n.created_at,
    }));

    const prefs = (await db.get("SELECT notify_task_due FROM users WHERE id = ?", [userId])) as
      | { notify_task_due: number }
      | undefined;
    const wantsDueReminders = prefs ? !!prefs.notify_task_due : true;

    let dueFormatted: any[] = [];
    let milestoneFormatted: any[] = [];

    if (wantsDueReminders) {
      // Pripominky na termin: ukoly prirazene mne, ktere nejsou hotove a maji
      // termin dnes nebo drive. Pocitane za behu, nejsou to ulozene zaznamy.
      // Datum se porovnava v JS (misto SQLite-specifickeho date('now')), aby
      // to fungovalo stejne nad SQLite i Postgresem.
      const assignedOpenTasks = (await db.all(
        `SELECT t.id, t.title, t.due_date, t.project_id, p.name as project_name
         FROM tasks t
         JOIN task_assignees ta ON ta.task_id = t.id AND ta.user_id = ?
         JOIN projects p ON p.id = t.project_id
         WHERE t.status != 'done'
           AND t.due_date IS NOT NULL
         ORDER BY t.due_date ASC`,
        [userId]
      )) as any[];

      const todayStr = new Date().toISOString().slice(0, 10);
      const dueTasks = assignedOpenTasks.filter((t) => String(t.due_date).slice(0, 10) <= todayStr);

      dueFormatted = dueTasks.map((t) => ({
        id: `due:${t.id}`,
        type: "task_due",
        payload: {
          taskId: t.id,
          taskTitle: t.title,
          dueDate: t.due_date,
          projectId: t.project_id,
          projectName: t.project_name,
        },
        isRead: false,
        createdAt: t.due_date,
      }));

      // Blizici se deadline milniku (do 3 dnu, vcetne jiz prosleho) napric
      // vsemi mymi projekty - jen ty jeste nedokoncene.
      const soonStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const milestonesRaw = (await db.all(
        `SELECT m.id, m.title, m.due_date, m.project_id, p.name as project_name
         FROM milestones m
         JOIN projects p ON p.id = m.project_id
         JOIN project_members pm ON pm.project_id = p.id
         WHERE pm.user_id = ? AND m.due_date IS NOT NULL AND m.due_date <= ?
         ORDER BY m.due_date ASC`,
        [userId, soonStr]
      )) as any[];

      for (const m of milestonesRaw) {
        const total = (await db.get("SELECT COUNT(*) as c FROM tasks WHERE milestone_id = ?", [m.id])) as {
          c: number;
        };
        const done = (await db.get(
          "SELECT COUNT(*) as c FROM tasks WHERE milestone_id = ? AND status = 'done'",
          [m.id]
        )) as { c: number };
        if (Number(total.c) > 0 && Number(total.c) === Number(done.c)) continue;
        milestoneFormatted.push({
          id: `milestone_due:${m.id}`,
          type: "milestone_due",
          payload: {
            milestoneId: m.id,
            milestoneTitle: m.title,
            dueDate: m.due_date,
            projectId: m.project_id,
            projectName: m.project_name,
          },
          isRead: false,
          createdAt: m.due_date,
        });
      }
    }

    const all = [...storedFormatted, ...dueFormatted, ...milestoneFormatted].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );

    res.json(all);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/read", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId as number;
    const idParam = String(req.params.id);

    // "due:*" pripominky nejsou ulozene zaznamy, nelze je oznacit jako precte
    if (!idParam.startsWith("stored:")) {
      return res.json({ ok: true });
    }
    const id = Number(idParam.replace("stored:", ""));
    await db.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/read-all", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId as number;
    await db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Nastaveni, jake typy notifikaci chce uzivatel dostavat.
router.get("/settings", async (req: AuthRequest, res, next) => {
  try {
    const row = (await db.get(
      "SELECT notify_task_due, notify_follows, notify_email FROM users WHERE id = ?",
      [req.userId as number]
    )) as { notify_task_due: number; notify_follows: number; notify_email: number };
    res.json({
      taskDue: !!row.notify_task_due,
      follows: !!row.notify_follows,
      email: !!row.notify_email,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/settings", async (req: AuthRequest, res, next) => {
  try {
    const { taskDue, follows, email } = req.body;
    await db.run(
      `UPDATE users SET
        notify_task_due = COALESCE(?, notify_task_due),
        notify_follows = COALESCE(?, notify_follows),
        notify_email = COALESCE(?, notify_email)
       WHERE id = ?`,
      [
        taskDue === undefined ? null : taskDue ? 1 : 0,
        follows === undefined ? null : follows ? 1 : 0,
        email === undefined ? null : email ? 1 : 0,
        req.userId as number,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
