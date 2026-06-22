import { getLocalDb } from "./client";
import { localDbTables } from "./schema";
import {
  LocalAttendance,
  LocalCategory,
  LocalInventoryItem,
  LocalMainCategory,
  LocalMenuItem,
  LocalMenuItemCategory,
  LocalOrder,
  LocalPayment,
  LocalPaymentMethod,
  LocalRole,
  LocalStockMovement,
  LocalStockTransfer,
  LocalStockTransferItem,
  LocalStockLocation,
  LocalTable,
  LocalUser,
} from "./types";
import { getApproximateServerNow } from "@/shared/utils/serverTime";

export type {
  LocalUser,
  LocalRole,
  LocalPaymentMethod,
  LocalMenuItem,
  LocalCategory,
  LocalMainCategory,
  LocalMenuItemCategory,
  LocalTable,
  LocalOrder,
  LocalPayment,
  LocalAttendance,
  LocalInventoryItem,
  LocalStockMovement,
  LocalStockTransfer,
  LocalStockTransferItem,
  LocalStockLocation,
};

export { getLocalDb, localDbTables };

// Utility function to generate unique UUIDs for local records
export function generateLocalId(): string {
  try {
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }
  } catch (e) {
    // fallback
  }
  return (
    "local_" + getApproximateServerNow() + "_" + Math.random().toString(36).substring(2, 11)
  );
}

// Clears all menu-related tables from the local database.
export async function clearMenuTables(): Promise<void> {
  const db = await getLocalDb();
  await db.delete(localDbTables.diningTables)
  await db.delete(localDbTables.menuItemCategories);
  await db.delete(localDbTables.menuItems);
  await db.delete(localDbTables.categories);
  await db.delete(localDbTables.mainCategories);
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getLocalDb();
  await db.delete(localDbTables.users);
  await db.delete(localDbTables.roles);
  await db.delete(localDbTables.paymentMethods);
  await db.delete(localDbTables.menuItems);
  await db.delete(localDbTables.categories);
  await db.delete(localDbTables.mainCategories);
  await db.delete(localDbTables.menuItemCategories);
  await db.delete(localDbTables.diningTables);
  await db.delete(localDbTables.attendance);
  await db.delete(localDbTables.inventoryItems);
  await db.delete(localDbTables.inventoryStock);
  await db.delete(localDbTables.stockMovements);
  await db.delete(localDbTables.stockTransfers);
  await db.delete(localDbTables.stockTransferItems);
  await db.delete(localDbTables.stockLocations);
  await db.delete(localDbTables.systemSettings);
  await db.delete(localDbTables.organizations);
  await db.delete(localDbTables.recipes);
  await db.delete(localDbTables.recipeIngredients);
}

/**
 * Full local wipe used by the owner-approved data cleanup. Clears everything
 * clearAllLocalData() does, plus orders/payments/expenses (which it protects on
 * logout), but deliberately KEEPS device_enrollment so the device stays pinned
 * to its branch and re-pulls reference data on the next sync. Deletes run
 * sequentially — the pooled SQLite connection has no working transactions.
 */
export async function wipeAllLocalDataKeepEnrollment(): Promise<void> {
  const db = await getLocalDb();
  await clearAllLocalData();
  await db.delete(localDbTables.orders);
  await db.delete(localDbTables.payments);
  await db.delete(localDbTables.expenses);
}

// Global script to instantly wipe all local data from the Developer Console
if (typeof window !== "undefined") {
  (window as any).clearDb = async () => {
    // console.log("[SQLite DB] Wiping all local data...");
    await clearAllLocalData();
    // console.log("[SQLite DB] All local data has been successfully cleared!");
    alert("Local Database Cleared! Please refresh the page.");
  };
}
