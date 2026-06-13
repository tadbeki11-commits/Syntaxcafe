import { eq } from "drizzle-orm";
import { getLocalDb, generateLocalId } from "@/db/localDb";

const resolveDb = async (db?: any) => db ?? (await getLocalDb());

const parseRawJson = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const mergeRowWithRawJson = (row: any) => {
  const parsed = parseRawJson(row?.raw_json);
  if (parsed && typeof parsed === "object") {
    const merged = { ...row, ...parsed };
    // Column wins for print flag — stale raw_json must not re-queue printed orders.
    if (Number(row.is_printed) === 1) {
      merged.is_printed = 1;
    }
    const metaPrinted = Number(
      (parsed as any)?.meta?.is_printed ?? (row as any)?.meta?.is_printed,
    );
    if (metaPrinted === 1) {
      merged.is_printed = 1;
    }
    return merged;
  }
  return row;
};

export const readRows = async (table: any) => {
  const db = await resolveDb();
  const rows = await db.select().from(table);
  return rows.map((row: any) => mergeRowWithRawJson(row));
};

export const findById = async (table: any, id: string) => {
  const db = await resolveDb();
  const rows = await db.select().from(table).where(eq(table.id, id));
  return rows[0] ? mergeRowWithRawJson(rows[0]) : null;
};

export const findByRemoteId = async (table: any, remoteId: string) => {
  return findById(table, remoteId);
};

export const findByIdOrRemote = async (table: any, id: string) => {
  return findById(table, id);
};

const normalizeDbValue = (value: any) => {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
};

const toDbPayload = (row: any, fallbackId?: string) => {
  const targetId = row?.id ?? fallbackId ?? generateLocalId();
  const payload: Record<string, any> = {
    ...row,
    id: targetId,
    synced: Number(row?.synced ?? 0),
    raw_json: JSON.stringify({
      ...row,
      id: targetId,
    }),
  };

  for (const key of Object.keys(payload)) {
    payload[key] = normalizeDbValue(payload[key]);
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  return payload;
};

export const clearRows = async (table: any, db?: any) => {
  const resolvedDb = await resolveDb(db);
  await resolvedDb.delete(table);
};

export const deleteById = async (table: any, id: string, db?: any) => {
  const resolvedDb = await resolveDb(db);
  await resolvedDb.delete(table).where(eq(table.id, id));
};

export const upsertRow = async (table: any, row: any, db?: any) => {
  const resolvedDb = await resolveDb(db);
  const targetId = row?.id ?? generateLocalId();
  const payload = toDbPayload({ ...row, id: targetId });

  const { id, ...updatePayload } = payload;

  await resolvedDb
    .insert(table)
    .values(payload as any)
    .onConflictDoUpdate({
      target: table.id,
      set: updatePayload as any,
    });

  return targetId;
};
