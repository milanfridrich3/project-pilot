import { Router } from "express";
import { db } from "../db";
import { AuthRequest, requireAuth, requireVerifiedEmail } from "../middleware/auth";
import { createNotification } from "../lib/notify";

const router = Router();
router.use(requireAuth);
router.use(requireVerifiedEmail);

async function notifyIfEnabled(userId: number, type: string, payload: object) {
  const row = (await db.get("SELECT notify_follows FROM users WHERE id = ?", [userId])) as {
    notify_follows: number;
  };
  if (row.notify_follows) {
    await createNotification(userId, type, payload);
  }
}

// Zacit sledovat / poslat zadost o sledovani (pokud je ucet soukromy)
router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const followerId = req.userId as number;
    const { followeeId } = req.body;

    if (!followeeId || Number(followeeId) === followerId) {
      return res.status(400).json({ error: "Neplatný uživatel.", code: "INVALID_USER" });
    }

    const target = (await db.get("SELECT id, name, is_private FROM users WHERE id = ?", [followeeId])) as
      | { id: number; name: string; is_private: number }
      | undefined;
    if (!target) return res.status(404).json({ error: "Uživatel nenalezen.", code: "USER_NOT_FOUND" });

    const existing = (await db.get("SELECT id, status FROM follows WHERE follower_id = ? AND followee_id = ?", [
      followerId,
      target.id,
    ])) as { id: number; status: string } | undefined;
    if (existing) {
      return res.status(409).json({ error: "Sledování už existuje nebo čeká na schválení.", code: "FOLLOW_ALREADY_EXISTS" });
    }

    const status = target.is_private ? "pending" : "accepted";
    await db.run("INSERT INTO follows (follower_id, followee_id, status) VALUES (?, ?, ?)", [
      followerId,
      target.id,
      status,
    ]);

    const me = (await db.get("SELECT name FROM users WHERE id = ?", [followerId])) as { name: string };

    if (status === "pending") {
      await notifyIfEnabled(target.id, "follow_request", { fromUserId: followerId, fromUserName: me.name });
    } else {
      await notifyIfEnabled(target.id, "new_follower", { fromUserId: followerId, fromUserName: me.name });
    }

    res.status(201).json({ status });
  } catch (err) {
    next(err);
  }
});

// Prestat sledovat / zrusit odeslanou zadost
router.delete("/:followeeId", async (req: AuthRequest, res, next) => {
  try {
    const followerId = req.userId as number;
    const followeeId = Number(req.params.followeeId);
    await db.run("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?", [followerId, followeeId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Schvalit prichozi zadost o sledovani
router.post("/requests/:followerId/accept", async (req: AuthRequest, res, next) => {
  try {
    const followeeId = req.userId as number;
    const followerId = Number(req.params.followerId);

    const request = (await db.get(
      "SELECT id FROM follows WHERE follower_id = ? AND followee_id = ? AND status = 'pending'",
      [followerId, followeeId]
    )) as { id: number } | undefined;
    if (!request) return res.status(404).json({ error: "Žádost nenalezena.", code: "REQUEST_NOT_FOUND" });

    await db.run("UPDATE follows SET status = 'accepted' WHERE id = ?", [request.id]);

    const me = (await db.get("SELECT name FROM users WHERE id = ?", [followeeId])) as { name: string };
    await notifyIfEnabled(followerId, "follow_accepted", { fromUserId: followeeId, fromUserName: me.name });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Odmitnout prichozi zadost o sledovani
router.post("/requests/:followerId/decline", async (req: AuthRequest, res, next) => {
  try {
    const followeeId = req.userId as number;
    const followerId = Number(req.params.followerId);
    await db.run("DELETE FROM follows WHERE follower_id = ? AND followee_id = ? AND status = 'pending'", [
      followerId,
      followeeId,
    ]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
