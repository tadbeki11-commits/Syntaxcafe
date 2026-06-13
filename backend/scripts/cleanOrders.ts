import { db, pool } from "../src/db/drizzle";
import { orders, order_items, orderStatusLogs, payments } from "../src/db/tables";

async function cleanOrders() {
  console.log("🗑️ Cleaning all order-related tables...");

  try {
    // Delete payments
    await db.delete(payments);
    console.log("✅ Deleted all payments.");

    // Delete order items
    await db.delete(order_items);
    console.log("✅ Deleted all order items.");

    // Delete order status logs
    await db.delete(orderStatusLogs);
    console.log("✅ Deleted all order status logs.");

    // Delete orders
    await db.delete(orders);
    console.log("✅ Deleted all orders.");

    console.log("🎉 Order cleanup completed successfully!");
  } catch (err) {
    console.error("❌ Error cleaning orders:", err);
  }
}

async function run() {
  try {
    await cleanOrders();
  } finally {
    await pool.end();
  }
}

run();
