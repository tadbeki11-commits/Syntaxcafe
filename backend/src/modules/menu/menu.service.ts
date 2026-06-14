import { Injectable } from "@nestjs/common";
import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../../db/drizzle";
import { categories } from "../../db/tables/categories.table";
import { mainCategories } from "../../db/tables/main-categories.table";
import { menuItemCategories } from "../../db/tables/menu-item-categories.table";
import { menuItems } from "../../db/tables/menu-items.table";
import { emitCreated, emitDeleted, emitUpdated } from "../sync/sync-emit.util";
import { requireBranchId, tenantInsert } from "../../common/tenant/tenant-context";

const slugify = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

const asCategoryInputs = (menuData: any) => {
  const raw = Array.isArray(menuData.categories) ? menuData.categories : [];
  const categoryInputs = raw
    .map((entry: any) => {
      if (typeof entry === "string") return { name: entry };
      if (entry?.name || entry?.slug || entry?.id) return entry;
      return null;
    })
    .filter(Boolean);

  if (categoryInputs.length === 0 && menuData.category) {
    categoryInputs.push({
      name: menuData.category,
      slug: slugify(menuData.category),
      type: menuData.category_type || "main",
    });
  }

  return categoryInputs;
};

@Injectable()
export class MenuService {
  async create(menuData: any) {
    return db.transaction(async (tx) => {
      const categoryInputs = asCategoryInputs(menuData);
      const legacyCategory =
        menuData.category ??
        categoryInputs.find((category: any) => category?.type !== "tag")
          ?.slug ??
        categoryInputs[0]?.slug ??
        null;

      const [created] = await tx
        .insert(menuItems)
        .values({
          ...tenantInsert(),
          ...(menuData.id ? { id: menuData.id } : {}),
          name: menuData.name,
          description: menuData.description ?? null,
          price: menuData.price ?? null,
          category: legacyCategory,
          main_category: menuData.main_category ?? null,
          type: menuData.type ?? "cafe",
          is_available: menuData.is_available ?? true,
          image_url: menuData.image_url ?? menuData.image ?? null,
          prep_time_minutes: menuData.prep_time_minutes ?? 0,
          sku: menuData.sku ?? null,
          barcode: menuData.barcode ?? null,
        })
        .returning();

      await this.replaceMenuItemCategories(tx, created.id, categoryInputs);
      const full = await this.findById(created.id);
      if (full) {
        await emitCreated(tx, "menu_item", "MENU_ITEM_CREATED", full as any);
      }
      return full;
    });
  }

  async syncBulk(items: any[]) {
    if (!items || items.length === 0) return {};

    const updatedIds: string[] = [];
    const createdIds: string[] = [];

    await db.transaction(async (tx) => {
      for (const item of items) {
        const categoryInputs = asCategoryInputs(item);
        const [existing] = item.id
          ? await tx
              .select({ id: menuItems.id })
              .from(menuItems)
              .where(and(eq(menuItems.id, item.id), eq(menuItems.branch_id, requireBranchId())))
              .limit(1)
          : [];

        if (existing) {
          // Update existing
          await tx
            .update(menuItems)
            .set({
              name: item.name,
              description: item.description ?? null,
              price: item.price ?? null,
              category: item.category ?? null,
              main_category: item.main_category ?? null,
              type: item.type ?? null,
              is_available: item.is_available === 1 || item.is_available === true,
              image_url: item.image_url ?? null,
              prep_time_minutes: item.prep_time_minutes ?? 0,
              sku: item.sku ?? null,
              barcode: item.barcode ?? null,
              updated_at: new Date()
            })
            .where(and(eq(menuItems.id, item.id), eq(menuItems.branch_id, requireBranchId())));
          await this.replaceMenuItemCategories(tx, item.id, categoryInputs);
          updatedIds.push(item.id);
        } else {
          // Create new
          const [created] = await tx
            .insert(menuItems)
            .values({
              ...tenantInsert(),
              ...(item.id ? { id: item.id } : {}),
              name: item.name,
              description: item.description ?? null,
              price: item.price ?? null,
              category: item.category ?? null,
              main_category: item.main_category ?? null,
              type: item.type ?? null,
              is_available: item.is_available === 1 || item.is_available === true,
              image_url: item.image_url ?? null,
              prep_time_minutes: item.prep_time_minutes ?? 0,
              sku: item.sku ?? null,
              barcode: item.barcode ?? null,
            })
            .returning();
          await this.replaceMenuItemCategories(tx, created.id, categoryInputs);
          createdIds.push(created.id);
        }
      }
    });

    for (const id of updatedIds) {
      const full = await this.findById(id);
      if (full) {
        await emitUpdated(db, "menu_item", "MENU_ITEM_UPDATED", full as any);
      }
    }
    for (const id of createdIds) {
      const full = await this.findById(id);
      if (full) {
        await emitCreated(db, "menu_item", "MENU_ITEM_CREATED", full as any);
      }
    }

    return {};
  }

  async findById(id: string) {
    const rows = await db
      .select({ item: menuItems, category: categories })
      .from(menuItems)
      .leftJoin(
        menuItemCategories,
        eq(menuItems.id, menuItemCategories.menu_item_id),
      )
      .leftJoin(categories, eq(menuItemCategories.category_id, categories.id))
      .where(and(eq(menuItems.id, id), eq(menuItems.branch_id, requireBranchId())))
      .orderBy(asc(categories.display_order), asc(categories.name));

    return this.hydrateMenuItems(rows)[0];
  }

  async findAll(filters: any = {}) {
    const conditions = [eq(menuItems.branch_id, requireBranchId())] as any[];
    if (filters.type) conditions.push(eq(menuItems.type, filters.type));
    if (filters.is_available !== undefined) {
      conditions.push(
        eq(
          menuItems.is_available,
          filters.is_available === true || filters.is_available === "true",
        ),
      );
    }
    if (filters.search) {
      const query = `%${String(filters.search).trim()}%`;
      conditions.push(
        sql`(${menuItems.name} ILIKE ${query} OR ${menuItems.description} ILIKE ${query} OR ${menuItems.sku} ILIKE ${query} OR ${menuItems.barcode} ILIKE ${query})`,
      );
    }
    if (filters.category || filters.categories?.length) {
      const categorySlugs = filters.categories?.length
        ? filters.categories
        : [filters.category];
      const itemIds = await this.findItemIdsByCategorySlugs(
        categorySlugs,
        filters.match === "all" ? "all" : "any",
      );
      if (itemIds.length === 0) return [];
      conditions.push(inArray(menuItems.id, itemIds));
    }

    const rows = await db
      .select({ item: menuItems, category: categories })
      .from(menuItems)
      .leftJoin(
        menuItemCategories,
        eq(menuItems.id, menuItemCategories.menu_item_id),
      )
      .leftJoin(categories, eq(menuItemCategories.category_id, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(menuItems.category), asc(menuItems.name), asc(categories.display_order));

    return this.hydrateMenuItems(rows);
  }

  async update(id: string, menuData: any) {
    const updates: Record<string, any> = {};
    [
      "name",
      "description",
      "price",
      "category",
      "main_category",
      "type",
      "is_available",
      "image_url",
      "prep_time_minutes",
      "sku",
      "barcode",
    ].forEach((key) => {
      if (menuData[key] !== undefined) updates[key] = menuData[key];
    });

    const categoryInputs = asCategoryInputs(menuData);
    if (Object.keys(updates).length === 0 && categoryInputs.length === 0) {
      throw new Error("No fields to update");
    }

    await db.transaction(async (tx) => {
      if (Object.keys(updates).length > 0) {
        await tx
          .update(menuItems)
          .set({ ...updates, updated_at: new Date() })
          .where(and(eq(menuItems.id, id), eq(menuItems.branch_id, requireBranchId())))
          .returning();
      }

      if (categoryInputs.length > 0) {
        await this.replaceMenuItemCategories(tx, id, categoryInputs);
      }
    });

    const full = await this.findById(id);
    if (full) {
      await emitUpdated(db, "menu_item", "MENU_ITEM_UPDATED", full as any);
    }
    return full;
  }

  async delete(id: string) {
    await emitDeleted(db, "menu_item", "MENU_ITEM_DELETED", id);
    const [deleted] = await db
      .delete(menuItems)
      .where(and(eq(menuItems.id, id), eq(menuItems.branch_id, requireBranchId())))
      .returning({ id: menuItems.id });
    return deleted;
  }

  async getCafeMenu() {
    const rows = await db
      .select({ item: menuItems, category: categories })
      .from(menuItems)
      .leftJoin(
        menuItemCategories,
        eq(menuItems.id, menuItemCategories.menu_item_id),
      )
      .leftJoin(categories, eq(menuItemCategories.category_id, categories.id))
      .where(
        and(
          eq(menuItems.branch_id, requireBranchId()),
          eq(menuItems.type, "cafe"),
          eq(menuItems.is_available, true),
        ),
      )
      .orderBy(asc(menuItems.category), asc(menuItems.name), asc(categories.display_order));

    return this.hydrateMenuItems(rows);
  }

  async findCategories(filters: any = {}) {
    const conditions = [eq(categories.branch_id, requireBranchId())] as any[];
    if (filters.type) conditions.push(eq(categories.type, filters.type));
    if (filters.is_active !== undefined) {
      conditions.push(
        eq(
          categories.is_active,
          filters.is_active === true || filters.is_active === "true",
        ),
      );
    }
    if (filters.search) {
      conditions.push(ilike(categories.name, `%${String(filters.search).trim()}%`));
    }

    return db
      .select()
      .from(categories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(categories.type), asc(categories.display_order), asc(categories.name));
  }

  async findMainCategories(filters: any = {}) {
    const conditions = [eq(mainCategories.branch_id, requireBranchId())] as any[];

    if (filters.is_active !== undefined) {
      conditions.push(
        eq(
          mainCategories.is_active,
          filters.is_active === true || filters.is_active === "true",
        ),
      );
    }

    if (filters.search) {
      conditions.push(
        ilike(mainCategories.name, `%${String(filters.search).trim()}%`),
      );
    }

    const rows = await db
      .select()
      .from(mainCategories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(mainCategories.display_order), asc(mainCategories.name));

    if (rows.length > 0) return rows;

    const fallbackRows = await db
      .select({ value: menuItems.main_category })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.branch_id, requireBranchId()),
          sql`${menuItems.main_category} is not null and trim(${menuItems.main_category}) <> ''`,
        ),
      )
      .groupBy(menuItems.main_category)
      .orderBy(asc(menuItems.main_category));

    return fallbackRows.map((row, index) => {
      const value = String(row.value || "").trim();
      return {
        id: undefined,
        name: value
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        slug: slugify(value),
        display_order: index,
        is_active: true,
      };
    });
  }

  async createMainCategory(payload: any) {
    const name = String(payload?.name || "").trim();
    if (!name) {
      throw new Error("Main category name is required");
    }

    const slug = slugify(payload?.slug || name) || `category-${Date.now()}`;

    const [category] = await db
      .insert(mainCategories)
      .values({
        ...tenantInsert(),
        name,
        slug,
        display_order: payload?.display_order ?? 0,
        is_active: payload?.is_active ?? true,
      })
      .onConflictDoUpdate({
        target: [mainCategories.branch_id, mainCategories.slug],
        set: {
          name,
          display_order: payload?.display_order ?? 0,
          is_active: payload?.is_active ?? true,
          updated_at: new Date(),
        },
      })
      .returning();

    return category;
  }

  private hydrateMenuItems(rows: Array<{ item: any; category: any }>) {
    const byId = new Map<string, any>();

    for (const row of rows) {
      if (!row.item) continue;
      const existing =
        byId.get(row.item.id) ??
        {
          ...row.item,
          categories: [],
        };

      if (row.category && !existing.categories.some((c: any) => c.id === row.category.id)) {
        existing.categories.push(row.category);
      }

      byId.set(row.item.id, existing);
    }

    return Array.from(byId.values());
  }

  private async findItemIdsByCategorySlugs(categorySlugs: string[], match: "any" | "all") {
    const slugs = categorySlugs.map(slugify).filter(Boolean);
    if (slugs.length === 0) return [];

    let query = db
      .select({ menu_item_id: menuItemCategories.menu_item_id })
      .from(menuItemCategories)
      .innerJoin(categories, eq(menuItemCategories.category_id, categories.id))
      .where(
        and(
          eq(categories.branch_id, requireBranchId()),
          inArray(categories.slug, slugs),
        ),
      )
      .groupBy(menuItemCategories.menu_item_id);

    if (match === "all") {
      query = query.having(
        sql`count(distinct ${menuItemCategories.category_id}) = ${slugs.length}`,
      ) as any;
    }

    const rows = await query;

    return rows.map((row) => row.menu_item_id);
  }

  private async replaceMenuItemCategories(tx: any, menuItemId: string, categoryInputs: any[]) {
    if (!categoryInputs.length) return;

    await tx
      .delete(menuItemCategories)
      .where(eq(menuItemCategories.menu_item_id, menuItemId));

    const categoryIds: string[] = [];
    for (const input of categoryInputs) {
      if (input.id) {
        categoryIds.push(String(input.id));
        continue;
      }

      const name = String(input.name || input.slug || "").trim();
      if (!name) continue;
      const slug = slugify(input.slug || name);

      const [category] = await tx
        .insert(categories)
        .values({
          ...tenantInsert(),
          name,
          slug,
          icon: input.icon ?? null,
          display_order: input.display_order ?? 0,
          type: input.type ?? "main",
          is_active: input.is_active ?? true,
        })
        .onConflictDoUpdate({
          target: [categories.branch_id, categories.slug],
          set: {
            name,
            icon: input.icon ?? null,
            display_order: input.display_order ?? 0,
            type: input.type ?? "main",
            is_active: input.is_active ?? true,
            updated_at: new Date(),
          },
        })
        .returning();

      categoryIds.push(category.id);
    }

    const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));
    if (uniqueCategoryIds.length > 0) {
      await tx
        .insert(menuItemCategories)
        .values(
          uniqueCategoryIds.map((categoryId) => ({
            ...tenantInsert(),
            menu_item_id: menuItemId,
            category_id: categoryId,
          })),
        )
        .onConflictDoNothing();
    }
  }
}
