import { Router, Response } from "express";
import { db } from "../db";
import { AuthRequest, requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { isMember, hasPermission } from "../lib/permissions";
import { logActivity } from "../lib/notify";

const router = Router();
router.use(requireAuth);
router.use(requireVerifiedEmail);

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

router.post("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const { project_id, name, description, url } = req.body;
    if (!project_id || !name || !url) {
      return res.status(400).json({ error: "project_id, name a url jsou povinné.", code: "RESOURCE_FIELDS_REQUIRED" });
    }
    if (!isValidUrl(String(url).trim())) {
      return res.status(400).json({ error: "Zadej platnou URL adresu (http:// nebo https://).", code: "INVALID_URL" });
    }
    if (!(await isMember(project_id, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(project_id, req.userId as number, "manage_resources"))) {
      return res.status(403).json({ error: "Nemáte oprávnění spravovat zdroje.", code: "PERMISSION_DENIED" });
    }

    const result = await db.run(
      "INSERT INTO project_resources (project_id, name, description, url, added_by) VALUES (?, ?, ?, ?, ?)",
      [project_id, String(name).trim(), description || null, String(url).trim(), req.userId as number]
    );

    await logActivity(project_id, req.userId as number, "resource_added", { name: String(name).trim() });

    const resource = await db.get("SELECT * FROM project_resources WHERE id = ?", [result.lastInsertRowid]);
    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const resourceId = Number(req.params.id);
    const resource = (await db.get("SELECT * FROM project_resources WHERE id = ?", [resourceId])) as any;
    if (!resource) return res.status(404).json({ error: "Zdroj nenalezen.", code: "RESOURCE_NOT_FOUND" });
    if (!(await isMember(resource.project_id, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(resource.project_id, req.userId as number, "manage_resources"))) {
      return res.status(403).json({ error: "Nemáte oprávnění spravovat zdroje.", code: "PERMISSION_DENIED" });
    }

    const { name, description, url } = req.body;
    if (url !== undefined && !isValidUrl(String(url).trim())) {
      return res.status(400).json({ error: "Zadej platnou URL adresu (http:// nebo https://).", code: "INVALID_URL" });
    }

    await db.run(
      `UPDATE project_resources SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        url = COALESCE(?, url)
       WHERE id = ?`,
      [name ? String(name).trim() : null, description ?? null, url ? String(url).trim() : null, resourceId]
    );

    const updated = await db.get("SELECT * FROM project_resources WHERE id = ?", [resourceId]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const resourceId = Number(req.params.id);
    const resource = (await db.get("SELECT * FROM project_resources WHERE id = ?", [resourceId])) as any;
    if (!resource) return res.status(404).json({ error: "Zdroj nenalezen.", code: "RESOURCE_NOT_FOUND" });
    if (!(await isMember(resource.project_id, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(resource.project_id, req.userId as number, "manage_resources"))) {
      return res.status(403).json({ error: "Nemáte oprávnění spravovat zdroje.", code: "PERMISSION_DENIED" });
    }
    await db.run("DELETE FROM project_resources WHERE id = ?", [resourceId]);
    await logActivity(resource.project_id, req.userId as number, "resource_deleted", { name: resource.name });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
