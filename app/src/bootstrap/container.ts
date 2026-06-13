import { Database } from '@/infrastructure/database/database';
import { registerAllModules } from '@/bootstrap/register-modules';

type Factory<T> = () => T;

export class Container {
  private readonly singletons = new Map<symbol, unknown>();
  private readonly factories = new Map<symbol, Factory<unknown>>();

  registerSingleton<T>(token: symbol, instance: T): void {
    this.singletons.set(token, instance);
  }

  register<T>(token: symbol, factory: Factory<T>): void {
    this.factories.set(token, factory as Factory<unknown>);
  }

  resolve<T>(token: symbol): T {
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }
    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`No registration for token ${String(token)}`);
    }
    const instance = factory();
    this.singletons.set(token, instance);
    return instance as T;
  }
}

export const TOKENS = {
  authFacade: Symbol('AuthFacade'),
  userFacade: Symbol('UserFacade'),
  menuFacade: Symbol('MenuFacade'),
  orderFacade: Symbol('OrderFacade'),
  paymentFacade: Symbol('PaymentFacade'),
  inventoryFacade: Symbol('InventoryFacade'),
  recipeFacade: Symbol('RecipeFacade'),
  tableFacade: Symbol('TableFacade'),
  settingsFacade: Symbol('SettingsFacade'),
  attendanceFacade: Symbol('AttendanceFacade'),
  organizationFacade: Symbol('OrganizationFacade'),
  connectivityMonitor: Symbol('ConnectivityMonitor'),
} as const;

let rootContainer: Container | null = null;

export const buildContainer = (): Container => {
  const container = new Container();
  registerAllModules(container);
  return container;
};

export const getContainer = (): Container => {
  if (!rootContainer) {
    rootContainer = buildContainer();
  }
  return rootContainer;
};

export const bootstrapApp = async (): Promise<void> => {
  await Database.init();
  getContainer();
};
