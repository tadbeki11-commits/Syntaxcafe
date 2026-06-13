import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { asc, count, eq, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import db from "../../db/drizzle";
import { businesses } from "../../db/tables/businesses.table";
import { branches } from "../../db/tables/branches.table";
import { branchDevices } from "../../db/tables/branch-devices.table";
import { users } from "../../db/tables/users.table";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

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
  async overview() {
    const [[biz], [activeBiz], [branchRows], [deviceRows]] = await Promise.all([
      db.select({ c: count() }).from(businesses),
      db
        .select({ c: count() })
        .from(businesses)
        .where(eq(businesses.is_active, true)),
      db.select({ c: count() }).from(branches),
      db.select({ c: count() }).from(branchDevices),
    ]);
    return {
      businesses: Number(biz.c),
      active_businesses: Number(activeBiz.c),
      branches: Number(branchRows.c),
      devices: Number(deviceRows.c),
    };
  }

  async listBusinesses() {
    const rows = await db
      .select()
      .from(businesses)
      .orderBy(asc(businesses.created_at));

    const branchCounts = await db
      .select({ business_id: branches.business_id, c: count() })
      .from(branches)
      .groupBy(branches.business_id);
    const branchMap = new Map(
      branchCounts.map((r) => [r.business_id, Number(r.c)]),
    );

    return rows.map((b) => ({
      ...b,
      branch_count: branchMap.get(b.id) ?? 0,
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

    const owner = business.owner_user_id
      ? (
          await db
            .select({
              id: users.id,
              name: users.name,
              username: users.username,
              role: users.role,
              is_active: users.is_active,
            })
            .from(users)
            .where(eq(users.id, business.owner_user_id))
            .limit(1)
        )[0]
      : null;

    return { ...business, branches: businessBranches, owner };
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

    return db.transaction(async (tx) => {
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
    return branch;
  }
}
