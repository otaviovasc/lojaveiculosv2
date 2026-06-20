import { assertEntitlement } from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { FiscalProviderGateway } from "../../ports/fiscalProviderGateway.js";
import type { FiscalRepository } from "../../ports/fiscalRepository.js";

export type FiscalServicePorts = {
  fiscalProviderGateway: FiscalProviderGateway;
  fiscalRepository: FiscalRepository;
};

export function requireFiscalScope(
  context: ServiceContext,
): StoreScopedServiceContext {
  if (!context.storeId || !context.tenantId) {
    throw new FiscalScopeError();
  }

  const scoped = context as StoreScopedServiceContext;
  assertEntitlement(scoped, "nfe");
  return scoped;
}

export class FiscalScopeError extends Error {
  constructor() {
    super("Fiscal service requires store, tenant and nfe entitlement scope.");
    this.name = "FiscalScopeError";
  }
}
