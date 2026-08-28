import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { AuthRequest, requireAuth, signToken } from "../middleware/auth";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  generateVerificationCode,
} from "../lib/mailer";
import { createNotification } from "../lib/notify";

const router = Router();

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  motto: string | null;
  avatar: string | null;
  theme: string;
  language: string;
  is_private: number;
  email_verified: number;
  onboarded: number;
  verification_code: string | null;
  verification_expires: string | null;
  verification_attempts: number;
  verification_last_sent: string | null;
  location: string | null;
  is_active: number;
  reset_code: string | null;
  reset_expires: string | null;
  reset_attempts: number;
  reset_last_sent: string | null;
  notify_task_due: number;
  notify_follows: number;
  notify_email: number;
}

function publicUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    motto: u.motto,
    avatar: u.avatar,
    theme: u.theme,
    language: u.language,
    isPrivate: !!u.is_private,
    emailVerified: !!u.email_verified,
    onboarded: !!u.onboarded,
    location: u.location,
    notifyTaskDue: !!u.notify_task_due,
    notifyFollows: !!u.notify_follows,
    notifyEmail: !!u.notify_email,
  };
}

// Jednoducha, ale rozumne prisna kontrola formatu emailu - odchyti
// zjevne vymyslene/neplatne adresy uz na serveru, nespoleha jen na
// klientsky <input type="email">.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

const AVATAR_PRESET_KEYS = [
  "icon:default",
  "icon:cat",
  "icon:fox",
  "icon:owl",
  "icon:panda",
  "icon:rabbit",
  "icon:bear",
  "icon:bird",
];

function isValidAvatar(avatar: string): boolean {
  if (AVATAR_PRESET_KEYS.includes(avatar)) return true;
  if (avatar.startsWith("data:image/") && avatar.length <= 400000) return true;
  return false;
}

const RESEND_COOLDOWN_MS = 30 * 1000;

// Vraci null pri uspechu, nebo pocet sekund, ktere je jeste potreba pockat,
// pokud si uzivatel rekl o novy kod moc brzy po predchozim.
async function issueVerificationCode(
  userId: number,
  email: string,
  language: string
): Promise<number | null> {
  const current = (await db.get("SELECT verification_last_sent FROM users WHERE id = ?", [userId])) as {
    verification_last_sent: string | null;
  };

  if (current.verification_last_sent) {
    const elapsed = Date.now() - new Date(current.verification_last_sent).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    }
  }

  const code = generateVerificationCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  await db.run(
    `UPDATE users SET
      verification_code = ?,
      verification_expires = ?,
      verification_attempts = 0,
      verification_last_sent = ?
     WHERE id = ?`,
    [code, expires, now, userId]
  );

  await sendVerificationEmail(email, code, language === "cs" ? "cs" : "en");
  return null;
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Jméno, email a heslo jsou povinné.", code: "REGISTER_FIELDS_REQUIRED" });
    }
    if (!isValidEmailFormat(email)) {
      return res.status(400).json({ error: "Zadej platnou emailovou adresu.", code: "INVALID_EMAIL_FORMAT" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Heslo musí mít alespoň 6 znaků.", code: "PASSWORD_TOO_SHORT" });
    }

    const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      return res.status(409).json({ error: "Tento email je již zaregistrován.", code: "EMAIL_ALREADY_REGISTERED" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await db.run("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [
      name,
      email.trim(),
      passwordHash,
    ]);

    const userId = result.lastInsertRowid;
    const user = (await db.get("SELECT * FROM users WHERE id = ?", [userId])) as unknown as UserRow;

    await issueVerificationCode(userId, user.email, user.language);
    await sendWelcomeEmail(user.email, user.name, user.language === "cs" ? "cs" : "en");

    await createNotification(userId, "verify_email", {});

    const token = signToken(userId);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email a heslo jsou povinné.", code: "EMAIL_PASSWORD_REQUIRED" });
    }

    const user = (await db.get("SELECT * FROM users WHERE email = ?", [email])) as unknown as UserRow | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Nesprávný email nebo heslo.", code: "INVALID_CREDENTIALS" });
    }

    if (!user.is_active) {
      await db.run("UPDATE users SET is_active = 1 WHERE id = ?", [user.id]);
      user.is_active = 1;
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as
      | UserRow
      | undefined;
    if (!user) return res.status(404).json({ error: "Uživatel nenalezen.", code: "USER_NOT_FOUND" });
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, motto, avatar, theme, language, isPrivate, onboarded, location, notifyTaskDue, notifyFollows, notifyEmail } =
      req.body;

    if (theme !== undefined && !["light", "dark"].includes(theme)) {
      return res.status(400).json({ error: "Neplatný motiv.", code: "INVALID_THEME" });
    }
    if (language !== undefined && !["cs", "en"].includes(language)) {
      return res.status(400).json({ error: "Nepodporovaný jazyk.", code: "INVALID_LANGUAGE" });
    }
    if (avatar !== undefined && avatar !== null && !isValidAvatar(avatar)) {
      return res.status(400).json({ error: "Neplatný avatar.", code: "INVALID_AVATAR" });
    }

    const isPrivateValue = isPrivate === undefined ? null : isPrivate ? 1 : 0;
    const onboardedValue = onboarded === undefined ? null : onboarded ? 1 : 0;
    const notifyTaskDueValue = notifyTaskDue === undefined ? null : notifyTaskDue ? 1 : 0;
    const notifyFollowsValue = notifyFollows === undefined ? null : notifyFollows ? 1 : 0;
    const notifyEmailValue = notifyEmail === undefined ? null : notifyEmail ? 1 : 0;

    await db.run(
      `UPDATE users SET
        name = COALESCE(?, name),
        motto = COALESCE(?, motto),
        avatar = COALESCE(?, avatar),
        theme = COALESCE(?, theme),
        language = COALESCE(?, language),
        is_private = COALESCE(?, is_private),
        onboarded = COALESCE(?, onboarded),
        location = COALESCE(?, location),
        notify_task_due = COALESCE(?, notify_task_due),
        notify_follows = COALESCE(?, notify_follows),
        notify_email = COALESCE(?, notify_email)
       WHERE id = ?`,
      [
        name ?? null,
        motto ?? null,
        avatar ?? null,
        theme ?? null,
        language ?? null,
        isPrivateValue,
        onboardedValue,
        location ?? null,
        notifyTaskDueValue,
        notifyFollowsValue,
        notifyEmailValue,
        req.userId as number,
      ]
    );

    const user = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as UserRow;
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

router.post("/me/send-verification", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as UserRow;
    if (user.email_verified) {
      return res.status(400).json({ error: "Email je již ověřený.", code: "EMAIL_ALREADY_VERIFIED" });
    }
    const waitSeconds = await issueVerificationCode(user.id, user.email, user.language);
    if (waitSeconds !== null) {
      return res
        .status(429)
        .json({ error: `Zkus to prosím znovu za ${waitSeconds} s.`, code: "VERIFICATION_RATE_LIMITED", waitSeconds });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const MAX_VERIFICATION_ATTEMPTS = 5;

router.post("/me/verify-email", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.body;
    const user = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as UserRow;

    if (user.email_verified) {
      return res.status(400).json({ error: "Email je již ověřený.", code: "EMAIL_ALREADY_VERIFIED" });
    }
    if (!user.verification_code || !user.verification_expires) {
      return res.status(400).json({ error: "Nejdřív si nech poslat ověřovací kód.", code: "VERIFICATION_CODE_NOT_REQUESTED" });
    }
    if (new Date(user.verification_expires).getTime() < Date.now()) {
      return res.status(400).json({ error: "Kód vypršel, nech si poslat nový.", code: "VERIFICATION_CODE_EXPIRED" });
    }
    if (String(code).trim() !== user.verification_code) {
      const attempts = user.verification_attempts + 1;
      if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await db.run(
          "UPDATE users SET verification_code = NULL, verification_expires = NULL, verification_attempts = 0 WHERE id = ?",
          [user.id]
        );
        return res.status(429).json({
          error: "Příliš mnoho pokusů. Nech si poslat nový kód.",
          code: "TOO_MANY_ATTEMPTS",
        });
      }
      await db.run("UPDATE users SET verification_attempts = ? WHERE id = ?", [attempts, user.id]);
      return res.status(400).json({ error: "Nesprávný kód.", code: "WRONG_VERIFICATION_CODE" });
    }

    await db.run(
      "UPDATE users SET email_verified = 1, verification_code = NULL, verification_expires = NULL, verification_attempts = 0 WHERE id = ?",
      [req.userId as number]
    );

    await db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'verify_email'", [
      req.userId as number,
    ]);

    const updated = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as UserRow;
    res.json(publicUser(updated));
  } catch (err) {
    next(err);
  }
});

router.patch("/me/password", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Vyplňte současné i nové heslo.", code: "PASSWORD_FIELDS_REQUIRED" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Nové heslo musí mít alespoň 6 znaků.", code: "NEW_PASSWORD_TOO_SHORT" });
    }

    const user = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as UserRow;
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "Současné heslo není správné.", code: "CURRENT_PASSWORD_WRONG" });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.userId as number]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Pro smazání účtu potvrď své heslo.", code: "DELETE_ACCOUNT_PASSWORD_REQUIRED" });
    }

    const user = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as
      | UserRow
      | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Nesprávné heslo.", code: "WRONG_PASSWORD" });
    }

    await db.run("DELETE FROM users WHERE id = ?", [req.userId as number]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- Zapomenute heslo / obnova hesla (bez prihlaseni) ---

const RESET_COOLDOWN_MS = 30 * 1000;
const MAX_RESET_ATTEMPTS = 5;

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmailFormat(email)) {
      return res.status(400).json({ error: "Zadej platnou emailovou adresu.", code: "INVALID_EMAIL_FORMAT" });
    }

    const user = (await db.get("SELECT * FROM users WHERE email = ?", [email.trim()])) as unknown as
      | UserRow
      | undefined;

    // Vzdy odpovime stejne, i kdyz ucet neexistuje - jinak by slo podle
    // odpovedi zjistit, jestli je dana emailova adresa zaregistrovana.
    if (!user) {
      return res.json({ ok: true });
    }

    if (user.reset_last_sent) {
      const elapsed = Date.now() - new Date(user.reset_last_sent).getTime();
      if (elapsed < RESET_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESET_COOLDOWN_MS - elapsed) / 1000);
        return res
          .status(429)
          .json({ error: `Zkus to prosím znovu za ${waitSeconds} s.`, code: "VERIFICATION_RATE_LIMITED", waitSeconds });
      }
    }

    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    await db.run("UPDATE users SET reset_code = ?, reset_expires = ?, reset_attempts = 0, reset_last_sent = ? WHERE id = ?", [
      code,
      expires,
      now,
      user.id,
    ]);

    await sendPasswordResetEmail(user.email, code, user.language === "cs" ? "cs" : "en");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Vyplňte všechna pole.", code: "PASSWORD_FIELDS_REQUIRED" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Nové heslo musí mít alespoň 6 znaků.", code: "NEW_PASSWORD_TOO_SHORT" });
    }

    const user = (await db.get("SELECT * FROM users WHERE email = ?", [email.trim()])) as unknown as
      | UserRow
      | undefined;

    if (!user || !user.reset_code || !user.reset_expires) {
      return res.status(400).json({ error: "Nejdřív si nech poslat ověřovací kód.", code: "VERIFICATION_CODE_NOT_REQUESTED" });
    }
    if (new Date(user.reset_expires).getTime() < Date.now()) {
      return res.status(400).json({ error: "Kód vypršel, nech si poslat nový.", code: "VERIFICATION_CODE_EXPIRED" });
    }
    if (String(code).trim() !== user.reset_code) {
      const attempts = user.reset_attempts + 1;
      if (attempts >= MAX_RESET_ATTEMPTS) {
        await db.run("UPDATE users SET reset_code = NULL, reset_expires = NULL, reset_attempts = 0 WHERE id = ?", [
          user.id,
        ]);
        return res.status(429).json({ error: "Příliš mnoho pokusů. Nech si poslat nový kód.", code: "TOO_MANY_ATTEMPTS" });
      }
      await db.run("UPDATE users SET reset_attempts = ? WHERE id = ?", [attempts, user.id]);
      return res.status(400).json({ error: "Nesprávný kód.", code: "WRONG_VERIFICATION_CODE" });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.run(
      "UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL, reset_attempts = 0 WHERE id = ?",
      [newHash, user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Zmena emailu (vyzaduje heslo, novy email se musi znovu overit) ---

router.patch("/me/email", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
      return res.status(400).json({ error: "Vyplňte nový email a heslo.", code: "PASSWORD_FIELDS_REQUIRED" });
    }
    if (!isValidEmailFormat(newEmail)) {
      return res.status(400).json({ error: "Zadej platnou emailovou adresu.", code: "INVALID_EMAIL_FORMAT" });
    }

    const user = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as UserRow;
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Nesprávné heslo.", code: "WRONG_PASSWORD" });
    }

    const existing = await db.get("SELECT id FROM users WHERE email = ? AND id != ?", [newEmail.trim(), user.id]);
    if (existing) {
      return res.status(409).json({ error: "Tento email je již zaregistrován.", code: "EMAIL_ALREADY_REGISTERED" });
    }

    await db.run("UPDATE users SET email = ?, email_verified = 0 WHERE id = ?", [newEmail.trim(), user.id]);
    await issueVerificationCode(user.id, newEmail.trim(), user.language);

    const updated = (await db.get("SELECT * FROM users WHERE id = ?", [user.id])) as unknown as UserRow;
    res.json(publicUser(updated));
  } catch (err) {
    next(err);
  }
});

// --- Deaktivace uctu (na rozdil od smazani lze obnovit pristim prihlasenim) ---

router.post("/me/deactivate", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Pro deaktivaci účtu potvrď své heslo.", code: "DELETE_ACCOUNT_PASSWORD_REQUIRED" });
    }
    const user = (await db.get("SELECT * FROM users WHERE id = ?", [req.userId as number])) as unknown as UserRow;
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Nesprávné heslo.", code: "WRONG_PASSWORD" });
    }
    await db.run("UPDATE users SET is_active = 0 WHERE id = ?", [user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
