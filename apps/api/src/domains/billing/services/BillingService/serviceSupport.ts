import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import type { BillingProviderReconciliationRepository } from "../../ports/billingProviderReconciliation.js";
import type { BillingRepository } from "../../ports/billingRepository.js";
import type { BillingWebhookRepository } from "../../ports/billingWebhookRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import type { BillingPlanHireRepository } from "../../ports/billingPlanHireRepository.js";

export type BillingServicePorts = {
  billingProviderRepository?: BillingProviderRepository;
  billingPlanHireRepository?: BillingPlanHireRepository;
  billingProviderReconciliationRepository?: BillingProviderReconciliationRepository;
  billingRepository: BillingRepository;
  billingWebhookRepository?: BillingWebhookRepository;
  environment?: string;
  paymentProviderGateway?: PaymentProviderGateway;
  publicAppUrl?: string;
};

export type BillingServicesPorts = BillingServicePorts & {
  billingProviderRepository: BillingProviderRepository;
  billingPlanHireRepository: BillingPlanHireRepository;
  billingWebhookRepository: BillingWebhookRepository;
  paymentProviderGateway: PaymentProviderGateway;
};

export function getBillingPlanHireRepository(
  ports: BillingServicePorts,
): BillingPlanHireRepository {
  if (!ports.billingPlanHireRepository) {
    throw new BillingCompositionError();
  }
  return ports.billingPlanHireRepository;
}

export class BillingScopeError extends Error {
  constructor(fieldName: string) {
    super(`Billing service requires ${fieldName}.`);
    this.name = "BillingScopeError";
  }
}

export class BillingCompositionError extends Error {
  constructor() {
    super(
      "Billing services are unavailable because runtime composition is incomplete.",
    );
    this.name = "BillingCompositionError";
  }
}

export class BillingStoreNotFoundError extends Error {
  constructor() {
    super("Managed store was not found.");
    this.name = "BillingStoreNotFoundError";
  }
}

export function requireBillingScope(context: ServiceContext): {
  storeId: StoreId;
  tenantId: TenantId;
} {
  if (!context.storeId) throw new BillingScopeError("storeId");
  if (!context.tenantId) throw new BillingScopeError("tenantId");
  return {
    storeId: context.storeId as StoreId,
    tenantId: context.tenantId as TenantId,
  };
}

export function requireTenantBillingScope(context: ServiceContext): {
  tenantId: TenantId;
} {
  if (!context.tenantId) throw new BillingScopeError("tenantId");
  return { tenantId: context.tenantId as TenantId };
}

export function getBillingEnvironment(ports: BillingServicePorts): string {
  return ports.environment ?? "test";
}

export function getBillingWebhookRepository(
  ports: BillingServicePorts,
): BillingWebhookRepository {
  if (!ports.billingWebhookRepository) {
    throw new BillingCompositionError();
  }
  return ports.billingWebhookRepository;
}

export function getBillingProviderRepository(
  ports: BillingServicePorts,
): BillingProviderRepository {
  if (!ports.billingProviderRepository) {
    throw new BillingCompositionError();
  }
  return ports.billingProviderRepository;
}
