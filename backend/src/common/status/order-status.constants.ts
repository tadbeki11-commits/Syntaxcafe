/**
 * Single source of truth for order/payment status vocabulary.
 *
 * Two independent axes:
 *  - ORDER_STATUS    (orders.status)         — lifecycle: is the order fulfilled?
 *  - PAYMENT_STATUS  (orders.payment_status) — money: has it been paid?
 *  - PAYMENT_ROW_STATUS (payments.status)    — a payment row only exists once
 *                                              confirmed, so it is never "pending".
 *
 * `done` means *fulfilled / served*; it says nothing about payment. Whether a
 * sale collected money lives entirely in `payment_status`. Do NOT reintroduce
 * `status = 'paid'` as a proxy for "closed".
 *
 * The offline Tauri app keeps its own copy of these unions (the local SQLite
 * mirror can't share a Postgres enum), so this stays plain TS — no pgEnum.
 */

export const ORDER_STATUS = ["pending", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const PAYMENT_STATUS = ["pending", "paid", "cancelled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYMENT_ROW_STATUS = ["paid", "cancelled"] as const;
export type PaymentRowStatus = (typeof PAYMENT_ROW_STATUS)[number];

export function isOrderStatus(v: unknown): v is OrderStatus {
  return ORDER_STATUS.includes(String(v).toLowerCase() as OrderStatus);
}

export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return PAYMENT_STATUS.includes(String(v).toLowerCase() as PaymentStatus);
}

export function isPaymentRowStatus(v: unknown): v is PaymentRowStatus {
  return PAYMENT_ROW_STATUS.includes(
    String(v).toLowerCase() as PaymentRowStatus,
  );
}

/**
 * Legacy → canonical mapping for the lifecycle axis. The old `orders.status`
 * was overloaded with payment/void concepts; collapse those:
 *   paid|completed              -> done      (fulfilled)
 *   ready|preparing|pending|... -> pending   (not yet served)
 *   deleted|voided|refunded|cancelled|canceled -> cancelled
 */
export function normalizeOrderStatus(raw: unknown): OrderStatus {
  const s = String(raw ?? "").toLowerCase();
  switch (s) {
    case "paid":
    case "completed":
    case "complete":
    case "done":
    case "served":
      return "done";
    case "deleted":
    case "voided":
    case "void":
    case "refunded":
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      // pending, ready, preparing, new, open, "" → not yet fulfilled
      return "pending";
  }
}

/** Legacy → canonical mapping for orders.payment_status. */
export function normalizePaymentStatus(raw: unknown): PaymentStatus {
  const s = String(raw ?? "").toLowerCase();
  switch (s) {
    case "paid":
      return "paid";
    case "cancelled":
    case "canceled":
    case "deleted":
    case "voided":
    case "refunded":
      return "cancelled";
    default:
      return "pending";
  }
}

/** Legacy → canonical mapping for payments.status (no "pending"). */
export function normalizePaymentRowStatus(raw: unknown): PaymentRowStatus {
  const s = String(raw ?? "").toLowerCase();
  switch (s) {
    case "cancelled":
    case "canceled":
    case "deleted":
    case "voided":
    case "refunded":
      return "cancelled";
    default:
      // a payment row exists because money was confirmed
      return "paid";
  }
}

/**
 * Bulk-sync conflict resolution: higher rank wins, so a later push can't
 * downgrade a more-advanced lifecycle state. `cancelled` is terminal and
 * outranks everything.
 */
export const ORDER_STATUS_PRIORITY: Record<OrderStatus, number> = {
  pending: 0,
  done: 1,
  cancelled: 2,
};
