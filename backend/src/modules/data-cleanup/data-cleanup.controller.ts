import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DataCleanupService } from "./data-cleanup.service";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";

// Shares the "devices" permission resource: owners/platform bypass the guard,
// and device-token (POS) requests are role-less and exempt.
@ApiTags("data-cleanup")
@RequirePermission("devices")
@Controller("data-cleanup")
export class DataCleanupController {
  constructor(private readonly service: DataCleanupService) {}

  // ── Device-facing (x-device-token) ─────────────────────────────────────────

  @ApiOperation({ summary: "Device requests a local data cleanup" })
  @Post("requests")
  create(
    @Headers("x-device-token") deviceToken: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.createRequest(deviceToken, body?.reason);
  }

  @ApiOperation({ summary: "Device polls its active cleanup request" })
  @Get("requests/active")
  active(@Headers("x-device-token") deviceToken: string) {
    return this.service.getActiveRequest(deviceToken);
  }

  @ApiOperation({
    summary: "Device confirms wipe; clears branch orders/payments and completes",
  })
  @Post("requests/:id/complete")
  complete(
    @Param("id") id: string,
    @Headers("x-device-token") deviceToken: string,
  ) {
    return this.service.completeRequest(id, deviceToken);
  }

  // ── Owner-facing (JWT) ─────────────────────────────────────────────────────

  @ApiOperation({ summary: "List a branch's cleanup requests (owner/platform)" })
  @Get("requests")
  list(@Query("branch_id") branchId: string) {
    return this.service.listForBranch(branchId);
  }

  @ApiOperation({ summary: "Approve a cleanup request (owner/platform)" })
  @Post("requests/:id/approve")
  approve(@Param("id") id: string) {
    return this.service.approve(id);
  }

  @ApiOperation({ summary: "Reject a cleanup request (owner/platform)" })
  @Post("requests/:id/reject")
  reject(@Param("id") id: string) {
    return this.service.reject(id);
  }
}
