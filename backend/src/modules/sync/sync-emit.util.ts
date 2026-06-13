import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { emitSyncEvent, type SyncEventInput } from "./sync-event.emitter";

type Db = NodePgDatabase<any>;


export const emitEntitySync = async (
  db: Db,
  input: SyncEventInput & {
    row?: Record<string, unknown>;
  },
): Promise<void> => {
  const payload = input.payload ?? input.row ?? {};
  await emitSyncEvent(db, {
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId ?? (payload.id as string) ?? null,
    operation: input.operation,
    payload,
    version: input.version ?? Number((payload as any).version ?? 1),
  });
};

export const emitCreated = (
  db: Db,
  entityType: string,
  eventType: string,
  row: Record<string, unknown>,
) =>
  emitEntitySync(db, {
    eventType,
    entityType,
    entityId: row.id as string,
    operation: "create",
    row,
    payload: row,
  });

export const emitUpdated = (
  db: Db,
  entityType: string,
  eventType: string,
  row: Record<string, unknown>,
) =>
  emitEntitySync(db, {
    eventType,
    entityType,
    entityId: row.id as string,
    operation: "update",
    row,
    payload: row,
  });

export const emitDeleted = (
  db: Db,
  entityType: string,
  eventType: string,
  entityId: string,
  payload: Record<string, unknown> = { id: entityId },
) =>
  emitEntitySync(db, {
    eventType,
    entityType,
    entityId,
    operation: "delete",
    payload,
  });
