import type { ServiceContext } from "../../../shared/serviceContext.js";
import { getBillingOverview } from "../../../domains/billing/services/BillingService/getBillingOverview.js";
import { getBillingProviderStatus } from "../../../domains/billing/services/BillingService/getBillingProviderStatus.js";
import { updateStoreEntitlement } from "../../../domains/billing/services/BillingService/updateStoreEntitlement.js";
import type { UpdateStoreEntitlementServiceInput } from "../../../domains/billing/services/BillingService/updateStoreEntitlement.js";
import type { BillingOverview } from "../../../domains/billing/ports/billingRepository.js";
import type { PaymentProviderStatus } from "../../../domains/billing/ports/paymentProviderGateway.js";
import type { BillingServicePorts } from "../../../domains/billing/services/BillingService/serviceSupport.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "../../../infrastructure/db/billing/drizzleBillingRepository.js";
import { createMemoryBillingRepository } from "../adapters/memory/billingRepository.js";
import { createMemoryPaymentProviderGateway } from "../adapters/memory/paymentProviderGateway.js";

export type BillingServices = {
  getOverview: (context: ServiceContext) => Promise<BillingOverview>;
  getProviderStatus: (
    context: ServiceContext,
  ) => Promise<PaymentProviderStatus>;
  updateEntitlement: (
    context: ServiceContext,
    input: UpdateStoreEntitlementServiceInput,
  ) => Promise<BillingOverview>;
};

export type CreateBillingServicesOptions =
  | { drizzleClient?: never; ports?: BillingServicePorts }
  | { drizzleClient: DrizzleBillingClient; ports?: never };

export function createBillingServices(
  options: CreateBillingServicesOptions = {},
): BillingServices {
  const ports = resolvePorts(options);

  return {
    getOverview: (context) => getBillingOverview(context, ports),
    getProviderStatus: (context) => getBillingProviderStatus(context, ports),
    updateEntitlement: (context, input) =>
      updateStoreEntitlement(context, input, ports),
  };
}

function resolvePorts(
  options: CreateBillingServicesOptions,
): BillingServicePorts {
  if ("ports" in options && options.ports) return options.ports;
  if ("drizzleClient" in options) {
    return {
      billingRepository: createDrizzleBillingRepository(options.drizzleClient),
      paymentProviderGateway: createMemoryPaymentProviderGateway(
        listMissingAsaasConfig(process.env),
      ),
    };
  }

  return {
    billingRepository: createMemoryBillingRepository(),
    paymentProviderGateway: createMemoryPaymentProviderGateway(),
  };
}

export const billingServices = createBillingServices();

function listMissingAsaasConfig(env: Record<string, string | undefined>) {
  return [
    "ASAAS_RUNTIME_IMPLEMENTATION",
    ...["ASAAS_API_URL", "ASAAS_API_KEY", "ASAAS_WEBHOOK_SECRET"].filter(
      (key) => !env[key],
    ),
  ];
}
