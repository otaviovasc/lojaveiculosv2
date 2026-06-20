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

export class InternalMonitoringScopeError extends Error {
  constructor() {
    super("Internal monitoring requires store and tenant scope.");
    this.name = "InternalMonitoringScopeError";
  }
}
