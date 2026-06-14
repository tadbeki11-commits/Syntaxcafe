import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DevicesService } from "../../modules/devices/devices.service";
import { BranchesService } from "../../modules/branches/branches.service";
import {
  DEFAULT_BRANCH_ID,
  DEFAULT_BUSINESS_ID,
  runWithTenant,
  TenantContext,
  TenantScope,
} from "./tenant-context";

// Resolves the tenant for every request and runs the handler inside an
// AsyncLocalStorage scope so singleton services can read it via getTenant().
//
// Resolution order:
//   1. A device token (x-device-token) — pins the request to the device's branch.
//   2. A verified JWT (web admin / platform console) — authoritative tenant + scope.
//   3. Explicit x-business-id / x-branch-id headers.
//   4. The default business+branch (back-compat for the offline app pre-enrollment).
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly devices: DevicesService,
    private readonly branches: BranchesService,
  ) {}

  async use(req: any, _res: any, next: () => void) {
    const ctx = await this.resolve(req);
    runWithTenant(ctx, () => next());
  }

  private async resolve(req: any): Promise<TenantContext> {
    const deviceToken = req.headers["x-device-token"] as string | undefined;
    if (deviceToken) {
      const tenant = await this.devices.resolveToken(deviceToken);
      if (tenant) {
        return {
          businessId: tenant.businessId,
          branchId: tenant.branchId,
          scope: "branch",
          userId: (req.headers["x-user-id"] as string) || null,
        };
      }
    }

    const auth: string | undefined = req.headers["authorization"];
    if (auth?.startsWith("Bearer ")) {
      try {
        const p: any = this.jwt.verify(auth.slice(7));
        const ctx: TenantContext = {
          businessId: p.business_id ?? null,
          branchId: p.branch_id ?? null,
          scope: (p.scope as TenantScope) ?? "branch",
          userId: p.sub ?? null,
          username: p.username ?? null,
        };

        // Owners/platform admins aren't pinned to a branch — they pick one via
        // the branch switcher (x-branch-id). Validate it before honoring it.
        const selected = req.headers["x-branch-id"] as string | undefined;
        if (selected && ctx.scope === "platform") {
          ctx.branchId = selected;
          const selBusiness = req.headers["x-business-id"] as string | undefined;
          if (selBusiness) ctx.businessId = selBusiness;
        } else if (selected && ctx.scope === "owner" && ctx.businessId) {
          if (await this.branches.belongsToBusiness(selected, ctx.businessId)) {
            ctx.branchId = selected;
          }
        }
        return ctx;
      } catch {
        // Invalid/expired token: fall through to header/default resolution.
      }
    }

    const headerBranch = req.headers["x-branch-id"] as string | undefined;
    const headerBusiness = req.headers["x-business-id"] as string | undefined;
    return {
      businessId: headerBusiness || DEFAULT_BUSINESS_ID,
      branchId: headerBranch || DEFAULT_BRANCH_ID,
      scope: "branch",
      userId: (req.headers["x-user-id"] as string) || null,
    };
  }
}
