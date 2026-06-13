import { db, pool } from "../src/db/drizzle";
import { categories, users } from "../src/db/tables";
import * as bcrypt from "bcryptjs";
import {
  DEFAULT_BUSINESS_ID,
  ensureDefaultTenant,
  tcols,
} from "./seedTenant";

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

async function seed() {
  console.log("🔄 Seeding initial data...");

  await ensureDefaultTenant();

  // Seed platform super admin (no business; manages the whole platform)
  const superPassword = await bcrypt.hash("super123", BCRYPT_SALT_ROUNDS);
  try {
    await db
      .insert(users)
      .values({
        id: "00000000-0000-0000-0000-0000000000a1",
        username: "superadmin",
        name: "Platform Super Admin",
        password_hash: superPassword,
        role: "super_admin",
        is_active: true,
      })
      .onConflictDoNothing();
    console.log("✅ Super admin seeded (superadmin / super123).");
  } catch (err) {
    console.error("❌ Failed to seed super admin:", err);
  }

  // Seed an owner for the default business (manages branches via the web admin)
  const ownerPassword = await bcrypt.hash("owner123", BCRYPT_SALT_ROUNDS);
  try {
    await db
      .insert(users)
      .values({
        id: "00000000-0000-0000-0000-0000000000b1",
        business_id: DEFAULT_BUSINESS_ID,
        username: "owner",
        name: "Business Owner",
        password_hash: ownerPassword,
        role: "owner",
        is_active: true,
      })
      .onConflictDoNothing();
    console.log("✅ Owner seeded (owner / owner123).");
  } catch (err) {
    console.error("❌ Failed to seed owner:", err);
  }

  // Seed Admin
  const adminPassword = await bcrypt.hash("admin123", BCRYPT_SALT_ROUNDS);
  try {
    await db
      .insert(users)
      .values({
        business_id: DEFAULT_BUSINESS_ID,
        username: "admin",
        name: "System Administrator",
        password_hash: adminPassword,
        role: "admin",
        first_name: "System",
        last_name: "Administrator",
        is_active: true,
      })
      .onConflictDoNothing();
    console.log("✅ Default admin seeded.");
  } catch (err) {
    console.error("❌ Failed to seed admin:", err);
  }

  // Seed Sample Employees
  const sampleUsers = [
    {
      username: "baker1",
      role: "bakery_employee",
      first_name: "John",
      last_name: "Baker",
    },
    {
      username: "waiter1",
      role: "cafe_waiter",
      first_name: "Sarah",
      last_name: "Waiter",
    },
    {
      username: "cashier1",
      role: "cashier",
      first_name: "Mike",
      last_name: "Cashier",
    },
    {
      username: "kitchen1",
      role: "kitchen_staff",
      first_name: "Anna",
      last_name: "Chef",
    },
  ];

  const employeePassword = await bcrypt.hash("password123", BCRYPT_SALT_ROUNDS);
  const pinPassword = await bcrypt.hash("1234", BCRYPT_SALT_ROUNDS);

  for (const user of sampleUsers) {
    try {
      await db
        .insert(users)
        .values({
          business_id: DEFAULT_BUSINESS_ID,
          username: user.username,
          name: `${user.first_name} ${user.last_name}`,
          password_hash: employeePassword,
          pin_hash: pinPassword,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: true,
        })
        .onConflictDoNothing();
      console.log(`✅ Seeded sample employee: ${user.username} (${user.role})`);
    } catch (err) {
      console.error(`❌ Failed to seed employee ${user.username}:`, err);
    }
  }

  const sampleCategories = [
    { name: "Coffee", slug: "coffee", icon: "coffee", display_order: 1, type: "main" },
    { name: "Cold Drinks", slug: "cold-drinks", icon: "snowflake", display_order: 2, type: "tag" },
    { name: "Popular", slug: "popular", icon: "star", display_order: 3, type: "promotion" },
    { name: "Pastry", slug: "pastry", icon: "croissant", display_order: 4, type: "main" },
    { name: "Barista", slug: "barista", icon: "cup-soda", display_order: 5, type: "workflow" },
  ];

  for (const category of sampleCategories) {
    await db
      .insert(categories)
      .values({ ...tcols(), ...category })
      .onConflictDoUpdate({
        target: [categories.branch_id, categories.slug],
        set: {
          name: category.name,
          icon: category.icon,
          display_order: category.display_order,
          type: category.type,
          is_active: true,
          updated_at: new Date(),
        },
      });
  }
}

  

async function run() {
  try {
    await seed();
    console.log("🎉 Database seeded successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await pool.end();
  }
}

run();
