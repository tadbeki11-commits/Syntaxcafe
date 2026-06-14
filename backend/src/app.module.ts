import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TenantMiddleware } from "./common/tenant/tenant.middleware";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { MenuModule } from "./modules/menu/menu.module";
import { OrderModule } from "./modules/order/order.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { StockLocationsModule } from "./modules/stock-locations/stock-locations.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { RolesModule } from "./modules/roles/roles.module";
import { RecipesModule } from "./modules/recipes/recipes.module";
import { SyncModule } from "./modules/sync/sync.module";
import { TablesModule } from "./modules/tables/tables.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { PlatformModule } from "./modules/platform/platform.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { DbModule } from "./db/db.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "change_this_secret",
      signOptions: { expiresIn: "8h" },
    }),
    DbModule,
    HealthModule,
    UsersModule,
    AuthModule,
    MenuModule,
    OrderModule,
    PaymentModule,
    InventoryModule,
    StockLocationsModule,
    SettingsModule,
    RolesModule,
    RecipesModule,
    SyncModule,
    TablesModule,
    OrganizationModule,
    DevicesModule,
    BranchesModule,
    PlatformModule,
    ExpensesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
