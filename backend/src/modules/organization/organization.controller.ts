import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { OrganizationService } from "./organization.service";
import { OrganizationRequestDto } from "./dto/organization.dto";
import { AddOrgPaymentDto, AddOrgTransactionDto } from "./dto/org-credit.dto";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";

@ApiTags("organizations")
@RequirePermission("customers")
@Controller("organizations")
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @ApiOperation({ summary: "List organizations" })
  @Get()
  async getAll(@Query("include_inactive") includeInactive?: string) {
    const organizations = await this.organizationService.findAll(
      includeInactive === "true" || includeInactive === "1",
    );
    return {
      status: "success",
      data: { organizations, count: organizations.length },
    };
  }

  @ApiOperation({ summary: "Get a single organization" })
  @Get(":id")
  async getOne(@Param("id") id: string) {
    const organization = await this.organizationService.findById(id);
    return { status: "success", data: { organization } };
  }

  @ApiOperation({ summary: "List orders for an organization" })
  @Get(":id/orders")
  async getOrders(@Param("id") id: string) {
    const orders = await this.organizationService.getOrders(id);
    return { status: "success", data: { orders, count: orders.length } };
  }

  @ApiOperation({ summary: "Create an organization (admin)" })
  @Post()
  async create(@Body() body: OrganizationRequestDto) {
    const organization = await this.organizationService.create(body);
    return {
      status: "success",
      message: "Organization created",
      data: { organization },
    };
  }

  @ApiOperation({ summary: "Update an organization (admin)" })
  @Put(":id")
  async update(@Param("id") id: string, @Body() body: OrganizationRequestDto) {
    const organization = await this.organizationService.update(
      id,
      body,
    );
    return {
      status: "success",
      message: "Organization updated",
      data: { organization },
    };
  }

  @ApiOperation({ summary: "Deactivate (soft-delete) an organization (admin)" })
  @Delete(":id")
  async deactivate(@Param("id") id: string) {
    const organization = await this.organizationService.deactivate(id);
    return {
      status: "success",
      message: "Organization deactivated",
      data: { organization },
    };
  }

  // ─── Credit System ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Get credit summary for an organization (admin)" })
  @Get(":id/credit")
  async getCreditSummary(@Param("id") id: string) {
    const data = await this.organizationService.getCreditSummary(id);
    return { status: "success", data };
  }

  @ApiOperation({ summary: "Add a credit payment to an organization (admin)" })
  @Post(":id/payments")
  async addPayment(
    @Param("id") id: string,
    @Body() body: AddOrgPaymentDto,
  ) {
    const payment = await this.organizationService.addPayment(id, body);
    return {
      status: "success",
      message: "Payment added",
      data: { payment },
    };
  }

  @ApiOperation({ summary: "List credit payments for an organization (admin)" })
  @Get(":id/payments")
  async getPayments(@Param("id") id: string) {
    const payments = await this.organizationService.getPayments(id);
    return {
      status: "success",
      data: { payments, count: payments.length },
    };
  }

  @ApiOperation({
    summary: "Add a service-usage transaction to an organization (admin)",
  })
  @Post(":id/transactions")
  async addTransaction(
    @Param("id") id: string,
    @Body() body: AddOrgTransactionDto,
  ) {
    const transaction = await this.organizationService.addTransaction(
      id,
      body,
    );
    return {
      status: "success",
      message: "Transaction recorded",
      data: { transaction },
    };
  }

  @ApiOperation({
    summary: "List service-usage transactions for an organization (admin)",
  })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Get(":id/transactions")
  async getTransactions(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    const result = await this.organizationService.getTransactions(
      id,
      pageNum,
      limitNum,
    );
    return {
      status: "success",
      data: result,
    };
  }
}
