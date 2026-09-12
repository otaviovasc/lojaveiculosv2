import type { Context } from "hono";
import type { HttpAccountContext } from "../../../infrastructure/http/createHttpAccountContext.js";
import { createHttpAccountContext } from "../../../infrastructure/http/createHttpAccountContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";

export type AgencyAccountContextFactory = (
  context: Context,
  scope: { tenantId: string },
) => Promise<HttpAccountContext>;

export type FinancingContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export const defaultAgencyAccountContextFactory: AgencyAccountContextFactory = (
  context,
  scope,
) => createHttpAccountContext(context, { tenantId: scope.tenantId });

export const defaultFinancingContextFactory: FinancingContextFactory = (
  context,
) => createHttpServiceContext(context);

export async function createAgencyFinancingContext(
  context: Context,
  accountContextFactory: AgencyAccountContextFactory,
  tenantId: string,
) {
  const account = await accountContextFactory(context, { tenantId });
  if (account.serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Agency financing routes require user context.",
    );
  }
  return {
    ...account.serviceContext,
    billingManagedBy: "agency" as const,
    tenantId,
  };
}

export async function createStoreFinancingContext(
  context: Context,
  contextFactory: FinancingContextFactory,
): Promise<StoreScopedServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Credere financing routes require authenticated store user context.",
    );
  }
  if (!serviceContext.tenantId || !serviceContext.storeId) {
    throw new HttpContextAuthenticationError(
      "Credere financing routes require scoped tenant and store context.",
    );
  }
  return serviceContext as StoreScopedServiceContext;
}

export async function createDirectOwnerFinancingContext(
  context: Context,
  contextFactory: FinancingContextFactory,
): Promise<StoreScopedServiceContext> {
  const serviceContext = await createStoreFinancingContext(
    context,
    contextFactory,
  );
  if (
    serviceContext.billingManagedBy !== "store_owner" ||
    serviceContext.membershipRole !== "owner" ||
    !serviceContext.permissions.includes("financing.connection.manage")
  ) {
    throw new HttpContextAuthorizationError(
      "Credere connection management is restricted to direct store owners.",
    );
  }
  return serviceContext;
}
