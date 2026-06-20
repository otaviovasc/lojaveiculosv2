import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingRepository } from "../../ports/billingRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";

export type BillingServicePorts = {
  billingRepository: BillingRepository;
  paymentProviderGateway?: PaymentProviderGateway;
};

export class BillingScopeError extends Error {
  constructor(fieldName: string) {
    super(`Billing service requires ${fieldName}.`);
    this.name = "BillingScopeError";
  }
}

export function requireBillingScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId) throw new BillingScopeError("storeId");
  if (!context.tenantId) throw new BillingScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}
