// Real-time order channel for the desktop app.
//
// While the app is online, this keeps an active socket.io connection to the
// backend's `/orders` namespace. The connection authenticates with the device's
// enrollment token, so the backend places it in its branch room and pushes only
// this branch's new orders (see backend OrdersGateway). The cashier dashboard
// subscribes via subscribeNewOrder() to react the instant a waiter creates an
// order — no more 3s polling lag.
//
// Connection lifecycle follows the sync engine's online/offline state, and
// socket.io handles reconnection/heartbeats for us.

import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/infrastructure/api/http-client";
import { getDeviceToken } from "@/shared/utils/deviceToken";
import { syncEngine } from "@/infrastructure/sync/sync-engine";

type NewOrderHandler = (order: any) => void;

/** Derive the server origin (no /api prefix, no path) for the socket URL. */
const deriveOrigin = (base: string): string => {
  try {
    return new URL(base).origin;
  } catch {
    if (base) return base.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }
};

class OrderSocketManager {
  private socket: Socket | null = null;
  private started = false;
  private readonly handlers = new Set<NewOrderHandler>();

  /** Begin tracking online state so the socket connects/disconnects with it. */
  private ensureStarted() {
    if (this.started) return;
    this.started = true;
    syncEngine.subscribe((status) => {
      if (status.online) this.connect();
      else this.disconnect();
    });
  }

  private connect() {
    const token = getDeviceToken();
    // Without a device token the backend can't scope us to a branch.
    if (!token) return;

    if (this.socket) {
      (this.socket.auth as any) = { deviceToken: token };
      if (!this.socket.connected) this.socket.connect();
      return;
    }

    const origin = deriveOrigin(API_BASE_URL);
    if (!origin) return;

    const socket = io(`${origin}/orders`, {
      auth: { deviceToken: token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("new_order", (payload: any) => {
      const order = payload?.order ?? payload;
      this.handlers.forEach((handler) => {
        try {
          handler(order);
        } catch {
          /* a misbehaving subscriber shouldn't break the others */
        }
      });
    });

    this.socket = socket;
  }

  private disconnect() {
    this.socket?.disconnect();
  }

  /**
   * Subscribe to new-order pushes for this device's branch. Returns an
   * unsubscribe function. The connection stays open after unsubscribe so other
   * subscribers (and reconnects) keep working.
   */
  subscribeNewOrder(handler: NewOrderHandler): () => void {
    this.handlers.add(handler);
    this.ensureStarted();
    if (syncEngine.isAppOnline()) this.connect();
    return () => {
      this.handlers.delete(handler);
    };
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }
}

export const orderSocket = new OrderSocketManager();
export default orderSocket;
