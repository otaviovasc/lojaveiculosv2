import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { InternalMonitoringRepository } from "../../ports/internalMonitoringRepository.js";

export type InternalMonitoringServicePorts = {
  internalMonitoringRepository: InternalMonitoringRepository;
};

export function normalizeInternalHealthLimit(limit: number) {
  if (!Number.isFinite(limit)) return 40;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export function requireInternalMonitoringScope(context: ServiceContext) {
  if (!context.storeId || !context.tenantId) {
    throw new InternalMonitoringScopeError();
  }

  return {
    storeId: context.storeId,
    tenantId: context.tenantId,
  };
}

export function requirePlatformInternalMonitoringAccess(
  context: ServiceContext,
): void {
  if (
    context.actor.kind !== "user" ||
    !context.platformAdmin ||
    context.storeId !== null ||
    context.tenantId !== null
  ) {
    throw new InternalMonitoringPlatformScopeError();
  }
}

export class InternalMonitoringScopeError extends Error {
  constructor() {
    super("Internal monitoring requires store and tenant scope.");
    this.name = "InternalMonitoringScopeError";
  }
}

export class InternalMonitoringPlatformScopeError extends Error {
  constructor() {
    super("Platform observability requires a platform administrator context.");
    this.name = "InternalMonitoringPlatformScopeError";
  }
}
