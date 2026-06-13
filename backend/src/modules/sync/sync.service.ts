import { Injectable, Logger } from "@nestjs/common";
import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import db from "../../db/drizzle";
import { syncEvents } from "../../db/tables/sync-events.table";
import { SyncApplierService } from "./sync-applier.service";
import {
  requireBranchId,
  requireBusinessId,
} from "../../common/tenant/tenant-context";

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly syncApplier: SyncApplierService) {}
  async getChanges(since = 0, limit = 500) {
    const safeSince = Number(since) || 0;
    const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1000);

    // Partition the stream: only this branch's events, plus business-wide
    // broadcasts (branch_id IS NULL within the same business).
    const businessId = requireBusinessId();
    const branchId = requireBranchId();
    const tenantFilter = or(
      eq(syncEvents.branch_id, branchId),
      and(eq(syncEvents.business_id, businessId), isNull(syncEvents.branch_id)),
    );

    const rows = await db
      .select()
      .from(syncEvents)
      .where(and(gt(syncEvents.id, safeSince), tenantFilter))
      .orderBy(asc(syncEvents.id))
      .limit(safeLimit + 1);

    const hasMore = rows.length > safeLimit;
    const events = (hasMore ? rows.slice(0, safeLimit) : rows).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payload: row.payload,
      version: row.version,
      createdAt: row.created_at,
    }));

    const nextCursor = events.length
      ? events[events.length - 1].id
      : safeSince;

    return { events, nextCursor, hasMore };
  }

  async ingestEvents(
    events: Array<{
      eventType: string;
      entityType: string;
      entityId?: string | null;
      operation: string;
      payload?: Record<string, unknown>;
      clientVersion?: number;
    }>,
  ) {
    let accepted = 0;
    let conflicts = 0;

    for (const event of events) {
      try {
        await this.syncApplier.apply({
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          operation: event.operation,
          payload: event.payload,
          clientVersion: event.clientVersion,
        });
        accepted += 1;
      } catch (error) {
        conflicts += 1;
        this.logger.warn(
          `Failed to apply sync event ${event.eventType}: ${(error as Error).message}`,
        );
      }
    }

    return { accepted, conflicts };
  }
}
