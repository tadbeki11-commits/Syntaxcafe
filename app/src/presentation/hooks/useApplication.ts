import { getContainer, TOKENS } from '@/bootstrap/container';
import type { AuthFacade } from '@/application/auth/auth.facade';
import type { UserFacade } from '@/application/users/user.facade';
import type { MenuFacade } from '@/application/menu/menu.facade';
import type { OrderFacade } from '@/application/orders/order.facade';
import type { PaymentFacade } from '@/application/payments/payment.facade';
import type { InventoryFacade } from '@/application/inventory/inventory.facade';
import type { RecipeFacade } from '@/application/recipes/recipe.facade';
import type { TableFacade } from '@/application/tables/table.facade';
import type { SettingsFacade } from '@/application/settings/settings.facade';
import type { AttendanceFacade } from '@/application/attendance/attendance.facade';

export const useApplication = () => {
  const container = getContainer();
  return {
    auth: container.resolve<AuthFacade>(TOKENS.authFacade),
    users: container.resolve<UserFacade>(TOKENS.userFacade),
    menu: container.resolve<MenuFacade>(TOKENS.menuFacade),
    orders: container.resolve<OrderFacade>(TOKENS.orderFacade),
    payments: container.resolve<PaymentFacade>(TOKENS.paymentFacade),
    inventory: container.resolve<InventoryFacade>(TOKENS.inventoryFacade),
    recipes: container.resolve<RecipeFacade>(TOKENS.recipeFacade),
    tables: container.resolve<TableFacade>(TOKENS.tableFacade),
    settings: container.resolve<SettingsFacade>(TOKENS.settingsFacade),
    attendance: container.resolve<AttendanceFacade>(TOKENS.attendanceFacade),
  };
};
