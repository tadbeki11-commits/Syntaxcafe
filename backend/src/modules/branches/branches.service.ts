import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import db from "../../db/drizzle";
import { branches } from "../../db/tables/branches.table";

@Injectable()
export class BranchesService {
  // branchId -> businessId, cached for the per-request membership check in the
  // tenant middleware (branch ownership never changes).
  private readonly ownerCache = new Map<string, string>();

  // businessId -> its first branch id, used as the fallback scope for owners
  // who haven't picked a branch yet via the switcher.
  private readonly firstBranchCache = new Map<string, string>();

  listForBusiness(businessId: string) {
    return db
      .select()
      .from(branches)
      .where(eq(branches.business_id, businessId))
      .orderBy(asc(branches.created_at));
  }

  async belongsToBusiness(
    branchId: string,
    businessId: string,
  ): Promise<boolean> {
    let owner = this.ownerCache.get(branchId);
    if (!owner) {
      const [row] = await db
        .select({ business_id: branches.business_id })
        .from(branches)
        .where(eq(branches.id, branchId))
        .limit(1);
      if (!row) return false;
      owner = row.business_id;
      this.ownerCache.set(branchId, owner);
    }
    return owner === businessId;
  }

  /**
   * The first (oldest) branch of a business. Used as the fallback scope for
   * owners who haven't selected a branch via the switcher yet, so reads/writes
   * still land in their own business. Returns null if the business has none.
   */
  async firstBranchId(businessId: string): Promise<string | null> {
    const cached = this.firstBranchCache.get(businessId);
    if (cached) return cached;
    const [row] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.business_id, businessId))
      .orderBy(asc(branches.created_at))
      .limit(1);
    if (!row) return null;
    this.firstBranchCache.set(businessId, row.id);
    return row.id;
  }
}
