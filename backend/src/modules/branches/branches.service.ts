import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import db from "../../db/drizzle";
import { branches } from "../../db/tables/branches.table";

@Injectable()
export class BranchesService {
  // branchId -> businessId, cached for the per-request membership check in the
  // tenant middleware (branch ownership never changes).
  private readonly ownerCache = new Map<string, string>();

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
}
