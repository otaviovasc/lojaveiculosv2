import { Hono, type Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { BillingScopeError } from "../../../domains/billing/services/BillingService/serviceSupport.js";
import { updateEntitlementSchema } from "./billing.controller.schemas.js";
import { billingServices, type BillingServices } from "./billingServices.js";

export type BillingContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateBillingFeatureOptions = {
  contextFactory?: BillingContextFactory;
  services?: BillingServices;
};

export function createBillingFeature(
  options: CreateBillingFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? billingServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

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

async function handleBilling(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof BillingRequestValidationError ||
      error instanceof BillingScopeError
    ) {
      return jsonApiError(context, {
        code: "BILLING_REQUEST_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof HttpContextAuthenticationError) {
      return jsonApiError(context, {
        code: "HTTP_AUTHENTICATION_REQUIRED",
        error,
        message: error.message,
        status: 401,
      });
    }
    if (
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return jsonApiError(context, {
        code: "AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
      });
    }
    return jsonApiError(context, {
      code: "INTERNAL_SERVER_ERROR",
      error,
      message: "Internal server error.",
      status: 500,
    });
  }
}

function parseDateOrNull(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

class BillingRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingRequestValidationError";
  }
}
