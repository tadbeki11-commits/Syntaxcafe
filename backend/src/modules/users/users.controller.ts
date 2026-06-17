import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  Headers,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── List / Search ───────────────────────────────────────────────────────

  @ApiOperation({ summary: "Get all users, optionally filtered by role" })
  @ApiQuery({ name: "role", required: false })
  @ApiQuery({ name: "is_active", required: false })
  @Get()
  async getAll(
    @Headers("x-app-client") appClient: string,
    @Query("role") role?: string,
    @Query("is_active") isActive?: string,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied. Restricted to the local POS application.");
    }

    const params: { role?: string; is_active?: boolean } = {};
    if (role) params.role = role;
    if (isActive !== undefined) params.is_active = isActive !== "false";

    const userList = await this.usersService.findAll(params);
    return {
      status: "success",
      data: {
        users: userList.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          full_name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name,
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          is_active: u.is_active,
          pin_hash: u.pin_hash,
          password_hash: u.password_hash,
          created_at: u.created_at,
          updated_at: u.updated_at,
        })),
      },
    };
  }

  @ApiOperation({ summary: "Get all users without sensitive auth data (Public)" })
  @ApiQuery({ name: "role", required: false })
  @ApiQuery({ name: "is_active", required: false })
  @Get("public")
  async getPublicUsers(
    @Query("role") role?: string,
    @Query("is_active") isActive?: string,
  ) {
    const params: { role?: string; is_active?: boolean } = {};
    if (role) params.role = role;
    if (isActive !== undefined) params.is_active = isActive !== "false";

    const userList = await this.usersService.findAll(params);
    return {
      status: "success",
      data: {
        users: userList.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          full_name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name,
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          is_active: u.is_active,
          created_at: u.created_at,
          updated_at: u.updated_at,
        })),
      },
    };
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Create a new user" })
  @Post()
  async create(@Body() body: any) {
    try {
      const user = await this.usersService.register(body);
      return {
        status: "success",
        message: "User created successfully",
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            is_active: user.is_active,
            created_at: user.created_at,
            password_hash: user.password_hash,
            pin_hash: user.pin_hash,
          },
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || "Failed to create user");
    }
  }

  // ─── Bulk Sync ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Bulk sync users" })
  @Post("sync")
  async bulkSync(@Body() body: any) {
    const data = await this.usersService.syncBulk(body.users || []);
    return {
      status: "success",
      message: "Users bulk sync successful",
      data,
    };
  }

  @ApiOperation({ summary: "Get a user by ID" })
  @ApiParam({ name: "id" })
  @Get(":id")
  async getById(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException("User not found");
    return {
      status: "success",
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
    };
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Update a user's profile" })
  @ApiParam({ name: "id" })
  @Put(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    try {
      const updated = await this.usersService.updateProfile(id, body);
      return {
        status: "success",
        message: "User updated successfully",
        data: {
          user: {
            id: updated.id,
            username: updated.username,
            role: updated.role,
            full_name: `${updated.first_name || ""} ${updated.last_name || ""}`.trim(),
            first_name: updated.first_name,
            last_name: updated.last_name,
            phone: updated.phone,
            is_active: updated.is_active,
            updated_at: updated.updated_at,
          },
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || "Failed to update user");
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Delete a user" })
  @ApiParam({ name: "id" })
  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.usersService.deleteUser(id);
    return { status: "success", message: "User deleted successfully" };
  }

  // ─── Toggle active status ─────────────────────────────────────────────────

  @ApiOperation({ summary: "Toggle active/inactive status of a user" })
  @ApiParam({ name: "id" })
  @Patch(":id/toggle-status")
  async toggleStatus(@Param("id") id: string) {
    try {
      const result = await this.usersService.toggleStatus(id);
      return {
        status: "success",
        message: `User ${result.is_active ? "activated" : "deactivated"} successfully`,
        data: result,
      };
    } catch (error: any) {
      throw new NotFoundException(error.message || "User not found");
    }
  }

  // ─── Change password ──────────────────────────────────────────────────────

  @ApiOperation({ summary: "Change a user's password" })
  @ApiParam({ name: "id" })
  @Post(":id/change-password")
  async changePassword(@Param("id") id: string, @Body() body: any) {
    const { current_password, new_password } = body;
    if (!current_password || !new_password) {
      throw new BadRequestException("current_password and new_password are required");
    }
    try {
      await this.usersService.changePassword(id, current_password, new_password);
      return { status: "success", message: "Password updated successfully" };
    } catch (error: any) {
      throw new BadRequestException(error.message || "Failed to change password");
    }
  }

  // ─── Change PIN ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Change a user's 4-digit login PIN" })
  @ApiParam({ name: "id" })
  @Post(":id/change-pin")
  async changePin(@Param("id") id: string, @Body() body: any) {
    const { current_pin, new_pin } = body;
    if (!current_pin || !new_pin) {
      throw new BadRequestException("current_pin and new_pin are required");
    }
    if (!/^\d{4}$/.test(new_pin)) {
      throw new BadRequestException("new_pin must be exactly 4 digits");
    }
    try {
      await this.usersService.changePin(id, current_pin, new_pin);
      return { status: "success", message: "PIN updated successfully" };
    } catch (error: any) {
      throw new BadRequestException(error.message || "Failed to change PIN");
    }
  }
}
