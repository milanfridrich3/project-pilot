import { db } from "../db";
import { pushToUser } from "./realtime";

// Centralni misto pro vytvareni notifikaci - uklada do DB A rovnou posila
// pripojenym klientum pres SSE (viz routes/notifications.ts /stream),
// takze se notifikace objevi okamzite bez cekani na dalsi polling.
export async function createNotification(userId: number, type: string, payload: object) {
  const result = await db.run("INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)", [
    userId,
    type,
    JSON.stringify(payload),
  ]);
  const notification = {
    id: `stored:${result.lastInsertRowid}`,
    type,
    payload,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  pushToUser(userId, "notification", notification);
  return notification;
}

// Zapis do historie aktivity projektu (pro Waypoint/timeline pohled).
// "type" je stroj-citelny klic (task_created, task_completed, ...),
// konkretni text si sestavi az frontend pomoci prekladu podle typu a payloadu.
export async function logActivity(
  projectId: number,
  actorId: number | null,
  type: string,
  payload: object
) {
  await db.run("INSERT INTO project_activity (project_id, actor_id, type, payload) VALUES (?, ?, ?, ?)", [
    projectId,
    actorId,
    type,
    JSON.stringify(payload),
  ]);
}
