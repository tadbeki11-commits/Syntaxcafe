import { ForbiddenException, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { role_permissions } from "../../db/schema";
import { getTenant, requireBusinessId } from "../../common/tenant/tenant-context";
import {
  CONFIGURABLE_ROLES,
  PermissionMatrix,
  allAllowedMatrix,
  isAllAccessRole,
  withDefaults,
} from "../../common/permissions/permissions.constants";

@Injectable()
export class RolePermissionsService {
  /** Raw stored matrix for a role in the current business, or null if unset. */
  private async storedFor(role: string): Promise<PermissionMatrix | null> {
    const [row] = await db
      .select()
      .from(role_permissions)
      .where(
        and(
          eq(role_permissions.business_id, requireBusinessId()),
          eq(role_permissions.role, role),
        ),
      )
      .limit(1);
    return (row?.permissions as PermissionMatrix) ?? null;
  }

  /** Effective matrix for an explicit role (all-access roles → everything). */
  async getEffective(role?: string | null): Promise<PermissionMatrix> {
    if (isAllAccessRole(role)) return allAllowedMatrix();
    if (!role) return allAllowedMatrix();
    return withDefaults(await this.storedFor(role));
  }

  /** Effective matrix for the signed-in user (drives the web nav/guard). */
  async getMine(): Promise<{ role: string | null; permissions: PermissionMatrix }> {
    const t = getTenant();
    const role = t?.role ?? null;
    // Platform/owner scopes are always full-access regardless of role string.
    if (t?.scope === "platform" || t?.scope === "owner" || isAllAccessRole(role)) {
      return { role, permissions: allAllowedMatrix() };
    }
    return { role, permissions: await this.getEffective(role) };
  }

  /** Every configurable role's matrix for the business — for the editor. */
  async list(): Promise<{ role: string; permissions: PermissionMatrix }[]> {
    const rows = await db
      .select()
      .from(role_permissions)
      .where(eq(role_permissions.business_id, requireBusinessId()));
    const byRole = new Map(
      rows.map((r) => [r.role, r.permissions as PermissionMatrix]),
    );
    return CONFIGURABLE_ROLES.map((role) => ({
      role,
      permissions: withDefaults(byRole.get(role) ?? null),
    }));
  }

  /** Upsert a role's matrix. Owner / business_admin / super_admin only. */
  async upsert(role: string, permissions: PermissionMatrix): Promise<PermissionMatrix> {
    const t = getTenant();
    const canEdit =
      t?.scope === "platform" || t?.scope === "owner" || isAllAccessRole(t?.role);
    if (!canEdit) {
      throw new ForbiddenException("Only the owner can configure role permissions.");
    }
    if (!CONFIGURABLE_ROLES.includes(role as (typeof CONFIGURABLE_ROLES)[number])) {
      throw new ForbiddenException(`Role "${role}" is not configurable.`);
    }
    const clean = withDefaults(permissions);
    const business_id = requireBusinessId();
    await db
      .insert(role_permissions)
      .values({ business_id, role, permissions: clean })
      .onConflictDoUpdate({
        target: [role_permissions.business_id, role_permissions.role],
        set: { permissions: clean, updated_at: new Date() },
      });
    return clean;
  }
}
