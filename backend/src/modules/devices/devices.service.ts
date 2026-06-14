import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import db from "../../db/drizzle";
import { branchDevices } from "../../db/tables/branch-devices.table";
import { branches } from "../../db/tables/branches.table";
import { getTenant } from "../../common/tenant/tenant-context";

export interface DeviceTenant {
  businessId: string;
  branchId: string;
}

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

@Injectable()
export class DevicesService {
  // Long-lived device tokens are looked up on every sync request, so cache the
  // token -> tenant resolution in memory. (Revocation requires a process restart
  // or an explicit cache bust; acceptable for the device count we expect.)
  private readonly tokenCache = new Map<string, DeviceTenant>();

  /** Loads a branch and asserts the caller (owner/platform) may manage it. */
  private async getManageableBranch(branchId: string) {
    const tenant = getTenant();
    if (!tenant || (tenant.scope !== "owner" && tenant.scope !== "platform")) {
      throw new ForbiddenException(
        "Only an owner or platform admin can manage device enrollment.",
      );
    }

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

  /** Returns the branch's current reusable enrollment code (owner/platform). */
  async getEnrollmentCode(branchId: string) {
    const branch = await this.getManageableBranch(branchId);
    return { branch_id: branch.id, code: branch.enrollment_code ?? null };
  }

  /**
   * Owner/platform sets (or rotates) the branch's reusable enrollment code.
   * Devices enroll with it any number of times until it's rotated again; rotating
   * does not revoke already-enrolled devices (their tokens stay valid).
   */
  async rotateEnrollmentCode(branchId: string) {
    const branch = await this.getManageableBranch(branchId);

    const code = randomBytes(6).toString("hex").toUpperCase(); // 12 chars
    await db
      .update(branches)
      .set({ enrollment_code: code, updated_at: new Date() })
      .where(eq(branches.id, branch.id));

    return { branch_id: branch.id, code };
  }

  /**
   * A device redeems its branch's enrollment code for a long-lived token. Public
   * endpoint: possession of a valid code is the credential. The code is reusable,
   * so each call provisions a new device record/token.
   */
  async enroll(code: string, deviceName?: string) {
    const trimmed = code?.trim().toUpperCase();
    if (!trimmed) throw new BadRequestException("Enrollment code is required");

    const [branch] = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.enrollment_code, trimmed),
          eq(branches.is_active, true),
        ),
      )
      .limit(1);
    if (!branch) throw new BadRequestException("Invalid enrollment code");

    const token = randomBytes(32).toString("hex"); // 64 chars
    await db.insert(branchDevices).values({
      business_id: branch.business_id,
      branch_id: branch.id,
      name: deviceName?.trim() || null,
      token_hash: sha256(token),
      status: "active",
      last_seen_at: new Date(),
    });

    return {
      token,
      business_id: branch.business_id,
      branch_id: branch.id,
    };
  }

  /** Resolves a device token to its tenant, or null if unknown/revoked. */
  async resolveToken(token: string): Promise<DeviceTenant | null> {
    if (!token) return null;
    const cached = this.tokenCache.get(token);
    if (cached) return cached;

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
    if (!device) return null;

    const tenant: DeviceTenant = {
      businessId: device.business_id,
      branchId: device.branch_id,
    };
    this.tokenCache.set(token, tenant);
    return tenant;
  }
}
