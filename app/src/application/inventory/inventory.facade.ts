// @ts-nocheck
import { inventoryAdapter } from '@/infrastructure/adapters/inventory.adapter';

type InventoryAdapter = typeof inventoryAdapter;

export class InventoryFacade {
  constructor(
    private readonly adapter: InventoryAdapter,
  ) {}

  getAll = (page?: number, limit?: number, search?: string) => this.adapter.getAll(page, limit, search);
  getTransfers = () => this.adapter.getTransfers();
  getMovements = (id: number | string, locationId?: number | string) =>
    this.adapter.getMovements(id, locationId);
  updateQuantity = (id: number | string, data: unknown) =>
    this.adapter.updateQuantity(id, data);
  createTransfer = (data: unknown) => this.adapter.createTransfer(data);
  receiveTransfer = (id: number | string) => this.adapter.receiveTransfer(id);

  create = async (data: Record<string, unknown>) => {
    const result = await this.adapter.create(data);
    return result;
  };

  update = async (id: number | string, data: Record<string, unknown>) => {
    const result = await this.adapter.update(id, data);
    return result;
  };

  delete = async (id: number | string) => {
    const result = await this.adapter.delete(id);
    return result;
  };
}
