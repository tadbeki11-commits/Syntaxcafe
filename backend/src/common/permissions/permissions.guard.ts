import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getTenant } from "../tenant/tenant-context";
import { RolePermissionsService } from "../../modules/role-permissions/role-permissions.service";
import { Action, isAllAccessRole } from "./permissions.constants";
import { PERMISSION_RESOURCE } from "./require-permission.decorator";

function methodToAction(method: string): Action {
  switch (method.toUpperCase()) {
    case "POST":
      return "write";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return "read";
  }
}

// Global, opt-in guard. Routes without @RequirePermission pass through untouched.
// The desktop POS sends no back-office JWT, so its tenant context has no role and
// it is exempt. Owners/platform admins and all-access roles bypass. Everyone else
// is checked against their role's matrix for the resource + derived action.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly service: RolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<string>(PERMISSION_RESOURCE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!resource) return true; // not a guarded route

    const t = getTenant();
    const role = t?.role;
    if (!role) return true; // POS / unauthenticated — exempt
    if (t?.scope === "platform" || t?.scope === "owner" || isAllAccessRole(role)) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const action = methodToAction(req.method);
    const matrix = await this.service.getEffective(role);
    const allowed = matrix[resource]?.[action] ?? true;
    if (!allowed) {
      throw new ForbiddenException(
        `Your role does not have ${action} access to ${resource}.`,
      );
    }
    return true;
  }
}
