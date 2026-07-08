import { Hono, type Context } from "hono";
import type { z } from "zod";
import type { TenantId } from "@lojaveiculosv2/shared";
import type { HttpAccountContext } from "../../../infrastructure/http/createHttpAccountContext.js";
import { createHttpAccountContext } from "../../../infrastructure/http/createHttpAccountContext.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  BillingRequestValidationError,
  handleBilling,
} from "../../billing/controllers/billing.controller.errors.js";
import {
  createBillingProviderCheckoutSchema,
  syncBillingProviderSubscriptionSchema,
  updateEntitlementSchema,
} from "../../billing/controllers/billing.controller.schemas.js";
import {
  billingServices,
  type BillingServices,
} from "../../billing/controllers/billingServices.js";
import {
  agencyStoreEntitlementParamsSchema,
  agencyTenantParamsSchema,
} from "./agency.controller.schemas.js";

export type AgencyAccountContextFactory = (
  context: Context,
  scope: { tenantId: TenantId },
) => Promise<HttpAccountContext>;

export type CreateAgencyFeatureOptions = {
  accountContextFactory?: AgencyAccountContextFactory;
  services?: BillingServices;
};

export function createAgencyFeature(options: CreateAgencyFeatureOptions = {}) {
  const feature = new Hono();
  const services = options.services ?? billingServices;
  const accountContextFactory =
    options.accountContextFactory ??
    ((context, scope) =>
      createHttpAccountContext(context, { tenantId: scope.tenantId }));

  feature.get("/tenants/:tenantId/overview", async (context) =>
    handleBilling(context, async () => {
      const { tenantId } = parseParams(context, agencyTenantParamsSchema);
      const serviceContext = await createAgencyContext(
        context,
        accountContextFactory,
        tenantId as TenantId,
      );
      return context.json(await services.getAgencyOverview(serviceContext));
    }),
  );

  feature.get("/tenants/:tenantId/billing/provider/status", async (context) =>
    handleBilling(context, async () => {
      const { tenantId } = parseParams(context, agencyTenantParamsSchema);
      const serviceContext = await createAgencyContext(
        context,
        accountContextFactory,
        tenantId as TenantId,
      );
      return context.json(
        await services.getAgencyProviderStatus(serviceContext),
      );
    }),
  );

  feature.post(
    "/tenants/:tenantId/billing/provider/subscription/sync",
    async (context) =>
      handleBilling(context, async () => {
        const { tenantId } = parseParams(context, agencyTenantParamsSchema);
        const input = await parseJson(
          context,
          syncBillingProviderSubscriptionSchema,
        );
        const serviceContext = await createAgencyContext(
          context,
          accountContextFactory,
          tenantId as TenantId,
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

  feature.post(
    "/tenants/:tenantId/billing/provider/checkout",
    async (context) =>
      handleBilling(context, async () => {
        const { tenantId } = parseParams(context, agencyTenantParamsSchema);
        const input = await parseJson(
          context,
          createBillingProviderCheckoutSchema,
        );
        const serviceContext = await createAgencyContext(
          context,
          accountContextFactory,
          tenantId as TenantId,
        );
        return context.json(
          await services.createProviderCheckout(serviceContext, {
            ...(input.billingTypes ? { billingTypes: input.billingTypes } : {}),
            ...(input.minutesToExpire
              ? { minutesToExpire: input.minutesToExpire }
              : {}),
            ...(input.nextDueDate
              ? { nextDueDate: new Date(`${input.nextDueDate}T00:00:00.000Z`) }
              : {}),
            returnPath: "/agency/admin/unified-billing",
          }),
        );
      }),
  );

  feature.patch(
    "/tenants/:tenantId/stores/:storeId/entitlements/:featureKey",
    async (context) =>
      handleBilling(context, async () => {
        const params = parseParams(context, agencyStoreEntitlementParamsSchema);
        const input = await parseJson(context, updateEntitlementSchema);
        if (params.featureKey !== input.featureKey) {
          throw new BillingRequestValidationError(
            "Feature key route mismatch.",
          );
        }
        const serviceContext = await createAgencyContext(
          context,
          accountContextFactory,
          params.tenantId as TenantId,
        );
        return context.json(
          await services.updateAgencyEntitlement(serviceContext, {
            featureKey: input.featureKey,
            status: input.status,
            storeId: params.storeId as never,
            ...(input.endsAt !== undefined
              ? { endsAt: parseDateOrNull(input.endsAt) }
              : {}),
            ...(input.metadata !== undefined
              ? { metadata: input.metadata }
              : {}),
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

async function createAgencyContext(
  context: Context,
  contextFactory: AgencyAccountContextFactory,
  tenantId: TenantId,
): Promise<ServiceContext> {
  const account = await contextFactory(context, { tenantId });
  if (account.serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Agency routes require user context.",
    );
  }

  return {
    ...account.serviceContext,
    billingManagedBy: "agency",
    tenantId,
  };
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

function parseParams<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  try {
    return schema.parse(context.req.param());
  } catch {
    throw new BillingRequestValidationError("Route parameters are invalid.");
  }
}

const parseDateOrNull = (value: string | null): Date | null =>
  value ? new Date(value) : null;
