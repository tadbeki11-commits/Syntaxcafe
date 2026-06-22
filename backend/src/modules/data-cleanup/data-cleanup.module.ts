import { Module } from "@nestjs/common";
import { DataCleanupController } from "./data-cleanup.controller";
import { DataCleanupService } from "./data-cleanup.service";

@Module({
  controllers: [DataCleanupController],
  providers: [DataCleanupService],
})
export class DataCleanupModule {}
