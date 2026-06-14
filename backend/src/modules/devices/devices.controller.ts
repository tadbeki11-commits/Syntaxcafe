import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DevicesService } from "./devices.service";

@ApiTags("devices")
@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

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
}
