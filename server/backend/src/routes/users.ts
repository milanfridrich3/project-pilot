import { Router } from "express";
import { db } from "../db";
import { AuthRequest, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

interface UserRow {
  id: number;
  name: string;
  email: string;
  motto: string | null;
  avatar: string | null;
  is_private: number;
  created_at: string;
}

async function followStatus(viewerId: number, targetId: number): Promise<"none" | "pending" | "accepted"> {
  if (viewerId === targetId) return "accepted";
  const row = (await db.get("SELECT status FROM follows WHERE follower_id = ? AND followee_id = ?", [
    viewerId,
    targetId,
  ])) as { status: string } | undefined;
  if (!row) return "none";
  return row.status as "pending" | "accepted";
}

async function countFollowers(userId: number): Promise<number> {
  const row = (await db.get("SELECT COUNT(*) as c FROM follows WHERE followee_id = ? AND status = 'accepted'", [
    userId,
  ])) as { c: number };
  return Number(row.c);
}

async function countFollowing(userId: number): Promise<number> {
  const row = (await db.get("SELECT COUNT(*) as c FROM follows WHERE follower_id = ? AND status = 'accepted'", [
    userId,
  ])) as { c: number };
  return Number(row.c);
}

async function countCompletedProjects(userId: number): Promise<number> {
  const row = (await db.get(
    `SELECT COUNT(*) as c FROM projects p
     JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = ?
       AND (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) > 0
       AND NOT EXISTS (
         SELECT 1 FROM tasks t WHERE t.project_id = p.id AND t.status != 'done'
       )`,
    [userId]
  )) as { c: number };
  return Number(row.c);
}

router.get("/search", async (req: AuthRequest, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    // "all" (vychozi) hleda ve vsem, jinak jen v jedne kategorii - viz
    // frontend prepinac typu vysledku.
    const type = String(req.query.type || "all");
    if (q.length < 2) {
      return res.json({ users: [], projects: [], tasks: [], comments: [] });
    }
    const like = `%${q}%`;
    const viewerId = req.userId as number;

    const users =
      type === "all" || type === "users"
        ? ((await db.all(
            `SELECT id, name, avatar, motto, is_private FROM users
             WHERE LOWER(name) LIKE LOWER(?) AND id != ?
             ORDER BY name ASC LIMIT 20`,
            [like, viewerId]
          )) as any[])
        : [];

    // Zahrnuje projekty, kde uz jsem clenem, i verejne dohledatelne
    // projekty, kde clenem jeste nejsem (nalezeni != pristup - detail a
    // data projektu zustavaji chranene project membership kontrolou).
    const projects =
      type === "all" || type === "projects"
        ? ((await db.all(
            `SELECT DISTINCT p.id, p.name, p.objective, p.is_discoverable,
               CASE WHEN pm.user_id IS NOT NULL THEN 1 ELSE 0 END as is_member
             FROM projects p
             LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
             WHERE (pm.user_id IS NOT NULL OR p.is_discoverable = 1)
               AND LOWER(p.name) LIKE LOWER(?)
               AND p.is_archived = 0
             ORDER BY p.created_at DESC LIMIT 20`,
            [viewerId, like]
          )) as any[])
        : [];

    // Ukoly a komentare se hledaji jen v projektech, kde jsem clenem -
    // na rozdil od projektu samotnych se tu nikdy nepracuje s daty
    // projektu, ktery nejsou moje (zadne obchazeni projektovych opravneni).
    const tasks =
      type === "all" || type === "tasks"
        ? ((await db.all(
            `SELECT t.id, t.title, t.project_id, p.name as project_name
             FROM tasks t
             JOIN projects p ON p.id = t.project_id
             JOIN project_members pm ON pm.project_id = p.id
             WHERE pm.user_id = ? AND LOWER(t.title) LIKE LOWER(?)
             ORDER BY t.created_at DESC LIMIT 20`,
            [viewerId, like]
          )) as any[])
        : [];

    const comments =
      type === "all" || type === "comments"
        ? ((await db.all(
            `SELECT c.id, c.body, c.task_id, t.title as task_title, t.project_id, p.name as project_name
             FROM task_comments c
             JOIN tasks t ON t.id = c.task_id
             JOIN projects p ON p.id = t.project_id
             JOIN project_members pm ON pm.project_id = p.id
             WHERE pm.user_id = ? AND LOWER(c.body) LIKE LOWER(?)
             ORDER BY c.created_at DESC LIMIT 20`,
            [viewerId, like]
          )) as any[])
        : [];

    res.json({
      users: await Promise.all(
        users.map(async (u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          motto: u.motto,
          isPrivate: !!u.is_private,
          followStatus: await followStatus(viewerId, u.id),
        }))
      ),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        objective: p.objective,
        isMember: !!p.is_member,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.project_id,
        projectName: t.project_name,
      })),
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body,
        taskId: c.task_id,
        taskTitle: c.task_title,
        projectId: c.project_id,
        projectName: c.project_name,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Lidé, ktere sleduji (pro pozvanky do projektu apod.)
router.get("/following", async (req: AuthRequest, res, next) => {
  try {
    const viewerId = req.userId as number;
    const rows = await db.all(
      `SELECT u.id, u.name, u.avatar FROM follows f
       JOIN users u ON u.id = f.followee_id
       WHERE f.follower_id = ? AND f.status = 'accepted'
       ORDER BY u.name ASC`,
      [viewerId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

function canViewList(viewerId: number, target: UserRow, status: "none" | "pending" | "accepted"): boolean {
  if (viewerId === target.id) return true;
  if (!target.is_private) return true;
  return status === "accepted";
}

router.get("/:id/followers", async (req: AuthRequest, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const viewerId = req.userId as number;

    const target = (await db.get("SELECT * FROM users WHERE id = ?", [targetId])) as unknown as
      | UserRow
      | undefined;
    if (!target) return res.status(404).json({ error: "Uživatel nenalezen.", code: "USER_NOT_FOUND" });
    const viewerStatus = await followStatus(viewerId, target.id);
    if (!canViewList(viewerId, target, viewerStatus)) {
      return res.status(403).json({ error: "Tento seznam je soukromý.", code: "LIST_IS_PRIVATE" });
    }

    const rows = (await db.all(
      `SELECT u.id, u.name, u.avatar, u.is_private FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.followee_id = ? AND f.status = 'accepted'
       ORDER BY u.name ASC`,
      [targetId]
    )) as any[];

    res.json(
      await Promise.all(
        rows.map(async (u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          isPrivate: !!u.is_private,
          followStatus: await followStatus(viewerId, u.id),
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

router.get("/:id/following", async (req: AuthRequest, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const viewerId = req.userId as number;

    const target = (await db.get("SELECT * FROM users WHERE id = ?", [targetId])) as unknown as
      | UserRow
      | undefined;
    if (!target) return res.status(404).json({ error: "Uživatel nenalezen.", code: "USER_NOT_FOUND" });
    const viewerStatus = await followStatus(viewerId, target.id);
    if (!canViewList(viewerId, target, viewerStatus)) {
      return res.status(403).json({ error: "Tento seznam je soukromý.", code: "LIST_IS_PRIVATE" });
    }

    const rows = (await db.all(
      `SELECT u.id, u.name, u.avatar, u.is_private FROM follows f
       JOIN users u ON u.id = f.followee_id
       WHERE f.follower_id = ? AND f.status = 'accepted'
       ORDER BY u.name ASC`,
      [targetId]
    )) as any[];

    res.json(
      await Promise.all(
        rows.map(async (u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          isPrivate: !!u.is_private,
          followStatus: await followStatus(viewerId, u.id),
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const viewerId = req.userId as number;

    const user = (await db.get("SELECT * FROM users WHERE id = ?", [targetId])) as unknown as UserRow | undefined;
    if (!user) return res.status(404).json({ error: "Uživatel nenalezen.", code: "USER_NOT_FOUND" });

    const status = await followStatus(viewerId, targetId);
    const canSeeDetail = !user.is_private || status === "accepted" || viewerId === targetId;

    const base = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      isPrivate: !!user.is_private,
      isSelf: viewerId === targetId,
      followStatus: status,
    };

    if (!canSeeDetail) {
      return res.json(base);
    }

    res.json({
      ...base,
      motto: user.motto,
      memberSince: user.created_at,
      followers: await countFollowers(targetId),
      following: await countFollowing(targetId),
      completedProjects: await countCompletedProjects(targetId),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
