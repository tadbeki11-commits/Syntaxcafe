import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a UUID to a shorter integer number for display purposes.
 * Generates a positive 32-bit integer hash from the UUID string.
 */
export function uuidToDisplayId(uuid: string | null | undefined): number {
  if (!uuid) return 0;

  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash);
}

/**
 * Display label for an order's tracking number. Prefers the backend-assigned
 * per-branch serial (`order_number`); falls back to the UUID-derived id for
 * legacy or not-yet-synced orders so something stable always renders.
 */
export function formatOrderNumber(
  order:
    | {
        order_number?: number | null;
        id?: string | null;
      }
    | null
    | undefined,
): string {
  const serial = order?.order_number;
  if (serial != null && Number(serial) > 0) return `#${serial}`;
  return `#${order?.id}`;
}

export type OrderSource = "cashier" | "waiter";

/**
 * Determines whether an order was rung up by a cashier on a waiter's behalf or
 * placed directly by the waiter. Prefers the backend-provided `order_source`;
 * otherwise infers it from the creator differing from the attributed waiter
 * (cashier flows send a distinct `created_by_id`/`cashier_id`).
 */
export function getOrderSource(order: any): OrderSource {
  if (order?.order_source === "cashier" || order?.order_source === "waiter") {
    return order.order_source;
  }
  const waiterId = order?.waiter_id || order?.employee_id;
  const creatorId = order?.cashier_id || order?.created_by_id;
  if (creatorId && waiterId && String(creatorId) !== String(waiterId)) {
    return "cashier";
  }
  return "waiter";
}
