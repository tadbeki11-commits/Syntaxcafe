import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { DevicesService } from "../devices/devices.service";

/**
 * Real-time push channel for order events. Cashier/kitchen clients open a
 * socket on the `/orders` namespace and are placed into a room scoped to their
 * branch. When a waiter creates an order, OrderService calls notifyNewOrder()
 * which fans the event out only to that branch's room — so a cashier is
 * notified instantly and never sees another tenant's traffic.
 *
 * Clients authenticate the same way the REST API pins a device: a device token
 * (handshake.auth.deviceToken or the x-device-token header) is resolved to a
 * branch. Owner/admin clients without a device token may pass an explicit
 * branchId in handshake.auth.
 */
@WebSocketGateway({
  namespace: "/orders",
  cors: { origin: "*" },
})
export class OrdersGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly devices: DevicesService) {}

  async handleConnection(client: Socket) {
    try {
      const auth = (client.handshake.auth ?? {}) as Record<string, unknown>;
      const token =
        (auth.deviceToken as string | undefined) ||
        (client.handshake.headers["x-device-token"] as string | undefined);

      let branchId: string | null = null;
      if (token) {
        const tenant = await this.devices.resolveToken(String(token));
        branchId = tenant?.branchId ?? null;
      }
      // Fallback for clients that aren't device-enrolled (e.g. owner console).
      if (!branchId && auth.branchId) branchId = String(auth.branchId);

      if (!branchId) {
        this.logger.warn(
          `Rejecting order socket ${client.id}: could not resolve a branch`,
        );
        client.disconnect(true);
        return;
      }

      client.data.branchId = branchId;
      await client.join(this.room(branchId));
      this.logger.log(`Order socket ${client.id} joined ${this.room(branchId)}`);
    } catch (err) {
      this.logger.error(`Order socket ${client.id} connection failed`, err);
      client.disconnect(true);
    }
  }

  /** Push a freshly created order to every client watching its branch. */
  notifyNewOrder(branchId: string | null | undefined, order: unknown) {
    if (!branchId || !this.server) return;
    this.server.to(this.room(branchId)).emit("new_order", { order });
  }

  /**
   * Push an updated order to every client watching its branch. Used when an
   * order changes server-side after creation — e.g. a web cashier confirms or
   * settles its payment — so a POS reading from its local DB reflects the new
   * status instantly instead of waiting for the next pull.
   */
  notifyOrderUpdated(branchId: string | null | undefined, order: unknown) {
    if (!branchId || !this.server) return;
    this.server.to(this.room(branchId)).emit("order_updated", { order });
  }

  private room(branchId: string) {
    return `branch:${branchId}`;
  }
}
