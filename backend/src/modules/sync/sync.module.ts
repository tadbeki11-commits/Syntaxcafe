import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { SyncApplierService } from "./sync-applier.service";
import { UsersModule } from "../users/users.module";
import { MenuModule } from "../menu/menu.module";
import { InventoryModule } from "../inventory/inventory.module";
import { RecipesModule } from "../recipes/recipes.module";
import { StockLocationsModule } from "../stock-locations/stock-locations.module";
import { OrderModule } from "../order/order.module";
import { PaymentModule } from "../payment/payment.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [
    UsersModule,
    MenuModule,
    InventoryModule,
    RecipesModule,
    StockLocationsModule,
    OrderModule,
    PaymentModule,
    SettingsModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncApplierService],
  exports: [SyncService, SyncApplierService],
})
export class SyncModule {}
