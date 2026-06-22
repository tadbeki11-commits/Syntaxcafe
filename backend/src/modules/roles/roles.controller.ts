import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { RoleRequestDto } from "./dto/role.dto";
import {
  RoleResponseDto,
  RolesResponseDto,
} from "../settings/dto/role.dto";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";

@ApiTags("roles")
@RequirePermission("roles")
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: "Get all roles" })
  @ApiOkResponse({ type: RolesResponseDto })
  @Get()
  async getAll(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const rolesList = await this.rolesService.findAll();
    return { status: "success", data: { roles: rolesList, count: rolesList.length } };
  }

  @ApiOperation({ summary: "Get a role by ID" })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: RoleResponseDto })
  @Get(":id")
  async getById(
    @Headers("x-app-client") appClient: string,
    @Param("id") id: string,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const role = await this.rolesService.findById(id);
    if (!role) throw new Error("Role not found");
    return { status: "success", data: { role } };
  }

  @ApiOperation({ summary: "Create a new role (admin)" })
  @ApiBody({ type: RoleRequestDto })
  @ApiOkResponse({ type: RoleResponseDto })
  @Post()
  async create(
    @Headers("x-app-client") appClient: string,
    @Body() body: RoleRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const role = await this.rolesService.create(body);
    return { status: "success", data: { role } };
  }

  @ApiOperation({ summary: "Update a role (admin)" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: RoleRequestDto })
  @ApiOkResponse({ type: RoleResponseDto })
  @Put(":id")
  async update(
    @Headers("x-app-client") appClient: string,
    @Param("id") id: string,
    @Body() body: RoleRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const role = await this.rolesService.update(id, body);
    return { status: "success", data: { role } };
  }

  @ApiOperation({ summary: "Soft-delete (disable) a role (admin)" })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: RoleResponseDto })
  @Delete(":id")
  async remove(
    @Headers("x-app-client") appClient: string,
    @Param("id") id: string,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const role = await this.rolesService.delete(id);
    return { status: "success", data: { role } };
  }
}
