import fs from "fs";
import path from "path";
import { sql, inArray } from "drizzle-orm";
import { db, pool } from "../src/db/drizzle";
import { menuItems, categories, menuItemCategories } from "../src/db/tables";
import { ensureDefaultTenant, tcols } from "./seedTenant";

const slugify = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type MenuJsonItem = {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  sub_category?: string;
  main_category?: string;
  available?: boolean;
  image_url?: string;
  type?: string;
};

function resolveMenuJsonPath() {
  const candidates = [
    path.resolve(process.cwd(), "../menu.json"),
    path.resolve(__dirname, "../../menu.json"),
    path.resolve(__dirname, "../menu.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`menu.json not found. Looked in: ${candidates.join(", ")}`);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeMenuItem(item: MenuJsonItem) {
  return {
    ...tcols(),
    name: item.name,
    description: item.description ?? null,
    price: typeof item.price === "number" ? String(item.price) : null,
    category: item.category ?? null,
    type: item.type ?? null,
    is_available: item.available ?? true,
    image_url: item.image_url ?? null,
    meta: {
      sub_category: item.sub_category ?? null,
      main_category: item.main_category ?? null,
      source: "menu.json",
    },
  };
}

export async function importMenuFromJson() {
  const menuJsonPath = resolveMenuJsonPath();
  const raw = fs.readFileSync(menuJsonPath, "utf8");
  const parsed = JSON.parse(raw) as MenuJsonItem[];

  if (!Array.isArray(parsed)) {
    throw new Error("menu.json must contain an array of menu items");
  }

  const normalizedItems = parsed.map(normalizeMenuItem);

  await ensureDefaultTenant();

  console.log(
    `🔄 Importing ${normalizedItems.length} menu items from ${menuJsonPath}`,
  );

  await db.transaction(async (tx) => {
    // 1. Collect and upsert unique categories
    const categoryMap = new Map<string, string>(); // slug -> id (UUID)
    const uniqueCategoryInputs = new Map<string, { name: string; slug: string; type: string }>();

    for (const item of parsed) {
      if (item.main_category) {
        const slug = slugify(item.main_category);
        if (!uniqueCategoryInputs.has(slug)) {
          uniqueCategoryInputs.set(slug, { name: item.main_category, slug, type: "main" });
        }
      }
      if (item.category) {
        const slug = slugify(item.category);
        if (!uniqueCategoryInputs.has(slug)) {
          uniqueCategoryInputs.set(slug, { name: item.category, slug, type: "category" });
        }
      }
      if (item.sub_category) {
        const slug = slugify(item.sub_category);
        if (!uniqueCategoryInputs.has(slug)) {
          uniqueCategoryInputs.set(slug, { name: item.sub_category, slug, type: "sub" });
        }
      }
    }

    for (const input of uniqueCategoryInputs.values()) {
      const [category] = await tx
        .insert(categories)
        .values({
          ...tcols(),
          name: input.name,
          slug: input.slug,
          type: input.type,
          is_active: true,
        })
        .onConflictDoUpdate({
          target: [categories.branch_id, categories.slug],
          set: {
            name: input.name,
            type: input.type,
            updated_at: new Date(),
          },
        })
        .returning();
      
      categoryMap.set(category.slug, category.id);
    }

    // 2. Upsert menu items (using name as conflict target since IDs are now UUIDs)
    for (const itemsChunk of chunk(normalizedItems, 100)) {
      await tx
        .insert(menuItems)
        .values(itemsChunk)
        .onConflictDoUpdate({
          target: menuItems.name,
          set: {
            description: sql.raw("excluded.description"),
            price: sql.raw("excluded.price"),
            category: sql.raw("excluded.category"),
            type: sql.raw("excluded.type"),
            is_available: sql.raw("excluded.is_available"),
            image_url: sql.raw("excluded.image_url"),
            meta: sql.raw("excluded.meta"),
            updated_at: new Date(),
          },
        });
    }

    // 3. Sync menu item categories relations
    // Get all menu items that were just upserted
    const allMenuItems = await tx.select().from(menuItems);
    const menuItemByName = new Map(allMenuItems.map(mi => [mi.name, mi.id]));

    const relations = [];
    for (const item of parsed) {
       const menuItemId = menuItemByName.get(item.name);
       if (!menuItemId) continue;
       
       const categorySlugs = [
         item.main_category ? slugify(item.main_category) : null,
         item.category ? slugify(item.category) : null,
         item.sub_category ? slugify(item.sub_category) : null,
       ].filter(Boolean);

       const uniqueSlugs = Array.from(new Set(categorySlugs));
       for (const slug of uniqueSlugs) {
          const categoryId = categoryMap.get(slug as string);
          if (categoryId) {
             relations.push({
                ...tcols(),
                menu_item_id: menuItemId,
                category_id: categoryId,
             });
          }
       }
    }

    if (relations.length > 0) {
       for (const relationsChunk of chunk(relations, 100)) {
          await tx.insert(menuItemCategories)
            .values(relationsChunk)
            .onConflictDoNothing();
       }
    }
  });

  console.log("✅ Menu import complete.");
}

async function run() {
  try {
    await importMenuFromJson();
  } catch (err) {
    console.error("❌ Menu import failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  void run();
}
