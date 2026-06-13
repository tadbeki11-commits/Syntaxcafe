import {
  api,
  notImplemented,
  API_BASE_URL,
  isOnline,
  generateEscPosBase64,
} from "@/infrastructure/api/http-client";
import { getContainer, TOKENS } from "@/bootstrap/container";
import type { AuthFacade } from "@/application/auth/auth.facade";
import type { UserFacade } from "@/application/users/user.facade";
import type { MenuFacade } from "@/application/menu/menu.facade";
import type { OrderFacade } from "@/application/orders/order.facade";
import type { PaymentFacade } from "@/application/payments/payment.facade";
import type { InventoryFacade } from "@/application/inventory/inventory.facade";
import type { RecipeFacade } from "@/application/recipes/recipe.facade";
import type { TableFacade } from "@/application/tables/table.facade";
import type { SettingsFacade } from "@/application/settings/settings.facade";
import type { AttendanceFacade } from "@/application/attendance/attendance.facade";
import type { OrganizationFacade } from "@/application/organization/organization.facade";
import { expensesAdapter } from "@/infrastructure/adapters/expenses.adapter";
import { stockLocationsAdapter } from "@/infrastructure/adapters/stock-locations.adapter";

export { API_BASE_URL, isOnline, api, generateEscPosBase64 };

const resolve = <T>(token: symbol): T => getContainer().resolve<T>(token);

const appServices = {
  get auth() {
    return resolve<AuthFacade>(TOKENS.authFacade);
  },
  get users() {
    return resolve<UserFacade>(TOKENS.userFacade);
  },
  get menu() {
    return resolve<MenuFacade>(TOKENS.menuFacade);
  },
  get orders() {
    return resolve<OrderFacade>(TOKENS.orderFacade);
  },
  get payments() {
    return resolve<PaymentFacade>(TOKENS.paymentFacade);
  },
  get inventory() {
    return resolve<InventoryFacade>(TOKENS.inventoryFacade);
  },
  stockLocations: stockLocationsAdapter,
  get recipes() {
    return resolve<RecipeFacade>(TOKENS.recipeFacade);
  },
  get tables() {
    return resolve<TableFacade>(TOKENS.tableFacade);
  },
  get settings() {
    return resolve<SettingsFacade>(TOKENS.settingsFacade);
  },
  get attendance() {
    return resolve<AttendanceFacade>(TOKENS.attendanceFacade);
  },
  get organizations() {
    return resolve<OrganizationFacade>(TOKENS.organizationFacade);
  },
  employees: { getLedger: (..._args: any[]) => notImplemented("Employees") },
  expenses: expensesAdapter,
  sync: {
    getConfig: (..._args: any[]) => notImplemented("Sync"),
    updateConfig: (..._args: any[]) => notImplemented("Sync"),
    getRemoteStatus: (..._args: any[]) => notImplemented("Sync"),
    pushRemote: (..._args: any[]) => notImplemented("Sync"),
    pullRemote: (..._args: any[]) => notImplemented("Sync"),
  },
  health: () => api.get("/health"),
};

export default appServices;

export const getAppServices = () => appServices;
