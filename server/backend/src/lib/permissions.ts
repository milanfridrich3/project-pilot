import { db } from "../db";

export type ProjectRole = "owner" | "admin" | "member";

// Akce, ktere jde v ramci projektu delegovat na Admina nebo i bezneho
// Membera. Vlastnik (Owner) muze mit vzdy vsechno bez ohledu na tato
// nastaveni - viz "Pouze Owner muze mit uplnou kontrolu nad projektem".
export const PERMISSION_ACTIONS = [
  "create_tasks",
  "edit_tasks",
  "delete_tasks",
  "assign_tasks",
  "manage_milestones",
  "manage_members",
  "approve_join_requests",
  "edit_project_settings",
  "manage_resources",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// Vychozi minimalni role potrebna pro danou akci, pokud vlastnik
// projektu nic nezmenil v Project Settings -> Members / Permissions.
const DEFAULT_MIN_ROLE: Record<PermissionAction, ProjectRole> = {
  create_tasks: "member",
  edit_tasks: "member",
  delete_tasks: "admin",
  assign_tasks: "member",
  manage_milestones: "admin",
  manage_members: "admin",
  approve_join_requests: "admin",
  edit_project_settings: "admin",
  manage_resources: "admin",
};

const ROLE_RANK: Record<ProjectRole, number> = { member: 0, admin: 1, owner: 2 };

interface MembershipRow {
  role: string;
}

export async function getMembership(projectId: number, userId: number): Promise<ProjectRole | null> {
  const row = (await db.get("SELECT role FROM project_members WHERE project_id = ? AND user_id = ?", [
    projectId,
    userId,
  ])) as MembershipRow | undefined;
  if (!row) return null;
  return row.role as ProjectRole;
}

export async function isMember(projectId: number, userId: number): Promise<boolean> {
  return (await getMembership(projectId, userId)) !== null;
}

export async function isOwnerOrAdmin(projectId: number, userId: number): Promise<boolean> {
  const role = await getMembership(projectId, userId);
  return role === "owner" || role === "admin";
}

export async function isOwner(projectId: number, userId: number): Promise<boolean> {
  return (await getMembership(projectId, userId)) === "owner";
}

// Seznam id vsech vlastniku+adminu projektu - pro notifikace o zadostech o pripojeni.
export async function getOwnersAndAdmins(projectId: number): Promise<number[]> {
  const rows = (await db.all("SELECT user_id FROM project_members WHERE project_id = ? AND role IN ('owner', 'admin')", [
    projectId,
  ])) as { user_id: number }[];
  return rows.map((r) => r.user_id);
}

// Efektivni nastaveni opravneni projektu - vychozi hodnoty prepsane tim,
// co si vlastnik nastavil v permissions_json (jen ty klice, ktere zmenil).
export async function getProjectPermissions(projectId: number): Promise<Record<PermissionAction, ProjectRole>> {
  const row = (await db.get("SELECT permissions_json FROM projects WHERE id = ?", [projectId])) as
    | { permissions_json: string | null }
    | undefined;
  const result = { ...DEFAULT_MIN_ROLE };
  if (row?.permissions_json) {
    try {
      const overrides = JSON.parse(row.permissions_json) as Partial<Record<PermissionAction, ProjectRole>>;
      for (const key of PERMISSION_ACTIONS) {
        if (overrides[key] && ROLE_RANK[overrides[key] as ProjectRole] !== undefined) {
          result[key] = overrides[key] as ProjectRole;
        }
      }
    } catch {
      // poskozeny/neplatny JSON - pouzijeme vychozi hodnoty
    }
  }
  return result;
}

// Hlavni kontrola opravneni - vlastnik smi vzdy vsechno, kontrola VZDY
// na backendu (ne jen ve frontendu), aby to neslo obejit primym volanim API.
export async function hasPermission(
  projectId: number,
  userId: number,
  action: PermissionAction
): Promise<boolean> {
  const role = await getMembership(projectId, userId);
  if (!role) return false;
  if (role === "owner") return true;
  const permissions = await getProjectPermissions(projectId);
  const minRole = permissions[action];
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
