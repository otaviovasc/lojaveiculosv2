import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import type { BillingRepository } from "../../ports/billingRepository.js";
import type { BillingWebhookRepository } from "../../ports/billingWebhookRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";

export type BillingServicePorts = {
  billingProviderRepository?: BillingProviderRepository;
  billingRepository: BillingRepository;
  billingWebhookRepository?: BillingWebhookRepository;
  environment?: string;
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

export function getBillingEnvironment(ports: BillingServicePorts): string {
  return ports.environment ?? "test";
}

export function getBillingWebhookRepository(
  ports: BillingServicePorts,
): BillingWebhookRepository {
  if (!ports.billingWebhookRepository) {
    throw new BillingScopeError("billingWebhookRepository");
  }
  return ports.billingWebhookRepository;
}

export function getBillingProviderRepository(
  ports: BillingServicePorts,
): BillingProviderRepository {
  if (!ports.billingProviderRepository) {
    throw new BillingScopeError("billingProviderRepository");
  }
  return ports.billingProviderRepository;
}
