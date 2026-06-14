import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { inventoryItems, stockLocations, inventoryStock } from "../../db/schema";
import { emitSyncEvent } from "../sync/sync-event.emitter";
import { requireBranchId, tenantInsert } from "../../common/tenant/tenant-context";

const slugify = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const LOCATION_TYPES = new Set([
  "storage",
  "prep_station",
  "retail",
  "cold_storage",
]);

@Injectable()
export class StockLocationsService {
  private locationPayload(row: typeof stockLocations.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      location_type: row.location_type,
      is_default: row.is_default,
      is_active: row.is_active,
      display_order: row.display_order,
      linked_main_category_slug: row.linked_main_category_slug,
      meta: row.meta,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    };
  }

  async findAll(includeInactive = false) {
    if (includeInactive) {
      return db
        .select()
        .from(stockLocations)
        .where(eq(stockLocations.branch_id, requireBranchId()))
        .orderBy(
          asc(stockLocations.display_order),
          asc(stockLocations.name),
        );
    }

    return db
      .select()
      .from(stockLocations)
      .where(
        and(
          eq(stockLocations.branch_id, requireBranchId()),
          eq(stockLocations.is_active, true),
        ),
      )
      .orderBy(
        asc(stockLocations.display_order),
        asc(stockLocations.name),
      );
  }

  async findById(id: string) {
    console.log(id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundException("Stock location not found");
    }
    const [row] = await db
      .select()
      .from(stockLocations)
      .where(and(eq(stockLocations.id, id), eq(stockLocations.branch_id, requireBranchId())))
      .limit(1);
    if (!row) throw new NotFoundException("Stock location not found");
    return row;
  }

  async create(payload: any) {
    const name = String(payload?.name || "").trim();
    if (!name) throw new BadRequestException("Location name is required");

    const slug = slugify(payload?.slug || name);
    if (!slug) throw new BadRequestException("Location slug is required");

    const locationType = LOCATION_TYPES.has(payload?.location_type)
      ? payload.location_type
      : "storage";

    const branchId = requireBranchId();
    const [existing] = await db
      .select({ id: stockLocations.id })
      .from(stockLocations)
      .where(and(eq(stockLocations.slug, slug), eq(stockLocations.branch_id, branchId)))
      .limit(1);
    if (existing) {
      throw new BadRequestException(`Location slug "${slug}" already exists`);
    }

    const isDefault = payload?.is_default === true;

    return db.transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(stockLocations)
          .set({ is_default: false, updated_at: new Date() })
          .where(and(eq(stockLocations.is_default, true), eq(stockLocations.branch_id, branchId)));
      }

      const [created] = await tx
        .insert(stockLocations)
        .values({
          ...tenantInsert(),
          ...(payload.id ? { id: payload.id } : {}),
          name,
          slug,
          description: payload?.description?.trim() || null,
          location_type: locationType,
          is_default: isDefault,
          is_active: payload?.is_active !== false,
          display_order: Number(payload?.display_order ?? 0) || 0,
          linked_main_category_slug:
            payload?.linked_main_category_slug?.trim() || null,
          meta: {},
        })
        .returning();

      if (!created.is_default) {
        const [defaultRow] = await tx
          .select({ id: stockLocations.id })
          .from(stockLocations)
          .where(and(eq(stockLocations.is_default, true), eq(stockLocations.branch_id, branchId)))
          .limit(1);
        if (!defaultRow) {
          const [promoted] = await tx
            .update(stockLocations)
            .set({ is_default: true, updated_at: new Date() })
            .where(and(eq(stockLocations.id, created.id), eq(stockLocations.branch_id, branchId)))
            .returning();
          if (promoted) Object.assign(created, promoted);
          created.is_default = true;
        }
      }

      await emitSyncEvent(tx, {
        eventType: "STOCK_LOCATION_CREATED",
        entityType: "stock_location",
        entityId: created.id,
        operation: "create",
        payload: this.locationPayload(created),
        version: created.version,
      });

      return created;
    });
  }

  async update(id: string, payload: any) {
    const branchId = requireBranchId();
    const current = await this.findById(id);
    const updates: Record<string, any> = {
      updated_at: new Date(),
      version: (current.version ?? 1) + 1,
    };

    if (payload?.name !== undefined) {
      const name = String(payload.name).trim();
      if (!name) throw new BadRequestException("Location name is required");
      updates.name = name;
    }

    if (payload?.slug !== undefined) {
      const slug = slugify(payload.slug);
      if (!slug) throw new BadRequestException("Location slug is required");
      const [conflict] = await db
        .select({ id: stockLocations.id })
        .from(stockLocations)
        .where(
          and(
            eq(stockLocations.slug, slug),
            ne(stockLocations.id, id),
            eq(stockLocations.branch_id, branchId),
          ),
        )
        .limit(1);
      if (conflict) {
        throw new BadRequestException(`Location slug "${slug}" already exists`);
      }
      updates.slug = slug;
    }

    if (payload?.description !== undefined) {
      updates.description = payload.description?.trim() || null;
    }

    if (payload?.location_type !== undefined) {
      if (!LOCATION_TYPES.has(payload.location_type)) {
        throw new BadRequestException("Invalid location type");
      }
      updates.location_type = payload.location_type;
    }

    if (payload?.display_order !== undefined) {
      updates.display_order = Number(payload.display_order) || 0;
    }

    if (payload?.linked_main_category_slug !== undefined) {
      updates.linked_main_category_slug =
        payload.linked_main_category_slug?.trim() || null;
    }

    if (payload?.is_active !== undefined) {
      updates.is_active = payload.is_active !== false;
    }

    const wantsDefault = payload?.is_default === true;
    const clearingDefault =
      payload?.is_default === false && current.is_default === true;

    if (clearingDefault) {
      const [otherDefault] = await db
        .select({ id: stockLocations.id })
        .from(stockLocations)
        .where(
          and(
            eq(stockLocations.is_default, true),
            ne(stockLocations.id, id),
            eq(stockLocations.branch_id, branchId),
          ),
        )
        .limit(1);
      if (!otherDefault) {
        throw new BadRequestException(
          "Assign another default location before removing the default flag",
        );
      }
      updates.is_default = false;
    }

    return db.transaction(async (tx) => {
      if (wantsDefault) {
        await tx
          .update(stockLocations)
          .set({ is_default: false, updated_at: new Date() })
          .where(and(eq(stockLocations.is_default, true), eq(stockLocations.branch_id, branchId)));
        updates.is_default = true;
      }

      const [updated] = await tx
        .update(stockLocations)
        .set(updates)
        .where(and(eq(stockLocations.id, id), eq(stockLocations.branch_id, branchId)))
        .returning();

      if (!updated) throw new NotFoundException("Stock location not found");

      await emitSyncEvent(tx, {
        eventType: "STOCK_LOCATION_UPDATED",
        entityType: "stock_location",
        entityId: updated.id,
        operation: "update",
        payload: this.locationPayload(updated),
        version: updated.version,
      });

      return updated;
    });
  }

  async deactivate(id: string) {
    const current = await this.findById(id);

    const stockQty = await this.getStockQuantityForLocation(id);
    if (stockQty > 0) {
      throw new BadRequestException(
        `Cannot deactivate "${current.name}" while it holds stock (${stockQty} units). Transfer stock out first.`,
      );
    }

    if (current.is_default) {
      throw new BadRequestException(
        "Cannot deactivate the default location. Assign another default first.",
      );
    }

    const [updated] = await db
      .update(stockLocations)
      .set({
        is_active: false,
        updated_at: new Date(),
        version: (current.version ?? 1) + 1,
      })
      .where(and(eq(stockLocations.id, id), eq(stockLocations.branch_id, requireBranchId())))
      .returning();

    if (updated) {
      await emitSyncEvent(db, {
        eventType: "STOCK_LOCATION_DEACTIVATED",
        entityType: "stock_location",
        entityId: updated.id,
        operation: "update",
        payload: this.locationPayload(updated),
        version: updated.version,
      });
    }

    return updated;
  }

  async getStockAtLocation(id: string) {
    const location = await this.findById(id);
    const stockRows = await db
      .select({
        inventory_item_id: inventoryStock.inventory_item_id,
        name: inventoryItems.name,
        unit: inventoryItems.base_unit,
        quantity: inventoryStock.quantity,
      })
      .from(inventoryStock)
      .innerJoin(inventoryItems, eq(inventoryStock.inventory_item_id, inventoryItems.id))
      .where(
        and(
          eq(inventoryStock.location_id, id),
          eq(inventoryStock.branch_id, requireBranchId()),
        ),
      );

    return { location, stock: stockRows, count: stockRows.length };
  }

  private async getStockQuantityForLocation(id: string) {
    const [row] = await db
      .select({
        total: sql<number>`COALESCE(sum(quantity), 0)`,
      })
      .from(inventoryStock)
      .where(
        and(
          eq(inventoryStock.location_id, id),
          eq(inventoryStock.branch_id, requireBranchId()),
        ),
      );
    return row ? Number(row.total) : 0;
  }
}
