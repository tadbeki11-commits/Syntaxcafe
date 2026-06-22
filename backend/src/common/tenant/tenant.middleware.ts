import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
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
        // The device token pins the branch, but a web back-office operator also
        // sends a Bearer JWT — decode it (if present) to carry their role, which
        // the permission guard needs. The desktop POS sends no JWT, so role stays
        // null and the guard treats it as exempt.
        const jwt = this.tryDecodeBearer(req);
        return {
          businessId: tenant.businessId,
          branchId: tenant.branchId,
          scope: "branch",
          userId: (jwt?.userId ?? (req.headers["x-user-id"] as string)) || null,
          username: jwt?.username ?? null,
          role: jwt?.role ?? null,
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
          role: p.role ?? null,
        };

        // Owners/platform admins aren't pinned to a branch — they pick one via
        // the branch switcher (x-branch-id). Validate it before honoring it.
        const selected = req.headers["x-branch-id"] as string | undefined;
        if (selected && ctx.scope === "platform") {
          ctx.branchId = selected;
          const selBusiness = req.headers["x-business-id"] as
            | string
            | undefined;
          if (selBusiness) ctx.businessId = selBusiness;
        } else if (selected && ctx.scope === "owner" && ctx.businessId) {
          if (await this.branches.belongsToBusiness(selected, ctx.businessId)) {
            ctx.branchId = selected;
          }
        }

        // Owner hasn't picked a branch yet (fresh login, before the switcher
        // sets x-branch-id) — fall back to their first branch so branch-scoped
        // reads/writes don't crash. The switcher reconciles the selection.
        if (!ctx.branchId && ctx.scope === "owner" && ctx.businessId) {
          ctx.branchId = await this.branches.firstBranchId(ctx.businessId);
        }
        return ctx;
      } catch {
        // A Bearer token was explicitly presented but is invalid/expired. Don't
        // silently degrade to branch/default scope — that's what made an expired
        // web session resurface as a confusing 403 ("Platform administrator
        // access required") instead of a clean "log in again". Reject with 401 so
        // the web client can clear the stale cookie and redirect to login. (The
        // desktop POS never sends a Bearer — it uses x-device-token — so this
        // can't affect it.)
        throw new UnauthorizedException("Session expired. Please sign in again.");
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

  /** Best-effort decode of a Bearer JWT for identity/role. Null if absent/invalid. */
  private tryDecodeBearer(
    req: any,
  ): {
    role: string | null;
    userId: string | null;
    username: string | null;
  } | null {
    const auth: string | undefined = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) return null;
    try {
      const p: any = this.jwt.verify(auth.slice(7));
      return {
        role: p.role ?? null,
        userId: p.sub ?? null,
        username: p.username ?? null,
      };
    } catch {
      return null;
    }
  }
}
