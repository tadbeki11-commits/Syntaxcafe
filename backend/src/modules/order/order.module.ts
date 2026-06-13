import { Module } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";
import { OrderInventoryService } from "./order-inventory.service";
import { ZReportService } from "./z-report.service";

@Module({
  providers: [OrderService, OrderInventoryService, ZReportService],
  controllers: [OrderController],
  exports: [OrderService, OrderInventoryService, ZReportService],
})
export class OrderModule {}
