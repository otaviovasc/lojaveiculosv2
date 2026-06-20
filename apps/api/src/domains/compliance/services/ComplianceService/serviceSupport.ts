import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { StoreScopedServiceContext } from "../../../../shared/serviceContext.js";
import type { ComplianceRepository } from "../../ports/complianceRepository.js";

export type ComplianceServicePorts = {
  complianceRepository: ComplianceRepository;
};

export function requireComplianceScope(
  context: ServiceContext,
): StoreScopedServiceContext {
  if (!context.storeId || !context.tenantId) {
    throw new ComplianceScopeError();
  }

  const scoped = context as StoreScopedServiceContext;
  assertEntitlement(scoped, "compliance");
  return scoped;
}

export class ComplianceScopeError extends Error {
  constructor() {
    super("Compliance requires store and tenant scope.");
    this.name = "ComplianceScopeError";
  }
}
