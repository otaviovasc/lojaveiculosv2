import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { StoreScopedServiceContext } from "../../../../shared/serviceContext.js";
import { assertEntitlement } from "../../../../shared/authorization.js";
import type { CrmRepository } from "../../ports/crmRepository.js";

export type CrmServicePorts = {
  crmRepository: CrmRepository;
};

export class CrmLeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`Lead not found: ${leadId}`);
    this.name = "CrmLeadNotFoundError";
  }
}

export class CrmScopeError extends Error {
  constructor(fieldName: string) {
    super(`CRM service requires ${fieldName}.`);
    this.name = "CrmScopeError";
  }
}

export function requireCrmScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  if (!context.storeId) throw new CrmScopeError("storeId");
  if (!context.tenantId) throw new CrmScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}

export function getCrmRepository(ports: CrmServicePorts): CrmRepository {
  return ports.crmRepository;
}
