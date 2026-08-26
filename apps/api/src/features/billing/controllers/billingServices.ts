import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createBillingPlanHire } from "../../../domains/billing/services/BillingService/createBillingPlanHire.js";
import type { CreateBillingPlanHireInput } from "../../../domains/billing/services/BillingService/createBillingPlanHire.js";
import { getBillingPlanHire } from "../../../domains/billing/services/BillingService/getBillingPlanHire.js";
import type { BillingPlanHireRecord } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import type { BillingPlanQuoteRecord } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import {
  approveBillingPlanQuote,
  requestBillingPlanQuote,
} from "../../../domains/billing/services/BillingService/manageBillingPlanQuote.js";
import { getAgencyBillingProviderStatus } from "../../../domains/billing/services/BillingService/getAgencyBillingProviderStatus.js";
import { getAgencyTenantOverview } from "../../../domains/billing/services/BillingService/getAgencyTenantOverview.js";
import { getBillingOverview } from "../../../domains/billing/services/BillingService/getBillingOverview.js";
import { getBillingProviderStatus } from "../../../domains/billing/services/BillingService/getBillingProviderStatus.js";
import { processBillingProviderWebhook } from "../../../domains/billing/services/BillingService/processBillingProviderWebhook.js";
import type { ProcessBillingProviderWebhookInput } from "../../../domains/billing/services/BillingService/processBillingProviderWebhook.js";
import type {
  AgencyTenantOverview,
  BillingOverview,
} from "../../../domains/billing/ports/billingRepository.js";
import type { PaymentProviderStatus } from "../../../domains/billing/ports/paymentProviderGateway.js";
import type {
  BillingServicePorts,
  BillingServicesPorts,
} from "../../../domains/billing/services/BillingService/serviceSupport.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "../../../infrastructure/db/billing/drizzleBillingRepository.js";
import { createDrizzleBillingProviderRepository } from "../../../infrastructure/db/billing/drizzleBillingProviderRepository.js";
import { createDrizzleBillingWebhookRepository } from "../../../infrastructure/db/billing/drizzleBillingWebhookRepository.js";
import { createAsaasPaymentProviderGateway } from "../../../infrastructure/billing/asaasPaymentProviderGateway.js";
import { createDrizzleBillingPlanHireRepository } from "../../../infrastructure/db/billing/drizzleBillingPlanHireRepository.js";
import { createMemoryBillingProviderRepository } from "../adapters/memory/billingProviderRepository.js";
import { createMemoryBillingRepository } from "../adapters/memory/billingRepository.js";
import { createMemoryBillingWebhookRepository } from "../adapters/memory/billingWebhookRepository.js";
import { createMemoryPaymentProviderGateway } from "../adapters/memory/paymentProviderGateway.js";
import { createMemoryBillingPlanHireRepository } from "../adapters/memory/billingPlanHireRepository.js";

export type BillingServices = {
  approvePlanQuote: (
    context: ServiceContext,
    input: { expiresAt: Date; quoteId: string; quotedCents: number },
  ) => Promise<BillingPlanQuoteRecord>;
  createPlanHire: (
    context: ServiceContext,
    input: CreateBillingPlanHireInput,
  ) => Promise<BillingPlanHireRecord>;
  getPlanHire: (
    context: ServiceContext,
    hireId: string,
  ) => Promise<BillingPlanHireRecord>;
  getAgencyOverview: (context: ServiceContext) => Promise<AgencyTenantOverview>;
  getAgencyProviderStatus: (
    context: ServiceContext,
  ) => Promise<PaymentProviderStatus>;
  getOverview: (context: ServiceContext) => Promise<BillingOverview>;
  getProviderStatus: (
    context: ServiceContext,
  ) => Promise<PaymentProviderStatus>;
  processAsaasWebhook: (
    context: ServiceContext,
    input: ProcessBillingProviderWebhookInput,
  ) => ReturnType<typeof processBillingProviderWebhook>;
  requestPlanQuote: (
    context: ServiceContext,
    planId: string,
  ) => Promise<BillingPlanQuoteRecord>;
};

export type CreateBillingServicesOptions =
  | { drizzleClient?: never; ports?: BillingServicesPorts }
  | { drizzleClient: DrizzleBillingClient; ports?: never };

export function createBillingServices(
  options: CreateBillingServicesOptions = {},
): BillingServices {
  const ports = resolvePorts(options);

  return {
    approvePlanQuote: (context, input) =>
      approveBillingPlanQuote(context, input, ports),
    createPlanHire: (context, input) =>
      createBillingPlanHire(context, input, ports),
    getAgencyOverview: (context) => getAgencyTenantOverview(context, ports),
    getAgencyProviderStatus: (context) =>
      getAgencyBillingProviderStatus(context, ports),
    getOverview: (context) => getBillingOverview(context, ports),
    getPlanHire: (context, hireId) =>
      getBillingPlanHire(context, hireId, ports),
    getProviderStatus: (context) => getBillingProviderStatus(context, ports),
    processAsaasWebhook: (context, input) =>
      processBillingProviderWebhook(context, input, ports),
    requestPlanQuote: (context, planId) =>
      requestBillingPlanQuote(context, planId, ports),
  };
}

function resolvePorts(
  options: CreateBillingServicesOptions,
): BillingServicesPorts {
  if ("ports" in options && options.ports) return options.ports;
  if ("drizzleClient" in options) {
    return {
      billingPlanHireRepository: createDrizzleBillingPlanHireRepository(
        options.drizzleClient,
      ),
      billingProviderRepository: createDrizzleBillingProviderRepository(
        options.drizzleClient,
      ),
      billingRepository: createDrizzleBillingRepository(options.drizzleClient),
      billingWebhookRepository: createDrizzleBillingWebhookRepository(
        options.drizzleClient,
      ),
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "local",
      paymentProviderGateway: createAsaasPaymentProviderGateway(process.env),
      ...(process.env.PUBLIC_APP_URL
        ? { publicAppUrl: process.env.PUBLIC_APP_URL }
        : {}),
    };
  }

  return {
    billingPlanHireRepository: createMemoryBillingPlanHireRepository(),
    billingProviderRepository: createMemoryBillingProviderRepository(),
    billingRepository: createMemoryBillingRepository(),
    billingWebhookRepository: createMemoryBillingWebhookRepository(),
    environment: "test",
    paymentProviderGateway: createMemoryPaymentProviderGateway(),
    publicAppUrl: "http://localhost:5173",
  };
}

export const billingServices = createBillingServices();
