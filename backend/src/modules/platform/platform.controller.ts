import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PlatformService } from "./platform.service";
import { PlatformGuard } from "./platform.guard";

@ApiTags("platform")
@ApiBearerAuth()
@UseGuards(PlatformGuard)
@Controller("platform")
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @ApiOperation({ summary: "Platform-wide counts" })
  @Get("overview")
  overview() {
    return this.platform.overview();
  }

  @ApiOperation({ summary: "List all businesses" })
  @Get("businesses")
  listBusinesses() {
    return this.platform.listBusinesses();
  }

  @ApiOperation({ summary: "Create a business and provision its owner" })
  @Post("businesses")
  createBusiness(@Body() body: any) {
    return this.platform.createBusiness(body);
  }

  @ApiOperation({ summary: "Get a business with its branches and owner" })
  @Get("businesses/:id")
  getBusiness(@Param("id") id: string) {
    return this.platform.getBusiness(id);
  }

  @ApiOperation({ summary: "Update a business (plan, limits, suspend)" })
  @Patch("businesses/:id")
  updateBusiness(@Param("id") id: string, @Body() body: any) {
    return this.platform.updateBusiness(id, body);
  }

  @ApiOperation({ summary: "Create a branch under a business" })
  @Post("businesses/:id/branches")
  createBranch(@Param("id") id: string, @Body() body: any) {
    return this.platform.createBranch(id, body);
  }
}
