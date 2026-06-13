import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { registerUserModule } from '@/bootstrap/modules/user.module';
import { registerMenuModule } from '@/bootstrap/modules/menu.module';
import { registerOrderModule } from '@/bootstrap/modules/order.module';
import { registerPaymentModule } from '@/bootstrap/modules/payment.module';
import { registerInventoryModule } from '@/bootstrap/modules/inventory.module';
import { registerRecipeModule } from '@/bootstrap/modules/recipe.module';
import { registerTableModule } from '@/bootstrap/modules/table.module';
import { registerSettingsModule } from '@/bootstrap/modules/settings.module';
import { registerAuthModule } from '@/bootstrap/modules/auth.module';
import { registerAttendanceModule } from '@/bootstrap/modules/attendance.module';
import { registerOrganizationModule } from '@/bootstrap/modules/organization.module';
import { ConnectivityMonitor } from '@/infrastructure/sync/connectivity-monitor';

export const registerAllModules = (container: Container): void => {
  registerAuthModule(container);
  registerUserModule(container);
  registerMenuModule(container);
  registerOrderModule(container);
  registerPaymentModule(container);
  registerInventoryModule(container);
  registerRecipeModule(container);
  registerTableModule(container);
  registerSettingsModule(container);
  registerAttendanceModule(container);
  registerOrganizationModule(container);

  container.register(TOKENS.connectivityMonitor, () => new ConnectivityMonitor());
};
