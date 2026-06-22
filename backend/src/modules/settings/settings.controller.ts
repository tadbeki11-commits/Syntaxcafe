import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Headers,
  NotFoundException,
  Delete,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";
import {
  PaymentMethodRequestDto,
  PaymentMethodResponseDto,
  PaymentMethodsResponseDto,
} from "./dto/payment-method.dto";
import {
  RoleRequestDto,
  RoleResponseDto,
  RolesResponseDto,
  CancelPasswordRequestDto,
  PrintCopiesRequestDto,
  UserSettingsResponseDto,
} from "./dto/role.dto";

@ApiTags("settings")
@RequirePermission("settings")
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── Payment Methods ────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Get all active payment methods" })
  @ApiOkResponse({ type: PaymentMethodsResponseDto })
  @Get("payment-methods")
  async getPaymentMethods(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const methods = await this.settingsService.getAllPaymentMethods();
    return {
      status: "success",
      data: { payment_methods: methods, count: methods.length },
    };
  }

  @ApiOperation({ summary: "Create a new payment method (admin)" })
  @ApiBody({ type: PaymentMethodRequestDto })
  @ApiOkResponse({ type: PaymentMethodResponseDto })
  @Post("payment-methods")
  async createPaymentMethod(
    @Headers("x-app-client") appClient: string,
    @Body() body: PaymentMethodRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const method = await this.settingsService.createPaymentMethod(body);
    return { status: "success", data: { payment_method: method } };
  }

  @ApiOperation({ summary: "Update a payment method (admin)" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: PaymentMethodRequestDto })
  @ApiOkResponse({ type: PaymentMethodResponseDto })
  @Put("payment-methods/:id")
  async updatePaymentMethod(
    @Headers("x-app-client") appClient: string,
    @Param("id") id: string,
    @Body() body: PaymentMethodRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const method = await this.settingsService.updatePaymentMethod(
      id,
      body,
    );
    return { status: "success", data: { payment_method: method } };
  }

  @ApiOperation({ summary: "Soft-delete (disable) a payment method (admin)" })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: PaymentMethodResponseDto })
  @Delete("payment-methods/:id")
  async deletePaymentMethod(
    @Headers("x-app-client") appClient: string,
    @Param("id") id: string,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const method = await this.settingsService.deletePaymentMethod(
      id,
    );
    return { status: "success", data: { payment_method: method } };
  }

  // ── Data Management ────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Cleanup all orders and payments (admin)" })
  @Post("cleanup-data")
  async cleanupData(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    await this.settingsService.cleanupData();
    return {
      status: "success",
      message: "Data cleanup completed successfully.",
    };
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Get all roles" })
  @ApiOkResponse({ type: RolesResponseDto })
  @Get("roles")
  async getRoles(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const rolesList = await this.settingsService.getAllRoles();
    return {
      status: "success",
      data: { roles: rolesList, count: rolesList.length },
    };
  }

  @ApiOperation({ summary: "Create a new role (admin)" })
  @ApiBody({ type: RoleRequestDto })
  @ApiOkResponse({ type: RoleResponseDto })
  @Post("roles")
  async createRole(
    @Headers("x-app-client") appClient: string,
    @Body() body: RoleRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const role = await this.settingsService.createRole(body);
    return { status: "success", data: { role } };
  }

  @ApiOperation({ summary: "Update a role (admin)" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: RoleRequestDto })
  @ApiOkResponse({ type: RoleResponseDto })
  @Put("roles/:id")
  async updateRole(
    @Headers("x-app-client") appClient: string,
    @Param("id") id: string,
    @Body() body: RoleRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const role = await this.settingsService.updateRole(id, body);
    return { status: "success", data: { role } };
  }

  @ApiOperation({ summary: "Soft-delete (disable) a role (admin)" })
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: RoleResponseDto })
  @Delete("roles/:id")
  async deleteRole(
    @Headers("x-app-client") appClient: string,
    @Param("id") id: string,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const role = await this.settingsService.deleteRole(id);
    return { status: "success", data: { role } };
  }

  // ── Current-User Settings ──────────────────────────────────────────────────

  @ApiOperation({
    summary: "Get current user's settings (cancel-password, print-copies)",
  })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  @Get("current-user-settings")
  async getCurrentUserSettings(
    @Headers("x-app-client") appClient: string,
    @Headers("x-user-id") userIdHeader: string,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    if (!userIdHeader) throw new UnauthorizedException("User ID required");
    const settings = await this.settingsService.getCurrentUserSettings(userIdHeader);
    return { status: "success", data: settings };
  }

  @ApiOperation({
    summary: "Update current user's cancellation override password",
  })
  @ApiBody({ type: CancelPasswordRequestDto })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  @Put("current-user-settings/cancel-password")
  async updateCancelPassword(
    @Headers("x-app-client") appClient: string,
    @Headers("x-user-id") userIdHeader: string,
    @Body() body: CancelPasswordRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    if (!userIdHeader) throw new UnauthorizedException("User ID required");
    try {
      const result = await this.settingsService.updateCancelPassword(
        userIdHeader,
        body.cancel_password,
      );
      return { status: "success", data: result };
    } catch (error: any) {
      if (error.message.includes("Only admins can change")) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @ApiOperation({ summary: "Update current user's order print-copies setting" })
  @ApiBody({ type: PrintCopiesRequestDto })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  @Put("current-user-settings/print-copies")
  async updatePrintCopies(
    @Headers("x-app-client") appClient: string,
    @Headers("x-user-id") userIdHeader: string,
    @Body() body: PrintCopiesRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    if (!userIdHeader) throw new UnauthorizedException("User ID required");
    const result = await this.settingsService.updatePrintCopies(
      userIdHeader,
      String(body.print_copies),
    );
    return { status: "success", data: result };
  }

  // ── System / Inventory Settings ────────────────────────────────────────────

  @ApiOperation({ summary: "Get all system settings key/value pairs" })
  @Get("system/all")
  async getAllSystemSettings(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const settings = await this.settingsService.getAllSystemSettings();
    return { status: "success", data: { settings, count: settings.length } };
  }

  @ApiOperation({ summary: "Get inventory-related system settings" })
  @Get("system/inventory")
  async getInventorySettings(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.getInventorySettings();
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Update inventory-related system settings (admin)" })
  @Put("system/inventory")
  async updateInventorySettings(
    @Headers("x-app-client") appClient: string,
    @Body() body: { allow_low_stock_orders: boolean },
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.updateInventorySettings({
      allow_low_stock_orders: Boolean(body.allow_low_stock_orders),
    });
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Get organization-related system settings" })
  @Get("system/organizations")
  async getOrganizationSettings(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.getOrganizationSettings();
    return { status: "success", data };
  }

  @ApiOperation({
    summary: "Update organization-related system settings (admin)",
  })
  @Put("system/organizations")
  async updateOrganizationSettings(
    @Headers("x-app-client") appClient: string,
    @Body() body: { allow_cashier_manage_org_orders: boolean },
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.updateOrganizationSettings({
      allow_cashier_manage_org_orders: Boolean(
        body.allow_cashier_manage_org_orders,
      ),
    });
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Get table-selection system settings" })
  @Get("system/table-selection")
  async getTableSelectionSettings(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.getTableSelectionSettings();
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Update table-selection system settings (admin)" })
  @Put("system/table-selection")
  async updateTableSelectionSettings(
    @Headers("x-app-client") appClient: string,
    @Body() body: { force_table_selection: boolean },
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.updateTableSelectionSettings({
      force_table_selection: Boolean(body.force_table_selection),
    });
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Get printer department routing settings" })
  @Get("system/printer-routing")
  async getPrinterRoutingSettings(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.getPrinterRoutingSettings();
    return { status: "success", data };
  }

  @ApiOperation({
    summary: "Update printer department routing settings (admin)",
  })
  @Put("system/printer-routing")
  async updatePrinterRoutingSettings(
    @Headers("x-app-client") appClient: string,
    @Body() body: { printer_department_routing: Record<string, unknown> },
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.updatePrinterRoutingSettings({
      printer_department_routing: body?.printer_department_routing ?? {},
    });
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Get receipt system settings" })
  @Get("system/receipt")
  async getReceiptSettings(@Headers("x-app-client") appClient: string) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.getReceiptSettings();
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Update receipt system settings (admin)" })
  @Put("system/receipt")
  async updateReceiptSettings(
    @Headers("x-app-client") appClient: string,
    @Body() body: { enable_cashier_receipt: boolean },
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.updateReceiptSettings({
      enable_cashier_receipt: Boolean(body.enable_cashier_receipt),
    });
    return { status: "success", data };
  }

  @ApiOperation({
    summary: "Get whether a branch cancel-order password is set",
  })
  @Get("system/cancel-password")
  async getCancelPasswordStatus(
    @Headers("x-app-client") appClient: string,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    const data = await this.settingsService.getCancelPasswordStatus();
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Set the branch cancel-order password (owner)" })
  @ApiBody({ type: CancelPasswordRequestDto })
  @Put("system/cancel-password")
  async updateSystemCancelPassword(
    @Headers("x-app-client") appClient: string,
    @Body() body: CancelPasswordRequestDto,
  ) {
    if (appClient !== "tauri-pos-app") {
      throw new ForbiddenException("Access denied.");
    }
    try {
      const data = await this.settingsService.updateSystemCancelPassword(
        body.cancel_password,
      );
      return { status: "success", data };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
