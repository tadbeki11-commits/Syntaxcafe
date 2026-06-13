import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { syncEvents } from "../../db/tables/sync-events.table";
import {
  requireBranchId,
  requireBusinessId,
} from "../../common/tenant/tenant-context";

export type SyncEventInput = {
  eventType: string;
  entityType: string;
  entityId?: string | null;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  version?: number;
};

export async function emitSyncEvent(
  db: NodePgDatabase<any>,
  input: SyncEventInput,
): Promise<void> {
  await db.insert(syncEvents).values({
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    operation: input.operation,
    // Stamp the tenant from the active request context so the sync stream is
    // partitioned per branch. Falls back to the default branch outside a request.
    business_id: requireBusinessId(),
    branch_id: requireBranchId(),
    payload: input.payload,
    version: input.version ?? Number(input.payload.version ?? 1),
  });
}
