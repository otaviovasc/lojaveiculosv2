import { Hono, type Context } from "hono";
import type { z } from "zod";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createPassthroughTransactionRunner } from "../../../shared/transaction.js";
import type { FinanceServices } from "../../finance/controllers/financeServices.js";
import { financeServices as defaultFinanceServices } from "../../finance/controllers/financeServices.js";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { CrmFinancialProductTransactionRunner } from "./crmFinancialProducts.js";
import { registerCrmPipelineRoutes } from "./crm.pipeline.routes.js";
import { registerCrmVisitRoutes } from "./crm.visits.routes.js";
import {
  CrmRequestValidationError,
  handleCrm,
} from "./crm.controller.errors.js";
import { crmServices, type CrmServices } from "./crmServices.js";
import { registerCrmWhatsappRoutes } from "./crm.whatsapp.controller.js";
import type { CrmCoreRepository } from "../../../domains/crm/ports/crmCoreRepository.js";
import { registerCrmCoreRoutes } from "./crm.core.routes.js";
import { handleCrmCore } from "./crm.core.errors.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import { registerExternalBotRoutes } from "./crm.bot.controller.js";
import {
  registerCrmLeadCollectionRoutes,
  registerCrmLeadDetailRoutes,
} from "./crm.leads.routes.js";
import { registerCrmRoutingRoutes } from "./crm.routing.routes.js";

export type CrmContextFactory = (context: Context) => Promise<ServiceContext>;

export type CreateCrmFeatureOptions = {
  accountContextFactory?: CrmContextFactory;
  contextFactory?: CrmContextFactory;
  coreRepository?: CrmCoreRepository;
  financialProductTransactionRunner?:
    CrmFinancialProductTransactionRunner | undefined;
  financeServices?: Pick<FinanceServices, "materializeAutoEntries"> | undefined;
  externalBotManager?: ExternalBotManagerPorts | undefined;
  realtimeBroker?: CrmRealtimeBroker | undefined;
  resolveBotEntitlements?: ResolveCrmBotEntitlements | undefined;
  services?: CrmServices;
  webhookContextFactory?: CrmContextFactory;
};

export function createCrmFeature(options: CreateCrmFeatureOptions = {}) {
  const crmFeature = new Hono();
  const services = options.services ?? crmServices;
  const financeServices = options.financeServices ?? defaultFinanceServices;
  const financialProductTransactionRunner =
    options.financialProductTransactionRunner ??
    createPassthroughTransactionRunner({
      createActivity: services.createActivity,
      materializeAutoEntries: financeServices.materializeAutoEntries,
    });
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedServiceContext(context, contextFactory);

  const leadRouteSupport = {
    createContext,
    financeServices,
    financialProductTransactionRunner,
    handleCrm,
    parseJson,
    services,
  };
  registerCrmLeadCollectionRoutes(crmFeature, leadRouteSupport);

  registerCrmPipelineRoutes(crmFeature, {
    createContext,
    handleCrm,
    parseJson,
    services,
  });

  registerCrmVisitRoutes(crmFeature, {
    createContext,
    handleCrm,
    parseJson,
    services,
  });

  registerCrmRoutingRoutes(crmFeature, { createContext, services });

  if (options.coreRepository) {
    registerCrmCoreRoutes(crmFeature, {
      createContext,
      handleCrm: handleCrmCore,
      repository: options.coreRepository,
    });
  }

  registerCrmLeadDetailRoutes(crmFeature, leadRouteSupport);

  registerCrmWhatsappRoutes(crmFeature, {
    ...(options.accountContextFactory
      ? { createSupportContext: options.accountContextFactory }
      : {}),
    createContext,
    ...(options.webhookContextFactory
      ? { createWebhookContext: options.webhookContextFactory }
      : {}),
    ...(options.realtimeBroker
      ? { realtimeBroker: options.realtimeBroker }
      : {}),
    ...(options.resolveBotEntitlements
      ? { resolveBotEntitlements: options.resolveBotEntitlements }
      : {}),
    services,
  });

  registerExternalBotRoutes(crmFeature, {
    createContext,
    createWebhookContext:
      options.webhookContextFactory ??
      ((context) => createHttpServiceContext(context)),
    ...(options.externalBotManager
      ? { manager: options.externalBotManager }
      : {}),
    services,
  });

  return crmFeature;
}

async function createProtectedServiceContext(
  context: Context,
  contextFactory: CrmContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);

  if (!["integration", "user"].includes(serviceContext.actor.kind)) {
    throw new HttpContextAuthenticationError(
      "CRM routes require authenticated user or integration context.",
    );
  }

  return serviceContext;
}

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    throw new CrmRequestValidationError("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new CrmRequestValidationError("Request body is invalid.");
  }

  return parsed.data;
}
