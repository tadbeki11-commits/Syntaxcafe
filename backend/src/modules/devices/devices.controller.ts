import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DevicesService } from "./devices.service";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";

@ApiTags("devices")
@RequirePermission("devices")
@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @ApiOperation({
    summary: "List the devices enrolled to a branch (owner/platform)",
  })
  @Get()
  list(@Query("branch_id") branchId: string) {
    return this.devicesService.listForBranch(branchId);
  }

  @ApiOperation({
    summary: "Get a branch's current reusable enrollment code (owner/platform)",
  })
  @Get("enrollment-codes")
  getEnrollmentCode(@Query("branch_id") branchId: string) {
    return this.devicesService.getEnrollmentCode(branchId);
  }

  @ApiOperation({
    summary: "Set/rotate a branch's reusable enrollment code (owner/platform)",
  })
  @Post("enrollment-codes")
  rotateEnrollmentCode(@Body() body: { branch_id: string }) {
    return this.devicesService.rotateEnrollmentCode(body?.branch_id);
  }

  @ApiOperation({
    summary: "Redeem a branch enrollment code for a long-lived device token",
  })
  @Post("enroll")
  enroll(@Body() body: { code: string; device_name?: string }) {
    return this.devicesService.enroll(body?.code, body?.device_name);
  }

  @ApiOperation({
    summary: "Kick out (remove) an enrolled device (owner/platform)",
  })
  @Delete(":id")
  remove(@Param("id") id: string, @Query("branch_id") branchId: string) {
    return this.devicesService.removeDevice(id, branchId);
  }
}
