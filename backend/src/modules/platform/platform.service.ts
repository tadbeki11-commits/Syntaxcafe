import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, count, desc, eq, sql, sum } from "drizzle-orm";
import { hash } from "bcryptjs";
import db from "../../db/drizzle";
import { businesses } from "../../db/tables/businesses.table";
import { branches } from "../../db/tables/branches.table";
import { branchDevices } from "../../db/tables/branch-devices.table";
import { users } from "../../db/tables/users.table";
import { orders } from "../../db/tables/orders.table";
import { platformAuditLogs } from "../../db/tables/platform-audit-logs.table";
import {
  DEFAULT_BRANCH_ID,
  DEFAULT_BUSINESS_ID,
  getTenant,
} from "../../common/tenant/tenant-context";

// How long without a heartbeat before a device counts as offline.
const DEVICE_ONLINE_WINDOW_MS = 5 * 60 * 1000;

interface AuditInput {
  action: string;
  target_type: "business" | "branch" | "user";
  target_id?: string | null;
  target_label?: string | null;
  business_id?: string | null;
  metadata?: Record<string, unknown>;
}

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

// Roles a super admin may provision under a business. Branch-scoped roles must
// be pinned to a branch; business-wide roles (owner/business_admin) carry no
// branch. Branch admins are pinned to a single branch (see users.table.ts) and
// sign in to the web dashboard scoped to that branch alone.
const BRANCH_SCOPED_ROLES = [
  "admin",
  "cashier",
  "kitchen_staff",
  "cafe_waiter",
] as const;
const BUSINESS_WIDE_ROLES = ["owner", "business_admin"] as const;
const ASSIGNABLE_ROLES = [
  ...BUSINESS_WIDE_ROLES,
  ...BRANCH_SCOPED_ROLES,
] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

// Revenue counts every order that wasn't cancelled/voided. total_amount is whole
// birr (see orders.table.ts); we coalesce nulls so the SUM never returns null.
const REVENUE_FILTER = sql`lower(coalesce(${orders.status}, '')) not in ('cancelled', 'canceled', 'voided', 'void')`;

const slugify = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// All platform queries run UNSCOPED (super admin sees every tenant). The
// PlatformGuard restricts these routes to scope === "platform".
@Injectable()
export class PlatformService {
  /** Append an entry to the super-admin audit trail. Never throws into the caller. */
  private async recordAudit(entry: AuditInput) {
    try {
      const actor = getTenant();
      await db.insert(platformAuditLogs).values({
        actor_user_id: actor?.userId ?? null,
        actor_username: actor?.username ?? null,
        action: entry.action,
        target_type: entry.target_type,
        target_id: entry.target_id ?? null,
        target_label: entry.target_label ?? null,
        business_id: entry.business_id ?? null,
        metadata: (entry.metadata ?? {}) as any,
      });
    } catch {
      // Auditing must not break the operation it records.
    }
  }

  async overview() {
    // Midnight today (server local time) for the "today" slice of orders/revenue.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      [biz],
      [activeBiz],
      [branchRows],
      [deviceRows],
      [userRows],
      [orderRows],
      [todayRows],
    ] = await Promise.all([
      db.select({ c: count() }).from(businesses),
      db
        .select({ c: count() })
        .from(businesses)
        .where(eq(businesses.is_active, true)),
      db.select({ c: count() }).from(branches),
      db.select({ c: count() }).from(branchDevices),
      db.select({ c: count() }).from(users),
      db
        .select({ c: count(), revenue: sum(orders.total_amount) })
        .from(orders)
        .where(REVENUE_FILTER),
      db
        .select({ c: count(), revenue: sum(orders.total_amount) })
        .from(orders)
        .where(
          and(REVENUE_FILTER, sql`${orders.created_at} >= ${startOfToday}`),
        ),
    ]);
    return {
      businesses: Number(biz.c),
      active_businesses: Number(activeBiz.c),
      branches: Number(branchRows.c),
      devices: Number(deviceRows.c),
      users: Number(userRows.c),
      orders: Number(orderRows.c),
      revenue: Number(orderRows.revenue ?? 0),
      orders_today: Number(todayRows.c),
      revenue_today: Number(todayRows.revenue ?? 0),
    };
  }

  async listBusinesses() {
    const [rows, branchCounts, userCounts, orderStats] = await Promise.all([
      db.select().from(businesses).orderBy(asc(businesses.created_at)),
      db
        .select({ business_id: branches.business_id, c: count() })
        .from(branches)
        .groupBy(branches.business_id),
      db
        .select({ business_id: users.business_id, c: count() })
        .from(users)
        .groupBy(users.business_id),
      db
        .select({
          business_id: orders.business_id,
          c: count(),
          revenue: sum(orders.total_amount),
        })
        .from(orders)
        .where(REVENUE_FILTER)
        .groupBy(orders.business_id),
    ]);

    const branchMap = new Map(
      branchCounts.map((r) => [r.business_id, Number(r.c)]),
    );
    const userMap = new Map(
      userCounts.map((r) => [r.business_id, Number(r.c)]),
    );
    const orderMap = new Map(
      orderStats.map((r) => [
        r.business_id,
        { orders: Number(r.c), revenue: Number(r.revenue ?? 0) },
      ]),
    );

    return rows.map((b) => ({
      ...b,
      branch_count: branchMap.get(b.id) ?? 0,
      user_count: userMap.get(b.id) ?? 0,
      order_count: orderMap.get(b.id)?.orders ?? 0,
      revenue: orderMap.get(b.id)?.revenue ?? 0,
    }));
  }

  async getBusiness(id: string) {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException("Business not found");

    const businessBranches = await db
      .select()
      .from(branches)
      .where(eq(branches.business_id, id))
      .orderBy(asc(branches.created_at));

    const [staff, [orderStats], [todayStats]] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          role: users.role,
          is_active: users.is_active,
          branch_id: users.branch_id,
          phone: users.phone,
          created_at: users.created_at,
        })
        .from(users)
        .where(eq(users.business_id, id))
        .orderBy(asc(users.created_at)),
      db
        .select({ c: count(), revenue: sum(orders.total_amount) })
        .from(orders)
        .where(and(eq(orders.business_id, id), REVENUE_FILTER)),
      (() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return db
          .select({ c: count(), revenue: sum(orders.total_amount) })
          .from(orders)
          .where(
            and(
              eq(orders.business_id, id),
              REVENUE_FILTER,
              sql`${orders.created_at} >= ${startOfToday}`,
            ),
          );
      })(),
    ]);

    const branchNameById = new Map(businessBranches.map((b) => [b.id, b.name]));
    const owner = business.owner_user_id
      ? staff.find((u) => u.id === business.owner_user_id) ?? null
      : null;

    return {
      ...business,
      branches: businessBranches,
      owner,
      users: staff.map((u) => ({
        ...u,
        branch_name: u.branch_id ? branchNameById.get(u.branch_id) ?? null : null,
      })),
      stats: {
        orders: Number(orderStats.c),
        revenue: Number(orderStats.revenue ?? 0),
        orders_today: Number(todayStats.c),
        revenue_today: Number(todayStats.revenue ?? 0),
        users: staff.length,
        branches: businessBranches.length,
      },
    };
  }

  /** Create a business and provision its initial owner account in one transaction. */
  async createBusiness(input: {
    name: string;
    slug?: string;
    plan?: string;
    max_branches?: number | null;
    owner: {
      name: string;
      username: string;
      password: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
  }) {
    const name = String(input?.name || "").trim();
    if (!name) throw new BadRequestException("Business name is required");
    if (!input?.owner?.username || !input?.owner?.password) {
      throw new BadRequestException("Owner username and password are required");
    }

    const slug = slugify(input.slug || name) || `business-${Date.now()}`;

    const [existing] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.slug, slug))
      .limit(1);
    if (existing) {
      throw new BadRequestException(`Business slug "${slug}" already exists`);
    }

    const passwordHash = await hash(input.owner.password, BCRYPT_ROUNDS);

    const result = await db.transaction(async (tx) => {
      const [business] = await tx
        .insert(businesses)
        .values({
          name,
          slug,
          plan: input.plan || "standard",
          max_branches: input.max_branches ?? null,
        })
        .returning();

      const [owner] = await tx
        .insert(users)
        .values({
          business_id: business.id,
          name: input.owner.name || input.owner.username,
          username: input.owner.username,
          password_hash: passwordHash,
          role: "owner",
          first_name: input.owner.first_name ?? null,
          last_name: input.owner.last_name ?? null,
          phone: input.owner.phone ?? null,
          is_active: true,
        })
        .returning();

      const [updated] = await tx
        .update(businesses)
        .set({ owner_user_id: owner.id, updated_at: new Date() })
        .where(eq(businesses.id, business.id))
        .returning();

      return {
        ...updated,
        owner: { id: owner.id, username: owner.username, name: owner.name },
      };
    });

    await this.recordAudit({
      action: "business.create",
      target_type: "business",
      target_id: result.id,
      target_label: result.name,
      business_id: result.id,
      metadata: { plan: result.plan, owner_username: result.owner.username },
    });
    return result;
  }

  async updateBusiness(
    id: string,
    patch: {
      name?: string;
      plan?: string;
      max_branches?: number | null;
      is_active?: boolean;
    },
  ) {
    const updates: Record<string, any> = { updated_at: new Date() };
    if (patch.name !== undefined) updates.name = String(patch.name).trim();
    if (patch.plan !== undefined) updates.plan = patch.plan;
    if (patch.max_branches !== undefined)
      updates.max_branches = patch.max_branches;
    if (patch.is_active !== undefined) updates.is_active = patch.is_active;

    const [updated] = await db
      .update(businesses)
      .set(updates)
      .where(eq(businesses.id, id))
      .returning();
    if (!updated) throw new NotFoundException("Business not found");

    const action =
      patch.is_active === true
        ? "business.activate"
        : patch.is_active === false
          ? "business.suspend"
          : "business.update";
    await this.recordAudit({
      action,
      target_type: "business",
      target_id: updated.id,
      target_label: updated.name,
      business_id: updated.id,
      metadata: { changes: patch },
    });
    return updated;
  }

  /** Create a branch under a business (respects the plan's max_branches limit). */
  async createBranch(
    businessId: string,
    input: { name: string; slug?: string; parent_branch_id?: string | null },
  ) {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    if (!business) throw new NotFoundException("Business not found");

    const name = String(input?.name || "").trim();
    if (!name) throw new BadRequestException("Branch name is required");

    if (business.max_branches != null) {
      const [{ c }] = await db
        .select({ c: count() })
        .from(branches)
        .where(eq(branches.business_id, businessId));
      if (Number(c) >= business.max_branches) {
        throw new BadRequestException(
          `Branch limit reached for this plan (max ${business.max_branches})`,
        );
      }
    }

    const slug = slugify(input.slug || name) || `branch-${Date.now()}`;
    const [branch] = await db
      .insert(branches)
      .values({
        business_id: businessId,
        name,
        slug,
        parent_branch_id: input.parent_branch_id ?? null,
      })
      .returning();

    await this.recordAudit({
      action: "branch.create",
      target_type: "branch",
      target_id: branch.id,
      target_label: branch.name,
      business_id: businessId,
    });
    return branch;
  }

  /**
   * Hard-delete a business and everything constrained to it. FK cascades remove
   * its branches and devices; users are deleted explicitly (their FK is SET NULL,
   * which would otherwise leave orphaned, tenant-less accounts).
   */
  async deleteBusiness(id: string) {
    if (id === DEFAULT_BUSINESS_ID) {
      throw new BadRequestException(
        "The default business cannot be deleted; it is the offline app's fallback tenant.",
      );
    }

    const [business] = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!business) throw new NotFoundException("Business not found");

    await db.transaction(async (tx) => {
      await tx.delete(users).where(eq(users.business_id, id));
      // branches + branch_devices cascade from the businesses FK.
      await tx.delete(businesses).where(eq(businesses.id, id));
    });

    await this.recordAudit({
      action: "business.delete",
      target_type: "business",
      target_id: id,
      target_label: business.name,
      business_id: id,
    });
    return { id, deleted: true };
  }

  /** Hard-delete a single branch (its devices cascade away; child branches detach). */
  async deleteBranch(businessId: string, branchId: string) {
    if (branchId === DEFAULT_BRANCH_ID) {
      throw new BadRequestException(
        "The default branch cannot be deleted; it is the offline app's fallback tenant.",
      );
    }

    const [branch] = await db
      .select({
        id: branches.id,
        name: branches.name,
        business_id: branches.business_id,
      })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);
    if (!branch || branch.business_id !== businessId) {
      throw new NotFoundException("Branch not found for this business");
    }

    await db.delete(branches).where(eq(branches.id, branchId));

    await this.recordAudit({
      action: "branch.delete",
      target_type: "branch",
      target_id: branchId,
      target_label: branch.name,
      business_id: businessId,
    });
    return { id: branchId, deleted: true };
  }

  /**
   * Every user across the platform, divided by business and listing each
   * business's branches. Users carry no branch link, so they are grouped at the
   * business level; tenant-less accounts (platform admins) land in their own group.
   */
  async listAllUsers() {
    const [businessRows, branchRows, userRows] = await Promise.all([
      db.select().from(businesses).orderBy(asc(businesses.created_at)),
      db.select().from(branches).orderBy(asc(branches.created_at)),
      db
        .select({
          id: users.id,
          business_id: users.business_id,
          branch_id: users.branch_id,
          name: users.name,
          username: users.username,
          role: users.role,
          is_active: users.is_active,
          created_at: users.created_at,
        })
        .from(users)
        .orderBy(asc(users.created_at)),
    ]);

    const branchNameById = new Map(branchRows.map((br) => [br.id, br.name]));
    const withBranchName = userRows.map((u) => ({
      ...u,
      branch_name: u.branch_id ? branchNameById.get(u.branch_id) ?? null : null,
    }));

    const branchesByBusiness = new Map<string, typeof branchRows>();
    for (const br of branchRows) {
      const list = branchesByBusiness.get(br.business_id) ?? [];
      list.push(br);
      branchesByBusiness.set(br.business_id, list);
    }

    const usersByBusiness = new Map<string | null, typeof withBranchName>();
    for (const u of withBranchName) {
      const key = u.business_id ?? null;
      const list = usersByBusiness.get(key) ?? [];
      list.push(u);
      usersByBusiness.set(key, list);
    }

    const groups = businessRows.map((b) => ({
      business: {
        id: b.id,
        name: b.name,
        slug: b.slug,
        plan: b.plan,
        is_active: b.is_active,
      },
      branches: (branchesByBusiness.get(b.id) ?? []).map((br) => ({
        id: br.id,
        name: br.name,
        slug: br.slug,
        is_active: br.is_active,
      })),
      users: usersByBusiness.get(b.id) ?? [],
    }));

    const orphans = usersByBusiness.get(null) ?? [];
    if (orphans.length > 0) {
      groups.push({ business: null as any, branches: [], users: orphans });
    }

    return { groups, total_users: userRows.length };
  }

  /**
   * Reset any user's password to a new value. Super-admin only — no knowledge of
   * the current password is required. The new hash overwrites password_hash and
   * the action is recorded in the audit trail (never the password itself).
   */
  async resetUserPassword(userId: string, newPassword: string) {
    const password = String(newPassword || "");
    if (password.length < 4) {
      throw new BadRequestException(
        "Password must be at least 4 characters long",
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        business_id: users.business_id,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");

    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    await db
      .update(users)
      .set({ password_hash: passwordHash, updated_at: new Date() })
      .where(eq(users.id, userId));

    await this.recordAudit({
      action: "user.reset_password",
      target_type: "user",
      target_id: user.id,
      target_label: user.username ?? user.name,
      business_id: user.business_id,
    });

    return { id: user.id, reset: true };
  }

  /**
   * Provision a staff/owner account under a specific business (and branch, for
   * branch-scoped roles). Super-admin only. Mirrors the uniqueness rules the
   * users table enforces: branch-scoped staff are unique within their branch,
   * business-wide accounts within their business.
   */
  async createUser(input: {
    business_id: string;
    branch_id?: string | null;
    name?: string;
    username: string;
    password: string;
    role: string;
    phone?: string;
  }) {
    const username = String(input?.username || "").trim();
    const password = String(input?.password || "");
    const role = String(input?.role || "").trim() as AssignableRole;

    if (!username) throw new BadRequestException("Username is required");
    if (password.length < 4) {
      throw new BadRequestException(
        "Password must be at least 4 characters long",
      );
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new BadRequestException(
        `Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
      );
    }

    const [business] = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, input.business_id))
      .limit(1);
    if (!business) throw new NotFoundException("Business not found");

    const branchScoped = (BRANCH_SCOPED_ROLES as readonly string[]).includes(
      role,
    );
    let branchId: string | null = null;
    let branchName: string | null = null;

    if (branchScoped) {
      if (!input.branch_id) {
        throw new BadRequestException(
          `A branch is required for the "${role}" role`,
        );
      }
      const [branch] = await db
        .select({ id: branches.id, name: branches.name, business_id: branches.business_id })
        .from(branches)
        .where(eq(branches.id, input.branch_id))
        .limit(1);
      if (!branch || branch.business_id !== business.id) {
        throw new NotFoundException("Branch not found for this business");
      }
      branchId = branch.id;
      branchName = branch.name;
    }

    // Reject duplicate usernames within the same scope before hitting the DB
    // constraint, so the caller gets a clean message instead of a 500.
    const dupConditions = branchId
      ? and(eq(users.branch_id, branchId), eq(users.username, username))
      : and(eq(users.business_id, business.id), eq(users.username, username));
    const [dup] = await db
      .select({ id: users.id })
      .from(users)
      .where(dupConditions)
      .limit(1);
    if (dup) {
      throw new BadRequestException(
        `Username "${username}" is already taken in this ${branchId ? "branch" : "business"}`,
      );
    }

    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    const [created] = await db
      .insert(users)
      .values({
        business_id: business.id,
        branch_id: branchId,
        name: String(input.name || username).trim(),
        username,
        password_hash: passwordHash,
        role,
        phone: input.phone ?? null,
        is_active: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
        is_active: users.is_active,
        branch_id: users.branch_id,
        business_id: users.business_id,
      });

    await this.recordAudit({
      action: "user.create",
      target_type: "user",
      target_id: created.id,
      target_label: created.username ?? created.name,
      business_id: business.id,
      metadata: { role, branch_id: branchId, branch_name: branchName },
    });

    return { ...created, branch_name: branchName };
  }

  /** Enable or disable a user account (suspend without deleting). */
  async setUserActive(userId: string, isActive: boolean) {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        business_id: users.business_id,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");

    await db
      .update(users)
      .set({ is_active: isActive, updated_at: new Date() })
      .where(eq(users.id, userId));

    await this.recordAudit({
      action: isActive ? "user.activate" : "user.deactivate",
      target_type: "user",
      target_id: user.id,
      target_label: user.username ?? user.name,
      business_id: user.business_id,
    });
    return { id: user.id, is_active: isActive };
  }

  /** Hard-delete a user account. */
  async deleteUser(userId: string) {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
        business_id: users.business_id,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");
    if (user.role === "super_admin") {
      throw new BadRequestException("Platform super admins cannot be deleted here");
    }

    await db.delete(users).where(eq(users.id, userId));

    await this.recordAudit({
      action: "user.delete",
      target_type: "user",
      target_id: user.id,
      target_label: user.username ?? user.name,
      business_id: user.business_id,
    });
    return { id: user.id, deleted: true };
  }

  /** Recent super-admin audit entries, newest first. */
  async listAudit(limit = 200) {
    const rows = await db
      .select()
      .from(platformAuditLogs)
      .orderBy(desc(platformAuditLogs.created_at))
      .limit(Math.min(Math.max(limit, 1), 500));
    return { logs: rows };
  }

  /**
   * Every enrolled device across the platform with its business/branch and a
   * computed online flag (heartbeat within the last few minutes).
   */
  async listDevices() {
    const rows = await db
      .select({
        id: branchDevices.id,
        name: branchDevices.name,
        status: branchDevices.status,
        last_seen_at: branchDevices.last_seen_at,
        created_at: branchDevices.created_at,
        business_id: branchDevices.business_id,
        business_name: businesses.name,
        branch_id: branchDevices.branch_id,
        branch_name: branches.name,
      })
      .from(branchDevices)
      .leftJoin(businesses, eq(branchDevices.business_id, businesses.id))
      .leftJoin(branches, eq(branchDevices.branch_id, branches.id))
      .orderBy(desc(branchDevices.last_seen_at));

    const now = Date.now();
    const devices = rows.map((d) => ({
      ...d,
      online:
        d.last_seen_at != null &&
        now - new Date(d.last_seen_at).getTime() < DEVICE_ONLINE_WINDOW_MS,
    }));

    return {
      devices,
      online_count: devices.filter((d) => d.online).length,
      total: devices.length,
    };
  }
}
