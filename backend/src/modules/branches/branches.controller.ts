import { Controller, ForbiddenException, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { BranchesService } from "./branches.service";
import { getTenant } from "../../common/tenant/tenant-context";

@ApiTags("branches")
@Controller("branches")
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  // The branches the current owner can switch between (their own business).
  @ApiOperation({ summary: "List branches for the current owner's business" })
  @Get()
  list() {
    const tenant = getTenant();
    if (!tenant?.businessId) {
      throw new ForbiddenException("No business context");
    }
    return this.branches.listForBusiness(tenant.businessId);
  }
}
