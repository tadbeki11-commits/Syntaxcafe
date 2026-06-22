import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import db from "../../db/drizzle";
import { branches } from "../../db/tables/branches.table";
import { branchDevices } from "../../db/tables/branch-devices.table";
import { dataCleanupRequests } from "../../db/tables/data-cleanup-requests.table";
import { orders } from "../../db/tables/orders.table";
import { payments } from "../../db/tables/payments.table";
import {
  getTenant,
  requireBranchId,
  tenantInsert,
} from "../../common/tenant/tenant-context";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

// A request is "active" (blocks a new one) while it still needs handling.
const ACTIVE_STATUSES = ["pending", "approved"] as const;

@Injectable()
export class DataCleanupService {
  /** Resolves the device row for the caller's device token, or null. */
  private async resolveDevice(token?: string) {
    if (!token) return null;
    const [device] = await db
      .select()
      .from(branchDevices)
      .where(
        and(
          eq(branchDevices.token_hash, sha256(token)),
          eq(branchDevices.status, "active"),
        ),
      )
      .limit(1);
    return device ?? null;
  }

  /** Loads a branch and asserts the caller (owner/platform) may manage it. */
  private async getManageableBranch(branchId: string) {
    const tenant = getTenant();
    if (!tenant || (tenant.scope !== "owner" && tenant.scope !== "platform")) {
      throw new ForbiddenException(
        "Only an owner or platform admin can review cleanup requests.",
      );
    }
    if (!branchId) throw new BadRequestException("Branch id is required");

    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);
    if (!branch) throw new NotFoundException("Branch not found");
    if (tenant.scope === "owner" && branch.business_id !== tenant.businessId) {
      throw new ForbiddenException("Branch does not belong to your business.");
    }
    return branch;
  }

  // ── Device-facing ──────────────────────────────────────────────────────────

  /** A device asks to wipe its local data. One active request per device. */
  async createRequest(deviceToken: string, reason?: string) {
    const branchId = requireBranchId();
    const device = await this.resolveDevice(deviceToken);

    const existing = await db
      .select()
      .from(dataCleanupRequests)
      .where(this.activeForDevice(branchId, device?.id))
      .orderBy(desc(dataCleanupRequests.requested_at))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const [created] = await db
      .insert(dataCleanupRequests)
      .values({
        ...tenantInsert(),
        device_id: device?.id ?? null,
        device_name: device?.name ?? null,
        reason: reason?.trim() || null,
        status: "pending",
        requested_at: new Date(),
      })
      .returning();
    return created;
  }

  /** Latest non-terminal request for the calling device (for polling). */
  async getActiveRequest(deviceToken: string) {
    const branchId = requireBranchId();
    const device = await this.resolveDevice(deviceToken);

    const [row] = await db
      .select()
      .from(dataCleanupRequests)
      .where(this.activeForDevice(branchId, device?.id))
      .orderBy(desc(dataCleanupRequests.requested_at))
      .limit(1);
    return row ?? null;
  }

  /**
   * Filter for a device's active requests in a branch. When the device can't be
   * resolved from its token, fall back to branch-level matching so the device
   * still tracks its request.
   */
  private activeForDevice(branchId: string, deviceId?: string) {
    return and(
      eq(dataCleanupRequests.branch_id, branchId),
      ...(deviceId ? [eq(dataCleanupRequests.device_id, deviceId)] : []),
      inArray(dataCleanupRequests.status, [...ACTIVE_STATUSES]),
    );
  }

  /**
   * Device confirms it has wiped: run the branch cleanup (delete this branch's
   * orders + payments) and mark the request completed. Only valid for an
   * approved request belonging to the caller's branch.
   */
  async completeRequest(id: string, deviceToken: string) {
    const branchId = requireBranchId();
    const device = await this.resolveDevice(deviceToken);

    const [request] = await db
      .select()
      .from(dataCleanupRequests)
      .where(
        and(
          eq(dataCleanupRequests.id, id),
          eq(dataCleanupRequests.branch_id, branchId),
        ),
      )
      .limit(1);
    if (!request) throw new NotFoundException("Cleanup request not found");
    if (device && request.device_id && request.device_id !== device.id) {
      throw new ForbiddenException("Request belongs to a different device.");
    }
    if (request.status !== "approved") {
      throw new BadRequestException(
        "Cleanup request is not approved (or already completed).",
      );
    }

    // Scope the wipe to this branch only — never touch other tenants' data.
    await db.delete(payments).where(eq(payments.branch_id, branchId));
    await db.delete(orders).where(eq(orders.branch_id, branchId));

    const [updated] = await db
      .update(dataCleanupRequests)
      .set({ status: "completed", completed_at: new Date(), updated_at: new Date() })
      .where(eq(dataCleanupRequests.id, request.id))
      .returning();

    console.log(
      `[DataCleanupService] Completed cleanup ${request.id}: cleared orders & payments for branch ${branchId}.`,
    );
    return updated;
  }

  // ── Owner-facing ───────────────────────────────────────────────────────────

  /** Lists cleanup requests for a branch, pending first. */
  async listForBranch(branchId: string) {
    const branch = await this.getManageableBranch(branchId);
    const rows = await db
      .select()
      .from(dataCleanupRequests)
      .where(eq(dataCleanupRequests.branch_id, branch.id))
      .orderBy(desc(dataCleanupRequests.requested_at));
    return { branch_id: branch.id, requests: rows };
  }

  /** Owner approves a pending request. */
  async approve(id: string) {
    const request = await this.loadReviewable(id);
    const tenant = getTenant();
    const [updated] = await db
      .update(dataCleanupRequests)
      .set({
        status: "approved",
        reviewed_at: new Date(),
        reviewed_by_user_id: tenant?.userId ?? null,
        updated_at: new Date(),
      })
      .where(eq(dataCleanupRequests.id, request.id))
      .returning();
    return updated;
  }

  /** Owner rejects a pending request. */
  async reject(id: string) {
    const request = await this.loadReviewable(id);
    const tenant = getTenant();
    const [updated] = await db
      .update(dataCleanupRequests)
      .set({
        status: "rejected",
        reviewed_at: new Date(),
        reviewed_by_user_id: tenant?.userId ?? null,
        updated_at: new Date(),
      })
      .where(eq(dataCleanupRequests.id, request.id))
      .returning();
    return updated;
  }

  /** Loads a pending request and asserts the owner may manage its branch. */
  private async loadReviewable(id: string) {
    if (!id) throw new BadRequestException("Request id is required");
    const [request] = await db
      .select()
      .from(dataCleanupRequests)
      .where(eq(dataCleanupRequests.id, id))
      .limit(1);
    if (!request) throw new NotFoundException("Cleanup request not found");
    await this.getManageableBranch(request.branch_id);
    if (request.status !== "pending") {
      throw new BadRequestException(
        `Request is already ${request.status}.`,
      );
    }
    return request;
  }
}
