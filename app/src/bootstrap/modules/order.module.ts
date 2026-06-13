import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { ordersAdapter } from '@/infrastructure/adapters/orders.adapter';
import { OrderFacade } from '@/application/orders/order.facade';

export const registerOrderModule = (container: Container): void => {
  container.registerSingleton(TOKENS.orderFacade, new OrderFacade(ordersAdapter));
};
