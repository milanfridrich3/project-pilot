import { Router, Response } from "express";
import { db } from "../db";
import { AuthRequest, requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { TEMPLATES, getTemplateLabel, getTemplateMilestones, TemplateLanguage } from "../db/templates";
import {
  getMembership,
  isMember,
  isOwner,
  hasPermission,
  getProjectPermissions,
  getOwnersAndAdmins,
  PERMISSION_ACTIONS,
  PermissionAction,
  ProjectRole,
} from "../lib/permissions";
import { createNotification, logActivity } from "../lib/notify";

const router = Router();
router.use(requireAuth);
router.use(requireVerifiedEmail);

async function getUserLanguage(userId: number): Promise<TemplateLanguage> {
  const row = (await db.get("SELECT language FROM users WHERE id = ?", [userId])) as
    | { language: string }
    | undefined;
  return row?.language === "cs" ? "cs" : "en";
}

async function isFollowing(followerId: number, followeeId: number): Promise<boolean> {
  const row = await db.get(
    "SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ? AND status = 'accepted'",
    [followerId, followeeId]
  );
  return !!row;
}

async function computeProgress(projectId: number): Promise<number> {
  const total = (await db.get("SELECT COUNT(*) as c FROM tasks WHERE project_id = ?", [projectId])) as {
    c: number;
  };
  if (Number(total.c) === 0) return 0;
  const done = (await db.get("SELECT COUNT(*) as c FROM tasks WHERE project_id = ? AND status = 'done'", [
    projectId,
  ])) as { c: number };
  return Math.round((Number(done.c) / Number(total.c)) * 100);
}

// Nejblizsi (jeste neprosly) deadline projektu - bud nejblizsi nesplneny
// milnik, nebo nejblizsi nehotovy ukol, podle toho, co je driv.
async function computeNextDeadline(projectId: number): Promise<string | null> {
  const milestone = (await db.get(
    `SELECT m.due_date FROM milestones m
     WHERE m.project_id = ? AND m.due_date IS NOT NULL
     ORDER BY m.due_date ASC LIMIT 1`,
    [projectId]
  )) as { due_date: string | null } | undefined;
  const task = (await db.get(
    `SELECT due_date FROM tasks
     WHERE project_id = ? AND status != 'done' AND due_date IS NOT NULL
     ORDER BY due_date ASC LIMIT 1`,
    [projectId]
  )) as { due_date: string | null } | undefined;
  const candidates = [milestone?.due_date, task?.due_date].filter(Boolean) as string[];
  if (candidates.length === 0) return null;
  return candidates.sort()[0];
}

router.get("/templates", async (req: AuthRequest, res, next) => {
  try {
    const lang = await getUserLanguage(req.userId as number);
    res.json(TEMPLATES.map((t) => ({ key: t.key, label: getTemplateLabel(t, lang) })));
  } catch (err) {
    next(err);
  }
});

// Souhrn pro Dashboard: moje projekty (se stavem/deadline/progresem), moje
// ukoly, pripnute ukoly, nadchazejici milniky a zpozdene ukoly - vse
// dohromady napric vsemi projekty, kde jsem clenem.
router.get("/dashboard/summary", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId as number;

    const projectRows = (await db.all(
      `SELECT p.id, p.name, p.objective, p.template, p.owner_id, p.color, p.icon, p.is_archived, p.created_at
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ? AND p.is_archived = 0
       ORDER BY p.created_at DESC`,
      [userId]
    )) as any[];

    const projects = await Promise.all(
      projectRows.map(async (p) => ({
        ...p,
        progress: await computeProgress(p.id),
        nextDeadline: await computeNextDeadline(p.id),
      }))
    );

    const myTasksRaw = (await db.all(
      `SELECT t.*, p.name as project_name, p.color as project_color
       FROM tasks t
       JOIN task_assignees ta ON ta.task_id = t.id AND ta.user_id = ?
       JOIN projects p ON p.id = t.project_id
       WHERE t.status != 'done'
       ORDER BY (t.due_date IS NULL), t.due_date ASC`,
      [userId]
    )) as any[];

    const todayStr = new Date().toISOString().slice(0, 10);
    const overdueTasks = myTasksRaw.filter((t) => t.due_date && String(t.due_date).slice(0, 10) < todayStr);
    const upcomingTasks = myTasksRaw.filter((t) => !t.due_date || String(t.due_date).slice(0, 10) >= todayStr);

    const pinnedRows = (await db.all(
      `SELECT t.*, p.name as project_name, p.color as project_color
       FROM task_pins tp
       JOIN tasks t ON t.id = tp.task_id
       JOIN projects p ON p.id = t.project_id
       WHERE tp.user_id = ?
       ORDER BY tp.created_at DESC`,
      [userId]
    )) as any[];

    const upcomingMilestones = (await db.all(
      `SELECT m.*, p.name as project_name, p.color as project_color
       FROM milestones m
       JOIN projects p ON p.id = m.project_id
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ? AND m.due_date IS NOT NULL AND m.due_date >= ?
       ORDER BY m.due_date ASC LIMIT 10`,
      [userId, todayStr]
    )) as any[];

    res.json({
      projects,
      myTasks: upcomingTasks,
      overdueTasks,
      pinnedTasks: pinnedRows,
      upcomingMilestones,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const archived = req.query.archived === "true" ? 1 : 0;
    const rows = (await db.all(
      `SELECT p.id, p.name, p.objective, p.template, p.owner_id, p.color, p.icon, p.is_archived, p.created_at
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ? AND p.is_archived = ?
       ORDER BY p.created_at DESC`,
      [req.userId as number, archived]
    )) as any[];

    const withProgress = await Promise.all(
      rows.map(async (p) => ({ ...p, progress: await computeProgress(p.id) }))
    );
    res.json(withProgress);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, objective, template, color, icon, isDiscoverable } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Název projektu je povinný.", code: "PROJECT_NAME_REQUIRED" });
    }
    const templateDef = TEMPLATES.find((t) => t.key === template) || TEMPLATES[0];
    const userId = req.userId as number;
    const lang = await getUserLanguage(userId);
    const milestoneTitles = getTemplateMilestones(templateDef, lang);

    const projectId = await db.transaction(async (tx) => {
      const result = await tx.run(
        "INSERT INTO projects (name, objective, template, owner_id, color, icon, is_discoverable) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, objective || null, templateDef.key, userId, color || null, icon || null, isDiscoverable ? 1 : 0]
      );
      const newProjectId = result.lastInsertRowid;

      await tx.run("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')", [
        newProjectId,
        userId,
      ]);

      for (let index = 0; index < milestoneTitles.length; index++) {
        await tx.run("INSERT INTO milestones (project_id, title, order_index) VALUES (?, ?, ?)", [
          newProjectId,
          milestoneTitles[index],
          index,
        ]);
      }

      return newProjectId;
    });

    const project = await db.get("SELECT * FROM projects WHERE id = ?", [projectId]);
    res.status(201).json({ ...(project as object), progress: 0 });
  } catch (err) {
    next(err);
  }
});

// Nahled na dohledatelny (is_discoverable) projekt pro neclena - jen
// zakladni informace, zadna detailni data (ukoly/milniky/clenove).
// Nalezeni projektu ve vyhledavani/nahledu NEZNAMENA pristup k projektu.
router.get("/:id/preview", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId = req.userId as number;
    const role = await getMembership(projectId, userId);
    if (role) {
      return res.json({ isMember: true, role });
    }
    const project = (await db.get("SELECT * FROM projects WHERE id = ?", [projectId])) as any;
    if (!project || !project.is_discoverable) {
      return res.status(404).json({ error: "Projekt nenalezen.", code: "PROJECT_NOT_FOUND" });
    }
    const memberCount = (await db.get("SELECT COUNT(*) as c FROM project_members WHERE project_id = ?", [
      projectId,
    ])) as { c: number };
    const pendingRequest = await db.get(
      "SELECT status FROM project_join_requests WHERE project_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1",
      [projectId, userId]
    );
    res.json({
      isMember: false,
      id: project.id,
      name: project.name,
      objective: project.objective,
      color: project.color,
      icon: project.icon,
      memberCount: Number(memberCount.c),
      joinRequestStatus: (pendingRequest as any)?.status || null,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId = req.userId as number;
    const myRole = await getMembership(projectId, userId);
    if (!myRole) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }

    const project = await db.get("SELECT * FROM projects WHERE id = ?", [projectId]);
    if (!project) return res.status(404).json({ error: "Projekt nenalezen.", code: "PROJECT_NOT_FOUND" });

    const members = await db.all(
      `SELECT u.id, u.name, u.email, pm.role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ?
       ORDER BY (pm.role = 'owner') DESC, (pm.role = 'admin') DESC, u.name ASC`,
      [projectId]
    );

    const milestones = (await db.all("SELECT * FROM milestones WHERE project_id = ? ORDER BY order_index ASC", [
      projectId,
    ])) as any[];

    const milestonesWithCompletion = await Promise.all(
      milestones.map(async (m) => {
        const total = (await db.get("SELECT COUNT(*) as c FROM tasks WHERE milestone_id = ?", [m.id])) as {
          c: number;
        };
        const done = (await db.get("SELECT COUNT(*) as c FROM tasks WHERE milestone_id = ? AND status = 'done'", [
          m.id,
        ])) as { c: number };
        const completion = Number(total.c) === 0 ? 0 : Math.round((Number(done.c) / Number(total.c)) * 100);
        return { ...m, taskCount: Number(total.c), completion };
      })
    );

    const tasks = (await db.all(
      `SELECT t.* FROM tasks t
       WHERE t.project_id = ?
       ORDER BY t.created_at ASC`,
      [projectId]
    )) as any[];

    const assigneeRows = (await db.all(
      `SELECT ta.task_id, u.id as user_id, u.name as user_name
       FROM task_assignees ta
       JOIN users u ON u.id = ta.user_id
       JOIN tasks t ON t.id = ta.task_id
       WHERE t.project_id = ?
       ORDER BY u.name ASC`,
      [projectId]
    )) as { task_id: number; user_id: number; user_name: string }[];
    const assigneesByTask = new Map<number, { id: number; name: string }[]>();
    for (const row of assigneeRows) {
      const list = assigneesByTask.get(row.task_id) || [];
      list.push({ id: row.user_id, name: row.user_name });
      assigneesByTask.set(row.task_id, list);
    }

    const pinnedRows = (await db.all("SELECT task_id FROM task_pins WHERE user_id = ?", [userId])) as {
      task_id: number;
    }[];
    const pinnedIds = new Set(pinnedRows.map((r) => r.task_id));
    const tasksWithPins = tasks.map((t) => ({
      ...t,
      pinned: pinnedIds.has(t.id),
      assignees: assigneesByTask.get(t.id) || [],
    }));

    const resources = await db.all(
      `SELECT r.*, u.name as added_by_name
       FROM project_resources r
       LEFT JOIN users u ON u.id = r.added_by
       WHERE r.project_id = ?
       ORDER BY r.created_at DESC`,
      [projectId]
    );

    // "Efektivni" opravneni pro aktualniho uzivatele - vlastnik ma vzdy vse.
    let myPermissions: Record<string, boolean>;
    if (myRole === "owner") {
      myPermissions = Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, true]));
    } else {
      const entries: [string, boolean][] = [];
      for (const action of PERMISSION_ACTIONS) {
        entries.push([action, await hasPermission(projectId, userId, action as PermissionAction)]);
      }
      myPermissions = Object.fromEntries(entries);
    }

    let pendingJoinRequestCount = 0;
    if (myRole === "owner" || myRole === "admin") {
      const row = (await db.get(
        "SELECT COUNT(*) as c FROM project_join_requests WHERE project_id = ? AND status = 'pending'",
        [projectId]
      )) as { c: number };
      pendingJoinRequestCount = Number(row.c);
    }

    res.json({
      ...(project as object),
      progress: await computeProgress(projectId),
      members,
      milestones: milestonesWithCompletion,
      tasks: tasksWithPins,
      resources,
      myRole,
      permissions: myPermissions,
      pendingJoinRequestCount,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isMember(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(projectId, req.userId as number, "edit_project_settings"))) {
      return res.status(403).json({ error: "Nemáte oprávnění upravovat nastavení projektu.", code: "PERMISSION_DENIED" });
    }
    const { name, objective, color, icon, isDiscoverable } = req.body;
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: "Název projektu nesmí být prázdný.", code: "PROJECT_NAME_EMPTY" });
    }

    await db.run(
      `UPDATE projects SET
        name = COALESCE(?, name),
        objective = COALESCE(?, objective),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        is_discoverable = COALESCE(?, is_discoverable)
       WHERE id = ?`,
      [
        name ?? null,
        objective ?? null,
        color ?? null,
        icon ?? null,
        isDiscoverable === undefined ? null : isDiscoverable ? 1 : 0,
        projectId,
      ]
    );

    const project = await db.get("SELECT * FROM projects WHERE id = ?", [projectId]);
    res.json({ ...(project as object), progress: await computeProgress(projectId) });
  } catch (err) {
    next(err);
  }
});

// --- Nastaveni opravneni projektu (Owner only) ---

router.get("/:id/permissions", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isOwner(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Pouze vlastník může spravovat oprávnění.", code: "OWNER_ONLY_EDIT" });
    }
    res.json(await getProjectPermissions(projectId));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/permissions", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isOwner(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Pouze vlastník může spravovat oprávnění.", code: "OWNER_ONLY_EDIT" });
    }
    const updates = req.body as Partial<Record<PermissionAction, ProjectRole>>;
    const valid: Partial<Record<PermissionAction, ProjectRole>> = {};
    for (const key of PERMISSION_ACTIONS) {
      const value = updates[key];
      if (value === "owner" || value === "admin" || value === "member") {
        valid[key] = value;
      }
    }
    const current = await getProjectPermissions(projectId);
    const merged = { ...current, ...valid };
    await db.run("UPDATE projects SET permissions_json = ? WHERE id = ?", [JSON.stringify(merged), projectId]);
    res.json(merged);
  } catch (err) {
    next(err);
  }
});

// Archivace - archivovany projekt zmizi z hlavniho seznamu, ale zustava
// dostupny (a obnovitelny) pres ?archived=true. Zustava vyhrazeno Owneru.
router.post("/:id/archive", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isOwner(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Pouze vlastník může projekt archivovat.", code: "OWNER_ONLY_EDIT" });
    }
    await db.run("UPDATE projects SET is_archived = 1 WHERE id = ?", [projectId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/unarchive", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isOwner(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Pouze vlastník může projekt obnovit.", code: "OWNER_ONLY_EDIT" });
    }
    await db.run("UPDATE projects SET is_archived = 0 WHERE id = ?", [projectId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    // Smazani projektu zustava vyhrazeno vylucne Ownerovi, i kdyz ostatni
    // opravneni jdou delegovat - jde o nevratnou akci nad celym projektem.
    if (!(await isOwner(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Pouze vlastník může projekt smazat.", code: "OWNER_ONLY_DELETE" });
    }
    await db.run("DELETE FROM projects WHERE id = ?", [projectId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- Clenove projektu ---

router.post("/:id/members", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId = req.userId as number;
    if (!(await isMember(projectId, userId))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(projectId, userId, "manage_members"))) {
      return res.status(403).json({ error: "Nemáte oprávnění spravovat členy.", code: "PERMISSION_DENIED" });
    }
    const { userId: targetId } = req.body;
    if (!targetId) {
      return res.status(400).json({ error: "Chybí uživatel k pozvání.", code: "MISSING_INVITE_USER" });
    }
    if (!(await isFollowing(userId, Number(targetId)))) {
      return res.status(403).json({ error: "Pozvat můžeš jen lidi, které sleduješ.", code: "INVITE_MUST_FOLLOW" });
    }
    const user = (await db.get("SELECT id, name, email, avatar FROM users WHERE id = ?", [targetId])) as
      | { id: number; name: string; email: string; avatar: string | null }
      | undefined;
    if (!user) {
      return res.status(404).json({ error: "Uživatel nenalezen.", code: "USER_NOT_FOUND" });
    }
    try {
      await db.run("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'member')", [
        projectId,
        user.id,
      ]);
    } catch {
      return res.status(409).json({ error: "Uživatel je již členem projektu.", code: "ALREADY_MEMBER" });
    }
    await logActivity(projectId, userId, "member_joined", { userId: user.id, userName: user.name });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// Zmena role clena - jen Owner, a jen mezi admin/member (vlastnictvi se
// timto nepredava). Vlastnika samotneho takto zmenit nejde.
router.patch("/:id/members/:userId", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    if (!(await isOwner(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Pouze vlastník může nastavovat role.", code: "OWNER_ONLY_EDIT" });
    }
    const { role } = req.body;
    if (role !== "admin" && role !== "member") {
      return res.status(400).json({ error: "Neplatná role.", code: "INVALID_ROLE" });
    }
    const targetRole = await getMembership(projectId, targetUserId);
    if (!targetRole) {
      return res.status(404).json({ error: "Uživatel není členem projektu.", code: "NOT_A_MEMBER" });
    }
    if (targetRole === "owner") {
      return res.status(400).json({ error: "Roli vlastníka nelze změnit.", code: "CANNOT_CHANGE_OWNER" });
    }
    await db.run("UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?", [
      role,
      projectId,
      targetUserId,
    ]);
    const target = (await db.get("SELECT name FROM users WHERE id = ?", [targetUserId])) as { name: string };
    await logActivity(projectId, req.userId as number, "member_role_changed", {
      userId: targetUserId,
      userName: target.name,
      role,
    });
    res.json({ ok: true, role });
  } catch (err) {
    next(err);
  }
});

// Odebrani clena z projektu. Beznou opravnenou osobou (manage_members) lze
// odebrat jen Membery - odebrani Admina je vyhrazeno Ownerovi, aby si
// Admin nemohl "uklidit" konkurencni Admina bez vedomi vlastnika.
router.delete("/:id/members/:userId", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const userId = req.userId as number;

    const targetRole = await getMembership(projectId, targetUserId);
    if (!targetRole) {
      return res.status(404).json({ error: "Uživatel není členem projektu.", code: "NOT_A_MEMBER" });
    }
    if (targetRole === "owner") {
      return res.status(400).json({ error: "Vlastníka nelze z projektu odebrat.", code: "CANNOT_REMOVE_OWNER" });
    }
    const requesterRole = await getMembership(projectId, userId);
    if (!requesterRole) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    const isSelfLeaving = userId === targetUserId;
    if (!isSelfLeaving) {
      if (targetRole === "admin" && requesterRole !== "owner") {
        return res.status(403).json({ error: "Admina může odebrat jen vlastník.", code: "OWNER_ONLY_EDIT" });
      }
      if (!(await hasPermission(projectId, userId, "manage_members"))) {
        return res.status(403).json({ error: "Nemáte oprávnění spravovat členy.", code: "PERMISSION_DENIED" });
      }
    }
    await db.run("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", [projectId, targetUserId]);
    const target = (await db.get("SELECT name FROM users WHERE id = ?", [targetUserId])) as { name: string };
    await logActivity(projectId, userId, isSelfLeaving ? "member_left" : "member_removed", {
      userId: targetUserId,
      userName: target?.name,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- Zadosti o pripojeni ---

router.post("/:id/join-requests", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId = req.userId as number;

    if (await isMember(projectId, userId)) {
      return res.status(409).json({ error: "Už jste členem tohoto projektu.", code: "ALREADY_MEMBER" });
    }
    const project = (await db.get("SELECT * FROM projects WHERE id = ?", [projectId])) as any;
    if (!project || !project.is_discoverable) {
      return res.status(404).json({ error: "Projekt nenalezen.", code: "PROJECT_NOT_FOUND" });
    }
    const existing = await db.get(
      "SELECT id, status FROM project_join_requests WHERE project_id = ? AND user_id = ?",
      [projectId, userId]
    );
    if (existing && (existing as any).status === "pending") {
      return res.status(409).json({ error: "Žádost už čeká na vyřízení.", code: "REQUEST_ALREADY_PENDING" });
    }
    let requestId: number;
    if (existing) {
      requestId = (existing as any).id;
      await db.run("UPDATE project_join_requests SET status = 'pending', created_at = ? WHERE id = ?", [
        new Date().toISOString(),
        requestId,
      ]);
    } else {
      const inserted = await db.run(
        "INSERT INTO project_join_requests (project_id, user_id, status) VALUES (?, ?, 'pending')",
        [projectId, userId]
      );
      requestId = inserted.lastInsertRowid;
    }

    const me = (await db.get("SELECT name FROM users WHERE id = ?", [userId])) as { name: string };
    const targets = await getOwnersAndAdmins(projectId);
    for (const targetId of targets) {
      await createNotification(targetId, "join_request", {
        requestId,
        fromUserId: userId,
        fromUserName: me.name,
        projectId,
        projectName: project.name,
      });
    }

    res.status(201).json({ status: "pending" });
  } catch (err) {
    next(err);
  }
});

// Casova osa aktivity projektu - kdo co udelal a kdy. Vyzaduje clenstvi v
// projektu (stejna ochrana jako zbytek dat projektu).
router.get("/:id/activity", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isMember(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    const rows = await db.all(
      `SELECT a.id, a.type, a.payload, a.created_at, u.id as actor_id, u.name as actor_name
       FROM project_activity a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.project_id = ?
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 50`,
      [projectId]
    );
    res.json(
      (rows as any[]).map((r) => ({
        id: r.id,
        type: r.type,
        payload: JSON.parse(r.payload),
        createdAt: r.created_at,
        actorId: r.actor_id,
        actorName: r.actor_name,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get("/:id/join-requests", async (req: AuthRequest, res: Response, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isMember(projectId, req.userId as number))) {
      return res.status(403).json({ error: "Nemáte přístup k tomuto projektu.", code: "PROJECT_ACCESS_DENIED" });
    }
    if (!(await hasPermission(projectId, req.userId as number, "approve_join_requests"))) {
      return res.status(403).json({ error: "Nemáte oprávnění schvalovat žádosti.", code: "PERMISSION_DENIED" });
    }
    const rows = await db.all(
      `SELECT r.id, r.status, r.created_at, u.id as user_id, u.name, u.avatar
       FROM project_join_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.project_id = ? AND r.status = 'pending'
       ORDER BY r.created_at ASC`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/join-requests/:requestId/accept", async (req: AuthRequest, res: Response, next) => {
  try {
    const requestId = Number(req.params.requestId);
    const userId = req.userId as number;
    const request = (await db.get("SELECT * FROM project_join_requests WHERE id = ?", [requestId])) as any;
    if (!request || request.status !== "pending") {
      return res.status(404).json({ error: "Žádost nenalezena.", code: "REQUEST_NOT_FOUND" });
    }
    if (!(await hasPermission(request.project_id, userId, "approve_join_requests"))) {
      return res.status(403).json({ error: "Nemáte oprávnění schvalovat žádosti.", code: "PERMISSION_DENIED" });
    }

    await db.transaction(async (tx) => {
      await tx.run("UPDATE project_join_requests SET status = 'accepted' WHERE id = ?", [requestId]);
      try {
        await tx.run("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'member')", [
          request.project_id,
          request.user_id,
        ]);
      } catch {
        // uz je nejakym zpusobem clenem - v poradku
      }
    });

    const project = (await db.get("SELECT name FROM projects WHERE id = ?", [request.project_id])) as {
      name: string;
    };
    await createNotification(request.user_id, "join_request_accepted", {
      projectId: request.project_id,
      projectName: project.name,
    });
    const requester = (await db.get("SELECT name FROM users WHERE id = ?", [request.user_id])) as { name: string };
    await logActivity(request.project_id, userId, "member_joined", {
      userId: request.user_id,
      userName: requester.name,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/join-requests/:requestId/decline", async (req: AuthRequest, res: Response, next) => {
  try {
    const requestId = Number(req.params.requestId);
    const userId = req.userId as number;
    const request = (await db.get("SELECT * FROM project_join_requests WHERE id = ?", [requestId])) as any;
    if (!request || request.status !== "pending") {
      return res.status(404).json({ error: "Žádost nenalezena.", code: "REQUEST_NOT_FOUND" });
    }
    if (!(await hasPermission(request.project_id, userId, "approve_join_requests"))) {
      return res.status(403).json({ error: "Nemáte oprávnění schvalovat žádosti.", code: "PERMISSION_DENIED" });
    }
    await db.run("UPDATE project_join_requests SET status = 'rejected' WHERE id = ?", [requestId]);

    const project = (await db.get("SELECT name FROM projects WHERE id = ?", [request.project_id])) as {
      name: string;
    };
    await createNotification(request.user_id, "join_request_rejected", {
      projectId: request.project_id,
      projectName: project.name,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
