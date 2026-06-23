// Global realtime → local-DB bridge.
//
// While the app is online the device holds a branch-scoped socket to the backend
// (see order-socket.ts). Previously only the cashier dashboard reacted to those
// pushes, so other screens (and other roles) only saw backend-originated changes
// — e.g. a web cashier cancelling an order — after a manual sync. This bridge
// runs once for the whole app: it persists every pushed order into the local DB
// (the single source the UI reads from) and fires a `local-data-changed` event
// so any screen wired with useSyncRefetch re-reads instantly, no polling needed.

import { orderSocket } from "@/infrastructure/realtime/order-socket";
import { persistServerOrders } from "@/infrastructure/adapters/orders.adapter";
import { syncEngine } from "@/infrastructure/sync/sync-engine";

export const LOCAL_DATA_CHANGED_EVENT = "local-data-changed";

let started = false;

/** Notify every open screen that the local DB changed underneath it. */
export const notifyLocalDataChanged = (detail?: unknown): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LOCAL_DATA_CHANGED_EVENT, { detail }),
  );
};

export function startRealtimeSync(): void {
  if (started) return;
  started = true;

  const onOrder = async (order: any) => {
    try {
      if (order) {
        await persistServerOrders([order]);
      }
      // Refresh any list/dashboard reading from the local DB, and recompute the
      // unsynced badge.
      notifyLocalDataChanged({ type: "order", order });
      syncEngine.notifyListeners();
    } catch (error) {
      console.warn("[realtime] Failed to persist pushed order", error);
    }
  };

  // New orders (e.g. placed on the web waiter app) and updates to existing
  // orders (paid/settled/cancelled elsewhere) both land in the local DB here.
  orderSocket.subscribeNewOrder(onOrder);
  orderSocket.subscribeOrderUpdated(onOrder);
}

export default startRealtimeSync;
