import { Module } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";
import { OrderInventoryService } from "./order-inventory.service";
import { ZReportService } from "./z-report.service";
import { OrdersGateway } from "./orders.gateway";

@Module({
  providers: [
    OrderService,
    OrderInventoryService,
    ZReportService,
    OrdersGateway,
  ],
  controllers: [OrderController],
  exports: [OrderService, OrderInventoryService, ZReportService, OrdersGateway],
})
export class OrderModule {}
