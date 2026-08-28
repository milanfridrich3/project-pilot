import { Router, Response } from "express";
import { db } from "../db";
import { AuthRequest, requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { isMember, hasPermission } from "../lib/permissions";
import { logActivity } from "../lib/notify";

const router = Router();
router.use(requireAuth);
router.use(requireVerifiedEmail);

router.post("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const { project_id, title, due_date, description } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ error: "project_id a title jsou povinné.", code: "PROJECT_ID_TITLE_REQUIRED" });
    }
    if (!(await isMember(project_id, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(project_id, req.userId as number, "manage_milestones"))) {
      return res.status(403).json({ error: "Nemáte oprávnění spravovat milníky.", code: "PERMISSION_DENIED" });
    }

    const maxOrder = (await db.get("SELECT MAX(order_index) as m FROM milestones WHERE project_id = ?", [
      project_id,
    ])) as { m: number | null };
    const nextOrder = (maxOrder.m ?? -1) + 1;

    const result = await db.run(
      "INSERT INTO milestones (project_id, title, due_date, description, order_index) VALUES (?, ?, ?, ?, ?)",
      [project_id, title, due_date || null, description || null, nextOrder]
    );

    const milestone = await db.get("SELECT * FROM milestones WHERE id = ?", [result.lastInsertRowid]);
    await logActivity(project_id, req.userId as number, "milestone_created", {
      milestoneId: result.lastInsertRowid,
      title,
    });
    res.status(201).json({ ...(milestone as object), taskCount: 0, completion: 0 });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const milestoneId = Number(req.params.id);
    const milestone = (await db.get("SELECT * FROM milestones WHERE id = ?", [milestoneId])) as any;
    if (!milestone) return res.status(404).json({ error: "Milník nenalezen.", code: "MILESTONE_NOT_FOUND" });
    if (!(await isMember(milestone.project_id, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(milestone.project_id, req.userId as number, "manage_milestones"))) {
      return res.status(403).json({ error: "Nemáte oprávnění spravovat milníky.", code: "PERMISSION_DENIED" });
    }

    const { title, due_date, description } = req.body;

    await db.run(
      `UPDATE milestones SET
        title = COALESCE(?, title),
        due_date = ?,
        description = COALESCE(?, description)
       WHERE id = ?`,
      [title ?? null, due_date !== undefined ? due_date : milestone.due_date, description ?? null, milestoneId]
    );

    const updated = await db.get("SELECT * FROM milestones WHERE id = ?", [milestoneId]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const milestoneId = Number(req.params.id);
    const milestone = (await db.get("SELECT * FROM milestones WHERE id = ?", [milestoneId])) as any;
    if (!milestone) return res.status(404).json({ error: "Milník nenalezen.", code: "MILESTONE_NOT_FOUND" });
    if (!(await isMember(milestone.project_id, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(milestone.project_id, req.userId as number, "manage_milestones"))) {
      return res.status(403).json({ error: "Nemáte oprávnění spravovat milníky.", code: "PERMISSION_DENIED" });
    }
    await db.run("DELETE FROM milestones WHERE id = ?", [milestoneId]);
    await logActivity(milestone.project_id, req.userId as number, "milestone_deleted", { title: milestone.title });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
