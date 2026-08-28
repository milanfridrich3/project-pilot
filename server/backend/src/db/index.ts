import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Databazova vrstva Project Pilotu
// ---------------------------------------------------------------------------
// Appka umi bezet nad dvema ruznymi databazemi:
//
//   1) SQLite (vychozi, node:sqlite) - soubor na disku, idealni pro lokalni
//      vyvoj. NEVYHODA v produkci: na hostinzich jako Render ma bezna
//      sluzba jen docasny souborovy system a Persistent Disk je jen na
//      placenych planech - soubor (a s nim vsichni uzivatele) tak muze
//      zmizet pri kazdem redeployi/restartu.
//
//   2) PostgreSQL (pres env promennou DATABASE_URL) - externi spravovana
//      databaze (Render Postgres, Neon, Supabase, Railway, ...), ktera
//      prezije redeploy i restart serveru bez nutnosti platit za disk.
//
// Cely zbytek backendu (routes/*, lib/permissions.ts, middleware/auth.ts)
// pouziva jen ctyri metody: db.get / db.all / db.run / db.exec (+ pripadne
// db.transaction). SQL se pise s "?" placeholdery jako u SQLite - adapter
// si je pro Postgres sam prevede na $1, $2, ... Diky tomu nebylo potreba
// prepisovat SQL dotazy v jednotlivych routach, jen je prevest z synchroniho
// na asynchronni volani (await db.get(...) misto db.prepare(...).get(...)).
//
// Ktera databaze se pouzije se rozhoduje ciste podle pritomnosti DATABASE_URL:
//   - DATABASE_URL nastavena  -> PostgreSQL
//   - DATABASE_URL nenastavena -> SQLite (puvodni chovani, beze zmeny)
// ---------------------------------------------------------------------------

export type Dialect = "sqlite" | "postgres";

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

export interface DbClient {
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<RunResult>;
  exec(sql: string): Promise<void>;
}

export interface Db extends DbClient {
  dialect: Dialect;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const DATABASE_URL = process.env.DATABASE_URL;

function createDb(): Db {
  if (DATABASE_URL) {
    return createPostgresDb(DATABASE_URL);
  }
  return createSqliteDb();
}

// --- SQLite adapter (node:sqlite, synchronni API zabalene do Promise) ------

function createSqliteDb(): Db {
  // Vyzadovano az tady (ne top-level importem), aby appka pri behu s
  // Postgresem vubec nemusela nacitat node:sqlite.
  const { DatabaseSync } = require("node:sqlite");

  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "..", "data.sqlite");
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const raw = new DatabaseSync(dbPath);
  raw.exec("PRAGMA journal_mode = WAL");
  raw.exec("PRAGMA foreign_keys = ON");

  function makeClient(conn: any): DbClient {
    return {
      async get(sql, params = []) {
        return conn.prepare(sql).get(...params);
      },
      async all(sql, params = []) {
        return conn.prepare(sql).all(...params);
      },
      async run(sql, params = []) {
        const result = conn.prepare(sql).run(...params);
        return {
          lastInsertRowid: Number(result.lastInsertRowid),
          changes: Number(result.changes),
        };
      },
      async exec(sql) {
        conn.exec(sql);
      },
    };
  }

  const client = makeClient(raw);

  return {
    dialect: "sqlite",
    ...client,
    async transaction(fn) {
      raw.exec("BEGIN");
      try {
        const result = await fn(client);
        raw.exec("COMMIT");
        return result;
      } catch (err) {
        try {
          raw.exec("ROLLBACK");
        } catch {
          // transakce uz mohla byt ukoncena (napr. chybou uvnitr) - v poradku
        }
        throw err;
      }
    },
    async close() {
      raw.close();
    },
  };
}

// --- PostgreSQL adapter (pg Pool) -------------------------------------------

function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Prevadi "obycejny" SQLite-styl INSERT na Postgres verzi, ktera vraci id
// nove radky - tim padem lastInsertRowid funguje stejne v obou dialektech.
function withReturningId(sql: string): string {
  const trimmed = sql.trim();
  if (!/^insert/i.test(trimmed)) return sql;
  if (/returning/i.test(trimmed)) return sql;
  return `${sql.replace(/;\s*$/, "")} RETURNING id`;
}

function createPostgresDb(connectionString: string): Db {
  // Vyzadovano az tady, aby appka bez DATABASE_URL vubec nepotrebovala
  // mit balicek "pg" nainstalovany funkcni (jen v package.json).
  const { Pool } = require("pg");

  const sslDisabled = process.env.DATABASE_SSL === "false";
  const pool = new Pool({
    connectionString,
    ssl: sslDisabled ? undefined : { rejectUnauthorized: false },
  });

  function makeClient(queryable: { query: (text: string, params?: any[]) => Promise<any> }): DbClient {
    return {
      async get(sql, params = []) {
        const res = await queryable.query(toPgSql(sql), params);
        return res.rows[0];
      },
      async all(sql, params = []) {
        const res = await queryable.query(toPgSql(sql), params);
        return res.rows;
      },
      async run(sql, params = []) {
        const pgSql = toPgSql(withReturningId(sql));
        const res = await queryable.query(pgSql, params);
        const lastInsertRowid = res.rows && res.rows[0] ? Number(res.rows[0].id) : 0;
        return { lastInsertRowid, changes: res.rowCount ?? 0 };
      },
      async exec(sql) {
        await queryable.query(sql);
      },
    };
  }

  const client = makeClient(pool);

  return {
    dialect: "postgres",
    ...client,
    async transaction(fn) {
      const conn = await pool.connect();
      const txClient = makeClient(conn);
      try {
        await conn.query("BEGIN");
        const result = await fn(txClient);
        await conn.query("COMMIT");
        return result;
      } catch (err) {
        try {
          await conn.query("ROLLBACK");
        } catch {
          // spojeni uz muze byt v chybovem stavu - v poradku, uvolnime ho niz
        }
        throw err;
      } finally {
        conn.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export const db = createDb();

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

function schemaSql(dialect: Dialect): string {
  const pk = dialect === "sqlite" ? "INTEGER PRIMARY KEY AUTOINCREMENT" : "SERIAL PRIMARY KEY";
  // "datetime('now')" (SQLite) a ekvivalentni text v Postgresu - stejny format
  // (YYYY-MM-DD HH:MM:SS, UTC), aby lexikograficke razeni fungovalo v obou.
  const nowDefault =
    dialect === "sqlite"
      ? "TEXT NOT NULL DEFAULT (datetime('now'))"
      : "TEXT NOT NULL DEFAULT (to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS'))";

  return `
    CREATE TABLE IF NOT EXISTS users (
      id ${pk},
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      motto TEXT,
      avatar TEXT,
      theme TEXT NOT NULL DEFAULT 'dark',
      language TEXT NOT NULL DEFAULT 'en',
      is_private INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_code TEXT,
      verification_expires TEXT,
      created_at ${nowDefault}
    );

    CREATE TABLE IF NOT EXISTS projects (
      id ${pk},
      name TEXT NOT NULL,
      objective TEXT,
      template TEXT NOT NULL DEFAULT 'blank',
      owner_id INTEGER NOT NULL,
      is_discoverable INTEGER NOT NULL DEFAULT 0,
      color TEXT,
      icon TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      permissions_json TEXT,
      created_at ${nowDefault},
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id ${pk},
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS project_join_requests (
      id ${pk},
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at ${nowDefault},
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS project_activity (
      id ${pk},
      project_id INTEGER NOT NULL,
      actor_id INTEGER,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at ${nowDefault},
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id ${pk},
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id ${pk},
      project_id INTEGER NOT NULL,
      milestone_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      is_important INTEGER NOT NULL DEFAULT 0,
      assignee_id INTEGER,
      created_by INTEGER,
      due_date TEXT,
      created_at ${nowDefault},
      completed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Ukol muze byt prirazen vice lidem najednou (napr. "Anna a Max delaji
    -- prezentaci"). "assignee_id" v tasks zustava v databazi jen jako
    -- nepouzivany starsi sloupec kvuli hladke migraci, aplikace uz cte a
    -- zapisuje vyhradne pres tuto tabulku.
    CREATE TABLE IF NOT EXISTS task_assignees (
      id ${pk},
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(task_id, user_id)
    );

    -- Osobni pripnuti ukolu - kazdy uzivatel si muze pripnout libovolny
    -- ukol z projektu, kde je clenem, nezavisle na ostatnich clenech.
    CREATE TABLE IF NOT EXISTS task_pins (
      id ${pk},
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at ${nowDefault},
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(task_id, user_id)
    );

    -- Diskuze u ukolu - funguje jako jednoduchy chat, chronologicky.
    CREATE TABLE IF NOT EXISTS task_comments (
      id ${pk},
      task_id INTEGER NOT NULL,
      author_id INTEGER,
      body TEXT NOT NULL,
      created_at ${nowDefault},
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Prilohy/zdroje projektu - zatim jen odkazy (nazev, popis, URL);
    -- nahravani souboru je planovano na pozdeji (viz README).
    CREATE TABLE IF NOT EXISTS project_resources (
      id ${pk},
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      added_by INTEGER,
      created_at ${nowDefault},
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS follows (
      id ${pk},
      follower_id INTEGER NOT NULL,
      followee_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'accepted',
      created_at ${nowDefault},
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(follower_id, followee_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id ${pk},
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at ${nowDefault},
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;
}

// Sloupce pridane v pozdejsich kolech vyvoje - u jiz existujici databaze
// (at uz SQLite soubor nebo Postgres, ktery tu uz bezel na starsim schematu)
// je potreba je doplnit rucne, protoze CREATE TABLE IF NOT EXISTS tabulku,
// ktera uz existuje, nezmeni. Bez tohoto kroku by dotazy na nove sloupce
// padaly s "no such column" / "column does not exist" a rozbily by napr.
// registraci nebo vytvareni projektu.
const COLUMN_MIGRATIONS: { table: string; column: string; definition: string }[] = [
  { table: "users", column: "is_private", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "email_verified", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "verification_code", definition: "TEXT" },
  { table: "users", column: "verification_expires", definition: "TEXT" },
  { table: "users", column: "onboarded", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "verification_attempts", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "verification_last_sent", definition: "TEXT" },
  { table: "users", column: "location", definition: "TEXT" },
  { table: "users", column: "is_active", definition: "INTEGER NOT NULL DEFAULT 1" },
  { table: "users", column: "notify_task_due", definition: "INTEGER NOT NULL DEFAULT 1" },
  { table: "users", column: "notify_follows", definition: "INTEGER NOT NULL DEFAULT 1" },
  { table: "users", column: "notify_email", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "reset_code", definition: "TEXT" },
  { table: "users", column: "reset_expires", definition: "TEXT" },
  { table: "users", column: "reset_attempts", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "users", column: "reset_last_sent", definition: "TEXT" },
  { table: "projects", column: "is_discoverable", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "project_members", column: "role", definition: "TEXT NOT NULL DEFAULT 'member'" },
  { table: "tasks", column: "created_by", definition: "INTEGER" },
  { table: "projects", column: "color", definition: "TEXT" },
  { table: "projects", column: "icon", definition: "TEXT" },
  { table: "projects", column: "is_archived", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "milestones", column: "description", definition: "TEXT" },
  { table: "tasks", column: "is_important", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "tasks", column: "completed_at", definition: "TEXT" },
  { table: "projects", column: "permissions_json", definition: "TEXT" },
];

async function migrateColumns() {
  for (const m of COLUMN_MIGRATIONS) {
    if (db.dialect === "postgres") {
      // Postgres 9.6+ podporuje IF NOT EXISTS primo - zadny try/catch potreba.
      await db.exec(`ALTER TABLE ${m.table} ADD COLUMN IF NOT EXISTS ${m.column} ${m.definition}`);
    } else {
      try {
        await db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.definition}`);
      } catch {
        // sloupec uz existuje - v poradku, nic delat nemusime
      }
    }
  }
}

export async function initDb() {
  await db.exec(schemaSql(db.dialect));
  await migrateColumns();
}
