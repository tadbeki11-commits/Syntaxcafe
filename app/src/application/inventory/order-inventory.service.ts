import { api, isOnline } from "@/infrastructure/api/http-client";

// Inventory is backend-authoritative with no local mirror. Stock availability is
// validated against the API, and stock deduction happens server-side when the
// order/payment syncs — there is no local deduction or movement bookkeeping here.

type OrderLine = {
  id?: number;
  menu_item_id?: number;
  quantity?: number;
  main_category?: string;
  item_type?: string;
};

export type InventoryShortfall = {
  inventory_item_id: number;
  inventory_item_name: string;
  location_id: number;
  location_name: string;
  required: number;
  available: number;
  unit: string;
};

export type InventoryAvailability = {
  available: boolean;
  shortfalls: InventoryShortfall[];
};

const asNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toCheckItems = (items: OrderLine[]) =>
  (items || [])
    .map((item) => ({
      menu_item_id: Number(item?.menu_item_id),
      quantity: asNumber(item?.quantity, 0),
    }))
    .filter(
      (line) =>
        Number.isFinite(line.menu_item_id) &&
        line.menu_item_id > 0 &&
        line.quantity > 0,
    );

/**
 * Backend-authoritative stock availability check.
 *
 * Inventory has no local mirror, so this can only run online. When offline (or if
 * the check endpoint is unreachable) we cannot verify and report the order as
 * available — the backend re-validates and rejects on insufficient stock when the
 * order syncs.
 */
export async function checkOrderInventoryAvailability(
  items: OrderLine[],
): Promise<InventoryAvailability> {
  const checkItems = toCheckItems(items);
  if (checkItems.length === 0 || !isOnline()) {
    return { available: true, shortfalls: [] };
  }

  try {
    const response = await api.post("/inventory/check-availability", {
      items: checkItems,
    });
    const result = response?.data?.data ?? response?.data ?? {};
    const rawShortfalls: any[] = Array.isArray(result?.shortfalls)
      ? result.shortfalls
      : [];

    const shortfalls: InventoryShortfall[] = rawShortfalls.map((s) => ({
      inventory_item_id: Number(s?.inventory_item_id),
      inventory_item_name:
        s?.name ?? s?.inventory_item_name ?? `Item ${s?.inventory_item_id}`,
      location_id: Number(s?.location_id),
      location_name: s?.location_name ?? `Location ${s?.location_id}`,
      required: asNumber(s?.required),
      available: asNumber(s?.available),
      unit: s?.unit ?? "piece",
    }));

    return {
      available: result?.available ?? shortfalls.length === 0,
      shortfalls,
    };
  } catch (error) {
    // Don't block order creation on a transient availability-check failure; the
    // backend re-validates stock when the order syncs.
    console.error("[inventory] check-availability failed", error);
    return { available: true, shortfalls: [] };
  }
}
