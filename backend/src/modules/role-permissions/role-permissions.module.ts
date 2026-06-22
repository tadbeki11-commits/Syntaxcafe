import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RolePermissionsService } from "./role-permissions.service";
import { RolePermissionsController } from "./role-permissions.controller";
import { PermissionsGuard } from "../../common/permissions/permissions.guard";

@Module({
  controllers: [RolePermissionsController],
  providers: [
    RolePermissionsService,
    // Registered here (where the service lives) but applied globally. Routes
    // opt in via @RequirePermission; everything else passes through.
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [RolePermissionsService],
})
export class RolePermissionsModule {}
