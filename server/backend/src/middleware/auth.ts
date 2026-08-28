import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "project-pilot-dev-secret";

export interface AuthRequest extends Request {
  userId?: number;
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  // EventSource (SSE) v prohlizeci neumi poslat vlastni hlavicky, takze pro
  // /notifications/stream pripojeni akceptujeme token i jako query parametr.
  const queryToken = req.query.token;
  if (typeof queryToken === "string" && queryToken) {
    return queryToken;
  }
  return null;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Chybí přístupový token." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Neplatný nebo vypršelý token." });
  }
}

// Pouziti: az po requireAuth. Blokuje akce, ktere vyzaduji overeny email
// (napr. zalozeni projektu, zadost o sledovani/pripojeni).
export async function requireVerifiedEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const row = (await db.get("SELECT email_verified FROM users WHERE id = ?", [req.userId as number])) as
      | { email_verified: number }
      | undefined;
    if (!row || !row.email_verified) {
      return res.status(403).json({
        error: "Nejdřív si ověř emailovou adresu v Nastavení.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}
