import { CanActivate, ForbiddenException, Injectable } from "@nestjs/common";
import { getTenant } from "../../common/tenant/tenant-context";

// Allows only platform super admins (scope === "platform"). The tenant scope is
// set by TenantMiddleware from the JWT and survives into the guard via ALS.
@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(): boolean {
    const tenant = getTenant();
    if (tenant?.scope !== "platform") {
      throw new ForbiddenException("Platform administrator access required");
    }
    return true;
  }
}
