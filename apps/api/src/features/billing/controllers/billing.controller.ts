import { Hono, type Context } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { createHttpIntegrationServiceContext } from "../../../infrastructure/http/httpIntegrationServiceContext.js";
import { BillingWebhookValidationError } from "../../../domains/billing/readModels/billingWebhookErrors.js";
import {
  BillingRequestValidationError,
  handleBilling,
} from "./billing.controller.errors.js";
import {
  createBillingPlanHireSchema,
  requestBillingPlanQuoteSchema,
} from "./billing.controller.schemas.js";
import { billingServices, type BillingServices } from "./billingServices.js";

export type BillingContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateBillingFeatureOptions = {
  contextFactory?: BillingContextFactory;
  services?: BillingServices;
  webhookContextFactory?: BillingContextFactory;
};

export function createBillingFeature(
  options: CreateBillingFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? billingServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const webhookContextFactory =
    options.webhookContextFactory ??
    ((context) =>
      createHttpIntegrationServiceContext(context, {
        actorId: "asaas",
        displayName: "Asaas",
        permissions: ["billing.webhook.ingest"],
      }));

  feature.get("/overview", async (context) =>
    handleBilling(context, async () => {
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(await services.getOverview(serviceContext));
    }),
  );

  feature.get("/provider/status", async (context) =>
    handleBilling(context, async () => {
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(await services.getProviderStatus(serviceContext));
    }),
  );

  feature.post("/plan-hires", async (context) =>
    handleBilling(context, async () => {
      const input = await parseJson(context, createBillingPlanHireSchema);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.createPlanHire(serviceContext, {
          idempotencyKey: input.idempotencyKey,
          planId: input.planId,
          ...(input.quoteId ? { quoteId: input.quoteId } : {}),
          ...(input.billingTypes ? { billingTypes: input.billingTypes } : {}),
          returnPath: "/billing",
        }),
        201,
      );
    }),
  );

  feature.get("/plan-hires/:hireId", async (context) =>
    handleBilling(context, async () => {
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.getPlanHire(serviceContext, context.req.param("hireId")),
      );
    }),
  );

  feature.post("/plan-quotes", async (context) =>
    handleBilling(context, async () => {
      const input = await parseJson(context, requestBillingPlanQuoteSchema);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.requestPlanQuote(serviceContext, input.planId),
        201,
      );
    }),
  );

  feature.post("/webhooks/asaas", async (context) =>
    handleBilling(context, async () => {
      const serviceContext = await webhookContextFactory(context);
      const payload = await parseWebhookJson(context);
      return context.json(
        await services.processAsaasWebhook(serviceContext, {
          payload,
          provider: "asaas",
          webhookToken: context.req.header("asaas-access-token") ?? null,
        }),
      );
    }),
  );

  return feature;
}

async function createProtectedContext(
  context: Context,
  contextFactory: BillingContextFactory,
) {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError("Billing requires user context.");
  }
  return serviceContext;
}

async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  try {
    return schema.parse(await context.req.json());
  } catch {
    throw new BillingRequestValidationError("Request body is invalid.");
  }
}

async function parseWebhookJson(
  context: Context,
): Promise<Record<string, unknown>> {
  try {
    const input: unknown = await context.req.json();
    if (input && typeof input === "object" && !Array.isArray(input)) {
      return input as Record<string, unknown>;
    }
  } catch {
    // Normalized below.
  }
  throw new BillingWebhookValidationError("Webhook body is invalid.");
}
