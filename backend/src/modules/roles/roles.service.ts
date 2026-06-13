import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { roles as rolesTable } from "../../db/schema";
import { hash, compare } from "bcryptjs";

@Injectable()
export class RolesService {
  async findAll(): Promise<any[]> {
    return db.select().from(rolesTable).orderBy(rolesTable.display_name);
  }

  async findById(id: string): Promise<any> {
    const [row] = await db.select().from(rolesTable).where(eq(rolesTable.id, id));
    return row || null;
  }

  async findByName(name: string): Promise<any> {
    const [row] = await db.select().from(rolesTable).where(eq(rolesTable.name, name));
    return row || null;
  }

  async create(data: any): Promise<any> {
    const [created] = await db
      .insert(rolesTable)
      .values({
        name: data.name,
        display_name: data.display_name,
        description: data.description ?? null,
        is_active: data.is_active !== false,
      })
      .returning();
    return created;
  }

  async update(id: string, data: any): Promise<any> {
    const [updated] = await db
      .update(rolesTable)
      .set({
        name: data.name,
        display_name: data.display_name,
        description: data.description,
        is_active: data.is_active,
        updated_at: new Date(),
      })
      .where(eq(rolesTable.id, id))
      .returning();
    if (!updated) throw new Error("Role not found");
    return updated;
  }

  async delete(id: string): Promise<any> {
    const [deleted] = await db
      .update(rolesTable)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(rolesTable.id, id))
      .returning();
    if (!deleted) throw new Error("Role not found");
    return deleted;
  }

  async hardDelete(id: string): Promise<void> {
    const result = await db.delete(rolesTable).where(eq(rolesTable.id, id));
    // Check affected rows
    if (result.rowCount === 0) throw new Error("Role not found");
  }
}
