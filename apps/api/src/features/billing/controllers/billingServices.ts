import type { ServiceContext } from "../../../shared/serviceContext.js";
import { getBillingOverview } from "../../../domains/billing/services/BillingService/getBillingOverview.js";
import { updateStoreEntitlement } from "../../../domains/billing/services/BillingService/updateStoreEntitlement.js";
import type { UpdateStoreEntitlementServiceInput } from "../../../domains/billing/services/BillingService/updateStoreEntitlement.js";
import type { BillingOverview } from "../../../domains/billing/ports/billingRepository.js";
import type { BillingServicePorts } from "../../../domains/billing/services/BillingService/serviceSupport.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "../../../infrastructure/db/billing/drizzleBillingRepository.js";
import { createMemoryBillingRepository } from "../adapters/memory/billingRepository.js";

export type BillingServices = {
  getOverview: (context: ServiceContext) => Promise<BillingOverview>;
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
    };
  }

  return { billingRepository: createMemoryBillingRepository() };
}

export const billingServices = createBillingServices();
