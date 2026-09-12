import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { StoreScopedServiceContext } from "../../../../shared/serviceContext.js";
import type { AnalyticsRepository } from "../../ports/analyticsRepository.js";

export type AnalyticsServicePorts = {
  analyticsRepository: AnalyticsRepository;
};

export function requireAnalyticsScope(
  context: ServiceContext,
): StoreScopedServiceContext {
  const scoped = requireDashboardScope(context);
  assertEntitlement(scoped, "analytics");
  return scoped;
}

export function requireDashboardScope(
  context: ServiceContext,
): StoreScopedServiceContext {
  if (!context.storeId || !context.tenantId) {
    throw new AnalyticsScopeError();
  }

  return context as StoreScopedServiceContext;
}

export class AnalyticsScopeError extends Error {
  constructor() {
    super("Analytics requires store and tenant scope.");
    this.name = "AnalyticsScopeError";
  }
}
