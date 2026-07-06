import type { ServiceContext } from "../../../shared/serviceContext.js";
import { getBillingOverview } from "../../../domains/billing/services/BillingService/getBillingOverview.js";
import { getBillingProviderStatus } from "../../../domains/billing/services/BillingService/getBillingProviderStatus.js";
import { processBillingProviderWebhook } from "../../../domains/billing/services/BillingService/processBillingProviderWebhook.js";
import type { ProcessBillingProviderWebhookInput } from "../../../domains/billing/services/BillingService/processBillingProviderWebhook.js";
import { syncBillingProviderSubscription } from "../../../domains/billing/services/BillingService/syncBillingProviderSubscription.js";
import type { BillingProviderSubscriptionSyncResult } from "../../../domains/billing/ports/billingProviderRepository.js";
import type { SyncBillingProviderSubscriptionInput } from "../../../domains/billing/services/BillingService/syncBillingProviderSubscription.js";
import { updateStoreEntitlement } from "../../../domains/billing/services/BillingService/updateStoreEntitlement.js";
import type { UpdateStoreEntitlementServiceInput } from "../../../domains/billing/services/BillingService/updateStoreEntitlement.js";
import type { BillingOverview } from "../../../domains/billing/ports/billingRepository.js";
import type { PaymentProviderStatus } from "../../../domains/billing/ports/paymentProviderGateway.js";
import type { BillingServicePorts } from "../../../domains/billing/services/BillingService/serviceSupport.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "../../../infrastructure/db/billing/drizzleBillingRepository.js";
import { createDrizzleBillingProviderRepository } from "../../../infrastructure/db/billing/drizzleBillingProviderRepository.js";
import { createDrizzleBillingWebhookRepository } from "../../../infrastructure/db/billing/drizzleBillingWebhookRepository.js";
import { createAsaasPaymentProviderGateway } from "../../../infrastructure/billing/asaasPaymentProviderGateway.js";
import { createMemoryBillingProviderRepository } from "../adapters/memory/billingProviderRepository.js";
import { createMemoryBillingRepository } from "../adapters/memory/billingRepository.js";
import { createMemoryBillingWebhookRepository } from "../adapters/memory/billingWebhookRepository.js";
import { createMemoryPaymentProviderGateway } from "../adapters/memory/paymentProviderGateway.js";

export type BillingServices = {
  getOverview: (context: ServiceContext) => Promise<BillingOverview>;
  getProviderStatus: (
    context: ServiceContext,
  ) => Promise<PaymentProviderStatus>;
  processAsaasWebhook: (
    context: ServiceContext,
    input: ProcessBillingProviderWebhookInput,
  ) => ReturnType<typeof processBillingProviderWebhook>;
  syncProviderSubscription: (
    context: ServiceContext,
    input: SyncBillingProviderSubscriptionInput,
  ) => Promise<BillingProviderSubscriptionSyncResult>;
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
    processAsaasWebhook: (context, input) =>
      processBillingProviderWebhook(context, input, ports),
    syncProviderSubscription: (context, input) =>
      syncBillingProviderSubscription(context, input, ports),
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
      billingProviderRepository: createDrizzleBillingProviderRepository(
        options.drizzleClient,
      ),
      billingRepository: createDrizzleBillingRepository(options.drizzleClient),
      billingWebhookRepository: createDrizzleBillingWebhookRepository(
        options.drizzleClient,
      ),
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "local",
      paymentProviderGateway: createAsaasPaymentProviderGateway(process.env),
    };
  }

  return {
    billingProviderRepository: createMemoryBillingProviderRepository(),
    billingRepository: createMemoryBillingRepository(),
    billingWebhookRepository: createMemoryBillingWebhookRepository(),
    environment: "test",
    paymentProviderGateway: createMemoryPaymentProviderGateway(),
  };
}

export const billingServices = createBillingServices();
