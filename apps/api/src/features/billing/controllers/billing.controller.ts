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
  syncBillingProviderSubscriptionSchema,
  updateEntitlementSchema,
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

  feature.post("/provider/subscription/sync", async (context) =>
    handleBilling(context, async () => {
      const input = await parseJson(
        context,
        syncBillingProviderSubscriptionSchema,
      );
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.syncProviderSubscription(serviceContext, {
          ...(input.billingType ? { billingType: input.billingType } : {}),
          ...(input.nextDueDate
            ? { nextDueDate: new Date(`${input.nextDueDate}T00:00:00.000Z`) }
            : {}),
          ...(typeof input.updatePendingPayments === "boolean"
            ? { updatePendingPayments: input.updatePendingPayments }
            : {}),
        }),
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

  feature.patch("/entitlements/:featureKey", async (context) =>
    handleBilling(context, async () => {
      const input = await parseJson(context, updateEntitlementSchema);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      const featureKey = context.req.param("featureKey");
      if (featureKey !== input.featureKey) {
        throw new BillingRequestValidationError("Feature key route mismatch.");
      }

      return context.json(
        await services.updateEntitlement(serviceContext, {
          featureKey: input.featureKey,
          status: input.status,
          ...(input.endsAt !== undefined
            ? { endsAt: parseDateOrNull(input.endsAt) }
            : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
          ...(input.reason !== undefined ? { reason: input.reason } : {}),
          ...(input.startsAt !== undefined
            ? { startsAt: parseDateOrNull(input.startsAt) }
            : {}),
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

const parseDateOrNull = (value: string | null): Date | null =>
  value ? new Date(value) : null;
