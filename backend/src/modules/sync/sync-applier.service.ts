import { Injectable, Logger } from "@nestjs/common";
import db from "../../db/drizzle";
import { UsersService } from "../users/users.service";
import { MenuService } from "../menu/menu.service";
import { InventoryService } from "../inventory/inventory.service";
import { RecipesService } from "../recipes/recipes.service";
import { StockLocationsService } from "../stock-locations/stock-locations.service";
import { OrderService } from "../order/order.service";
import { PaymentService } from "../payment/payment.service";
import { SettingsService } from "../settings/settings.service";

export type InboundSyncEvent = {
  eventType: string;
  entityType: string;
  entityId?: string | null;
  operation: string;
  payload?: Record<string, unknown>;
  clientVersion?: number;
};

@Injectable()
export class SyncApplierService {
  private readonly logger = new Logger(SyncApplierService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly menuService: MenuService,
    private readonly inventoryService: InventoryService,
    private readonly recipesService: RecipesService,
    private readonly stockLocationsService: StockLocationsService,
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly settingsService: SettingsService,
  ) {}

  async apply(event: InboundSyncEvent): Promise<{ entityId?: string }> {
    const payload = event.payload ?? {};
    const op = event.operation as "create" | "update" | "delete";

    switch (event.entityType) {
      case "user":
        return this.applyUser(op, payload, event.entityId);
      case "menu_item":
        return this.applyMenuItem(op, payload, event.entityId);
      case "inventory_item":
        return this.applyInventory(op, payload, event.entityId);
      case "recipe":
        return this.applyRecipe(op, payload, event.entityId);
      case "stock_location":
        return this.applyStockLocation(op, payload, event.entityId);
      case "order":
        return this.applyOrder(op, payload, event.entityId);
      case "payment":
        return this.applyPayment(op, payload, event.entityId);
      case "role":
        return this.applyRole(op, payload, event.entityId);
      case "payment_method":
        return this.applyPaymentMethod(op, payload, event.entityId);
      default:
        this.logger.warn(`Unhandled entity type for apply: ${event.entityType}`);
        return {};
    }
  }

  private async applyUser(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "delete" && entityId) {
      await this.usersService.deleteUser(entityId);
      return { entityId };
    }
    if (op === "create") {
      const row = await this.usersService.register({
        ...payload,
        id: entityId ?? payload.id,
      });
      return { entityId: row.id };
    }
    const id = entityId ?? (payload.id as string);
    if (id) {
      const row = await this.usersService.updateProfile(id, payload);
      return { entityId: row.id };
    }
    return {};
  }

  private async applyMenuItem(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "delete" && entityId) {
      await this.menuService.delete(entityId);
      return { entityId };
    }
    if (op === "create") {
      const row = await this.menuService.create(payload);
      return { entityId: row?.id };
    }
    const id = entityId ?? (payload.id as string);
    if (id) {
      const row = await this.menuService.update(id, payload);
      return { entityId: row?.id };
    }
    return {};
  }

  private async applyInventory(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "delete" && entityId) {
      await this.inventoryService.delete(entityId);
      return { entityId };
    }
    if (op === "create") {
      const row = await this.inventoryService.create(payload);
      return { entityId: row?.id };
    }
    const id = entityId ?? (payload.id as string);
    if (id) {
      const row = await this.inventoryService.update(id, payload);
      return { entityId: row?.id };
    }
    return {};
  }

  private async applyRecipe(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "delete" && entityId) {
      await this.recipesService.delete(entityId);
      return { entityId };
    }
    if (op === "create") {
      const row = await this.recipesService.create(payload);
      return { entityId: row?.id };
    }
    const id = entityId ?? (payload.id as string);
    if (id) {
      const row = await this.recipesService.update(id, payload);
      return { entityId: row?.id };
    }
    return {};
  }

  private async applyStockLocation(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "delete" && entityId) {
      await this.stockLocationsService.deactivate(entityId);
      return { entityId };
    }
    if (op === "create") {
      const row = await this.stockLocationsService.create(payload);
      return { entityId: row?.id };
    }
    const id = entityId ?? (payload.id as string);
    if (id) {
      const row = await this.stockLocationsService.update(id, payload);
      return { entityId: row?.id };
    }
    return {};
  }

  private async applyOrder(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "create") {
      const result = await this.orderService.createCafeOrder({
        ...payload,
        id: entityId ?? payload.id,
      });
      return { entityId: (result as any)?.id ?? (result as any)?.order?.id };
    }
    const id = (entityId ?? payload.id ?? payload.order_id) as string;
    if (id && payload.status) {
      await this.orderService.updateStatus(id, String(payload.status));
      return { entityId: id };
    }
    return {};
  }

  private async applyPayment(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "create") {
      const row = await this.paymentService.create(payload);
      return { entityId: row?.id };
    }
    const id = entityId ?? (payload.id as string);
    if (id && payload.status) {
      await this.paymentService.updateStatus(id, String(payload.status));
      return { entityId: id };
    }
    return {};
  }

  private async applyRole(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "delete" && entityId) {
      await this.settingsService.deleteRole(entityId);
      return { entityId };
    }
    if (op === "create") {
      const row = await this.settingsService.createRole(payload as any);
      return { entityId: row?.id };
    }
    const id = entityId ?? (payload.id as string);
    if (id) {
      const row = await this.settingsService.updateRole(id, payload as any);
      return { entityId: row?.id };
    }
    return {};
  }

  private async applyPaymentMethod(
    op: string,
    payload: Record<string, unknown>,
    entityId?: string | null,
  ) {
    if (op === "delete" && entityId) {
      await this.settingsService.deletePaymentMethod(entityId);
      return { entityId };
    }
    if (op === "create") {
      const row = await this.settingsService.createPaymentMethod(payload as any);
      return { entityId: row?.id };
    }
    const id = entityId ?? (payload.id as string);
    if (id) {
      const row = await this.settingsService.updatePaymentMethod(id, payload as any);
      return { entityId: row?.id };
    }
    return {};
  }
}
