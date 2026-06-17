import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "./serviceContext.js";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertPermission(
  context: ServiceContext,
  permission: PermissionKey,
): void {
  if (context.permissions.includes(permission)) return;

  context.logger.warn("authorization.permission.denied", {
    actorId: context.actor.id,
    permission,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  throw new AuthorizationError(`Missing permission: ${permission}`);
}

export function assertEntitlement(
  context: StoreScopedServiceContext,
  entitlement: EntitlementKey,
): void {
  if (context.entitlements.includes(entitlement)) return;

  context.logger.warn("authorization.entitlement.denied", {
    actorId: context.actor.id,
    entitlement,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  throw new AuthorizationError(`Missing entitlement: ${entitlement}`);
}
