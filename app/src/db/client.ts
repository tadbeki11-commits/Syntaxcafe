import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { localDbTables } from "./schema";
import migration0000 from "../../drizzle/0000_stale_texas_twister.sql?raw";
import migration0001 from "../../drizzle/0001_device_enrollment.sql?raw";

import migrationJournal from "../../drizzle/meta/_journal.json";
import { getApproximateServerNow } from "@/shared/utils/serverTime";

export type LocalDbDrizzle = ReturnType<typeof drizzle<typeof localDbTables>>;

const migrationSqlByTag: Record<string, string> = {
  "0000_stale_texas_twister": migration0000,
  "0001_device_enrollment": migration0001,
};
const isAlreadyExistsError = (error: unknown): boolean => {
  const seen = new WeakSet<object>();

  const visit = (value: unknown): boolean => {
    if (value == null) return false;

    if (typeof value === "string") {
      return /already exists|duplicate column name/i.test(value);
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    ) {
      return false;
    }

    if (value instanceof Error) {
      return visit(value.message) || visit((value as any).cause);
    }

    if (Array.isArray(value)) {
      return value.some((entry) => visit(entry));
    }

    if (typeof value === "object") {
      if (seen.has(value)) return false;
      seen.add(value);

      const record = value as Record<string, unknown>;
      return (
        visit(record.message) ||
        visit(record.error) ||
        visit(record.cause) ||
        visit(record.detail) ||
        visit(record.data) ||
        visit(record.body) ||
        Object.values(record).some((entry) => visit(entry))
      );
    }

    return /already exists|duplicate column name/i.test(String(value));
  };

  return visit(error);
};

const applyDrizzleKitMigrations = async (db: Database): Promise<void> => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    )
  `);

  const entries = (migrationJournal as any)?.entries ?? [];
  for (const entry of entries) {
    const tag = String(entry?.tag || "");
    if (!tag) continue;

    const existing = (await db.select(
      `SELECT id FROM "__drizzle_migrations" WHERE hash = $1 LIMIT 1`,
      [tag],
    )) as any[];
    if (existing.length > 0) continue;

    const sqlText = migrationSqlByTag[tag];
    if (!sqlText) {
      throw new Error(`[SQLite DB] Missing migration SQL for tag "${tag}"`);
    }

    const statements = sqlText
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await db.execute(statement);
      } catch (error) {
        if (
          isAlreadyExistsError(error) &&
          /^CREATE\s+(UNIQUE\s+)?INDEX|^CREATE\s+TABLE|^ALTER\s+TABLE/i.test(
            statement,
          )
        ) {
          continue;
        }

        throw error;
      }
    }

    await db.execute(
      `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
      [tag, Number(entry?.when ?? getApproximateServerNow())],
    );
  }
};

const rawDbPromise = Database.load("sqlite:cafe_local.db");

const objectRowToArray = (row: any) => {
  if (!row || typeof row !== "object") return [];
  // Tauri plugin-sql returns row objects; sqlite-proxy expects value arrays.
  // JS preserves insertion order for string keys, which typically matches SQLite column order.
  return Object.keys(row).map((key) => (row as any)[key]);
};

const objectRowsToArrays = (rows: any[]) =>
  Array.isArray(rows) ? rows.map(objectRowToArray) : [];

const initDatabase = async (): Promise<LocalDbDrizzle> => {
  // console.log("[SQLite DB] Loading cafe_local.db database file...");
  const db = await rawDbPromise;
  const drizzleDb = drizzle(
    async (query, params, method) => {
      if (method === "run") {
        await db.execute(query, params);
        return { rows: [] };
      }

      const resultRows = (await db.select(query, params)) as any[];

      // drizzle-orm/sqlite-proxy expects:
      // - get: { rows: any[] | undefined } (single row values)
      // - all/values: { rows: any[][] } (rows of values)
      if (method === "get") {
        const first = resultRows?.[0];
        return { rows: first ? objectRowToArray(first) : [] };
      }

      return { rows: objectRowsToArrays(resultRows) };
    },
    { schema: localDbTables },
  );

  // console.log("[SQLite DB] Running Drizzle migrations...");
  await applyDrizzleKitMigrations(db);
  // console.log("[SQLite DB] SQLite database fully migrated and initialized.");

  return drizzleDb;
};

const localDbPromise = initDatabase();

export const getLocalDb = () => localDbPromise;
