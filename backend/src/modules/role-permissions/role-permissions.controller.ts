import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { RolePermissionsService } from "./role-permissions.service";
import { PermissionMatrix } from "../../common/permissions/permissions.constants";

@ApiTags("role-permissions")
@Controller("role-permissions")
export class RolePermissionsController {
  constructor(private readonly service: RolePermissionsService) {}

  @ApiOperation({ summary: "Effective permissions for the signed-in user" })
  @Get("me")
  async getMine() {
    const data = await this.service.getMine();
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Permission matrix for every configurable role" })
  @Get()
  async list() {
    const roles = await this.service.list();
    return { status: "success", data: { roles } };
  }

  @ApiOperation({ summary: "Set a role's permission matrix (owner only)" })
  @ApiParam({ name: "role" })
  @Put(":role")
  async upsert(
    @Param("role") role: string,
    @Body() body: { permissions: PermissionMatrix },
  ) {
    const permissions = await this.service.upsert(role, body?.permissions ?? {});
    return { status: "success", data: { role, permissions } };
  }
}
