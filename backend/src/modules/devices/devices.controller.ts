import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DevicesService } from "./devices.service";

@ApiTags("devices")
@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @ApiOperation({
    summary: "Mint a one-time device enrollment code for a branch (owner/platform)",
  })
  @Post("enrollment-codes")
  createEnrollmentCode(@Body() body: { branch_id: string; name?: string }) {
    return this.devicesService.createEnrollmentCode(body?.branch_id, body?.name);
  }

  @ApiOperation({
    summary: "Redeem an enrollment code for a long-lived device token",
  })
  @Post("enroll")
  enroll(@Body() body: { code: string; device_name?: string }) {
    return this.devicesService.enroll(body?.code, body?.device_name);
  }
}
