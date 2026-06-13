import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { inventoryAdapter } from '@/infrastructure/adapters/inventory.adapter';
import { InventoryFacade } from '@/application/inventory/inventory.facade';

export const registerInventoryModule = (container: Container): void => {
  container.registerSingleton(
    TOKENS.inventoryFacade,
    new InventoryFacade(inventoryAdapter),
  );
};
