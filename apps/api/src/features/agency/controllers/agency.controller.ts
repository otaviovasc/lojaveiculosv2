import { Hono } from "hono";
import type { TenantId } from "@lojaveiculosv2/shared";
import { createHttpAccountContext } from "../../../infrastructure/http/createHttpAccountContext.js";
import {
  BillingRequestValidationError,
  handleBilling,
} from "../../billing/controllers/billing.controller.errors.js";
import {
  createBillingProviderCheckoutSchema,
  syncBillingProviderSubscriptionSchema,
  updateBillingSelectionSchema,
  updateEntitlementSchema,
} from "../../billing/controllers/billing.controller.schemas.js";
import {
  billingServices,
  type BillingServices,
} from "../../billing/controllers/billingServices.js";
import {
  agencyStoreBillingParamsSchema,
  agencyStoreEntitlementParamsSchema,
  agencyTenantParamsSchema,
} from "./agency.controller.schemas.js";
import {
  createAgencyContext,
  parseDateOrNull,
  parseJson,
  parseParams,
  type AgencyAccountContextFactory,
} from "./agency.controller.support.js";

export type { AgencyAccountContextFactory } from "./agency.controller.support.js";

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

  feature.put(
    "/tenants/:tenantId/stores/:storeId/billing/selection",
    async (context) =>
      handleBilling(context, async () => {
        const params = parseParams(context, agencyStoreBillingParamsSchema);
        const input = await parseJson(context, updateBillingSelectionSchema);
        const serviceContext = await createAgencyContext(
          context,
          accountContextFactory,
          params.tenantId as TenantId,
        );
        return context.json(
          await services.updateAgencySelection(serviceContext, {
            addonIds: input.addonIds,
            planId: input.planId,
            storeId: params.storeId as never,
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

  feature.post(
    "/tenants/:tenantId/stores/:storeId/billing/addons/zapi/request",
    async (context) =>
      handleBilling(context, async () => {
        const params = parseParams(context, agencyStoreBillingParamsSchema);
        const serviceContext = await createAgencyContext(
          context,
          accountContextFactory,
          params.tenantId as TenantId,
        );
        return context.json({
          contract: await services.requestZapiAddon(serviceContext, {
            storeId: params.storeId as never,
          }),
        });
      }),
  );

  feature.delete(
    "/tenants/:tenantId/stores/:storeId/billing/addons/zapi/request",
    async (context) =>
      handleBilling(context, async () => {
        const params = parseParams(context, agencyStoreBillingParamsSchema);
        const serviceContext = await createAgencyContext(
          context,
          accountContextFactory,
          params.tenantId as TenantId,
        );
        return context.json({
          contract: await services.cancelZapiAddon(serviceContext, {
            storeId: params.storeId as never,
          }),
        });
      }),
  );

  return feature;
}
