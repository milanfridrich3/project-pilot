// ---------------------------------------------------------------------------
// Jednorazovy prevod dat: SQLite (data.sqlite) -> PostgreSQL
// ---------------------------------------------------------------------------
// Pouziti:
//
//   1. Zjisti si connection string k cilove Postgres databazi (napr. z
//      Render Postgres, Neon, Supabase...) - vypada nejak takto:
//      postgres://user:heslo@host:5432/nazev_db
//
//   2. Spust (z backend/):
//
//      DATABASE_URL="postgres://..." npm run migrate:sqlite-to-postgres
//
//      Volitelne SQLITE_SOURCE_PATH, pokud neni zdrojovy soubor na
//      obvyklem miste (backend/data.sqlite nebo DATABASE_PATH z .env):
//
//      DATABASE_URL="postgres://..." SQLITE_SOURCE_PATH=./data.sqlite npm run migrate:sqlite-to-postgres
//
//   3. Skript:
//      - vytvori (pokud jeste neexistuje) schema v cilove Postgres databazi
//      - zkopiruje vsechny radky ze SQLite do Postgres v poradi, ktere
//        respektuje cizi klice (users -> projects -> ... -> notifications)
//      - zachova puvodni ID (aby vazby mezi tabulkami zustaly platne)
//      - nastavi Postgres sekvence (SERIAL) tak, aby dalsi INSERT pokracoval
//        spravnym cislem a nekolidoval se zkopirovanymi daty
//
//   Skript je idempotentni v tom smyslu, ze pouziva "ON CONFLICT (id) DO
//   NOTHING" - pri opakovanem spusteni tedy jiz zkopirovana data
//   nezdvoji, ale POZOR: needela zadny merge/update existujicich radku.
//   Nejlepe spustit jen jednou, na cerstvou/prazdnou Postgres databazi.
// ---------------------------------------------------------------------------

import path from "path";
import fs from "fs";

async function main() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) {
    console.error(
      "Chybi DATABASE_URL (cilova Postgres databaze). Priklad spusteni:\n" +
        '  DATABASE_URL="postgres://user:heslo@host:5432/db" npm run migrate:sqlite-to-postgres'
    );
    process.exit(1);
  }

  const sourcePath =
    process.env.SQLITE_SOURCE_PATH ||
    process.env.DATABASE_PATH ||
    path.join(__dirname, "..", "..", "data.sqlite");

  if (!fs.existsSync(sourcePath)) {
    console.error(`Zdrojovy SQLite soubor nenalezen: ${sourcePath}`);
    console.error("Nastav SQLITE_SOURCE_PATH na spravnou cestu k data.sqlite.");
    process.exit(1);
  }

  console.log(`Zdroj (SQLite):  ${sourcePath}`);
  console.log(`Cil (Postgres):  ${targetUrl.replace(/:[^:@]*@/, ":***@")}`);

  // Cilova databaze - modul ./db se sam prepne na Postgres, protoze
  // DATABASE_URL je nastavena (viz src/db/index.ts).
  const { db, initDb } = await import("../db");
  if (db.dialect !== "postgres") {
    console.error("DATABASE_URL je nastavena, ale db modul se neprepnul na Postgres - zkontroluj konfiguraci.");
    process.exit(1);
  }

  console.log("Vytvarim/kontroluji schema v cilove databazi...");
  await initDb();

  // Zdrojova SQLite databaze - ctena primo, nezavisle na "db" modulu.
  const { DatabaseSync } = require("node:sqlite");
  const source = new DatabaseSync(sourcePath, { readOnly: true });

  // Poradi respektuje cizi klice - rodicovske tabulky vzdy pred detmi.
  const TABLES = [
    "users",
    "projects",
    "project_members",
    "project_join_requests",
    "project_activity",
    "milestones",
    "tasks",
    "task_pins",
    "follows",
    "notifications",
  ];

  for (const table of TABLES) {
    let rows: any[];
    try {
      rows = source.prepare(`SELECT * FROM ${table}`).all();
    } catch (err) {
      console.log(`  ${table}: tabulka ve zdroji neexistuje, preskakuji`);
      continue;
    }

    if (rows.length === 0) {
      console.log(`  ${table}: 0 radku, preskakuji`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

    let inserted = 0;
    for (const row of rows) {
      const values = columns.map((c) => row[c]);
      const result = await db.run(insertSql, values);
      if (result.changes > 0) inserted++;
    }
    console.log(`  ${table}: ${inserted}/${rows.length} radku zkopirovano`);

    // Sekvence pro SERIAL sloupec "id" musi ukazovat za nejvyssi zkopirovane
    // id, jinak by dalsi INSERT (bez explicitniho id) mohl kolidovat.
    await db.exec(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
    );
  }

  source.close();
  await db.close();

  console.log("\nHotovo. Databaze je pripravena - nastav DATABASE_URL na produkcnim serveru a restartuj appku.");
}

main().catch((err) => {
  console.error("Migrace selhala:", err);
  process.exit(1);
});
