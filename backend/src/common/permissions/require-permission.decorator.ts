import { SetMetadata } from "@nestjs/common";
import { Resource } from "./permissions.constants";

export const PERMISSION_RESOURCE = "permission_resource";

// Mark a controller (or handler) as guarded by the permission matrix for the
// given resource. The action is derived from the HTTP verb by PermissionsGuard
// (GET→read, POST→write, PUT/PATCH→update, DELETE→delete).
export const RequirePermission = (resource: Resource) =>
  SetMetadata(PERMISSION_RESOURCE, resource);
