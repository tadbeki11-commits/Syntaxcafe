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

  /**
   * Owner/platform mints a one-time enrollment code for a branch. The plaintext
   * code is returned once; only its hash is stored.
   */
  async createEnrollmentCode(branchId: string, name?: string) {
    const tenant = getTenant();
    if (!tenant || (tenant.scope !== "owner" && tenant.scope !== "platform")) {
      throw new ForbiddenException(
        "Only an owner or platform admin can enroll devices.",
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

    const code = randomBytes(6).toString("hex").toUpperCase(); // 12 chars
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const [device] = await db
      .insert(branchDevices)
      .values({
        business_id: branch.business_id,
        branch_id: branch.id,
        name: name ?? null,
        code_hash: sha256(code),
        code_expires_at: expiresAt,
        status: "pending",
      })
      .returning();

    return {
      device_id: device.id,
      branch_id: branch.id,
      code,
      expires_at: expiresAt,
    };
  }

  /**
   * A device redeems an enrollment code for a long-lived token. Public endpoint:
   * possession of a valid, unexpired code is the credential.
   */
  async enroll(code: string, deviceName?: string) {
    if (!code) throw new BadRequestException("Enrollment code is required");

    const [device] = await db
      .select()
      .from(branchDevices)
      .where(
        and(
          eq(branchDevices.code_hash, sha256(code.trim().toUpperCase())),
          eq(branchDevices.status, "pending"),
        ),
      )
      .limit(1);

    if (!device) throw new BadRequestException("Invalid enrollment code");
    if (device.code_expires_at && device.code_expires_at < new Date()) {
      throw new BadRequestException("Enrollment code has expired");
    }

    const token = randomBytes(32).toString("hex"); // 64 chars
    await db
      .update(branchDevices)
      .set({
        token_hash: sha256(token),
        code_hash: null,
        code_expires_at: null,
        status: "active",
        name: deviceName ?? device.name,
        last_seen_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(branchDevices.id, device.id));

    return {
      token,
      business_id: device.business_id,
      branch_id: device.branch_id,
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
