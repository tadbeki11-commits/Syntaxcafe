import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { diningTables } from "../../db/schema";
import { requireBranchId, tenantInsert } from "../../common/tenant/tenant-context";

@Injectable()
export class TablesService {
  async findAll() {
    return db
      .select()
      .from(diningTables)
      .where(eq(diningTables.branch_id, requireBranchId()))
      .orderBy(asc(diningTables.table_number));
  }

  async findById(id: string) {
    const [row] = await db
      .select()
      .from(diningTables)
      .where(and(eq(diningTables.id, id), eq(diningTables.branch_id, requireBranchId())))
      .limit(1);
    if (!row) throw new NotFoundException("Table not found");
    return row;
  }

  async create(payload: any) {
    const tableNumber = Number(payload?.table_number ?? payload?.number);
    if (!tableNumber || tableNumber < 1)
      throw new BadRequestException("Valid table_number is required");

    const [created] = await db
      .insert(diningTables)
      .values({
        ...tenantInsert(),
        id: payload?.id,
        table_number: tableNumber,
        status: payload?.status ?? "available",
      })
      .returning();

    return created;
  }

  async update(id: string, payload: any) {
    await this.findById(id);
    const updates: Record<string, any> = { updated_at: new Date() };

    if (payload?.table_number !== undefined) {
      const n = Number(payload.table_number);
      if (!n || n < 1) throw new BadRequestException("Valid table_number is required");
      updates.table_number = n;
    }

    if (payload?.status !== undefined) {
      updates.status = String(payload.status);
    }

    const [updated] = await db
      .update(diningTables)
      .set(updates)
      .where(and(eq(diningTables.id, id), eq(diningTables.branch_id, requireBranchId())))
      .returning();

    if (!updated) throw new NotFoundException("Table not found");
    return updated;
  }

  async remove(id: string) {
    const [deleted] = await db
      .delete(diningTables)
      .where(and(eq(diningTables.id, id), eq(diningTables.branch_id, requireBranchId())))
      .returning();
    if (!deleted) throw new NotFoundException("Table not found");
    return deleted;
  }

  async syncBulk(tables: any[]) {
    const idMapping: Record<string, string> = {};

    for (const t of tables) {
      const tableNumber = Number(t?.table_number ?? t?.number);
      if (!tableNumber || tableNumber < 1) continue;

      const targetId = t.id;
      if (targetId) {
        try {
          await this.update(String(targetId), t);
        } catch {
          await this.create({ ...t, id: String(targetId) });
        }
      } else {
        await this.create(t);
      }
    }

    return idMapping;
  }
}
