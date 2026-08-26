import { Hono } from "hono";
import type { TenantId } from "@lojaveiculosv2/shared";
import { createHttpAccountContext } from "../../../infrastructure/http/createHttpAccountContext.js";
import { handleBilling } from "../../billing/controllers/billing.controller.errors.js";
import {
  approveBillingPlanQuoteSchema,
  createBillingPlanHireSchema,
  requestBillingPlanQuoteSchema,
} from "../../billing/controllers/billing.controller.schemas.js";
import {
  billingServices,
  type BillingServices,
} from "../../billing/controllers/billingServices.js";
import {
  agencyStoreBillingParamsSchema,
  agencyTenantParamsSchema,
} from "./agency.controller.schemas.js";
import {
  createAgencyContext,
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
    "/tenants/:tenantId/stores/:storeId/billing/plan-hires",
    async (context) =>
      handleBilling(context, async () => {
        const params = parseParams(context, agencyStoreBillingParamsSchema);
        const input = await parseJson(context, createBillingPlanHireSchema);
        const agencyContext = await createAgencyContext(
          context,
          accountContextFactory,
          params.tenantId as TenantId,
        );
        return context.json(
          await services.createPlanHire(
            { ...agencyContext, storeId: params.storeId as never },
            {
              idempotencyKey: input.idempotencyKey,
              planId: input.planId,
              ...(input.quoteId ? { quoteId: input.quoteId } : {}),
              ...(input.billingTypes
                ? { billingTypes: input.billingTypes }
                : {}),
              returnPath: "/agency/admin/unified-billing",
            },
          ),
          201,
        );
      }),
  );

  feature.get(
    "/tenants/:tenantId/stores/:storeId/billing/plan-hires/:hireId",
    async (context) =>
      handleBilling(context, async () => {
        const params = parseParams(context, agencyStoreBillingParamsSchema);
        const agencyContext = await createAgencyContext(
          context,
          accountContextFactory,
          params.tenantId as TenantId,
        );
        return context.json(
          await services.getPlanHire(
            { ...agencyContext, storeId: params.storeId as never },
            context.req.param("hireId"),
          ),
        );
      }),
  );

  feature.post(
    "/tenants/:tenantId/stores/:storeId/billing/plan-quotes",
    async (context) =>
      handleBilling(context, async () => {
        const params = parseParams(context, agencyStoreBillingParamsSchema);
        const input = await parseJson(context, requestBillingPlanQuoteSchema);
        const agencyContext = await createAgencyContext(
          context,
          accountContextFactory,
          params.tenantId as TenantId,
        );
        return context.json(
          await services.requestPlanQuote(
            { ...agencyContext, storeId: params.storeId as never },
            input.planId,
          ),
          201,
        );
      }),
  );

  feature.patch(
    "/tenants/:tenantId/stores/:storeId/billing/plan-quotes/:quoteId/approve",
    async (context) =>
      handleBilling(context, async () => {
        const params = parseParams(context, agencyStoreBillingParamsSchema);
        const input = await parseJson(context, approveBillingPlanQuoteSchema);
        const agencyContext = await createAgencyContext(
          context,
          accountContextFactory,
          params.tenantId as TenantId,
        );
        return context.json(
          await services.approvePlanQuote(
            { ...agencyContext, storeId: params.storeId as never },
            {
              expiresAt: new Date(input.expiresAt),
              quoteId: context.req.param("quoteId"),
              quotedCents: input.quotedCents,
            },
          ),
        );
      }),
  );

  return feature;
}
