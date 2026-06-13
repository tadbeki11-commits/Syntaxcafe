// ─────────────────────────────────────────────────────────────────────────────
//
// All table definitions live in ./tables/<name>.table.ts
// All relations live in ./relations.ts
//
// Prefer importing directly from those files in new code:
//   import { users }    from "../../db/tables/users.table";
//   import { orders }   from "../../db/tables/orders.table";
//
// This file re-exports everything so existing imports continue to work.
// ─────────────────────────────────────────────────────────────────────────────

export * from "./tables/index";
export * from "./relations";

// Legacy alias kept for backward compatibility
export { order_items as orderItems } from "./tables/order-items.table";

